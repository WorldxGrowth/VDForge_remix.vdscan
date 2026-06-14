import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { useFiles } from '../hooks/useFiles';
import Navbar from '../components/Navbar';
import FileExplorer from '../components/FileExplorer';
import CodeEditor from '../components/Editor';
import Console from '../components/Console';
import CompilerPanel from '../components/Compiler';
import DeployPanel from '../components/Deploy';

type LeftTab = 'files' | 'compiler' | 'deploy' | 'settings';
type AppMode = 'remix' | 'nocode';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
};

export default function Home() {
  const { addLog } = useStore();
  const { initFiles } = useFiles();
  const isMobile = useIsMobile();

  const [leftTab, setLeftTab] = useState<LeftTab>('files');
  const [appMode, setAppMode] = useState<AppMode>('remix');
  const [sidebarOpen, setSidebarOpen] = useState(false); // always closed by default
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [consoleHeight, setConsoleHeight] = useState(180);

  const isDraggingSidebar = useRef(false);
  const isDraggingConsole = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  useEffect(() => {
    initFiles();
    addLog('VDForge IDE loaded — EVM: Shanghai | Chain: VDChain');
    addLog('Connect wallet to save files to cloud');
  }, []);

  // On desktop, open sidebar by default
  useEffect(() => {
    if (!isMobile) setSidebarOpen(true);
    else setSidebarOpen(false);
  }, [isMobile]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      // Ctrl+S → Compile
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const { currentFile, isCompiling } = useStore.getState();
        if (currentFile && !isCompiling) {
          const { useCompiler } = await import('../hooks/useCompiler');
          // Direct store call
          const store = useStore.getState();
          if (store.currentFile) {
            setLeftTab('compiler');
            setSidebarOpen(true);
            addLog('Ctrl+S → Compiling...');
          }
        }
      }

      // Ctrl+B → Sidebar toggle
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }

      // Ctrl+Enter → Go to Deploy tab
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        setLeftTab('deploy');
        setSidebarOpen(true);
        addLog('Ctrl+Enter → Deploy panel');
      }

      // Ctrl+1 → Files tab
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        setLeftTab('files');
        setSidebarOpen(true);
      }

      // Ctrl+2 → Compiler tab
      if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        setLeftTab('compiler');
        setSidebarOpen(true);
      }

      // Ctrl+3 → Deploy tab
      if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        setLeftTab('deploy');
        setSidebarOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addLog]);

  const onSidebarMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    isDraggingSidebar.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = sidebarWidth;
    e.preventDefault();
  }, [sidebarWidth, isMobile]);

  const onConsoleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingConsole.current = true;
    dragStartY.current = e.clientY;
    dragStartHeight.current = consoleHeight;
    e.preventDefault();
  }, [consoleHeight]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingSidebar.current) {
        const diff = e.clientX - dragStartX.current;
        setSidebarWidth(Math.max(180, Math.min(500, dragStartWidth.current + diff)));
      }
      if (isDraggingConsole.current) {
        const diff = dragStartY.current - e.clientY;
        setConsoleHeight(Math.max(60, Math.min(window.innerHeight * 0.7, dragStartHeight.current + diff)));
      }
    };
    const onMouseUp = () => {
      isDraggingSidebar.current = false;
      isDraggingConsole.current = false;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp); };
  }, []);

  const sideIcons: { id: LeftTab; path: string; label: string }[] = [
    { id: 'files',    label: 'Files',    path: 'M3 3h6l2 2v8H3V3zm2 4h4M5 9h4' },
    { id: 'compiler', label: 'Compile',  path: 'M8 3l4 4-4 4M4 7h6' },
    { id: 'deploy',   label: 'Deploy',   path: 'M12 6l-4-3v6l4-3zM3 3v10' },
    { id: 'settings', label: 'Settings', path: 'M7.5 3a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM7.5 5v3M6 7.5h3' },
  ];

  const handleTabClick = (id: LeftTab) => {
    if (sidebarOpen && leftTab === id) {
      setSidebarOpen(false);
    } else {
      setLeftTab(id);
      setSidebarOpen(true);
    }
  };

  const NAV_H = 44;
  const mobileConsoleH = Math.floor(window.innerHeight * 0.28);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0a16', overflow: 'hidden' }}>
      <Navbar appMode={appMode} onModeChange={setAppMode} isMobile={isMobile} />

      {/* No-Code overlay */}
      {appMode === 'nocode' && (
        <div style={{
          position: 'fixed', top: NAV_H, left: 0, right: 0, bottom: 0,
          background: '#050510', zIndex: 50,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px'
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: '#0d0d2a', border: '1px solid #2d2d4e',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="#6c63ff" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="8" width="22" height="14" rx="2"/>
              <path d="M8 8V6a5 5 0 0110 0v2"/>
              <circle cx="13" cy="15" r="2" fill="#6c63ff" stroke="none"/>
            </svg>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ddd', fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>No-Code Deploy</div>
            <div style={{ color: '#333', fontSize: '12px' }}>Token Factory · NFT Creator · Coming Soon</div>
          </div>
          <div style={{ background: '#0d0d1a', border: '1px solid #1a1a2e', borderRadius: '8px', padding: '10px 20px', color: '#333', fontSize: '12px' }}>
            Feature under development
          </div>
          <button onClick={() => setAppMode('remix')} style={{
            background: 'none', border: '1px solid #1a1a2e', color: '#444',
            borderRadius: '6px', padding: '7px 18px', fontSize: '12px', cursor: 'pointer'
          }}>← Back to IDE</button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, marginTop: `${NAV_H}px`, overflow: 'hidden', position: 'relative' }}>

        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{
            position: 'fixed', inset: 0, top: NAV_H,
            background: 'rgba(0,0,0,0.6)', zIndex: 30
          }} />
        )}

        {/* Icon Bar */}
        <div style={{
          width: '44px', background: '#080812', borderRight: '1px solid #1a1a2e',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: '6px', gap: '2px', flexShrink: 0, zIndex: 40
        }}>
          {sideIcons.map(({ id, path, label }) => {
            const active = sidebarOpen && leftTab === id;
            return (
              <button key={id} onClick={() => handleTabClick(id)} title={label}
                style={{
                  width: '36px', height: '36px', background: active ? '#1a1a3e' : 'none',
                  border: 'none', borderRadius: '6px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderLeft: active ? '2px solid #6c63ff' : '2px solid transparent',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#16162a'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                <svg width="17" height="17" viewBox="0 0 15 15" fill="none"
                  stroke={active ? '#6c63ff' : '#555'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={path} />
                </svg>
              </button>
            );
          })}

          <div style={{ flex: 1 }} />

          <button title="VDScan" onClick={() => window.open('https://vdscan.io', '_blank')}
            style={{ width: '36px', height: '36px', background: 'none', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#333" strokeWidth="1.2" strokeLinecap="round">
              <circle cx="6" cy="6" r="4"/><path d="M10 10l3 3"/>
            </svg>
          </button>
        </div>

        {/* Left Panel */}
        <div style={{
          width: isMobile ? '76vw' : `${sidebarWidth}px`,
          maxWidth: isMobile ? '320px' : undefined,
          background: '#0d0d1a', borderRight: '1px solid #1a1a2e',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          flexShrink: 0,
          position: isMobile ? 'fixed' : 'relative',
          left: isMobile ? (sidebarOpen ? '44px' : '-400px') : undefined,
          top: isMobile ? `${NAV_H}px` : undefined,
          bottom: isMobile ? 0 : undefined,
          zIndex: isMobile ? 35 : 1,
          transition: isMobile ? 'left 0.22s cubic-bezier(0.4,0,0.2,1)' : undefined,
          // Hide completely when closed on desktop
          display: (!isMobile && !sidebarOpen) ? 'none' : 'flex',
        } as React.CSSProperties}>

          {/* Panel Header */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #1a1a2e', background: '#06060e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ color: '#333', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              {leftTab === 'files' ? 'File Explorer' : leftTab === 'compiler' ? 'Solidity Compiler' : leftTab === 'deploy' ? 'Deploy & Run' : 'Settings'}
            </span>
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 2l9 9M11 2L2 11"/>
                </svg>
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {leftTab === 'files' && <FileExplorer />}
            {leftTab === 'compiler' && <CompilerPanel />}
            {leftTab === 'deploy' && <DeployPanel />}
            {leftTab === 'settings' && (
              <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ color: '#333', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Network</div>
                {[['Chain ID', '882022', '#6c63ff'], ['Symbol', 'VDC', '#6c63ff'], ['EVM', 'Shanghai', '#3ecf8e'], ['RPC', 'rpc.vdscan.io', '#444']].map(([k, v, c]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #0d0d1a' }}>
                    <span style={{ color: '#444', fontSize: '11px' }}>{k}</span>
                    <span style={{ color: c, fontSize: '11px', fontFamily: 'monospace' }}>{v}</span>
                  </div>
                ))}
                <div style={{ color: '#333', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: '6px' }}>Links</div>
                {[['VDScan Explorer', 'https://vdscan.io'], ['VDSwap DEX', 'https://vdswap.io'], ['VDDocs', 'https://docs.vdchain.io']].map(([label, url]) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer"
                    style={{ color: '#444', fontSize: '12px', textDecoration: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #0d0d1a' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#6c63ff'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#444'}>
                    {label}
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M1 8L8 1M4 1h4v4"/></svg>
                  </a>
                ))}
              </div>
            )}
          </div>

          {!isMobile && (
            <div onMouseDown={onSidebarMouseDown}
              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '5px', cursor: 'col-resize', zIndex: 10 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#6c63ff33'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            />
          )}
        </div>

        {/* Editor + Console */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
            <CodeEditor />
          </div>

          {/* Console drag handle */}
          <div onMouseDown={onConsoleMouseDown}
            style={{ height: '6px', cursor: 'row-resize', flexShrink: 0, background: '#06060e', borderTop: '1px solid #1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#6c63ff22'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#06060e'}>
            <div style={{ width: '28px', height: '2px', background: '#1a1a2e', borderRadius: '1px' }} />
          </div>

          <Console height={isMobile ? mobileConsoleH : consoleHeight} />
        </div>

      </div>
    </div>
  );
}
