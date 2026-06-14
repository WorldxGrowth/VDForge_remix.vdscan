import { useStore } from '../store';
import { authAPI, projectsAPI, filesAPI } from '../api';

const LOCAL_KEY = 'vdforge_local_files';

// ── MetaMask specifically select karo — Phantom/other wallets avoid ──
const getMetaMaskProvider = () => {
  if (typeof window === 'undefined' || !window.ethereum) return null;
  // Multiple providers (MetaMask + Phantom dono installed)
  if ((window.ethereum as any)?.providers?.length) {
    const mm = (window.ethereum as any).providers.find(
      (p: any) => p.isMetaMask && !p.isPhantom
    );
    if (mm) return mm;
  }
  // Single provider — MetaMask only
  if ((window.ethereum as any)?.isMetaMask && !(window.ethereum as any)?.isPhantom) {
    return window.ethereum;
  }
  // Fallback
  return window.ethereum || null;
};

export const useWallet = () => {
  const { wallet, isLoggedIn, setWallet, setToken, setProjects, setCurrentProject, setFiles, setCurrentFile, addLog } = useStore();

  const loadUserData = async () => {
    try {
      const { data: pData } = await projectsAPI.getAll();
      const projects = pData.projects || [];
      let targetProject: any;

      if (projects.length === 0) {
        const { data: newP } = await projectsAPI.create('My Workspace', 'Default workspace');
        targetProject = newP.project;
        setProjects([targetProject]);
      } else {
        setProjects(projects);
        targetProject = projects[0];
      }
      setCurrentProject(targetProject);

      const saved = localStorage.getItem(LOCAL_KEY);
      const localFiles = saved ? JSON.parse(saved) : [];
      const realLocal = localFiles.filter((f: any) => f.id && f.name && f.content !== undefined);

      if (realLocal.length > 0) {
        const { data: fData } = await filesAPI.getAll(targetProject.id);
        const dbFiles = fData.files || [];
        const dbNames = dbFiles.map((f: any) => f.name);
        const toMigrate = realLocal.filter((f: any) => !dbNames.includes(f.name));

        if (toMigrate.length > 0) {
          addLog(`Syncing ${toMigrate.length} local file(s) to cloud...`);
          for (const f of toMigrate) {
            try { await filesAPI.create(targetProject.id, f.name, f.content || ''); } catch {}
          }
          addLog(`Sync done`);
        }

        const { data: fData2 } = await filesAPI.getAll(targetProject.id);
        const allFiles = fData2.files || [];
        setFiles(allFiles);
        setCurrentFile(allFiles[0] || null);
        addLog(`Loaded ${allFiles.length} file(s) from cloud`);
      } else {
        const { data: fData } = await filesAPI.getAll(targetProject.id);
        const dbFiles = fData.files || [];
        setFiles(dbFiles);
        setCurrentFile(dbFiles[0] || null);
        addLog(`Loaded ${dbFiles.length} file(s) from cloud`);
      }

    } catch (err: any) {
      addLog(`Cloud load failed: ${err.message}`);
    }
  };

  const connect = async () => {
    try {
      const ethereum = getMetaMaskProvider();

      if (!ethereum) {
        alert('MetaMask not found! Please install MetaMask extension.');
        return;
      }

      // Save current local files before connecting
      const currentFiles = useStore.getState().files;
      if (currentFiles.length > 0) {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(currentFiles));
      }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const walletAddress = accounts[0];
      setWallet(walletAddress);

      const { data } = await authAPI.getNonce(walletAddress);
      const message = data.message;

      const signature = await ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress],
      });

      const res = await authAPI.verify(walletAddress, signature);
      setToken(res.data.token);
      addLog(`Wallet connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);

      await loadUserData();

    } catch (err: any) {
      addLog(`Wallet error: ${err.message}`);
    }
  };

  const disconnect = () => {
    const currentFiles = useStore.getState().files;
    if (currentFiles.length > 0) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(currentFiles));
    }

    setWallet(null);
    setToken(null);
    setProjects([]);
    setCurrentProject(null);

    const saved = localStorage.getItem(LOCAL_KEY);
    const localFiles = saved ? JSON.parse(saved) : [];
    setFiles(localFiles);
    setCurrentFile(localFiles[0] || null);
    addLog('Wallet disconnected — local mode');
  };

  return { wallet, isLoggedIn, connect, disconnect };
};
