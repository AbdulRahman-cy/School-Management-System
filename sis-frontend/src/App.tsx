import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import UniversityPortal from './pages/Dashboard';
import AuthPage from './pages/Authpage';

const queryClient = new QueryClient();

function SplashSpinner() {
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#f5f3ff', gap: 20,
    }}>
      <svg width="48" height="48" viewBox="0 0 48 48"
        style={{ animation: 'spin 0.9s linear infinite' }}>
        <circle cx="24" cy="24" r="20" fill="none" stroke="#ede9fe" strokeWidth="4" />
        <path d="M24 4 A20 20 0 0 1 44 24" fill="none" stroke="#7c3aed"
          strokeWidth="4" strokeLinecap="round" />
      </svg>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, isLoading, handleLoginSuccess } = useAuth();

  if (isLoading)       return <SplashSpinner />;
  if (isAuthenticated) return <UniversityPortal />;
  return <AuthPage onLoginSuccess={handleLoginSuccess} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  );
}