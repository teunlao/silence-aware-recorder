import { SaraudioProvider } from '@saraudio/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <SaraudioProvider>
      <App />
    </SaraudioProvider>
  </React.StrictMode>,
);
