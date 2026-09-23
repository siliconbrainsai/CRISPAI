import React from 'react';
import { Activity, Code, MessageCircle, Share2 } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 pt-16 pb-8 text-slate-400 mt-20">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Activity className="text-indigo-500" size={24} />
              <h2 className="text-xl font-black tracking-tight text-slate-100">CRISPAI</h2>
            </div>
            <span className="text-[10px] text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mt-1 font-bold tracking-wider uppercase">Powered by SiliconbrainsAI</span>
          </div>
          <p className="text-sm">
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
            <li><a href="#" className="hover:text-indigo-400 transition">Causal Engine</a></li>
            <li><a href="#" className="hover:text-indigo-400 transition">Multi-modal Pipeline</a></li>
            <li><a href="#" className="hover:text-indigo-400 transition">API Documentation</a></li>
            <li><a href="#" className="hover:text-indigo-400 transition">Enterprise Security</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-slate-100 font-bold mb-4">Company</h3>
          <ul className="space-y-2 text-sm">
            <li><a href="/about" className="hover:text-indigo-400 transition">About Us</a></li>
            <li><a href="/services" className="hover:text-indigo-400 transition">Services</a></li>
            <li><a href="#" className="hover:text-indigo-400 transition">Careers</a></li>
            <li><a href="/contact" className="hover:text-indigo-400 transition">Contact</a></li>
          </ul>
        </div>

        <div>
          <h3 className="text-slate-100 font-bold mb-4">Subscribe</h3>
          <p className="text-sm mb-4">Get the latest updates on Causal AI research and product releases.</p>
          <div className="flex">
            <input type="email" placeholder="Enter email" className="bg-slate-900 border border-slate-800 rounded-l px-4 py-2 w-full text-sm outline-none focus:border-indigo-500 text-slate-100" />
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-r font-bold text-sm transition">Join</button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between text-xs">
        <p>&copy; {new Date().getFullYear()} CRISP AI. All rights reserved.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <a href="#" className="hover:text-white transition">Privacy Policy</a>
          <a href="#" className="hover:text-white transition">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
