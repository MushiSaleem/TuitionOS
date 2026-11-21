import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {
  applyBrandTheme,
  applyDocumentMetadata,
  getActiveClientConfig,
} from './config/clientConfig';

try {
  const clientConfig = getActiveClientConfig();
  applyBrandTheme(clientConfig);
  applyDocumentMetadata(clientConfig);
} catch (error) {
  console.error('[TuitionOS] Client configuration bootstrap error:', error);
}

createRoot(document.getElementById('root')!).render(<App />);
