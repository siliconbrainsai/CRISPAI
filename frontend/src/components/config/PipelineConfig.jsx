import React, { useState } from 'react';
import { Play, Loader2, AlertCircle } from 'lucide-react';
import { runPipeline } from '../../services/api';

const PipelineConfig = ({ onJobStarted, datasetId, outcome, candidates, environments, onStartPipeline }) => {
    const [alpha, setAlpha] = useState(0.05);
    const [models, setModels] = useState({ IRM: true, ICP: true, PC: true, RF: true });
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    const handleRun = async () => {
        setSubmitting(true);
        setErrorMsg(null);
        const selectedModels = Object.keys(models).filter(m => models[m]);
        const alphaVal = parseFloat(alpha);

        if (onStartPipeline) {
            try {
                await onStartPipeline({ models: selectedModels, alpha: alphaVal });
            } catch (err) {
                setErrorMsg(err.message || 'Failed to start pipeline');
                setSubmitting(false);
            }
            return;
        }

        const config = {
            models: selectedModels,
            alpha: alphaVal,
            environment_keys: environments && environments.length > 0 ? environments : ["env_split"],
            environments: environments && environments.length > 0 ? environments : null,
            dataset_id: datasetId || null,
            outcome: outcome || null,
            candidates: candidates && candidates.length > 0 ? candidates : null
        };
        try {
            const res = await runPipeline(config);
            if (onJobStarted) onJobStarted(res.data.job_id);
        } catch (error) {
            console.error(error);
            setErrorMsg(error.response?.data?.detail || error.message || 'Pipeline submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 bg-slate-900 rounded-lg text-slate-100 shadow-xl mt-4">
            <h2 className="text-xl font-bold mb-4">Pipeline Configuration</h2>

            {errorMsg && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-sm flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}
            
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Significance Threshold (α): {alpha}</label>
                <input 
                    type="range" min="0.01" max="0.1" step="0.01" 
                    value={alpha} onChange={(e) => setAlpha(e.target.value)} 
                    className="w-full accent-indigo-500"
                />
            </div>

            <div className="flex flex-wrap gap-4 mb-6">
                {Object.keys(models).map(model => (
                    <label key={model} className="flex items-center gap-2 cursor-pointer bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
                        <input 
                            type="checkbox" checked={models[model]} 
                            onChange={() => setModels({...models, [model]: !models[model]})} 
                            className="form-checkbox h-4 w-4 text-indigo-600 rounded"
                        />
                        <span className="text-sm font-medium">{model}</span>
                    </label>
                ))}
            </div>

            <button 
                onClick={handleRun}
                disabled={submitting}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-6 py-2.5 rounded-lg font-bold transition shadow-lg shadow-indigo-600/20"
            >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />} 
                {submitting ? 'Initiating Pipeline...' : 'Run CRISP Pipeline'}
            </button>
        </div>
    );
};

export default PipelineConfig;
