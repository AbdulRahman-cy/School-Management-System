import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UniversityPortal from './pages/Dashboard';

// This handles the data-fetching logic for your backend
const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UniversityPortal />
    </QueryClientProvider>
  );
}

export default App;