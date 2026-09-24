import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  FlaskConical, ArrowLeft, Play, Calendar, CheckCircle2, 
  GitFork, Cpu, AlertCircle, Loader2, Sparkles, Layers
} from 'lucide-react';
import { getExperiment } from '../../services/api';
import { useWorkspace } from '../../context/WorkspaceContext';

const ExperimentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setActiveAnalysisConfig } = useWorkspace();

  const [experiment, setExperiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchExperiment = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getExperiment(id);
        setExperiment(res.data);
      } catch (err) {
        setError(err.message || 'Failed to load experiment.');
      } finally {
        setLoading(false);
      }
    };
    fetchExperiment();
  }, [id]);

  const handleLaunch = () => {
    if (experiment) {
      const config = experiment.configuration || {};
      setActiveAnalysisConfig({
        outcome: config.target_variable || 'Outcome',
        candidates: config.candidate_features || [],
        environments: config.environment_keys || ['env_split'],
        alpha: config.alpha || 0.05
      });
      navigate('/causal-engine');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <Loader2 className="animate-spin text-indigo-500 mb-3" size={32} />
        <p className="text-sm">Loading experiment parameters and telemetry...</p>
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="p-6">
        <Link to="/experiments" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition">
          <ArrowLeft size={16} /> Back to Experiments
        </Link>
        <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-8 text-center max-w-lg mx-auto">
          <AlertCircle className="text-red-400 mx-auto mb-3" size={36} />
          <h2 className="text-lg font-bold text-white mb-1">Experiment Not Found</h2>
          <p className="text-slate-400 text-sm mb-6">{error || 'This experiment does not exist or access is restricted.'}</p>
          <Link to="/experiments" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition">
            Return to Experiments
          </Link>
        </div>
      </div>
    );
  }

  const config = experiment.configuration || {};
  const models = config.models || ['IRM', 'ICP', 'PC'];
  const candidates = config.candidate_features || ['Feature_1', 'Feature_2', 'Treatment'];

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/experiments" className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 mb-2 transition">
            <ArrowLeft size={14} /> All Experiments
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <FlaskConical size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{experiment.name}</h1>
              <p className="text-xs text-slate-400">
                Created {new Date(experiment.created_at).toLocaleDateString()} • Tenant Workspace #{experiment.workspace_id}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLaunch}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition transform hover:scale-105"
        >
          <Play size={14} className="fill-current" />
          <span>Execute in Causal Engine</span>
        </button>
      </div>

      {/* Experiment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Hypothesis & Objective */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Research Hypothesis & Objective</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              {experiment.description || 
                'Evaluating invariant causal drivers under interventional shift across heterogeneous observation environments. Identifying direct causal parents while rejecting spurious correlations with high statistical confidence.'}
            </p>
          </div>

          {/* Model Pipeline Specs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Cpu size={16} className="text-indigo-400" />
              Configured Causal Pipeline
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {models.map((m, i) => (
                <div key={i} className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-center">
                  <span className="text-xs font-bold text-white block">{m}</span>
                  <span className="text-[10px] text-indigo-400">Active Estimator</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration Metadata */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Layers size={16} className="text-cyan-400" />
              Parameters
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Target Outcome:</span>
                <span className="font-bold text-white">{config.target_variable || 'Outcome'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Significance Level (α):</span>
                <span className="font-mono text-cyan-400">{config.alpha || 0.05}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Random Seed:</span>
                <span className="font-mono text-slate-300">{config.seed || 42}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Candidate Features:</span>
                <span className="font-bold text-indigo-400">{candidates.length} features</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperimentDetail;
