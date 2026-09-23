import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Phone, Mail } from 'lucide-react';

const Contact = () => {
  return (
    <div className="py-20 px-6 max-w-6xl mx-auto min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-16"
      >
        <div>
          <h1 className="text-4xl md:text-6xl font-black mb-6">Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Touch</span></h1>
          <p className="text-xl text-slate-400 mb-12">Interested in integrating CRISP AI into your organization? Our team is ready to assist you.</p>
          
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
                <MapPin size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white">Headquarters</h4>
                <p className="text-slate-400 text-sm">
                  16-1-486, Sree Gayathri Enclave, A/5,<br />
                  Teen Manzil Colony, Saidabad,<br />
                  Hyderabad, Telangana – 500059, India
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400">
                <Mail size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white">Email Us</h4>
                <div className="text-slate-400 text-sm flex flex-col gap-1 mt-1">
                  <a href="mailto:info@siliconbrainsai.com" className="hover:text-indigo-400 transition">info@siliconbrainsai.com</a>
                  <a href="mailto:contact@siliconbrainsai.com" className="hover:text-indigo-400 transition">contact@siliconbrainsai.com</a>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
                <Phone size={24} />
              </div>
              <div>
                <h4 className="font-bold text-white">Call Us</h4>
                <a href="tel:+916304001323" className="text-slate-400 text-sm hover:text-indigo-400 transition block mt-1">+91-630-400-1323</a>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
          <form className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">First Name</label>
                <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Last Name</label>
                <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Work Email</label>
              <input type="email" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Message</label>
              <textarea rows="4" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition"></textarea>
            </div>
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-lg transition-colors shadow-lg shadow-indigo-500/20">
              Send Message
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Contact;
