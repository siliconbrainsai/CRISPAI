import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, LogOut, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, workspaceName, isAuthenticated, logout } = useAuth();
  
  // Public routes where we show standard navigation
  const publicRoutes = ['/', '/about', '/services', '/contact', '/auth'];
  const isAppRoute = !publicRoutes.includes(location.pathname);

  const publicLinks = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Services', path: '/services' },
    { name: 'Contact Us', path: '/contact' },
    { name: 'Dashboard', path: '/dashboard' }
  ];

  const dashboardLinks = [
    { name: 'Overview', path: '/dashboard' },
    { name: 'Data Sources', path: '/data-sources' },
    { name: 'Causal Engine', path: '/causal-engine' },
    { name: 'Analysis', path: '/analysis' },
    { name: 'Reports', path: '/reports' },
    { name: 'Audit Trail', path: '/audit' }
  ];

  const activeLinks = isAppRoute ? dashboardLinks : publicLinks;

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const getRoleBadgeStyle = (r) => {
    switch (r) {
      case 'Admin':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'Data Scientist':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'Analyst':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600';
    }
  };

  return (
    <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Activity className="text-indigo-500 group-hover:text-cyan-400 transition-colors" size={28} />
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 leading-none">
              CRISP<span className="text-slate-500 font-light ml-1">AI</span>
            </h1>
            <span className="text-[10px] text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mt-0.5 font-bold tracking-wider uppercase">Powered by SiliconbrainsAI</span>
          </div>
        </Link>
        
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          {activeLinks.map(link => (
            <Link 
              key={link.name} 
              to={link.path}
              onClick={(e) => {
                if (!isAppRoute && link.name === 'Dashboard' && !isAuthenticated) {
                  e.preventDefault();
                  navigate('/auth');
                }
              }}
              className={`transition-colors hover:text-indigo-400 ${location.pathname === link.path ? 'text-indigo-400 font-semibold' : 'text-slate-300'}`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {!isAuthenticated ? (
            <>
              <Link to="/auth" className="text-sm font-semibold text-slate-300 hover:text-white transition">Sign In</Link>
              <Link to="/auth" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2 px-5 rounded-full shadow-lg shadow-indigo-500/30 transition-all transform hover:scale-105">
                Get Started
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="text-xs font-bold text-white">{user?.name || user?.email}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(role)}`}>
                    {role}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">{workspaceName}</span>
              </div>
              <div className="w-8 h-8 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center text-indigo-400 font-bold text-xs">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors ml-1"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
