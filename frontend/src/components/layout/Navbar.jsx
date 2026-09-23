import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const links = [
    { name: 'Home', path: '/' },
    { name: 'About Us', path: '/about' },
    { name: 'Services', path: '/services' },
    { name: 'Contact Us', path: '/contact' },
    { name: 'Dashboard', path: '/dashboard' }
  ];

  return (
    <nav className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Activity className="text-indigo-500 group-hover:text-cyan-400 transition-colors" size={28} />
          <div className="flex flex-col justify-center">
            <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 leading-none">
              CRISP<span className="text-slate-500 font-light ml-1">AI</span>
            </h1>
            <span className="text-[10px] text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mt-0.5 font-bold tracking-wider uppercase">Powered by SiliconbrainsAI</span>
          </div>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          {links.map(link => (
            <Link 
              key={link.name} 
              to={link.path}
              onClick={(e) => {
                if (link.name === 'Dashboard') {
                  e.preventDefault();
                  navigate('/auth');
                }
              }}
              className={`transition-colors hover:text-indigo-400 ${location.pathname === link.path ? 'text-indigo-400' : 'text-slate-300'}`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link to="/auth" className="text-sm font-semibold text-slate-300 hover:text-white transition">Sign In</Link>
          <Link to="/auth" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2 px-5 rounded-full shadow-lg shadow-indigo-500/30 transition-all transform hover:scale-105">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
