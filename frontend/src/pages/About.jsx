import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const About = () => {
  return (
    <div className="py-20 px-6 max-w-5xl mx-auto min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-4xl md:text-6xl font-black mb-8">
          Redefining AI with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Causality</span>.
        </h1>
        <p className="text-xl text-slate-400 mb-12 leading-relaxed max-w-3xl">
          At CRISP AI, we believe that correlation is not enough. Machine learning models today are brittle, biased, and often fail when deployed in the real world because they rely on spurious correlations. Our mission is to embed true causal reasoning into the heart of AI.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
            <h3 className="text-2xl font-bold mb-4 text-white">Our Vision</h3>
            <p className="text-slate-400 leading-relaxed">
              We envision a world where AI systems make decisions based on the underlying laws of nature and biology, not just surface-level patterns. Whether it's diagnosing astronauts in microgravity or analyzing complex cancer scans, our AI remains invariant.
            </p>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-2xl font-bold mb-6 text-white">Why Causality Matters</h3>
            {[
              'Eliminates Dataset Bias',
              'Ensures Robust Generalization',
              'Provides True Interpretability',
              'Reduces Catastrophic Failures'
            ].map(item => (
              <div key={item} className="flex items-center gap-3 bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                <CheckCircle2 className="text-indigo-400" size={24} />
                <span className="font-semibold text-slate-200">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default About;
