import { Routes, Route } from 'react-router-dom';

// components
import { ProtectedRoute } from './components/ProtectedRoute';

// pages
import { LandingPage } from './pages/LandingPage/LandinPage';
import { Home } from './pages/home/Home';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
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
