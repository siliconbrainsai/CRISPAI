import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { BrainCircuit, ShieldCheck, Network, ArrowRight } from 'lucide-react';

const Home = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex-grow flex items-center justify-center pt-20 pb-32 px-6 relative overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block py-1 px-3 rounded-full bg-slate-800 border border-slate-700 text-indigo-400 text-sm font-semibold mb-6">
              Introducing CRISP AI 3.0
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-tight">
              Uncover the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">True Causes</span> <br/> Hidden in Your Data.
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Move beyond fragile correlations. Our enterprise Causal AI platform discovers invariant risk factors across dynamic environments, ensuring your models are robust, interpretable, and safe.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-full flex items-center gap-2 transition-all transform hover:scale-105 w-full sm:w-auto justify-center shadow-xl shadow-indigo-500/20">
                Start Free Trial <ArrowRight size={20} />
              </Link>
              <Link to="/services" className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 px-8 rounded-full border border-slate-700 transition w-full sm:w-auto justify-center text-center">
                Explore Enterprise
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-900/50 border-y border-slate-800 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose CRISP?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Our revolutionary Invariant Risk Minimization (IRM) algorithms redefine how machine learning models generalize.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div whileHover={{ y: -10 }} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl transition-all">
              <div className="w-14 h-14 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 mb-6">
                <BrainCircuit size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Causal Discovery</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Identify variables that actually drive outcomes, not just spurious correlations caused by dataset bias or confounding factors.</p>
            </motion.div>

            <motion.div whileHover={{ y: -10 }} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl transition-all">
              <div className="w-14 h-14 bg-cyan-500/20 rounded-xl flex items-center justify-center text-cyan-400 mb-6">
                <Network size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Multi-Modal Fusion</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Seamlessly integrate tabular patient data with high-dimensional image scans (MRI, X-Ray) for a comprehensive diagnostic view.</p>
            </motion.div>

            <motion.div whileHover={{ y: -10 }} className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl transition-all">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 mb-6">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-bold mb-3">Invariant Robustness</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Deploy models that perform consistently across different hospitals, demographics, and environments without retraining.</p>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
