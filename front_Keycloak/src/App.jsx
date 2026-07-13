import { Routes, Route } from 'react-router-dom';

// components
import { ProtectedRoute } from './components/ProtectedRoute';

// pages
import { LandingPage } from './pages/LandingPage/LandinPage';
import { Home } from './pages/home/Home';
import { AuthPage } from './pages/Auth/AuthPage';
import { ResetPasswordPage } from './pages/Auth/ResetPasswordPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
