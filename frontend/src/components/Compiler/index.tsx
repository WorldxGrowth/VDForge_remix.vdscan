import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store';
import { useCompiler } from '../../hooks/useCompiler';

const SOLC_VERSIONS = [
  '0.8.35','0.8.34','0.8.33','0.8.32','0.8.31','0.8.30',
  '0.8.28','0.8.26','0.8.25','0.8.24','0.8.23','0.8.21',
  '0.8.20','0.8.19','0.8.17','0.8.10','0.8.0',
  '0.7.6','0.6.12','0.6.6','0.5.17','0.4.26'
];

const EVM_VERSIONS = ['shanghai','paris','london','berlin','istanbul','petersburg','byzantium'];

export default function CompilerPanel() {
  const { compileResult, isCompiling, currentFile, solcVersion, evmVersion,
          setSolcVersion, setEvmVersion, optimize, setOptimize } = useStore();
  const { compile } = useCompiler();

  const [autoCompile, setAutoCompile] = useState(() => localStorage.getItem('vdforge_autocompile') === 'true');
  const [hideWarnings, setHideWarnings] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [runs, setRuns] = useState(200);
  const [selectedContract, setSelectedContract] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const autoCompileTimer = useRef<any>(null);
  const lastContent = useRef<string>('');

  // Auto compile on content change
  useEffect(() => {
    if (!autoCompile || !currentFile) return;
    if (currentFile.content === lastContent.current) return;
    lastContent.current = currentFile.content;

    if (autoCompileTimer.current) clearTimeout(autoCompileTimer.current);
    autoCompileTimer.current = setTimeout(() => {
      if (currentFile && !isCompiling) {
        compile(currentFile.content, currentFile.name);
      }
    }, 1500);

    return () => { if (autoCompileTimer.current) clearTimeout(autoCompileTimer.current); };
  }, [currentFile?.content, autoCompile]);

  // Save autocompile preference
  const handleAutoCompile = (val: boolean) => {
    setAutoCompile(val);
    localStorage.setItem('vdforge_autocompile', String(val));
  };

  const handleCompile = async () => {
    if (!currentFile || isCompiling) return;
    await compile(currentFile.content, currentFile.name);
  };

  const copyToClipboard = (text: string, key: string) => {
    try { navigator.clipboard.writeText(text); } catch { const el = document.createElement("textarea"); el.value = text; document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el); }
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const contracts = compileResult?.contracts || {};
  const contractNames = Object.keys(contracts);

  const labelStyle: React.CSSProperties = {
    color: '#555', fontSize: '10px', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '5px'
  };

  const CopyBtn = ({ text, id, color = '#6c63ff' }: { text: string; id: string; color?: string }) => (
    <button
      onClick={() => copyToClipboard(text, id)}
      style={{
        background: copied === id ? '#0d2b1a' : '#0d0d1a',
        color: copied === id ? '#3ecf8e' : color,
        border: `1px solid ${copied === id ? '#3ecf8e44' : color + '33'}`,
        borderRadius: '4px', padding: '3px 10px', fontSize: '10px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
        transition: 'all 0.2s'
      }}>
      {copied === id ? (
        <><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M2 5l2.5 2.5L8 3"/></svg> Copied</>
      ) : (
        <><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="6" height="6" rx="1"/><path d="M1 7V1h6"/></svg> Copy</>
      )}
    </button>
  );

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', height: '100%' }}>

      {/* Compiler Version */}
      <div>
        <div style={labelStyle}>Compiler</div>
        <select value={solcVersion} onChange={e => setSolcVersion(e.target.value)}
          style={{ width: '100%', background: '#0a0a16', color: '#ccc', border: '1px solid #2d2d4e', borderRadius: '6px', padding: '7px 10px', fontSize: '12px', cursor: 'pointer' }}>
          {SOLC_VERSIONS.map(v => <option key={v} value={v}>{v}+commit</option>)}
        </select>
      </div>

      {/* Checkboxes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          { label: 'Auto compile', checked: autoCompile, onChange: handleAutoCompile },
          { label: 'Hide warnings', checked: hideWarnings, onChange: setHideWarnings },
        ].map(({ label, checked, onChange }) => (
          <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}>
            <div onClick={() => onChange(!checked)} style={{
              width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
              background: checked ? '#6c63ff' : 'transparent',
              border: `1.5px solid ${checked ? '#6c63ff' : '#3d3d5e'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}>
              {checked && <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M1.5 4.5L3.5 6.5L7.5 2.5"/></svg>}
            </div>
            {label}
          </label>
        ))}
      </div>

      {/* Advanced Config Toggle */}
      <div onClick={() => setShowAdvanced(!showAdvanced)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: '#666', fontSize: '12px', cursor: 'pointer',
          padding: '7px 0', borderTop: '1px solid #1a1a2e', borderBottom: '1px solid #1a1a2e',
          userSelect: 'none'
        }}>
        <span>Advanced Configurations</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round"
          style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: '0.2s' }}>
          <path d="M5 3l4 4-4 4"/>
        </svg>
      </div>

      {/* Advanced Panel */}
      {showAdvanced && (
        <div style={{ background: '#080812', border: '1px solid #1a1a2e', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <div style={labelStyle}>EVM Version</div>
            <select value={evmVersion} onChange={e => setEvmVersion(e.target.value)}
              style={{ width: '100%', background: '#0a0a16', color: '#ccc', border: '1px solid #2d2d4e', borderRadius: '4px', padding: '6px', fontSize: '12px' }}>
              {EVM_VERSIONS.map(v => (
                <option key={v} value={v}>{v}{v === 'shanghai' ? ' (VDChain default)' : ''}</option>
              ))}
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888', fontSize: '12px', cursor: 'pointer', userSelect: 'none' }}>
            <div onClick={() => setOptimize(!optimize)} style={{
              width: '14px', height: '14px', borderRadius: '3px', flexShrink: 0,
              background: optimize ? '#6c63ff' : 'transparent',
              border: `1.5px solid ${optimize ? '#6c63ff' : '#3d3d5e'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}>
              {optimize && <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round"><path d="M1.5 4.5L3.5 6.5L7.5 2.5"/></svg>}
            </div>
            Enable optimization
          </label>

          {optimize && (
            <div>
              <div style={labelStyle}>Runs</div>
              <input type="number" value={runs} onChange={e => setRuns(Number(e.target.value))}
                style={{ width: '100%', background: '#0a0a16', color: '#ccc', border: '1px solid #2d2d4e', borderRadius: '4px', padding: '6px', fontSize: '12px' }} />
            </div>
          )}

          <div style={{ background: '#0a1a10', border: '1px solid #1a3a20', borderRadius: '4px', padding: '7px 10px' }}>
            <div style={{ color: '#3ecf8e', fontSize: '10px', fontWeight: 600, marginBottom: '2px' }}>VDChain Notice</div>
            <div style={{ color: '#555', fontSize: '10px' }}>Always use EVM: Shanghai for VDChain deployment</div>
          </div>
        </div>
      )}

      {/* Compile Button */}
      <button onClick={handleCompile} disabled={!currentFile}
        style={{
          width: '100%', padding: '10px', borderRadius: '6px', border: 'none',
          background: isCompiling
            ? 'linear-gradient(135deg, #3a3a6e, #1a4a3a)'
            : 'linear-gradient(135deg, #6c63ff, #3ecf8e)',
          color: '#fff', fontWeight: 700, fontSize: '13px',
          cursor: currentFile ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          opacity: !currentFile ? 0.5 : 1, transition: 'all 0.2s'
        }}>
        {isCompiling ? (
          <>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"
              style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M7 2a5 5 0 1 0 5 5"/>
            </svg>
            Compiling...
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 4-8 4V2z" fill="white"/>
            </svg>
            Compile {currentFile?.name || ''}
          </>
        )}
      </button>

      <div style={{ color: '#333', fontSize: '10px', textAlign: 'center' }}>
        Ctrl+S to compile
      </div>

      {/* Status */}
      {compileResult && (
        <div style={{
          padding: '8px 12px', borderRadius: '6px',
          background: compileResult.success ? '#0a1a10' : '#1a0a0a',
          border: `1px solid ${compileResult.success ? '#1a4a2a' : '#4a1a1a'}`,
          color: compileResult.success ? '#3ecf8e' : '#ff6b6b',
          fontSize: '12px', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {compileResult.success ? (
            <><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 6l3 3 5-5"/></svg> Compilation successful</>
          ) : (
            <><svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8"/></svg> Failed — {compileResult.errors.length} error(s)</>
          )}
        </div>
      )}

      {/* Errors */}
      {compileResult && !compileResult.success && compileResult.errors.map((err: any, i: number) => (
        <div key={i} style={{
          background: '#0f0608', border: '1px solid #3a1a1a', borderLeft: '3px solid #ff6b6b',
          borderRadius: '4px', padding: '8px 10px', fontSize: '11px', color: '#ff9999',
          fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: '1.6'
        }}>
          {typeof err === 'string' ? err : err.formattedMessage}
        </div>
      ))}

      {/* Warnings */}
      {!hideWarnings && compileResult?.warnings?.map((w: any, i: number) => (
        <div key={i} style={{
          background: '#0f0e06', border: '1px solid #3a2a00', borderLeft: '3px solid #f0a500',
          borderRadius: '4px', padding: '8px 10px', fontSize: '11px', color: '#c8a060',
          fontFamily: 'monospace', lineHeight: '1.6'
        }}>
          {typeof w === 'string' ? w : w.formattedMessage}
        </div>
      ))}

      {/* Contracts */}
      {contractNames.length > 0 && (
        <>
          <div style={labelStyle}>Contract</div>

          {contractNames.map(name => (
            <div key={name} style={{ border: '1px solid #1a1a2e', borderRadius: '6px', overflow: 'hidden' }}>
              <div onClick={() => setSelectedContract(selectedContract === name ? '' : name)}
                style={{
                  padding: '9px 12px', background: selectedContract === name ? '#12122a' : '#0d0d1a',
                  cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderBottom: selectedContract === name ? '1px solid #1a1a2e' : 'none'
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#6c63ff" strokeWidth="1.5"><rect x="2" y="1" width="8" height="10" rx="1"/><path d="M4 4h4M4 6h4M4 8h2"/></svg>
                  <span style={{ color: '#ddd', fontSize: '12px', fontWeight: 600 }}>{name}</span>
                </div>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round"
                  style={{ transform: selectedContract === name ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>
                  <path d="M2 4l4 4 4-4"/>
                </svg>
              </div>

              {selectedContract === name && (
                <div style={{ padding: '10px', background: '#08080f', display: 'flex', flexDirection: 'column', gap: '10px' }}>

                  {/* ABI — Copy only, no textarea */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#6c63ff" strokeWidth="1.2"><rect x="1" y="1" width="8" height="8" rx="1"/><path d="M3 3h4M3 5h4M3 7h2"/></svg>
                      <span style={{ color: '#555', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>ABI</span>
                    </div>
                    <CopyBtn text={JSON.stringify(contracts[name].abi, null, 2)} id={`abi-${name}`} color="#6c63ff" />
                  </div>

                  {/* Bytecode — Copy only */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#f0a500" strokeWidth="1.2"><path d="M1 3l3-2 3 2M4 1v8M7 3l2 2-2 2"/></svg>
                      <span style={{ color: '#555', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Bytecode</span>
                    </div>
                    <CopyBtn text={`0x${contracts[name].bytecode}`} id={`bytecode-${name}`} color="#f0a500" />
                  </div>

                </div>
              )}
            </div>
          ))}
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
