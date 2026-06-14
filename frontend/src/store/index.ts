import { create } from 'zustand';

interface File {
  id: string;
  project_id: string;
  name: string;
  content: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface CompileResult {
  success: boolean;
  errors: any[];
  warnings: any[];
  contracts: Record<string, { abi: any[]; bytecode: string; contractName: string }>;
}

interface TxReceipt {
  id: number;
  status: 'success' | 'failed';
  type: 'deploy' | 'call';
  contractName?: string;
  functionName?: string;
  contractAddress?: string;
  txHash?: string;
  blockNumber?: number;
  blockHash?: string;
  from?: string;
  gasUsed?: string;
  chainName?: string;
  chainId?: string;
  explorer?: string;
  error?: string;
  timestamp: string;
}

interface Store {
  wallet: string | null;
  isLoggedIn: boolean;
  token: string | null;
  setWallet: (wallet: string | null) => void;
  setToken: (token: string | null) => void;

  projects: Project[];
  currentProject: Project | null;
  files: File[];
  currentFile: File | null;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  setFiles: (files: File[]) => void;
  setCurrentFile: (file: File | null) => void;
  updateFileContent: (id: string, content: string) => void;

  compileResult: CompileResult | null;
  isCompiling: boolean;
  setCompileResult: (result: CompileResult | null) => void;
  setIsCompiling: (val: boolean) => void;

  solcVersion: string;
  evmVersion: string;
  optimize: boolean;
  setSolcVersion: (v: string) => void;
  setEvmVersion: (v: string) => void;
  setOptimize: (v: boolean) => void;

  logs: string[];
  addLog: (log: string) => void;
  clearLogs: () => void;

  txReceipts: TxReceipt[];
  addTxReceipt: (receipt: Omit<TxReceipt, 'id'>) => void;
  clearTxReceipts: () => void;

  deployments: any[];
  setDeployments: (d: any[]) => void;
}

export const useStore = create<Store>((set) => ({
  wallet: null,
  isLoggedIn: false,
  token: localStorage.getItem('vdforge_token'),
  setWallet: (wallet) => set({ wallet, isLoggedIn: !!wallet }),
  setToken: (token) => {
    if (token) localStorage.setItem('vdforge_token', token);
    else localStorage.removeItem('vdforge_token');
    set({ token });
  },

  projects: [],
  currentProject: null,
  files: [],
  currentFile: null,
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (currentProject) => set({ currentProject }),
  setFiles: (files) => set({ files }),
  setCurrentFile: (currentFile) => set({ currentFile }),
  updateFileContent: (id, content) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, content } : f),
    currentFile: state.currentFile?.id === id ? { ...state.currentFile, content } : state.currentFile
  })),

  compileResult: null,
  isCompiling: false,
  setCompileResult: (compileResult) => set({ compileResult }),
  setIsCompiling: (isCompiling) => set({ isCompiling }),

  solcVersion: '0.8.34',
  evmVersion: 'shanghai',
  optimize: true,
  setSolcVersion: (solcVersion) => set({ solcVersion }),
  setEvmVersion: (evmVersion) => set({ evmVersion }),
  setOptimize: (optimize) => set({ optimize }),

  logs: [],
  addLog: (log) => set((state) => ({ logs: [...state.logs, `[${new Date().toLocaleTimeString()}] ${log}`] })),
  clearLogs: () => set({ logs: [] }),

  txReceipts: [],
  addTxReceipt: (receipt) => set((state) => ({
    txReceipts: [{ ...receipt, id: Date.now() }, ...state.txReceipts]
  })),
  clearTxReceipts: () => set({ txReceipts: [] }),

  deployments: [],
  setDeployments: (deployments) => set({ deployments }),
}));
