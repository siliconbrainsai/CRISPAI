import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, User, ArrowLeft, Shield, Building, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Data Scientist');
  const [workspaceName, setWorkspaceName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const result = await login(email, password);
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.error);
        }
      } else {
        const result = await register({
          email,
          name,
          password,
          role,
          workspace_name: workspaceName
        });
        if (result.success) {
          navigate('/dashboard');
        } else {
          setError(result.error);
        }
      }
    } catch (err) {
      setError(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
    setLoading(true);

    try {
      const result = await login(demoEmail, demoPassword);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-slate-950">
      {/* Dynamic ambient backgrounds */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-indigo-600/30 blur-[150px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-cyan-600/20 blur-[150px] rounded-full mix-blend-screen"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full space-y-6 bg-slate-900/90 backdrop-blur-xl p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl relative z-10"
      >
        <Link to="/" className="absolute top-6 left-6 text-slate-400 hover:text-white transition p-2 rounded-full hover:bg-slate-800">
          <ArrowLeft size={20} />
        </Link>
        <div className="text-center pt-2">
          <div className="mx-auto w-14 h-14 bg-indigo-500/20 rounded-full flex items-center justify-center mb-3">
            <Activity className="text-indigo-400" size={28} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-1">
            {isLogin ? 'Sign In to CRISP AI' : 'Create Enterprise Account'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            {isLogin ? 'Multi-tenant causal inference & invariant feature selection' : 'Join a workspace or create a dedicated enterprise tenant'}
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 text-xs sm:text-sm p-3 rounded-xl text-center">
            {error}
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-slate-500" size={16} />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Full Name"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="text-slate-500" size={16} />
                </div>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Workspace Name (e.g. Oncology Labs)"
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield className="text-slate-500" size={16} />
                </div>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-xl bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                >
                  <option value="Data Scientist">Data Scientist (Full Causal Execution)</option>
                  <option value="Analyst">Analyst (Exploration & Reports)</option>
                  <option value="Viewer">Viewer (Read-Only Access)</option>
                  <option value="Admin">Admin (Full Workspace Management)</option>
                </select>
              </div>
            </>
          )}
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="text-slate-500" size={16} />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="Email address"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="text-slate-500" size={16} />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-xl bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-indigo-500/20 shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={18} />
                Authenticating...
              </>
            ) : isLogin ? (
              'Sign In'
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        {isLogin && (
          <div className="pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                1-Click Instant Demo Access
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Sandbox Ready
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('admin@crisp.ai', 'AdminPassword123!')}
                className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 py-2 px-3 rounded-xl text-center border border-indigo-500/30 transition flex flex-col items-center justify-center font-medium disabled:opacity-50"
              >
                <span>Admin (Full Access)</span>
                <span className="text-[10px] text-indigo-400/80 font-normal">admin@crisp.ai</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('analyst@siliconbrain.ai', 'Admin123!')}
                className="bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 hover:text-cyan-200 py-2 px-3 rounded-xl text-center border border-cyan-500/30 transition flex flex-col items-center justify-center font-medium disabled:opacity-50"
              >
                <span>Data Scientist</span>
                <span className="text-[10px] text-cyan-400/80 font-normal">analyst@siliconbrain.ai</span>
              </button>
            </div>
          </div>
        )}

        <div className="text-center text-xs sm:text-sm">
          <p className="text-slate-400">
            {isLogin ? "Don't have an enterprise account? " : 'Already registered? '}
            <button 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="font-medium text-indigo-400 hover:text-indigo-300 transition underline underline-offset-4"
            >
              {isLogin ? 'Register now' : 'Sign in'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
