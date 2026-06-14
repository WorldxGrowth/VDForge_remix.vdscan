import { useRef, useEffect, useState } from 'react';
import { useStore } from '../../store';

interface ConsoleProps {
  height: number;
}

function copyText(text: string) {
  try { navigator.clipboard.writeText(text); } catch {
    const el = document.createElement('textarea');
    el.value = text; document.body.appendChild(el); el.select();
    document.execCommand('copy'); document.body.removeChild(el);
  }
}

export default function Console({ height }: ConsoleProps) {
  const { logs, clearLogs, txReceipts, clearTxReceipts } = useStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'logs' | 'transactions'>('logs');
  const [expandedTx, setExpandedTx] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, txReceipts]);

  // Auto switch to transactions tab when new receipt arrives
  useEffect(() => {
    if (txReceipts.length > 0) setActiveTab('transactions');
  }, [txReceipts.length]);

  const getLogColor = (log: string) => {
    if (log.includes('failed') || log.includes('Failed') || log.includes('error') || log.includes('Error')) return '#ff6b6b';
    if (log.includes('Compiled') || log.includes('Deployed') || log.includes('ready') || log.includes('Done')) return '#3ecf8e';
    if (log.includes('warning') || log.includes('Warning')) return '#f0a500';
    if (log.includes('Deploying') || log.includes('Compiling')) return '#6c63ff';
    if (log.includes('Transaction sent') || log.includes('Calling')) return '#60b8ff';
    if (log.includes('saved') || log.includes('Saved')) return '#555';
    return '#666';
  };

  const getLogPrefix = (log: string) => {
    if (log.includes('failed') || log.includes('Failed') || log.includes('error') || log.includes('Error')) return '✕';
    if (log.includes('Compiled') || log.includes('Deployed') || log.includes('ready') || log.includes('Done')) return '✓';
    if (log.includes('Deploying') || log.includes('Compiling')) return '›';
    if (log.includes('Transaction sent')) return '↑';
    if (log.includes('Calling') || log.includes('→')) return '~';
    return '›';
  };

  const copy = (text: string, key: string) => {
    copyText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const CopyBtn = ({ text, id, label = 'Copy' }: { text: string; id: string; label?: string }) => (
    <button onClick={() => copy(text, id)} style={{
      background: copiedKey === id ? '#0a1a10' : '#080810',
      color: copiedKey === id ? '#3ecf8e' : '#444',
      border: `1px solid ${copiedKey === id ? '#3ecf8e33' : '#1a1a2e'}`,
      borderRadius: '3px', padding: '2px 7px', fontSize: '10px', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: '3px'
    }}>
      {copiedKey === id ? '✓ Copied' : label}
    </button>
  );

  const tabBtn = (tab: 'logs' | 'transactions', label: string, count: number) => (
    <button onClick={() => setActiveTab(tab)} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      padding: '0 10px', height: '100%',
      color: activeTab === tab ? '#ccc' : '#333',
      fontSize: '11px', fontWeight: activeTab === tab ? 600 : 400,
      borderBottom: activeTab === tab ? '2px solid #6c63ff' : '2px solid transparent',
      display: 'flex', alignItems: 'center', gap: '5px'
    }}>
      {label}
      {count > 0 && (
        <span style={{
          background: activeTab === tab ? '#1a1a3e' : '#0d0d1a',
          color: activeTab === tab ? '#6c63ff' : '#333',
          borderRadius: '8px', padding: '0 5px', fontSize: '10px',
          border: '1px solid #1a1a2e'
        }}>{count}</span>
      )}
    </button>
  );

  return (
    <div style={{ height: `${height}px`, background: '#040408', borderTop: '1px solid #1a1a2e', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header with tabs */}
      <div style={{
        height: '32px', background: '#06060e', borderBottom: '1px solid #1a1a2e',
        display: 'flex', alignItems: 'stretch', justifyContent: 'space-between',
        padding: '0', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {tabBtn('logs', 'Terminal', logs.length)}
          {tabBtn('transactions', 'Transactions', txReceipts.length)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', gap: '6px' }}>
          {activeTab === 'logs' && logs.length > 0 && (
            <button onClick={clearLogs} style={{
              background: 'none', border: '1px solid #1a1a2e', color: '#333',
              borderRadius: '3px', padding: '2px 8px', fontSize: '10px', cursor: 'pointer'
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff6b6b'; (e.currentTarget as HTMLElement).style.borderColor = '#ff6b6b33'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#333'; (e.currentTarget as HTMLElement).style.borderColor = '#1a1a2e'; }}>
              Clear
            </button>
          )}
          {activeTab === 'transactions' && txReceipts.length > 0 && (
            <button onClick={clearTxReceipts} style={{
              background: 'none', border: '1px solid #1a1a2e', color: '#333',
              borderRadius: '3px', padding: '2px 8px', fontSize: '10px', cursor: 'pointer'
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff6b6b'; (e.currentTarget as HTMLElement).style.borderColor = '#ff6b6b33'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#333'; (e.currentTarget as HTMLElement).style.borderColor = '#1a1a2e'; }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>

        {/* LOGS TAB */}
        {activeTab === 'logs' && (
          <div style={{ padding: '4px 0' }}>
            {logs.length === 0 ? (
              <div style={{ color: '#1a1a2e', fontSize: '11px', padding: '10px 14px' }}>
                // Terminal output will appear here...
              </div>
            ) : logs.map((log, i) => (
              <div key={i}
                style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '2px 12px', borderLeft: '2px solid transparent' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderLeft = `2px solid ${getLogColor(log)}33`}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderLeft = '2px solid transparent'}
              >
                <span style={{ color: getLogColor(log), fontSize: '10px', fontWeight: 700, width: '10px', flexShrink: 0, marginTop: '2px' }}>
                  {getLogPrefix(log)}
                </span>
                <span style={{ fontSize: '11px', lineHeight: '1.7', color: getLogColor(log), wordBreak: 'break-all', flex: 1 }}>
                  {log}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
          <div style={{ padding: '6px' }}>
            {txReceipts.length === 0 ? (
              <div style={{ color: '#1a1a2e', fontSize: '11px', padding: '10px 8px' }}>
                // No transactions yet. Deploy a contract to see receipts here.
              </div>
            ) : txReceipts.map((tx) => (
              <div key={tx.id} style={{
                borderLeft: `3px solid ${tx.status === 'success' ? '#3ecf8e' : '#ff6b6b'}`,
                border: `1px solid ${tx.status === 'success' ? '#0d2a1a' : '#2a0d0d'}`,
                borderRadius: '0 6px 6px 0',
                marginBottom: '6px', overflow: 'hidden'
              }}>
                {/* Receipt header */}
                <div onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                  style={{ padding: '7px 10px', background: '#06060e', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: tx.status === 'success' ? '#3ecf8e' : '#ff6b6b', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: '#ccc', fontSize: '11px', fontWeight: 600 }}>
                        [{tx.type}] {tx.type === 'deploy' ? tx.contractName : tx.functionName}
                      </div>
                      <div style={{ color: '#333', fontSize: '10px' }}>{tx.timestamp} · {tx.chainName}</div>
                    </div>
                  </div>
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="#333" strokeWidth="1.5" strokeLinecap="round"
                    style={{ transform: expandedTx === tx.id ? 'rotate(180deg)' : 'none', transition: '0.2s', flexShrink: 0 }}>
                    <path d="M2 3.5l3.5 3.5 3.5-3.5"/>
                  </svg>
                </div>

                {/* Receipt details — expanded */}
                {expandedTx === tx.id && (
                  <div style={{ background: '#030306', padding: '10px 12px', fontSize: '11px' }}>
                    {tx.status === 'failed' ? (
                      <div style={{ color: '#ff6b6b', background: '#1a0808', borderRadius: '4px', padding: '7px 10px', border: '1px solid #3a1010' }}>
                        ✕ {tx.error}
                      </div>
                    ) : (
                      <>
                        <div style={{ color: '#3ecf8e', marginBottom: '8px', fontSize: '11px', fontWeight: 600 }}>
                          ✓ {tx.type === 'deploy' ? 'Transaction mined and execution completed' : 'Call completed successfully'}
                        </div>

                        {/* Details table */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontFamily: 'monospace' }}>
                          {[
                            { k: 'status',           v: '1 Transaction mined',  c: '#3ecf8e' },
                            { k: 'tx hash',          v: tx.txHash,              link: tx.txHash && tx.explorer ? `${tx.explorer}/tx/${tx.txHash}` : null },
                            { k: 'block number',     v: tx.blockNumber?.toString() },
                            { k: 'contract address', v: tx.contractAddress,     link: tx.contractAddress && tx.explorer ? `${tx.explorer}/address/${tx.contractAddress}` : null },
                            { k: 'from',             v: tx.from },
                            { k: 'gas used',         v: tx.gasUsed ? `${Number(tx.gasUsed).toLocaleString()} gas` : null },
                            { k: 'network',          v: `${tx.chainName} (#${tx.chainId})` },
                          ].filter(r => r.v).map(row => (
                            <div key={row.k} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '2px 0', borderBottom: '1px solid #0a0a12' }}>
                              <span style={{ color: '#2a2a3a', fontSize: '10px', minWidth: '110px', flexShrink: 0 }}>{row.k}</span>
                              {(row as any).link ? (
                                <a href={(row as any).link} target="_blank" rel="noreferrer"
                                  style={{ color: '#6c63ff', textDecoration: 'none', wordBreak: 'break-all', fontSize: '10px', flex: 1 }}>
                                  {String(row.v)}
                                </a>
                              ) : (
                                <span style={{ color: (row as any).c || '#888', wordBreak: 'break-all', fontSize: '10px', flex: 1 }}>
                                  {String(row.v)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '5px', marginTop: '8px', flexWrap: 'wrap' }}>
                          {tx.txHash && <CopyBtn text={tx.txHash} id={`th-${tx.id}`} label="Copy Tx Hash" />}
                          {tx.contractAddress && <CopyBtn text={tx.contractAddress} id={`ca-${tx.id}`} label="Copy Address" />}
                          {tx.txHash && tx.explorer && (
                            <a href={`${tx.explorer}/tx/${tx.txHash}`} target="_blank" rel="noreferrer"
                              style={{ background: '#080810', color: '#444', border: '1px solid #1a1a2e', borderRadius: '3px', padding: '2px 7px', fontSize: '10px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              View on Explorer
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 7L7 1M4 1h3v3"/></svg>
                            </a>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
