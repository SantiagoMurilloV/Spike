import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { DataProvider } from './context/DataContext';
import { AuthProvider } from './context/AuthContext';
import { OfflineBanner } from './components/OfflineBanner';
import { ServerWakingBanner } from './components/ServerWakingBanner';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors closeButton />
        <OfflineBanner />
        <ServerWakingBanner />
      </DataProvider>
    </AuthProvider>
  );
}
