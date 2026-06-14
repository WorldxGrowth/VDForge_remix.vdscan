import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global styles
const style = document.createElement('style');
style.textContent = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a16; color: #fff; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #0a0a16; }
  ::-webkit-scrollbar-thumb { background: #2d2d4e; border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: #6c63ff; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
