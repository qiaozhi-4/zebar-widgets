import { createRoot } from 'react-dom/client';
import { isHosted } from '../lib/useZebar';
import '../styles/base.css';
import './panel.css';
import { App } from './App';

if (!isHosted) document.documentElement.dataset.preview = '';

createRoot(document.getElementById('root')!).render(<App />);
