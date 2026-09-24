import React, { useState } from 'react';
import { Activity, Code, MessageCircle, Share2, CheckCircle2, AlertCircle, Loader2, Mail, ArrowRight } from 'lucide-react';
import { subscribeNewsletter } from '../../services/api';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setStatus('error');
      setFeedback('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setStatus('error');
      setFeedback('Please enter a valid email address.');
      return;
    }

    setStatus('loading');
    setFeedback('');

    try {
      const res = await subscribeNewsletter(cleanEmail);
      setStatus('success');
      setFeedback(res.data?.message || 'Thank you! You are now subscribed to CRISP AI updates.');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setFeedback(err.response?.data?.detail || err.message || 'Subscription failed. Please try again.');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setFeedback('');
    setEmail('');
  };

  return (
    <footer className="bg-slate-950 border-t border-slate-900 pt-16 pb-8 text-slate-400 mt-20">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Activity className="text-indigo-500" size={24} />
              <h2 className="text-xl font-black tracking-tight text-slate-100">CRISPAI</h2>
            </div>
            <span className="text-[10px] text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mt-1 font-bold tracking-wider uppercase">
              Powered by SiliconbrainsAI
            </span>
          </div>
          <p className="text-sm leading-relaxed">
            Pioneering Causal AI for robust, interpretable, and invariant predictive modeling across dynamic environments.
          </p>
          <div className="flex gap-4 mt-4">
            <Code className="hover:text-indigo-400 cursor-pointer transition" size={20} />
            <MessageCircle className="hover:text-indigo-400 cursor-pointer transition" size={20} />
            <Share2 className="hover:text-indigo-400 cursor-pointer transition" size={20} />
          </div>
        </div>

        <div>
          <h3 className="text-slate-100 font-bold mb-4">Platform</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="/causal-engine" className="hover:text-indigo-400 transition">Causal Engine</a></li>
            <li><a href="/analysis" className="hover:text-indigo-400 transition">Analysis & DAGs</a></li>
            <li><a href="/data-sources" className="hover:text-indigo-400 transition">Data Sources</a></li>
            <li><a href="/reports" className="hover:text-indigo-400 transition">Scientific Reports</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-slate-100 font-bold mb-4">Company</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="/about" className="hover:text-indigo-400 transition">About Us</a></li>
            <li><a href="/services" className="hover:text-indigo-400 transition">Services</a></li>
            <li><a href="/audit" className="hover:text-indigo-400 transition">Audit Trail</a></li>
            <li><a href="/contact" className="hover:text-indigo-400 transition">Contact</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-slate-100 font-bold mb-4 flex items-center gap-2">
            <Mail size={18} className="text-indigo-400" />
            <span>Subscribe</span>
          </h3>
          <p className="text-sm mb-4 leading-relaxed">
            Get the latest updates on Causal AI research and product releases.
          </p>

          {status === 'success' ? (
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 text-emerald-300 text-sm space-y-2 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                <p className="font-medium text-xs leading-relaxed">{feedback}</p>
              </div>
              <button 
                onClick={handleReset}
                className="text-[11px] text-emerald-400 hover:text-emerald-200 underline font-medium cursor-pointer transition block"
              >
                Subscribe another email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2">
              <div className="flex rounded-lg overflow-hidden border border-slate-800 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition shadow-sm">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  disabled={status === 'loading'}
                  placeholder="Enter your email" 
                  className="bg-slate-900 px-3.5 py-2.5 w-full text-sm outline-none text-slate-100 placeholder-slate-500 disabled:opacity-50"
                  aria-label="Email address for newsletter"
                />
                <button 
                  type="submit"
                  disabled={status === 'loading'}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white px-4 font-bold text-sm transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed shadow-md shadow-indigo-600/20"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span className="sr-only">Subscribing...</span>
                    </>
                  ) : (
                    <>
                      <span>Join</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>

              {status === 'error' && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 px-1 pt-0.5">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{feedback}</span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between text-xs">
        <p>&copy; {new Date().getFullYear()} CRISP AI (Powered by SiliconbrainsAI). All rights reserved.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <a href="#" className="hover:text-white transition">Privacy Policy</a>
          <a href="#" className="hover:text-white transition">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
