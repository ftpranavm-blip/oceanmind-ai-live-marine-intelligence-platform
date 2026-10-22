// Renders the real IoT module outside the app shell (no login, no canister).
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import IoTModule from '../src/pages/IoTModule';
import '../src/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
    <IoTModule />
    <Toaster />
  </ThemeProvider>,
);
