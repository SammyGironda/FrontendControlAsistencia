import React from 'react';
console.log('MAIN.JSX: executing');
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // Assuming you have an index.css for Tailwind
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster position="top-right" />
        <div id="dev-banner" style={{position: 'fixed', right: 12, bottom: 12, background: '#fffb', padding: '8px 12px', borderRadius: 8, boxShadow: '0 2px 6px rgba(0,0,0,0.12)', zIndex: 9999}}>DEV: app loaded</div>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
