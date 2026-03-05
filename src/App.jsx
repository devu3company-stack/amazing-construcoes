import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import ToastContainer from './components/ToastContainer';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import FollowUpPage from './pages/FollowUpPage';
import BudgetsPage from './pages/BudgetsPage';
import LoginPage from './pages/LoginPage';
import './index.css';

function ProtectedApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a1a',
        color: '#6366f1',
        fontSize: '1.1rem',
        fontWeight: 600,
      }}>
        Carregando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <DataProvider>
      <BrowserRouter>
        <div className="app-layout">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/follow-up" element={<FollowUpPage />} />
              <Route path="/budgets" element={<BudgetsPage />} />
            </Routes>
          </main>
        </div>
        <ToastContainer />
      </BrowserRouter>
    </DataProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
}

export default App;
