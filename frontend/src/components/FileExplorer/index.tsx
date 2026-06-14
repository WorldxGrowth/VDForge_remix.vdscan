import { useState, useRef } from 'react';
import { useFiles } from '../../hooks/useFiles';
import { useStore } from '../../store';
import { filesAPI } from '../../api';

interface FileItem {
  id: string;
  project_id: string;
  name: string;
  folder_path: string;
  type: 'file' | 'folder';
  content?: string;
}

const FolderIcon = ({ open = false, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d={open
      ? "M1 5h14v9a1 1 0 01-1 1H2a1 1 0 01-1-1V5zM1 5l2-3h4l1 3"
      : "M1 4h14v10a1 1 0 01-1 1H2a1 1 0 01-1-1V4zM1 4l2-2h4l1 2"}
      stroke={open ? '#6c63ff' : '#888'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
  </svg>
);

const FileIcon = ({ active = false, size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <path d="M2 1h7l3 3v9a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1z" stroke={active ? '#6c63ff' : '#666'} strokeWidth="1.2" fill="none"/>
    <path d="M9 1v3h3" stroke={active ? '#6c63ff' : '#666'} strokeWidth="1.2"/>
    <path d="M4 6h6M4 8h6M4 10h4" stroke={active ? '#6c63ff' : '#555'} strokeWidth="1" strokeLinecap="round"/>
  </svg>
);

export default function FileExplorer() {
  const { files, currentFile, setCurrentFile, createFile, deleteFile, projects, currentProject, createProject, switchProject } = useFiles();
  const { isLoggedIn, setFiles, addLog } = useStore();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showInput, setShowInput] = useState<'file' | 'folder' | 'import' | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');
  const [createInFolder, setCreateInFolder] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFileName = (name: string): string => {
    if (!name.trim()) return 'Name required';
    if (!name.endsWith('.sol') && showInput === 'file') return 'Must end with .sol';
    if (name.includes('/') || name.includes('\\')) return 'Invalid characters';
    return '';
  };

  const validateFolderName = (name: string): string => {
    if (!name.trim()) return 'Name required';
    if (name.includes('.sol')) return 'Folders cannot end with .sol';
    if (name.includes('/') || name.includes('\\')) return 'Invalid characters';
    return '';
  };

  const startCreate = (type: 'file' | 'folder' | 'import', inFolder = '') => {
    setShowDropdown(false);
    setShowInput(type);
    setCreateInFolder(inFolder);
    setInputValue('');
    setInputError('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCreate = async () => {
    const err = showInput === 'folder' ? validateFolderName(inputValue) : showInput === 'import' ? '' : validateFileName(inputValue);
    if (err) { setInputError(err); return; }

    if (showInput === 'import') {
      try {
        addLog(`Importing from: ${inputValue}`);
        const { importAPI } = await import('../../api');
        const { data } = await importAPI.fromUrl(inputValue);
        if (!data.success) throw new Error(data.message);
        const name = data.fileName;
        const content = data.content;
        await createFile(name, currentProject?.id, createInFolder);
        await new Promise(r => setTimeout(r, 150));
        const allFiles = useStore.getState().files as any[];
        const created = allFiles.find((f: any) => f.name === name);
        if (created) {
          if (isLoggedIn && !created.id.startsWith('local-')) {
            await filesAPI.update(created.id, content);
          }
          const updated = allFiles.map((f: any) => f.id === created.id ? { ...f, content } : f);
          setFiles(updated as any);
          setCurrentFile({ ...created, content } as any);
          localStorage.setItem('vdforge_local_files', JSON.stringify(updated));
        }
        addLog(`Imported: ${name}`);
      } catch (e: any) {
        setInputError(`Import failed: ${e.message}`);
        return;
      }
    } else if (showInput === 'folder') {
      if (isLoggedIn && currentProject?.id) {
        try {
          const { data } = await filesAPI.create(currentProject.id, inputValue, '', createInFolder, 'folder');
          const newFiles = [...files, data.file];
          setFiles(newFiles as any);
          setExpandedFolders(prev => ({ ...prev, [data.file.id]: true }));
          addLog(`Folder created: ${inputValue}`);
        } catch (e: any) {
          setInputError(e.message);
          return;
        }
      } else {
        const newFolder = {
          id: `local-folder-${Date.now()}`, project_id: 'local',
          name: inputValue, folder_path: createInFolder, type: 'folder', content: ''
        };
        const newFiles = [...files, newFolder];
        setFiles(newFiles as any);
      }
    } else {
      await createFile(inputValue, currentProject?.id, createInFolder);
    }
    setShowInput(null);
    setInputValue('');
    setInputError('');
  };

  const handleRename = async (item: FileItem) => {
    const err = item.type === 'folder' ? validateFolderName(renameValue) : validateFileName(renameValue);
    if (err) { setRenameError(err); return; }
    if (renameValue === item.name) { setRenamingId(null); return; }
    try {
      if (isLoggedIn && !item.id.startsWith('local-')) {
        await filesAPI.rename(item.id, renameValue);
      }
      const updated = (files as any[]).map(f => f.id === item.id ? { ...f, name: renameValue } : f);
      setFiles(updated as any);
      addLog(`Renamed: ${item.name} → ${renameValue}`);
    } catch (e: any) {
      setRenameError(e.message);
      return;
    }
    setRenamingId(null);
    setRenameError('');
  };

  const getFolderFullPath = (item: FileItem) =>
    item.folder_path ? `${item.folder_path}/${item.name}` : item.name;

  const buildTree = (parentPath: string) =>
    (files as FileItem[]).filter(f => (f.folder_path || '') === parentPath);

  const renderItem = (item: FileItem, depth = 0) => {
    const isFolder = item.type === 'folder';
    const folderPath = getFolderFullPath(item);
    const isExpanded = expandedFolders[item.id] !== false;
    const isActive = currentFile?.id === item.id;
    const isHovered = hoveredId === item.id;
    const isRenaming = renamingId === item.id;
    const children = isFolder ? buildTree(folderPath) : [];
    const paddingLeft = 10 + depth * 14;

    return (
      <div key={item.id}>
        <div
          onClick={() => isFolder ? setExpandedFolders(p => ({ ...p, [item.id]: !p[item.id] })) : setCurrentFile(item as any)}
          onMouseEnter={() => setHoveredId(item.id)}
          onMouseLeave={() => setHoveredId(null)}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            paddingLeft, paddingRight: '6px', paddingTop: '4px', paddingBottom: '4px',
            cursor: 'pointer',
            background: isActive ? '#1a1a3e' : isHovered ? '#0f0f1e' : 'transparent',
            borderLeft: isActive ? '2px solid #6c63ff' : '2px solid transparent',
          }}>
          <div style={{ width: '10px', flexShrink: 0 }}>
            {isFolder && (
              <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round"
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: '0.15s', display: 'block' }}>
                <path d="M2 1.5l4 3-4 3"/>
              </svg>
            )}
          </div>
          <div style={{ flexShrink: 0 }}>
            {isFolder ? <FolderIcon open={isExpanded} /> : <FileIcon active={isActive} />}
          </div>
          {isRenaming ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <input autoFocus value={renameValue}
                onChange={e => { setRenameValue(e.target.value); setRenameError(''); }}
                onBlur={() => handleRename(item)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(item); if (e.key === 'Escape') { setRenamingId(null); setRenameError(''); } }}
                onClick={e => e.stopPropagation()}
                style={{ width: '100%', background: '#0d0d2a', border: `1px solid ${renameError ? '#ff6b6b' : '#6c63ff'}`, borderRadius: '3px', padding: '1px 5px', color: '#fff', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
              />
              {renameError && <div style={{ color: '#ff6b6b', fontSize: '9px', marginTop: '2px' }}>{renameError}</div>}
            </div>
          ) : (
            <span style={{ color: isActive ? '#fff' : '#999', fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.name}
            </span>
          )}
          {isHovered && !isRenaming && (
            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: '1px', flexShrink: 0 }}>
              {isFolder && (
                <>
                  <button onClick={() => startCreate('folder', folderPath)} title="New Folder"
                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px 3px', display: 'flex', borderRadius: '3px' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1a1a3e'; (e.currentTarget as HTMLElement).style.color = '#6c63ff'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#555'; }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 3.5h10v7a1 1 0 01-1 1H2a1 1 0 01-1-1V3.5zM1 3.5l1.5-2h3L7 3.5M5.5 6v3M4 7.5h3"/>
                    </svg>
                  </button>
                  <button onClick={() => startCreate('file', folderPath)} title="New File"
                    style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px 3px', display: 'flex', borderRadius: '3px' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1a1a3e'; (e.currentTarget as HTMLElement).style.color = '#6c63ff'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#555'; }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                      <rect x="1" y="1" width="10" height="10" rx="1.5"/><path d="M6 4v4M4 6h4"/>
                    </svg>
                  </button>
                </>
              )}
              <button onClick={() => { setRenamingId(item.id); setRenameValue(item.name); setRenameError(''); }} title="Rename"
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px 3px', display: 'flex', borderRadius: '3px' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1a1a3e'; (e.currentTarget as HTMLElement).style.color = '#f0a500'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#555'; }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                  <path d="M8.5 1.5l2 2-6.5 6.5H2v-2l6.5-6.5z"/>
                </svg>
              </button>
              <button onClick={() => deleteFile(item.id)} title="Delete"
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', padding: '2px 3px', display: 'flex', borderRadius: '3px' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#2a0d0d'; (e.currentTarget as HTMLElement).style.color = '#ff6b6b'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#555'; }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                  <path d="M1.5 3h9M4 3V2h4v1M2.5 3l.5 8h6l.5-8"/>
                </svg>
              </button>
            </div>
          )}
        </div>
        {isFolder && isExpanded && (
          <div>
            {children.map(c => renderItem(c as FileItem, depth + 1))}
            {children.length === 0 && (
              <div style={{ paddingLeft: paddingLeft + 24, paddingTop: '3px', paddingBottom: '3px', color: '#2a2a3a', fontSize: '11px' }}>
                empty
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const rootItems = buildTree('');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', userSelect: 'none' }}
      onClick={() => { setShowDropdown(false); setShowProjectMenu(false); }}>

      {isLoggedIn && (
        <div style={{ borderBottom: '1px solid #1a1a2e' }} onClick={e => e.stopPropagation()}>
          <div onClick={() => setShowProjectMenu(!showProjectMenu)}
            style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0a0a14'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#444" strokeWidth="1.5" strokeLinecap="round"
              style={{ transform: showProjectMenu ? 'rotate(90deg)' : 'none', transition: '0.15s', flexShrink: 0 }}>
              <path d="M3 2l4 3-4 3"/>
            </svg>
            <FolderIcon open={showProjectMenu} size={13} />
            <span style={{ color: '#aaa', fontSize: '11px', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentProject?.name || 'No workspace'}
            </span>
          </div>
          {showProjectMenu && (
            <div style={{ background: '#06060e', borderTop: '1px solid #1a1a2e', paddingBottom: '4px' }}>
              {projects.map((p: any) => (
                <div key={p.id} onClick={() => { switchProject(p); setShowProjectMenu(false); }}
                  style={{ padding: '5px 14px', cursor: 'pointer', color: currentProject?.id === p.id ? '#6c63ff' : '#666', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#0d0d1a'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: currentProject?.id === p.id ? '#6c63ff' : '#2a2a3a', flexShrink: 0 }} />
                  {p.name}
                </div>
              ))}
              {showNewProject ? (
                <div style={{ padding: '5px 10px' }}>
                  <input autoFocus value={newProjectName}
                    onChange={e => setNewProjectName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newProjectName.trim()) {
                        createProject(newProjectName.trim());
                        setNewProjectName(''); setShowNewProject(false); setShowProjectMenu(false);
                      }
                      if (e.key === 'Escape') setShowNewProject(false);
                    }}
                    placeholder="Workspace name"
                    style={{ width: '100%', background: '#0d0d1a', border: '1px solid #6c63ff', borderRadius: '4px', padding: '4px 7px', color: '#fff', fontSize: '11px', boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>
              ) : (
                <div onClick={() => setShowNewProject(true)}
                  style={{ padding: '5px 14px', cursor: 'pointer', color: '#333', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', borderTop: '1px solid #0d0d1a', marginTop: '2px' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#6c63ff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#333'; }}>
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4.5 1v7M1 4.5h7"/></svg>
                  New Workspace
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create button */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #1a1a2e', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button onClick={() => setShowDropdown(!showDropdown)}
          style={{
            width: '100%', background: '#1a1a3e', border: '1px solid #2d2d5e',
            borderRadius: '6px', padding: '7px 12px', color: '#aaa',
            fontSize: '12px', fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px'
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#6c63ff'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#2d2d5e'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5.5 1v9M1 5.5h9"/>
            </svg>
            Create
          </div>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            style={{ transform: showDropdown ? 'rotate(180deg)' : 'none', transition: '0.15s' }}>
            <path d="M2 3.5l3 3 3-3"/>
          </svg>
        </button>

        {showDropdown && (
          <div style={{
            position: 'absolute', top: '100%', left: '10px', right: '10px',
            background: '#0d0d1a', border: '1px solid #2d2d4e', borderRadius: '6px',
            zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}>
            {[
              { label: 'New file', icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M2 1h6l3 3v8a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1z"/><path d="M8 1v3h3"/></svg>, action: () => startCreate('file') },
              { label: 'New folder', icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4h11v7a1 1 0 01-1 1H2a1 1 0 01-1-1V4zM1 4l1.5-2h4L8 4"/></svg>, action: () => startCreate('folder') },
              { label: 'Upload .sol file', icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M6.5 1v8M3.5 4l3-3 3 3M1 10v1a1 1 0 001 1h10a1 1 0 001-1v-1"/></svg>, action: () => { setShowDropdown(false); document.getElementById('file-upload-input')?.click(); } },
              { label: 'Import from HTTPS', icon: <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><circle cx="6.5" cy="6.5" r="5"/><path d="M1.5 6.5h10M6.5 1.5c-1.5 2-1.5 7 0 10M6.5 1.5c1.5 2 1.5 7 0 10"/></svg>, action: () => startCreate('import') },
            ].map(({ label, icon, action }) => (
              <div key={label} onClick={action}
                style={{ padding: '9px 14px', cursor: 'pointer', color: '#aaa', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1a1a3e'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#aaa'; }}>
                <span style={{ color: '#6c63ff', flexShrink: 0 }}>{icon}</span>
                {label}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload input — FIXED: sets content properly */}
      <input id="file-upload-input" type="file" accept=".sol" multiple style={{ display: 'none' }}
        onChange={async (e) => {
          const fileList = e.target.files;
          if (!fileList) return;
          for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            if (!file.name.endsWith('.sol')) continue;
            const content = await file.text();
            await createFile(file.name, currentProject?.id, '');
            await new Promise(r => setTimeout(r, 100));
            const allFiles = useStore.getState().files as any[];
            const created = allFiles.find((f: any) => f.name === file.name);
            if (created) {
              if (isLoggedIn && !created.id.startsWith('local-')) {
                try { await filesAPI.update(created.id, content); } catch {}
              }
              const updated = allFiles.map((f: any) => f.id === created.id ? { ...f, content } : f);
              setFiles(updated as any);
              setCurrentFile({ ...created, content } as any);
              localStorage.setItem('vdforge_local_files', JSON.stringify(updated));
              addLog(`Uploaded: ${file.name}`);
            }
          }
          (e.target as HTMLInputElement).value = '';
        }}
      />

      {/* Input field */}
      {showInput && (
        <div style={{ padding: '6px 10px', background: '#08080e', borderBottom: '1px solid #1a1a2e' }} onClick={e => e.stopPropagation()}>
          <div style={{ color: '#333', fontSize: '10px', marginBottom: '3px' }}>
            {showInput === 'import' ? 'Import from HTTPS URL' : showInput === 'folder' ? 'New folder name' : 'New file name (.sol)'}
            {createInFolder ? <span style={{ color: '#2a2a4a' }}> in /{createInFolder}</span> : null}
          </div>
          <input ref={inputRef} value={inputValue}
            onChange={e => { setInputValue(e.target.value); setInputError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowInput(null); setInputError(''); } }}
            placeholder={showInput === 'import' ? 'https://...' : showInput === 'folder' ? 'contracts' : 'MyToken.sol'}
            style={{
              width: '100%', background: '#0d0d1a',
              border: `1px solid ${inputError ? '#ff6b6b' : '#6c63ff'}`,
              borderRadius: '4px', padding: '5px 8px', color: '#fff',
              fontSize: '12px', boxSizing: 'border-box', outline: 'none'
            }}
          />
          {inputError && <div style={{ color: '#ff6b6b', fontSize: '10px', marginTop: '3px' }}>{inputError}</div>}
          <div style={{ display: 'flex', gap: '4px', marginTop: '5px' }}>
            <button onClick={handleCreate} style={{ flex: 1, background: '#6c63ff', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
              {showInput === 'import' ? 'Import' : 'Create'}
            </button>
            <button onClick={() => { setShowInput(null); setInputError(''); }} style={{ flex: 1, background: '#1a1a2e', color: '#555', border: 'none', borderRadius: '4px', padding: '5px', fontSize: '11px', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* File tree */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: '4px' }}>
        {rootItems.length === 0 ? (
          <div style={{ padding: '20px 14px', color: '#1a1a2e', fontSize: '11px', textAlign: 'center', lineHeight: '1.8' }}>
            No files<br /><span style={{ color: '#2a2a3a' }}>Click Create to start</span>
          </div>
        ) : rootItems.map(item => renderItem(item as FileItem))}
      </div>

      {/* Footer */}
      <div style={{ padding: '5px 10px', borderTop: '1px solid #1a1a2e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#1a1a2e', fontSize: '10px' }}>
          {(files as any[]).filter(f => f.type !== 'folder').length} file(s)
        </span>
        {isLoggedIn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#3ecf8e' }} />
            <span style={{ color: '#1a3a20', fontSize: '9px' }}>synced</span>
          </div>
        )}
      </div>
    </div>
  );
}
