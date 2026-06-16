import { RouterProvider } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { router } from './app/routes';

const App = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
