import React from 'react';
import { Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import DashboardLayout from './components/layout/DashboardLayout';

import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Contact from './pages/Contact';
import Auth from './pages/Auth';

// Enterprise dashboard pages
import Overview from './pages/dashboard/Overview';
import DataSources from './pages/dashboard/DataSources';
import DatasetDetail from './pages/dashboard/DatasetDetail';
import CausalEngine from './pages/dashboard/CausalEngine';
import Analysis from './pages/dashboard/Analysis';
import ModelEvaluation from './pages/dashboard/ModelEvaluation';
import Reports from './pages/dashboard/Reports';
import ReportDetail from './pages/dashboard/ReportDetail';
import Experiments from './pages/dashboard/Experiments';
import ExperimentDetail from './pages/dashboard/ExperimentDetail';
import AuditLog from './pages/dashboard/AuditLog';
import Settings from './pages/dashboard/Settings';

// Route guard for authenticated dashboard areas
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/auth" replace />;
};

function AppContent() {
  const location = useLocation();
  const publicRoutes = ['/', '/about', '/services', '/contact', '/auth'];
  const isPublicRoute = publicRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {isPublicRoute && <Navbar />}
      
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/auth" element={<Auth />} />

            {/* Authenticated Application Routes Guarded by ProtectedRoute */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Overview />} />
                <Route path="/data-sources" element={<DataSources />} />
                <Route path="/data-sources/:id" element={<DatasetDetail />} />
                <Route path="/causal-engine" element={<CausalEngine />} />
                <Route path="/analysis" element={<Analysis />} />
                <Route path="/analysis/:id" element={<Analysis />} />
                <Route path="/models" element={<ModelEvaluation />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/reports/:id" element={<ReportDetail />} />
                <Route path="/experiments" element={<Experiments />} />
                <Route path="/experiments/:id" element={<ExperimentDetail />} />
                <Route path="/audit" element={<AuditLog />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </AnimatePresence>
      </main>

      {isPublicRoute && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <AppContent />
      </WorkspaceProvider>
    </AuthProvider>
  );
}

export default App;
