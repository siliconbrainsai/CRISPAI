import React from 'react';
import { motion } from 'framer-motion';
import { Server, Zap, LineChart } from 'lucide-react';

const Services = () => {
  return (
    <div className="py-20 px-6 max-w-6xl mx-auto min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <h1 className="text-4xl md:text-6xl font-black mb-6">Enterprise <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Solutions</span></h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto">Scale your Causal AI workloads securely with our premium API and tailored enterprise architecture.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          {
            icon: <Server size={32} className="text-indigo-400" />,
            title: "On-Premise Deployment",
            desc: "Deploy the CRISP pipeline entirely within your secure VPC. Full HIPAA/GDPR compliance for sensitive medical data."
          },
          {
            icon: <Zap size={32} className="text-cyan-400" />,
            title: "High-Volume API API",
            desc: "RESTful and gRPC endpoints to process thousands of multi-modal diagnostic scans in real-time."
          },
          {
            icon: <LineChart size={32} className="text-emerald-400" />,
            title: "Custom Causal Modeling",
            desc: "Our elite team of researchers will design custom Invariant Risk Minimization algorithms tailored to your unique datasets."
          }
        ].map((service, idx) => (
          <motion.div 
            key={idx}
            whileHover={{ y: -10 }}
            className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
              {service.icon}
            </div>
            <h3 className="text-xl font-bold mb-4 text-white">{service.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{service.desc}</p>
            <button className="mt-8 text-indigo-400 font-semibold hover:text-indigo-300 transition">Learn More &rarr;</button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Services;
