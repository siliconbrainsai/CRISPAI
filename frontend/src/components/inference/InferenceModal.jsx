import React, { useState } from 'react';
import { runInference } from '../../services/api';
import { Activity } from 'lucide-react';

const InferenceModal = () => {
    const [patientData, setPatientData] = useState('{\n  "age": 45,\n  "biomarker_1": 1.2\n}');
    const [file, setFile] = useState(null);
    const [result, setResult] = useState(null);
    const [simVal, setSimVal] = useState(1.2);
    const simulatedProb = Math.min(100, Math.max(0, (simVal / 3.0) * 100)).toFixed(1);

    const handlePredict = async () => {
        const formData = new FormData();
        formData.append('patient_data', patientData);
        if (file) formData.append('scan', file);

        try {
            const res = await runInference(formData);
            setResult(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-6 bg-slate-900 rounded-lg text-slate-100 shadow-xl mt-4">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Activity className="text-indigo-500" /> Live Causal Inference Console
            </h2>
            
            <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-2">Patient Variables (JSON)</label>
                    <textarea 
                        className="w-full h-32 bg-slate-800 text-slate-100 p-3 rounded border border-slate-700 focus:border-indigo-500 outline-none font-mono text-sm"
                        value={patientData}
                        onChange={(e) => setPatientData(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-2">Patient Scan (Optional)</label>
                    <input 
                        type="file" 
                        onChange={(e) => setFile(e.target.files[0])}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                    />
                    <button 
                        onClick={handlePredict}
                        className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded transition shadow-lg shadow-indigo-500/30"
                    >
                        Run Diagnosis
                    </button>
                </div>
            </div>

            {result && (
                <div className="mt-6 p-4 bg-slate-800 rounded border border-slate-700">
                    <h3 className="font-bold text-lg mb-2">Diagnosis Result</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-slate-700 p-3 rounded">
                            <span className="block text-sm text-slate-400">Diagnosis</span>
                            <span className={`text-2xl font-bold ${result.diagnosis === 1 ? 'text-red-400' : 'text-green-400'}`}>
                                {result.diagnosis === 1 ? 'Positive' : 'Negative'}
                            </span>
                        </div>
                        <div className="bg-slate-700 p-3 rounded">
                            <span className="block text-sm text-slate-400">Confidence</span>
                            <span className="text-xl font-bold text-slate-200">
                                {result.confidence_interval[0]} - {result.confidence_interval[1]}
                            </span>
                        </div>
                        <div className="bg-slate-700 p-3 rounded">
                            <span className="block text-sm text-slate-400">Causal Factors</span>
                            <div className="flex flex-wrap gap-1 justify-center mt-1">
                                {result.causal_factors.map(f => (
                                    <span key={f} className="bg-slate-600 px-2 py-1 rounded text-xs">{f}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-6 border-t border-slate-700 pt-6">
                <h3 className="font-bold text-lg mb-4 text-indigo-400">Counterfactual (What-if) Simulator</h3>
                <div className="bg-slate-800 p-4 rounded border border-slate-700">
                    <label className="block text-sm font-medium mb-2">Adjust biomarker_1: {simVal}</label>
                    <input 
                        type="range" min="0" max="5" step="0.1"
                        value={simVal}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setSimVal(val);
                            try {
                                const parsed = JSON.parse(patientData);
                                parsed.biomarker_1 = val;
                                setPatientData(JSON.stringify(parsed, null, 2));
                            } catch(err) {}
                        }}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mb-4"
                    />
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-400">Simulated Disease Probability:</span>
                        <span className={`text-xl font-bold ${simulatedProb > 50 ? 'text-red-400' : 'text-green-400'}`}>
                            {simulatedProb}%
                        </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2.5 mt-2 overflow-hidden">
                        <div className={`h-2.5 rounded-full ${simulatedProb > 50 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${simulatedProb}%`, transition: 'width 0.3s ease' }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InferenceModal;
