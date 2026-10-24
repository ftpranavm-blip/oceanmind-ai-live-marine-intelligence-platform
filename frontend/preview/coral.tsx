// Renders the real Coral module outside the app shell (no login, no canister).
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import CoralModule from '../src/pages/CoralModule';
import '../src/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <CoralModule />
    <Toaster />
  </ThemeProvider>,
);
