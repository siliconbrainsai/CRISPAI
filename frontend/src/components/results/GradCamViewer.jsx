import React from 'react';

const GradCamViewer = ({ gradCamData }) => {
    if (!gradCamData) return null;

    return (
        <div className="p-6 bg-slate-900 rounded-lg text-slate-100 shadow-xl mt-4">
            <h2 className="text-xl font-bold mb-4">Grad-CAM Interactive Viewer</h2>
            <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center">
                    <span className="mb-2 font-semibold text-slate-300">Original Scan</span>
                    <img 
                        src={`data:image/jpeg;base64,${gradCamData.original_image_base64}`} 
                        alt="Original" 
                        className="rounded border border-slate-700 w-full object-cover" 
                    />
                </div>
                <div className="flex flex-col items-center">
                    <span className="mb-2 font-semibold text-slate-300">Heatmap</span>
                    <img 
                        src={`data:image/jpeg;base64,${gradCamData.heatmap_base64}`} 
                        alt="Heatmap" 
                        className="rounded border border-slate-700 w-full object-cover" 
                    />
                </div>
                <div className="flex flex-col items-center">
                    <span className="mb-2 font-semibold text-indigo-400">Superimposed (Causal Region)</span>
                    <img 
                        src={`data:image/jpeg;base64,${gradCamData.superimposed_base64}`} 
                        alt="Superimposed" 
                        className="rounded border-2 border-indigo-500 w-full object-cover shadow-lg shadow-indigo-500/20" 
                    />
                </div>
            </div>
        </div>
    );
};

export default GradCamViewer;
