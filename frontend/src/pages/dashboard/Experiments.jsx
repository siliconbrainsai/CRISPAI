import React, { useState, useEffect, useCallback } from 'react';
import { FlaskConical, Plus, Play, Activity, AlertCircle, Loader2, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { getExperiments, createExperiment, getDatasets } from '../../services/api';

const Experiments = () => {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [availableDatasets, setAvailableDatasets] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    hypothesis: '',
    dataset_name: '',
    outcome: '',
    treatment: '',
    environment: '',
    methodology: 'Invariant Risk Minimization (IRM)'
  });

  const fetchExperiments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getExperiments();
      setExperiments(res.data || []);
    } catch (err) {
      console.error('Failed to load experiments:', err);
      setError(err.message || 'Backend unavailable. Unable to load experiments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExperiments();
    getDatasets()
      .then(res => setAvailableDatasets(res.data || []))
      .catch(() => {});
  }, [fetchExperiments]);

  const handleCreateExperiment = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Please enter an experiment name.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createExperiment({
        name: formData.name,
        hypothesis: formData.hypothesis,
        dataset_name: formData.dataset_name,
        outcome: formData.outcome,
        treatment: formData.treatment,
        environment: formData.environment,
        methodology: formData.methodology,
        status: 'RUNNING'
      });

      setShowModal(false);
      setFormData({
        name: '',
        hypothesis: '',
        dataset_name: '',
        outcome: '',
        treatment: '',
        environment: '',
        methodology: 'Invariant Risk Minimization (IRM)'
      });
      fetchExperiments();
    } catch (err) {
      console.error('Failed to create experiment:', err);
      setFormError(err.message || 'Failed to save experiment to database.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Experiments</h1>
          <p className="text-sm text-slate-400 mt-1">Design and track causal hypothesis tests</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchExperiments}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
            title="Refresh Experiments"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition"
          >
            <Plus size={16} /> New Experiment
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center shadow-lg">
          <Loader2 className="animate-spin text-indigo-400 mb-3" size={32} />
          <h3 className="text-lg font-bold text-white mb-1">Loading Experiments...</h3>
          <p className="text-slate-400 text-sm">Fetching verified experiments from SQLite database</p>
        </div>
      ) : error ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center shadow-lg">
          <AlertCircle className="text-rose-400 mb-3" size={40} />
          <h3 className="text-lg font-bold text-white mb-1">Backend Unavailable</h3>
          <p className="text-slate-400 text-sm max-w-sm mb-4">{error}</p>
          <button 
            onClick={fetchExperiments}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition"
          >
            Retry
          </button>
        </div>
      ) : experiments.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center shadow-lg">
          <FlaskConical size={48} className="text-slate-700 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Active Experiments</h3>
          <p className="text-slate-400 max-w-md mb-6">Design an experiment to test specific causal hypotheses across different environments.</p>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2.5 px-5 rounded-lg transition flex items-center gap-2"
          >
            <Plus size={16} /> Create Experiment
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Experiment</th>
                <th className="px-6 py-4 font-medium">Methodology</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Created Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {experiments.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-800/50 transition">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <FlaskConical size={16} />
                    </div>
                    <div>
                      <span className="font-semibold text-white block">{exp.name}</span>
                      {exp.hypothesis && (
                        <span className="text-xs text-slate-400 line-clamp-1 italic max-w-xs">"{exp.hypothesis}"</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded border border-slate-700">
                      {exp.methodology || 'IRM'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-emerald-500/20 px-2.5 py-1 rounded-full text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                      {exp.status || 'RUNNING'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(exp.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition" title="View Results">
                      <Activity size={16} />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition" title="Re-Run Pipeline">
                      <Play size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-slate-950/40 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center">
            <span>Showing {experiments.length} experiment{experiments.length !== 1 ? 's' : ''} (SQLite Single Source of Truth)</span>
          </div>
        </div>
      )}

      {/* Modal for Creating New Experiment */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FlaskConical className="text-indigo-400" size={20} />
                <h3 className="text-lg font-bold text-white">Create New Experiment</h3>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="text-rose-400" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateExperiment} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Experiment Name *</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Invariant Biomarker Efficacy Test"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Causal Hypothesis</label>
                <textarea 
                  value={formData.hypothesis}
                  onChange={(e) => setFormData({ ...formData, hypothesis: e.target.value })}
                  placeholder="e.g., Biomarker_1 causally regulates outcome regardless of hospital site shift"
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Treatment Variable</label>
                  <input 
                    type="text" 
                    value={formData.treatment}
                    onChange={(e) => setFormData({ ...formData, treatment: e.target.value })}
                    placeholder="e.g. drug_dose"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Outcome Target</label>
                  <input 
                    type="text" 
                    value={formData.outcome}
                    onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                    placeholder="e.g. diagnosis"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Environment Split</label>
                  <input 
                    type="text" 
                    value={formData.environment}
                    onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                    placeholder="e.g. env_split"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Methodology</label>
                  <select 
                    value={formData.methodology}
                    onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Invariant Risk Minimization (IRM)">Invariant Risk Minimization (IRM)</option>
                    <option value="Invariant Causal Prediction (ICP)">Invariant Causal Prediction (ICP)</option>
                    <option value="Nonlinear Invariant Causal Prediction">Nonlinear ICP</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg transition flex items-center gap-2"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  <span>Save Experiment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Experiments;

