import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { ConfigProvider } from 'antd';
import { useTaskStore } from "./store/taskStore";
import { useProcessInstanceStore } from "./store/processInstanceStore";
import { useAuthStore } from "./store/useAuthStore";

declare global {
  interface Window {
    __stores__?: {
      task: typeof useTaskStore;
      instance: typeof useProcessInstanceStore;
      auth: typeof useAuthStore;
    };
  }
}

if (import.meta.env.DEV) {
  window.__stores__ = {
    task: useTaskStore,
    instance: useProcessInstanceStore,
    auth: useAuthStore,
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);