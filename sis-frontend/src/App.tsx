import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import UniversityPortal from './pages/Dashboard';
import AuthPage from './pages/Authpage';
import { getAccessToken } from './api/auth';

const queryClient = new QueryClient();

function App() {
  // Access token lives in memory — on a hard refresh it's gone, so we always
  // start unauthenticated and let the silent-refresh interceptor recover the
  // session via the HttpOnly cookie on the first protected request.
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    // AuthPage dispatches this after a successful login or register
    const onLogin   = () => setAuthed(true);

    // apiClient interceptor dispatches this when the refresh cookie is also
    // expired (e.g. user was away for 7+ days)
    const onExpired = () => {
      setAuthed(false);
      queryClient.clear(); // wipe any cached data from the previous session
    };

    window.addEventListener('auth:login',   onLogin);
    window.addEventListener('auth:expired', onExpired);

    return () => {
      window.removeEventListener('auth:login',   onLogin);
      window.removeEventListener('auth:expired', onExpired);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {authed ? <UniversityPortal /> : <AuthPage />}
    </QueryClientProvider>
  );
}

export default App;