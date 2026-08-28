import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/LoginLight';
import Overview from './pages/OverviewLight';
import Agents from './pages/AgentsLight';
import Sessions from './pages/SessionsLight';
import Events from './pages/EventsLight';
import Decisions from './pages/DecisionsLight';
import Investigations from './pages/InvestigationsLight';
import AttackChains from './pages/AttackChainsLight';
import Alerts from './pages/AlertsLight';
import Simulations from './pages/Simulations';
import './index.css';
import './lightTheme.css';
import './attackChains.css';
import './simulations.css';

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
            <Route path="decisions" element={<Decisions />} />
            <Route path="investigations" element={<Investigations />} />
            <Route path="activity" element={<Navigate to="/events" replace />} />
            <Route path="attack-chains" element={<AttackChains />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="simulations" element={<Simulations />} />
          </Route>
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
