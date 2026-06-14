import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://remix.vdscan.io/api',
  headers: { 'Content-Type': 'application/json' }
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('vdforge_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  getNonce: (wallet: string) => API.get(`/auth/nonce/${wallet}`),
  verify: (wallet: string, signature: string) => API.post('/auth/verify', { wallet, signature }),
  me: () => API.get('/auth/me'),
};

export const projectsAPI = {
  getAll: () => API.get('/projects'),
  create: (name: string, description?: string) => API.post('/projects', { name, description }),
  delete: (id: string) => API.delete(`/projects/${id}`),
};

export const filesAPI = {
  getAll: (projectId: string) => API.get(`/files/${projectId}`),
  create: (project_id: string, name: string, content?: string, folder_path?: string, type?: string) =>
    API.post('/files', { project_id, name, content, folder_path: folder_path || '', type: type || 'file' }),
  update: (id: string, content: string, name?: string) =>
    API.put(`/files/${id}`, { content, name }),
  rename: (id: string, name: string) =>
    API.put(`/files/${id}`, { name }),
  delete: (id: string) => API.delete(`/files/${id}`),
};

export const deploymentsAPI = {
  save: (data: any) => API.post('/deployments', data),
  getAll: () => API.get('/deployments'),
  getRecent: () => API.get('/deployments/recent'),
};

export const compileAPI = {
  log: (data: any) => API.post('/compile', data),
  history: (userId: string) => API.get(`/compile/history?userId=${userId}`),
};

export default API;

export const importAPI = {
  fromUrl: (url: string) => API.post('/import', { url }),
};
