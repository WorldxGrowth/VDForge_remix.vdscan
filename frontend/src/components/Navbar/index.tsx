import { useWallet } from '../../hooks/useWallet';

interface NavbarProps {
  appMode: 'remix' | 'nocode';
  onModeChange: (mode: 'remix' | 'nocode') => void;
  isMobile: boolean;
}

export default function Navbar({ appMode, onModeChange, isMobile }: NavbarProps) {
  const { wallet, isLoggedIn, connect, disconnect } = useWallet();

  return (
    <nav style={{
      height: '44px', background: '#080812',
      borderBottom: '1px solid #1a1a2e',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 12px', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div style={{
          width: '26px', height: '26px',
          background: 'linear-gradient(135deg, #6c63ff, #3ecf8e)',
          borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 11L7 3L12 11H2Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M4.5 8.5H9.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>
              VD<span style={{ color: '#6c63ff' }}>Forge</span>
            </span>
            <span style={{ color: '#1a1a2e', fontSize: '10px' }}>remix.vdscan.io</span>
          </div>
        )}
      </div>

      {/* Center — Mode Toggle */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#0d0d1a', border: '1px solid #1a1a2e',
        borderRadius: '8px', padding: '3px', gap: '2px'
      }}>
        {(['remix', 'nocode'] as const).map(mode => (
          <button key={mode} onClick={() => onModeChange(mode)}
            style={{
              padding: isMobile ? '4px 10px' : '4px 14px',
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontSize: '11px', fontWeight: 600,
              background: appMode === mode ? '#1a1a3e' : 'transparent',
              color: appMode === mode ? '#6c63ff' : '#444',
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: '5px'
            }}>
            {mode === 'remix' ? (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M1 1l4 4-4 4"/><path d="M6 8h3"/>
                </svg>
                {!isMobile ? 'Remix IDE' : 'IDE'}
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="1" y="3" width="8" height="5" rx="1"/><path d="M3 3V2a2 2 0 014 0v1"/>
                </svg>
                {!isMobile ? 'No Code' : 'NoCode'}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Right — Wallet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {isLoggedIn ? (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              background: '#0a1a10', border: '1px solid #1a3a20',
              borderRadius: '6px', padding: isMobile ? '4px 8px' : '4px 10px',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3ecf8e', flexShrink: 0 }} />
              <span style={{ color: '#3ecf8e', fontSize: '11px', fontWeight: 600, fontFamily: 'monospace' }}>
                {wallet?.slice(0, isMobile ? 4 : 6)}...{wallet?.slice(-4)}
              </span>
            </div>
            <button onClick={disconnect} style={{
              background: 'none', color: '#444', border: '1px solid #1a1a2e',
              borderRadius: '5px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer',
              display: 'flex', alignItems: 'center'
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff6b6b'; (e.currentTarget as HTMLElement).style.borderColor = '#ff6b6b44'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#444'; (e.currentTarget as HTMLElement).style.borderColor = '#1a1a2e'; }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M8 4L10 6L8 8M10 6H4M4 2H2v8h2"/>
              </svg>
              {!isMobile && <span style={{ marginLeft: '4px' }}>Disconnect</span>}
            </button>
          </>
        ) : (
          <button onClick={connect} style={{
            background: 'linear-gradient(135deg, #6c63ff, #3ecf8e)', color: '#fff',
            border: 'none', borderRadius: '6px',
            padding: isMobile ? '6px 10px' : '6px 14px',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '5px'
          }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round">
              <rect x="1" y="3.5" width="9" height="6" rx="1.5"/>
              <path d="M3.5 3.5V2.5a2 2 0 014 0v1"/>
            </svg>
            {isMobile ? 'Connect' : 'Connect Wallet'}
          </button>
        )}
      </div>
    </nav>
  );
}
