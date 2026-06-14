import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { deploymentsAPI } from '../../api';
import { ethers } from 'ethers';

const VDSCAN_VERIFY_API = 'https://vdscan.io/api/contracts/verify';

const CHAIN_INFO: Record<string, { name: string; explorer: string; symbol: string }> = {
  '882022': { name: 'VDChain',     explorer: 'https://vdscan.io',          symbol: 'VDC'   },
  '56':     { name: 'BSC Mainnet', explorer: 'https://bscscan.com',         symbol: 'BNB'   },
  '97':     { name: 'BSC Testnet', explorer: 'https://testnet.bscscan.com', symbol: 'tBNB'  },
  '1':      { name: 'Ethereum',    explorer: 'https://etherscan.io',        symbol: 'ETH'   },
  '137':    { name: 'Polygon',     explorer: 'https://polygonscan.com',     symbol: 'MATIC' },
  '43114':  { name: 'Avalanche',   explorer: 'https://snowtrace.io',        symbol: 'AVAX'  },
};

const getChainInfo = (id: string) =>
  CHAIN_INFO[id] || { name: `Chain ${id}`, explorer: '', symbol: '?' };

function copyText(t: string) {
  try { navigator.clipboard.writeText(t); } catch {
    const el = document.createElement('textarea');
    el.value = t; document.body.appendChild(el);
    el.select(); document.execCommand('copy');
    document.body.removeChild(el);
  }
}

// ── Verify Modal ────────────────────────────────────────────────
function VerifyModal({ dc, solcVersion, evmVersion, optimize, sourceCode, onClose }: {
  dc: any; solcVersion: string; evmVersion: string; optimize: boolean; sourceCode: string; onClose: () => void;
}) {
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [step, setStep] = useState(0);

  const isVDChain = dc.chainId === '882022';

  const STEPS = [
    'Validating contract on VDChain...',
    'Compiling source code...',
    'Matching bytecode...',
    'Publishing to VDScan...',
  ];

  const handleVerify = async () => {
    setStatus('loading');
    setStep(1);
    try {
      await new Promise(r => setTimeout(r, 800)); setStep(2);
      await new Promise(r => setTimeout(r, 1000)); setStep(3);
      await new Promise(r => setTimeout(r, 800)); setStep(4);

      const res = await fetch(VDSCAN_VERIFY_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: dc.address,
          contract_name: dc.contractName,
          token_name: tokenName || dc.contractName,
          token_symbol: tokenSymbol || '',
          source_code: sourceCode,
          compiler_version: solcVersion,
          evm_version: evmVersion,
          optimization: optimize,
          optimization_runs: 200,
          license: 'MIT',
          abi: '',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setStep(0);
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Verification failed');
        setStep(0);
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Network error');
      setStep(0);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        background: '#08080f', border: '1px solid #1a1a2e', borderRadius: '12px',
        width: '100%', maxWidth: '480px', overflow: 'hidden',
        boxShadow: '0 0 60px rgba(62,207,142,0.08)'
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#0a1a10', border: '1px solid #1a3a20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#3ecf8e" strokeWidth="1.5" strokeLinecap="round">
                <path d="M8 1l2 4h4l-3 3 1 4-4-2-4 2 1-4L2 5h4z"/>
              </svg>
            </div>
            <div>
              <div style={{ color: '#ddd', fontSize: '13px', fontWeight: 700 }}>Verify on VDScan</div>
              <div style={{ color: '#333', fontSize: '10px' }}>Source code verification</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '4px' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 2l10 10M12 2L2 12"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          {/* Not VDChain warning */}
          {!isVDChain && (
            <div style={{ marginBottom: '16px', padding: '10px 12px', background: '#1a0a00', border: '1px solid #3a1a00', borderRadius: '8px', color: '#f0a500', fontSize: '11px' }}>
              ⚠️ Verify on VDScan only works for VDChain (882022). Current chain: {dc.chainName} ({dc.chainId})
            </div>
          )}

          {/* Auto-filled info */}
          <div style={{ marginBottom: '16px', padding: '12px', background: '#040408', border: '1px solid #1a1a2e', borderRadius: '8px' }}>
            <div style={{ color: '#3ecf8e', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
              Auto-filled Details
            </div>
            {[
              { label: 'Contract', value: dc.contractName },
              { label: 'Address', value: `${dc.address.slice(0,10)}...${dc.address.slice(-6)}` },
              { label: 'Compiler', value: `v${solcVersion}` },
              { label: 'EVM', value: evmVersion },
              { label: 'Optimization', value: optimize ? 'Enabled' : 'Disabled' },
              { label: 'Source Code', value: sourceCode ? `${sourceCode.length} chars ✓` : '❌ Not found' },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ color: '#444', fontSize: '11px' }}>{label}</span>
                <span style={{ color: '#aaa', fontSize: '11px', fontFamily: 'monospace' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Optional fields */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{ color: '#444', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
              Token / Contract Name <span style={{ color: '#2a2a3a' }}>(optional)</span>
            </div>
            <input
              placeholder={dc.contractName}
              value={tokenName}
              onChange={e => setTokenName(e.target.value)}
              style={{ width: '100%', background: '#06060e', border: '1px solid #1a1a2e', borderRadius: '6px', padding: '8px 10px', color: '#ccc', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#444', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
              Token Symbol <span style={{ color: '#2a2a3a' }}>(optional — only for ERC20)</span>
            </div>
            <input
              placeholder="e.g. MTK"
              value={tokenSymbol}
              onChange={e => setTokenSymbol(e.target.value)}
              style={{ width: '100%', background: '#06060e', border: '1px solid #1a1a2e', borderRadius: '6px', padding: '8px 10px', color: '#ccc', fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Steps loading */}
          {status === 'loading' && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#040408', border: '1px solid #1a1a2e', borderRadius: '8px' }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: i < STEPS.length - 1 ? '8px' : 0 }}>
                  {step > i + 1 ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#3ecf8e" strokeWidth="2" strokeLinecap="round"><path d="M2 6l3 3 5-5"/></svg>
                  ) : step === i + 1 ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#6c63ff" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M6 2a4 4 0 1 0 4 4"/></svg>
                  ) : (
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px solid #2a2a3a' }} />
                  )}
                  <span style={{ fontSize: '11px', color: step === i + 1 ? '#6c63ff' : step > i + 1 ? '#3ecf8e' : '#2a2a3a' }}>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#0a1a10', border: '1px solid #1a3a20', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#3ecf8e" strokeWidth="2" strokeLinecap="round"><path d="M2 8l4 4 8-8"/></svg>
                <span style={{ color: '#3ecf8e', fontWeight: 700, fontSize: '13px' }}>Contract Verified!</span>
              </div>
              <div style={{ color: '#2a6a40', fontSize: '11px', marginBottom: '8px' }}>
                Bytecode matched exactly — highest level of verification.
              </div>
              <a href={`https://vdscan.io/address/${dc.address}`} target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#3ecf8e', fontSize: '11px', textDecoration: 'none', background: '#0d2a1a', padding: '4px 10px', borderRadius: '4px', border: '1px solid #1a3a20' }}>
                View on VDScan
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 8L8 1M5 1h3v3"/></svg>
              </a>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div style={{ marginBottom: '16px', padding: '12px', background: '#1a0808', border: '1px solid #3a1010', borderRadius: '8px' }}>
              <div style={{ color: '#ff6b6b', fontWeight: 700, fontSize: '12px', marginBottom: '4px' }}>Verification Failed</div>
              <div style={{ color: '#aa4444', fontSize: '11px' }}>{errorMsg}</div>
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {status !== 'success' && (
              <button
                onClick={handleVerify}
                disabled={status === 'loading' || !isVDChain || !sourceCode}
                style={{
                  flex: 1, padding: '10px', borderRadius: '6px', border: 'none',
                  background: (status === 'loading' || !isVDChain || !sourceCode) ? '#1a1a2e'
                    : 'linear-gradient(135deg, #3ecf8e, #6c63ff)',
                  color: (status === 'loading' || !isVDChain || !sourceCode) ? '#333' : '#fff',
                  fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}>
                {status === 'loading' ? 'Verifying...' : '✓ Verify & Publish'}
              </button>
            )}
            <button onClick={onClose} style={{
              padding: '10px 16px', borderRadius: '6px', border: '1px solid #1a1a2e',
              background: '#06060e', color: '#444', fontSize: '12px', cursor: 'pointer'
            }}>
              {status === 'success' ? 'Close' : 'Cancel'}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

// ── Main Deploy Panel ───────────────────────────────────────────
export default function DeployPanel() {
  const { compileResult, wallet, addLog, addTxReceipt, solcVersion, evmVersion, optimize, currentFile } = useStore();

  const [selectedContract, setSelectedContract] = useState('');
  const [constructorArgs, setConstructorArgs] = useState<Record<string, string>>({});
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedContracts, setDeployedContracts] = useState<any[]>([]);
  const [callResults, setCallResults] = useState<Record<string, string>>({});
  const [callInputs, setCallInputs] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [walletChain, setWalletChain] = useState<{ id: string; name: string; symbol: string } | null>(null);
  const [collapsedContracts, setCollapsedContracts] = useState<Record<number, boolean>>({});
  const [verifyModal, setVerifyModal] = useState<any | null>(null);

  useEffect(() => {
    const detect = async () => {
      if (!window.ethereum) return;
      try {
        const p = new ethers.BrowserProvider(window.ethereum);
        const n = await p.getNetwork();
        const id = n.chainId.toString();
        const info = getChainInfo(id);
        setWalletChain({ id, name: info.name, symbol: info.symbol });
      } catch {}
    };
    detect();
    window.ethereum?.on?.('chainChanged', detect);
    return () => window.ethereum?.removeListener?.('chainChanged', detect);
  }, []);

  const contracts = compileResult?.contracts || {};
  const contractNames = Object.keys(contracts);
  const currentContract = contracts[selectedContract];

  const getConstructorInputs = () => {
    if (!currentContract) return [];
    const ctor = currentContract.abi.find((x: any) => x.type === 'constructor');
    return ctor?.inputs || [];
  };

  const copy = (text: string, key: string) => {
    copyText(text); setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const toggleContract = (i: number) =>
    setCollapsedContracts(prev => ({ ...prev, [i]: !prev[i] }));

  const handleDeploy = async () => {
    if (!currentContract || !window.ethereum) return;
    setIsDeploying(true);
    addLog(`Deploying ${selectedContract} on ${walletChain?.name || 'Unknown'}...`);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      const chainId = network.chainId.toString();
      const chainInfo = getChainInfo(chainId);

      const factory = new ethers.ContractFactory(
        currentContract.abi, `0x${currentContract.bytecode}`, signer
      );
      const args = getConstructorInputs().map((inp: any) => constructorArgs[inp.name] || '');
      const contract = await factory.deploy(...args);
      const deployTx = contract.deploymentTransaction();
      addLog(`Transaction sent: ${deployTx?.hash}`);

      await contract.waitForDeployment();
      const address = await contract.getAddress();
      const txHash = deployTx?.hash || '';
      const txReceipt = await provider.getTransactionReceipt(txHash);

      addLog(`Deployed: ${selectedContract} at ${address}`);
      addLog(`Explorer: ${chainInfo.explorer}/address/${address}`);

      // Source code save karo deploy ke waqt
      const sourceCode = currentFile?.content || '';

      addTxReceipt({
        status: 'success', type: 'deploy',
        contractName: selectedContract, contractAddress: address,
        txHash, blockNumber: txReceipt?.blockNumber,
        blockHash: txReceipt?.blockHash?.toString(),
        from: txReceipt?.from,
        gasUsed: txReceipt?.gasUsed?.toString(),
        chainName: chainInfo.name, chainId,
        explorer: chainInfo.explorer,
        timestamp: new Date().toLocaleTimeString(),
      });

      setDeployedContracts(prev => {
        const updated = [{
          contractName: selectedContract, address, txHash,
          chainId, chainName: chainInfo.name, abi: currentContract.abi,
          sourceCode, // source code save karo
        }, ...prev];
        setCollapsedContracts(c => {
          const shifted: Record<number, boolean> = { 0: false };
          Object.entries(c).forEach(([k, v]) => { shifted[Number(k) + 1] = v; });
          return shifted;
        });
        return updated;
      });

      try {
        await deploymentsAPI.save({
          userId: wallet, contractName: selectedContract,
          contractAddress: address, txHash, chainId,
          chainName: chainInfo.name, abi: currentContract.abi
        });
      } catch {}
    } catch (err: any) {
      addLog(`Deploy failed: ${err.message}`);
      addTxReceipt({
        status: 'failed', type: 'deploy',
        contractName: selectedContract,
        error: err.message,
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const callFunction = async (dc: any, func: any) => {
    const key = `${dc.address}-${func.name}`;
    const isRead = func.stateMutability === 'view' || func.stateMutability === 'pure';
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(dc.address, dc.abi, signer);
      const inputStr = callInputs[key] || '';
      const args = inputStr ? inputStr.split(',').map(s => s.trim()) : [];
      addLog(`Calling ${func.name}(${args.join(', ')})...`);
      const result = await contract[func.name](...args);
      const resultStr = result?.toString() || 'success';
      setCallResults(prev => ({ ...prev, [key]: resultStr }));
      addLog(`${func.name} → ${resultStr}`);

      if (!isRead && result?.hash) {
        try {
          const txReceipt = await provider.getTransactionReceipt(result.hash);
          addTxReceipt({
            status: 'success', type: 'call',
            contractName: dc.contractName,
            contractAddress: dc.address,
            functionName: func.name,
            txHash: result.hash,
            blockNumber: txReceipt?.blockNumber,
            from: txReceipt?.from,
            gasUsed: txReceipt?.gasUsed?.toString(),
            chainName: dc.chainName, chainId: dc.chainId,
            explorer: getChainInfo(dc.chainId).explorer,
            timestamp: new Date().toLocaleTimeString(),
          });
        } catch {}
      }
    } catch (err: any) {
      setCallResults(prev => ({ ...prev, [key]: `Error: ${err.message}` }));
      addLog(`${func.name} failed: ${err.message}`);
    }
  };

  const L: React.CSSProperties = {
    color: '#333', fontSize: '10px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '6px'
  };

  const CopyBtn = ({ text, id, label = 'Copy' }: { text: string; id: string; label?: string }) => (
    <button onClick={() => copy(text, id)} style={{
      background: copiedKey === id ? '#0a1a10' : '#0a0a14',
      color: copiedKey === id ? '#3ecf8e' : '#444',
      border: `1px solid ${copiedKey === id ? '#3ecf8e33' : '#1a1a2e'}`,
      borderRadius: '4px', padding: '3px 8px', fontSize: '10px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.15s'
    }}>
      {copiedKey === id
        ? <><svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1.5 4.5L3.5 6.5L7.5 2.5"/></svg> Copied</>
        : <><svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2.5" y="2.5" width="5" height="5" rx="0.8"/><path d="M1 6.5V1h5.5"/></svg> {label}</>
      }
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px', padding: '12px', overflowY: 'auto' }}>

      {/* Chain status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#06060e', border: '1px solid #1a1a2e', borderRadius: '6px', padding: '8px 10px' }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: walletChain ? '#3ecf8e' : '#222', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#333', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '1px' }}>Active Network</div>
          <div style={{ color: walletChain ? '#ccc' : '#333', fontSize: '12px', fontWeight: 600 }}>
            {walletChain ? walletChain.name : 'Connect wallet'}
          </div>
        </div>
        {walletChain && <span style={{ color: '#2a2a3a', fontSize: '10px', fontFamily: 'monospace' }}>#{walletChain.id}</span>}
      </div>

      {/* Contract select */}
      <div>
        <div style={L}>Contract</div>
        {contractNames.length === 0 ? (
          <div style={{ color: '#2a2a3a', fontSize: '12px', padding: '10px', background: '#06060e', borderRadius: '6px', border: '1px solid #1a1a2e', textAlign: 'center' }}>
            Compile a contract first
          </div>
        ) : (
          <select value={selectedContract} onChange={e => setSelectedContract(e.target.value)}
            style={{ width: '100%', background: '#06060e', color: '#ccc', border: '1px solid #1a1a2e', borderRadius: '6px', padding: '8px', fontSize: '12px', cursor: 'pointer' }}>
            <option value="">Select contract...</option>
            {contractNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
      </div>

      {/* Constructor args */}
      {getConstructorInputs().length > 0 && (
        <div>
          <div style={L}>Constructor Arguments</div>
          {getConstructorInputs().map((inp: any) => (
            <div key={inp.name} style={{ marginBottom: '6px' }}>
              <div style={{ color: '#333', fontSize: '10px', marginBottom: '3px' }}>
                {inp.name} <span style={{ color: '#6c63ff' }}>({inp.type})</span>
              </div>
              <input placeholder={inp.type} value={constructorArgs[inp.name] || ''}
                onChange={e => setConstructorArgs(prev => ({ ...prev, [inp.name]: e.target.value }))}
                style={{ width: '100%', background: '#06060e', border: '1px solid #1a1a2e', borderRadius: '4px', padding: '6px 8px', color: '#ccc', fontSize: '12px', boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>
      )}

      {/* Deploy button */}
      <button onClick={handleDeploy}
        disabled={isDeploying || !selectedContract || !window.ethereum || !walletChain}
        style={{
          width: '100%', padding: '10px', borderRadius: '6px', border: 'none',
          background: isDeploying ? '#1a1a2e'
            : (!selectedContract || !walletChain) ? '#0d0d1a'
            : 'linear-gradient(135deg, #3ecf8e, #6c63ff)',
          color: (!selectedContract || !walletChain) ? '#2a2a3a' : '#fff',
          fontWeight: 700, fontSize: '13px',
          cursor: (isDeploying || !selectedContract || !walletChain) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s'
        }}>
        {isDeploying ? (
          <>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"
              style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M6.5 2a4.5 4.5 0 1 0 4.5 4.5"/>
            </svg>
            Deploying...
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 1v7M3 5l3-4 3 4M2 10h8"/>
            </svg>
            Deploy {selectedContract || 'Contract'}
          </>
        )}
      </button>

      {/* Deployed contracts */}
      {deployedContracts.length > 0 && (
        <>
          <div style={L}>Deployed Contracts ({deployedContracts.length})</div>
          {deployedContracts.map((dc, i) => {
            const isCollapsed = collapsedContracts[i] === true;
            return (
              <div key={i} style={{ background: '#06060e', border: '1px solid #1a1a2e', borderRadius: '6px', overflow: 'hidden', marginBottom: '4px' }}>

                {/* Header */}
                <div onClick={() => toggleContract(i)}
                  style={{ padding: '8px 10px', borderBottom: isCollapsed ? 'none' : '1px solid #1a1a2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0a0a14'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3ecf8e', flexShrink: 0 }} />
                    <span style={{ color: '#ccc', fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dc.contractName}
                    </span>
                    <span style={{ color: '#2a2a3a', fontSize: '10px', flexShrink: 0 }}>{dc.chainName}</span>
                  </div>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round"
                    style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: '0.2s', flexShrink: 0 }}>
                    <path d="M2 4l3.5 3.5L9 4"/>
                  </svg>
                </div>

                {!isCollapsed && (
                  <div style={{ padding: '8px 10px', maxHeight: '420px', overflowY: 'auto' }}>

                    {/* Address */}
                    <div style={{ color: '#2a2a3a', fontSize: '10px', fontFamily: 'monospace', marginBottom: '6px', wordBreak: 'break-all', lineHeight: '1.5' }}>
                      {dc.address}
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <CopyBtn text={dc.address} id={`dc-${i}`} label="Copy Address" />
                      <a href={`${getChainInfo(dc.chainId).explorer}/address/${dc.address}`}
                        target="_blank" rel="noreferrer"
                        style={{ background: '#0a0a14', color: '#444', border: '1px solid #1a1a2e', borderRadius: '4px', padding: '3px 8px', fontSize: '10px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Explorer
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 7L7 1M4 1h3v3"/></svg>
                      </a>

                      {/* ✅ Verify on VDScan button — sirf VDChain pe */}
                      {dc.chainId === '882022' && (
                        <button
                          onClick={() => setVerifyModal(dc)}
                          style={{
                            background: '#0a1a10', color: '#3ecf8e',
                            border: '1px solid #1a3a20',
                            borderRadius: '4px', padding: '3px 8px', fontSize: '10px',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            fontWeight: 600
                          }}>
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                            <path d="M4.5 1l1 2h2l-1.5 1.5.5 2-2-1-2 1 .5-2L1.5 3h2z"/>
                          </svg>
                          Verify on VDScan
                        </button>
                      )}
                    </div>

                    <div style={{ borderTop: '1px solid #0d0d1a', marginBottom: '8px' }} />

                    {/* Functions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {dc.abi.filter((f: any) => f.type === 'function').map((func: any) => {
                        const key = `${dc.address}-${func.name}`;
                        const isRead = func.stateMutability === 'view' || func.stateMutability === 'pure';
                        return (
                          <div key={func.name} style={{
                            padding: '6px 8px', background: '#040408',
                            borderRadius: '4px',
                            border: `1px solid ${isRead ? '#0d2010' : '#1a0d1a'}`
                          }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{
                                color: isRead ? '#3ecf8e' : '#9966ff',
                                fontSize: '9px', fontWeight: 700,
                                background: isRead ? '#0a1a10' : '#100a1a',
                                border: `1px solid ${isRead ? '#1a3a20' : '#2a1a3a'}`,
                                borderRadius: '3px', padding: '1px 5px', flexShrink: 0
                              }}>
                                {isRead ? 'read' : 'write'}
                              </span>
                              <span style={{ color: '#ddd', fontSize: '11px', fontFamily: 'monospace', fontWeight: 500 }}>
                                {func.name}
                              </span>
                              {func.outputs?.length > 0 && (
                                <span style={{ color: '#2a2a3a', fontSize: '10px', marginLeft: 'auto', flexShrink: 0 }}>
                                  → {func.outputs.map((o: any) => o.type).join(', ')}
                                </span>
                              )}
                            </div>

                            {func.inputs?.length > 0 && (
                              <input
                                placeholder={func.inputs.map((inp: any) => `${inp.name || inp.type} (${inp.type})`).join(', ')}
                                value={callInputs[key] || ''}
                                onChange={e => setCallInputs(prev => ({ ...prev, [key]: e.target.value }))}
                                style={{
                                  width: '100%', background: '#080810', border: '1px solid #1a1a2e',
                                  borderRadius: '4px', padding: '5px 7px', color: '#aaa',
                                  fontSize: '11px', marginTop: '5px', boxSizing: 'border-box'
                                }}
                              />
                            )}

                            <button onClick={() => callFunction(dc, func)} style={{
                              marginTop: '5px',
                              background: isRead ? '#0a1a10' : '#0d0a1a',
                              color: isRead ? '#3ecf8e' : '#9966ff',
                              border: `1px solid ${isRead ? '#1a3a20' : '#2a1a3a'}`,
                              borderRadius: '4px', padding: '4px 12px', fontSize: '10px',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px'
                            }}>
                              {isRead
                                ? <><svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><path d="M1 1l6 3-6 3V1z"/></svg> call</>
                                : <><svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 4h6M4 1l3 3-3 3"/></svg> transact</>
                              }
                            </button>

                            {callResults[key] && (
                              <div style={{
                                marginTop: '5px', padding: '5px 7px',
                                background: '#080810', borderRadius: '4px',
                                border: '1px solid #1a1a2e',
                                color: callResults[key].startsWith('Error') ? '#ff6b6b' : '#f0a500',
                                fontSize: '11px', fontFamily: 'monospace', wordBreak: 'break-all'
                              }}>
                                {callResults[key].startsWith('Error') ? '✕ ' : '→ '}{callResults[key]}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>

      {/* Verify Modal */}
      {verifyModal && (
        <VerifyModal
          dc={verifyModal}
          solcVersion={solcVersion}
          evmVersion={evmVersion}
          optimize={optimize}
          sourceCode={verifyModal.sourceCode || ''}
          onClose={() => setVerifyModal(null)}
        />
      )}
    </div>
  );
}