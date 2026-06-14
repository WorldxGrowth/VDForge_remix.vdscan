import { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useFiles } from '../../hooks/useFiles';
import MonacoEditor from '@monaco-editor/react';

export default function CodeEditor() {
  const { currentFile, files } = useStore();
  const { setCurrentFile, onContentChange } = useFiles();
  const [openTabs, setOpenTabs] = useState<string[]>([]);

  // Add to tabs when file selected
  useEffect(() => {
    if (currentFile && !openTabs.includes(currentFile.id)) {
      setOpenTabs(prev => [...prev, currentFile.id]);
    }
  }, [currentFile]);

  const closeTab = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(id => id !== fileId);
    setOpenTabs(newTabs);
    if (currentFile?.id === fileId) {
      const lastTab = newTabs[newTabs.length - 1];
      const lastFile = files.find(f => f.id === lastTab);
      setCurrentFile(lastFile || null);
    }
  };

  const tabFiles = openTabs.map(id => files.find(f => f.id === id)).filter(Boolean) as any[];

  if (!currentFile) {
    return (
      <div style={{
        flex: 1, background: '#0a0a16', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px', height: '100%'
      }}>
        <div style={{ fontSize: '48px' }}>◆</div>
        <div style={{ color: '#444', fontSize: '14px' }}>No file selected</div>
        <div style={{ color: '#333', fontSize: '12px' }}>Create or select a file from explorer</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
      {/* Tab Bar */}
      <div style={{
        height: '36px', background: '#080812', borderBottom: '1px solid #2d2d4e',
        display: 'flex', alignItems: 'flex-end', padding: '0', overflowX: 'auto', flexShrink: 0
      }}>
        {tabFiles.map(file => (
          <div key={file.id} onClick={() => setCurrentFile(file)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '0 12px', height: '36px', cursor: 'pointer', flexShrink: 0,
              background: currentFile?.id === file.id ? '#0a0a16' : '#0d0d1a',
              borderRight: '1px solid #2d2d4e',
              borderTop: currentFile?.id === file.id ? '2px solid #6c63ff' : '2px solid transparent',
              color: currentFile?.id === file.id ? '#fff' : '#666',
            }}>
            <span style={{ color: '#6c63ff', fontSize: '10px' }}>◆</span>
            <span style={{ fontSize: '12px' }}>{file.name}</span>
            <span onClick={(e) => closeTab(e, file.id)}
              style={{ fontSize: '14px', color: '#444', marginLeft: '4px', lineHeight: 1, padding: '0 2px' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff6b6b'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#444'}>
              ×
            </span>
          </div>
        ))}
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MonacoEditor
          key={currentFile.id}
          height="100%"
          defaultLanguage="sol"
          language="sol"
          theme="vdforge-dark"
          value={currentFile.content}
          onChange={(value) => onContentChange(currentFile.id, value || '')}
          loading={
            <div style={{ background: '#0a0a16', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c63ff', fontSize: '13px' }}>
              ⏳ Loading editor...
            </div>
          }
          options={{
            fontSize: 14,
            fontFamily: "'Fira Code', 'Courier New', monospace",
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            tabSize: 4,
            automaticLayout: true,
            padding: { top: 12 },
          }}
          beforeMount={(monaco) => {
            monaco.languages.register({ id: 'sol' });
            monaco.languages.setMonarchTokensProvider('sol', {
              keywords: ['pragma','solidity','contract','function','returns','return',
                'public','private','internal','external','pure','view','payable',
                'memory','storage','calldata','uint','uint256','int','int256',
                'address','bool','string','bytes','bytes32','mapping','struct',
                'event','emit','modifier','require','revert','assert',
                'constructor','fallback','receive','interface','library',
                'is','import','using','for','while','if','else','new','delete',
                'true','false','this','super','msg','block','tx','abi'],
              tokenizer: {
                root: [
                  [/\/\/.*$/, 'comment'],
                  [/\/\*/, 'comment', '@comment'],
                  [/".*?"/, 'string'],
                  [/\d+/, 'number'],
                  [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
                  [/[{}()\[\]]/, 'delimiter.bracket'],
                  [/[;,.]/, 'delimiter'],
                ],
                comment: [[/\*\//, 'comment', '@pop'], [/./, 'comment']],
              }
            });
            monaco.editor.defineTheme('vdforge-dark', {
              base: 'vs-dark', inherit: true,
              rules: [
                { token: 'keyword', foreground: '6c63ff', fontStyle: 'bold' },
                { token: 'comment', foreground: '555577', fontStyle: 'italic' },
                { token: 'string', foreground: '3ecf8e' },
                { token: 'number', foreground: 'f0a500' },
              ],
              colors: {
                'editor.background': '#0a0a16',
                'editor.lineHighlightBackground': '#1a1a2e',
                'editorLineNumber.foreground': '#333355',
                'editorCursor.foreground': '#6c63ff',
                'editor.selectionBackground': '#2d2d6e',
              }
            });
          }}
          onMount={(editor, monaco) => {
            monaco.editor.setTheme('vdforge-dark');
            editor.focus();
          }}
        />
      </div>
    </div>
  );
}
