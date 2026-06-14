import { useStore } from '../store';
import { compileAPI } from '../api';

let worker: Worker | null = null;
let pendingResolve: ((val: any) => void) | null = null;
let pendingReject: ((err: any) => void) | null = null;
let loadTimeout: any = null;
let compileTimeout: any = null;

function clearPending() {
  pendingResolve = null;
  pendingReject = null;
  if (loadTimeout) { clearTimeout(loadTimeout); loadTimeout = null; }
  if (compileTimeout) { clearTimeout(compileTimeout); compileTimeout = null; }
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker('/solc.worker.js');
    worker.onmessage = (e) => {
      const { type, output, error } = e.data;
      if (type === 'loaded') {
        const res = pendingResolve;
        clearPending();
        if (res) res(true);
      }
      if (type === 'result') {
        if (error) {
          const rej = pendingReject;
          clearPending();
          if (rej) rej(new Error(error));
        } else {
          const res = pendingResolve;
          clearPending();
          if (res) res(output);
        }
      }
      if (type === 'error') {
        const rej = pendingReject;
        clearPending();
        if (rej) rej(new Error(e.data.error));
      }
    };
    worker.onerror = (e) => {
      const rej = pendingReject;
      clearPending();
      if (rej) rej(new Error(`Worker error: ${e.message}`));
      // Reset worker on crash
      worker = null;
    };
  }
  return worker;
}

function loadVersion(version: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    clearPending();
    pendingResolve = resolve;
    pendingReject = reject;
    loadTimeout = setTimeout(() => {
      clearPending();
      // Kill and reset worker on timeout
      if (worker) { worker.terminate(); worker = null; }
      reject(new Error(`Load timeout: solc ${version} took too long`));
    }, 60000);
    getWorker().postMessage({ type: 'load', version });
  });
}

function doCompile(input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    clearPending();
    pendingResolve = resolve;
    pendingReject = reject;
    compileTimeout = setTimeout(() => {
      clearPending();
      reject(new Error('Compile timeout — try again'));
    }, 120000);
    getWorker().postMessage({ type: 'compile', input });
  });
}

export const useCompiler = () => {
  const { solcVersion, evmVersion, optimize, setCompileResult, setIsCompiling, addLog, wallet } = useStore();

  const compile = async (source: string, fileName: string) => {
    if (!source.trim()) { addLog('No source code'); return; }

    // Already compiling guard
    if (useStore.getState().isCompiling) {
      addLog('Already compiling — please wait...');
      return;
    }

    setIsCompiling(true);
    addLog(`Compiling ${fileName} — solc ${solcVersion} (EVM: ${evmVersion})...`);

    try {
      addLog(`Loading solc ${solcVersion}...`);
      await loadVersion(solcVersion);
      addLog(`solc ${solcVersion} ready`);

      const input = JSON.stringify({
        language: 'Solidity',
        sources: { [fileName]: { content: source } },
        settings: {
          evmVersion,
          optimizer: { enabled: optimize, runs: 200 },
          outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } }
        }
      });

      const outputRaw = await doCompile(input);
      const output = JSON.parse(outputRaw);

      const errors = (output.errors || []).filter((e: any) => e.severity === 'error');
      const warnings = (output.errors || []).filter((e: any) => e.severity === 'warning');

      if (errors.length > 0) {
        errors.forEach((e: any) => addLog(`Error: ${e.formattedMessage}`));
        setCompileResult({ success: false, errors, warnings, contracts: {} });
        addLog(`Failed — ${errors.length} error(s)`);
      } else {
        const contracts: Record<string, any> = {};
        for (const [_f, fc] of Object.entries(output.contracts || {})) {
          for (const [name, c] of Object.entries(fc as any)) {
            const ct = c as any;
            contracts[name] = { contractName: name, abi: ct.abi, bytecode: ct.evm.bytecode.object };
            addLog(`Compiled: ${name}`);
          }
        }
        warnings.forEach((w: any) => addLog(`Warning: ${w.formattedMessage}`));
        setCompileResult({ success: true, errors: [], warnings, contracts });
        addLog(`Done! ${Object.keys(contracts).length} contract(s)`);
        try { await compileAPI.log({ source, fileName, solcVersion, evmVersion, userId: wallet || undefined }); } catch {}
      }
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
      setCompileResult({ success: false, errors: [err.message], warnings: [], contracts: {} });
    } finally {
      setIsCompiling(false);
    }
  };

  return { compile };
};
