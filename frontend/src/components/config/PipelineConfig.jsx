import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { runPipeline } from '../../services/api';

const PipelineConfig = ({ onJobStarted }) => {
    const [alpha, setAlpha] = useState(0.05);
    const [models, setModels] = useState({ IRM: true, ICP: true, NLICP: true, RF: true });

    const handleRun = async () => {
        const config = {
            models: Object.keys(models).filter(m => models[m]),
            alpha: parseFloat(alpha),
            environment_keys: ["env_split"]
        };
        try {
            const res = await runPipeline(config);
            onJobStarted(res.data.job_id);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-6 bg-slate-900 rounded-lg text-slate-100 shadow-xl mt-4">
            <h2 className="text-xl font-bold mb-4">Pipeline Configuration</h2>
            
            <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Significance Threshold (α): {alpha}</label>
                <input 
                    type="range" min="0.01" max="0.1" step="0.01" 
                    value={alpha} onChange={(e) => setAlpha(e.target.value)} 
                    className="w-full accent-indigo-500"
                />
            </div>

            <div className="flex gap-4 mb-6">
                {Object.keys(models).map(model => (
                    <label key={model} className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" checked={models[model]} 
                            onChange={() => setModels({...models, [model]: !models[model]})} 
                            className="form-checkbox h-4 w-4 text-indigo-600 rounded"
                        />
                        <span>{model}</span>
                    </label>
                ))}
            </div>

            <button 
                onClick={handleRun}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded font-bold transition"
            >
                <Play size={20} /> Run CRISP Pipeline
            </button>
        </div>
    );
};

export default PipelineConfig;
