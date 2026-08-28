import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Agents from './pages/Agents';
import Sessions from './pages/Sessions';
import Events from './pages/Events';
import AttackChains from './pages/AttackChains';
import Simulations from './pages/Simulations';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/overview" replace />} />
            <Route path="overview" element={<Overview />} />
            <Route path="agents" element={<Agents />} />
            <Route path="sessions" element={<Sessions />} />
            <Route path="events" element={<Events />} />
            <Route path="activity" element={<Navigate to="/events" replace />} />
            <Route path="attack-chains" element={<AttackChains />} />
            <Route path="simulations" element={<Simulations />} />
          </Route>
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
