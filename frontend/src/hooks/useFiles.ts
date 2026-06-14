import { useCallback, useRef } from 'react';
import { useStore } from '../store';
import { filesAPI, projectsAPI } from '../api';

const LOCAL_KEY = 'vdforge_local_files';

const DEFAULT_CONTENT = (name: string) =>
  `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.23;\n\ncontract ${name.replace('.sol', '')} {\n\n}`;

export const useFiles = () => {
  const {
    files, currentFile, isLoggedIn,
    setFiles, setCurrentFile, updateFileContent,
    currentProject, projects, setProjects, setCurrentProject,
    addLog
  } = useStore();

  const saveTimer = useRef<any>(null);

  const saveLocal = (updatedFiles: any[]) => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updatedFiles));
  };

  const initFiles = () => {
    if (!isLoggedIn) {
      const saved = localStorage.getItem(LOCAL_KEY);
      const localFiles = saved ? JSON.parse(saved) : [{
        id: 'local-1', project_id: 'local', name: 'Contract.sol',
        folder_path: '', type: 'file',
        content: DEFAULT_CONTENT('MyContract')
      }];
      setFiles(localFiles);
      setCurrentFile(localFiles[0]);
    }
  };

  const onContentChange = useCallback((id: string, content: string) => {
    updateFileContent(id, content);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const updated = useStore.getState().files.map(f => f.id === id ? { ...f, content } : f);
      saveLocal(updated);
      if (isLoggedIn && !id.startsWith('local-')) {
        try {
          await filesAPI.update(id, content);
          addLog('Auto-saved to cloud');
        } catch {
          addLog('Cloud save failed, saved locally');
        }
      } else {
        addLog('Saved locally');
      }
    }, 2000);
  }, [isLoggedIn]);

  const createFile = async (name: string, projectId?: string, folderPath?: string) => {
    const pid = projectId || currentProject?.id;
    if (isLoggedIn && pid) {
      try {
        const { data } = await filesAPI.create(pid, name, DEFAULT_CONTENT(name), folderPath || '', 'file');
        const newFiles = [...useStore.getState().files, data.file];
        setFiles(newFiles);
        saveLocal(newFiles);
        setCurrentFile(data.file);
        addLog(`Created: ${name}`);
        return;
      } catch (err: any) {
        addLog(`Create failed: ${err.message}`);
      }
    }
    const newFile = {
      id: `local-${Date.now()}`, project_id: 'local',
      name, folder_path: folderPath || '', type: 'file',
      content: DEFAULT_CONTENT(name)
    };
    const newFiles = [...useStore.getState().files, newFile];
    setFiles(newFiles);
    saveLocal(newFiles);
    setCurrentFile(newFile);
    addLog(`Created: ${name}`);
  };

  const deleteFile = async (id: string) => {
    if (isLoggedIn && !id.startsWith('local-')) {
      try { await filesAPI.delete(id); } catch {}
    }
    // Remove item and its children (if folder)
    const item = useStore.getState().files.find((f: any) => f.id === id) as any;
    let newFiles = useStore.getState().files.filter((f: any) => f.id !== id);
    if (item?.type === 'folder') {
      const folderPath = item.folder_path ? `${item.folder_path}/${item.name}` : item.name;
      newFiles = newFiles.filter((f: any) =>
        !(f.folder_path === folderPath || f.folder_path?.startsWith(`${folderPath}/`))
      );
    }
    setFiles(newFiles);
    saveLocal(newFiles);
    const cf = useStore.getState().currentFile;
    if (cf?.id === id) setCurrentFile((newFiles as any[]).find(f => f.type !== 'folder') || null);
    addLog('Deleted');
  };

  const createProject = async (name: string) => {
    if (!isLoggedIn) return;
    try {
      const { data } = await projectsAPI.create(name);
      const newProjects = [...projects, data.project];
      setProjects(newProjects);
      setCurrentProject(data.project);
      setFiles([]);
      addLog(`Workspace created: ${name}`);
    } catch (err: any) {
      addLog(`Create workspace failed: ${err.message}`);
    }
  };

  const switchProject = async (project: any) => {
    setCurrentProject(project);
    try {
      const { data } = await filesAPI.getAll(project.id);
      const dbFiles = data.files || [];
      setFiles(dbFiles);
      setCurrentFile((dbFiles as any[]).find(f => f.type !== 'folder') || null);
      addLog(`Switched to: ${project.name}`);
    } catch (err: any) {
      addLog(`Load failed: ${err.message}`);
    }
  };

  const deleteProject = async (id: string) => {
    if (!isLoggedIn) return;
    try {
      await projectsAPI.delete(id);
      const newProjects = projects.filter((p: any) => p.id !== id);
      setProjects(newProjects);
      if (currentProject?.id === id) {
        if (newProjects.length > 0) await switchProject(newProjects[0]);
        else { setCurrentProject(null); setFiles([]); setCurrentFile(null); }
      }
      addLog('Workspace deleted');
    } catch (err: any) {
      addLog(`Delete failed: ${err.message}`);
    }
  };

  return {
    files, currentFile, setCurrentFile,
    onContentChange, createFile, deleteFile, initFiles,
    projects, currentProject,
    createProject, switchProject, deleteProject,
  };
};
