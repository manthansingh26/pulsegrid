import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Server, AlertTriangle } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ServicesPage from './pages/ServicesPage';
import IncidentsPage from './pages/IncidentsPage';
import ServiceDetail from './pages/ServiceDetail';
import IncidentDetail from './pages/IncidentDetail';

function App() {
  const location = useLocation();

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <LayoutDashboard className="text-blue-500" />
            PulseGrid
          </div>
        </div>
        <nav>
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          <Link 
            to="/services" 
            className={`nav-link ${location.pathname.startsWith('/services') ? 'active' : ''}`}
          >
            <Server size={18} /> Services
          </Link>
          <Link 
            to="/incidents" 
            className={`nav-link ${location.pathname.startsWith('/incidents') ? 'active' : ''}`}
          >
            <AlertTriangle size={18} /> Incidents
          </Link>
        </nav>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:id" element={<ServiceDetail />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
