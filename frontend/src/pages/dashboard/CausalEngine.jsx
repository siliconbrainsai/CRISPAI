import React, { useState, useEffect } from 'react';
import { Database, Target, Variable, Layers, PlayCircle, Activity, CheckCircle, ArrowRight, ArrowLeft, AlertTriangle, Loader2, Sparkles, HelpCircle } from 'lucide-react';
import PipelineConfig from '../../components/config/PipelineConfig';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../../context/WorkspaceContext';
import { createAnalysis, getDatasets, runPipeline } from '../../services/api';

const StepIndicator = ({ step, currentStep, label, icon: Icon, onClick, isClickable }) => (
  <button
    type="button"
    onClick={isClickable ? onClick : undefined}
    disabled={!isClickable}
    className={`w-full flex items-center gap-3 text-left p-2 rounded-lg transition-all ${
      step === currentStep 
        ? 'bg-indigo-950/40 border border-indigo-500/40 text-white shadow-sm' 
        : isClickable 
          ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 cursor-pointer' 
          : 'opacity-40 cursor-not-allowed text-slate-500'
    }`}
  >
    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 shrink-0 transition-colors ${
      step < currentStep 
        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' 
        : step === currentStep 
          ? 'bg-indigo-600 border-indigo-500 text-white' 
          : 'bg-slate-800 border-slate-700 text-slate-500'
    }`}>
      {step < currentStep ? <CheckCircle size={16} /> : step}
    </div>
    <span className={`text-sm font-semibold truncate ${step === currentStep ? 'text-white' : ''}`}>{label}</span>
  </button>
);

const CausalEngine = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [jobId, setJobId] = useState(null);
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const { 
    activeDataset, 
    setActiveDataset, 
    setActiveJobId, 
    setActiveAnalysisId, 
    setActiveAnalysisConfig 
  } = useWorkspace();
  const navigate = useNavigate();

  // Wizard State
  const [outcome, setOutcome] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [environments, setEnvironments] = useState([]);

  // Fetch datasets if none active
  useEffect(() => {
    if (!activeDataset) {
      setLoadingDatasets(true);
      getDatasets()
        .then(res => {
          const list = res.data || [];
          setAvailableDatasets(list);
          if (list.length > 0) {
            setActiveDataset(list[0]);
          }
        })
        .catch(err => console.error('Failed to load datasets in CausalEngine:', err))
        .finally(() => setLoadingDatasets(false));
    }
  }, [activeDataset, setActiveDataset]);

  const datasetColumns = activeDataset 
    ? (Array.isArray(activeDataset.columns) ? activeDataset.columns : (Array.isArray(activeDataset.schema_definition) ? activeDataset.schema_definition : []))
    : [];

  const handleStartPipeline = async ({ models, alpha }) => {
    try {
      // Step 1: Create persistent Analysis record in SQLite database
      const analysisRes = await createAnalysis({
        dataset_id: activeDataset?.id,
        outcome,
        candidates,
        environments: environments.length > 0 ? environments : [],
        method: models.join(', ') || 'IRM / ICP Ensemble',
        status: 'RUNNING'
      });
      const newAnalysisId = analysisRes.data?.id;
      if (newAnalysisId) {
        setActiveAnalysisId(newAnalysisId);
      }

      // Step 2: Trigger backend real causal pipeline
      const pipelineRes = await runPipeline({
        models,
        alpha,
        dataset_id: activeDataset?.id,
        file_path: activeDataset?.file_path || null,
        outcome,
        candidates,
        environments: environments.length > 0 ? environments : null,
        analysis_id: newAnalysisId
      });

      const newJobId = pipelineRes.data?.job_id;
      if (newJobId) {
        setJobId(newJobId);
        setActiveJobId(newJobId);
      }

      const config = {
        outcome,
        candidates,
        environments,
        models,
        alpha,
        date: new Date().toISOString()
      };
      setActiveAnalysisConfig(config);

      setTimeout(() => {
        navigate('/analysis');
      }, 500);
    } catch (err) {
      console.error('Failed to initiate causal pipeline:', err);
      throw err;
    }
  };

  const toggleCandidate = (col) => {
    setCandidates(prev => {
      const exists = prev.includes(col);
      return exists ? prev.filter(c => c !== col) : [...prev, col];
    });
    setEnvironments(prev => prev.filter(c => c !== col));
  };
  
  const toggleEnvironment = (col) => {
    setEnvironments(prev => {
      const exists = prev.includes(col);
      return exists ? prev.filter(c => c !== col) : [...prev, col];
    });
    setCandidates(prev => prev.filter(c => c !== col));
  };

  const availableEnvColumns = datasetColumns.filter(c => c !== outcome);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Causal Engine</h1>
          <p className="text-sm text-slate-400 mt-1">Configure and run causal discovery algorithms</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Workflow Nav */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <h3 className="font-bold text-white mb-6 uppercase tracking-wider text-xs flex items-center justify-between">
            <span>Analysis Workflow</span>
            <span className="text-indigo-400 font-normal">Step {currentStep} of 6</span>
          </h3>
          <div className="space-y-3">
            <StepIndicator step={1} currentStep={currentStep} label="Select Dataset" icon={Database} onClick={() => setCurrentStep(1)} isClickable={true} />
            <StepIndicator step={2} currentStep={currentStep} label="Select Outcome" icon={Target} onClick={() => setCurrentStep(2)} isClickable={!!activeDataset} />
            <StepIndicator step={3} currentStep={currentStep} label="Candidate Causes" icon={Variable} onClick={() => setCurrentStep(3)} isClickable={!!outcome} />
            <StepIndicator step={4} currentStep={currentStep} label="Environment Vars" icon={Layers} onClick={() => setCurrentStep(4)} isClickable={candidates.length > 0} />
            <StepIndicator step={5} currentStep={currentStep} label="Discovery Method" icon={Activity} onClick={() => setCurrentStep(5)} isClickable={candidates.length > 0} />
            <StepIndicator step={6} currentStep={currentStep} label="Run Analysis" icon={PlayCircle} onClick={() => setCurrentStep(6)} isClickable={candidates.length > 0} />
          </div>
        </div>

        {/* Right Active Step Container */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg min-h-[520px] flex flex-col">
          {!activeDataset ? (
             <div className="flex-grow flex flex-col items-center justify-center text-center">
               <Database size={48} className="text-slate-700 mb-4" />
               <h3 className="text-xl font-bold text-white mb-2">No Dataset Selected</h3>
               <p className="text-slate-400 mb-6 max-w-sm text-sm">Please upload or select a dataset in the Data Sources module before configuring a causal analysis.</p>
               <button onClick={() => navigate('/data-sources')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold">Go to Data Sources</button>
             </div>
          ) : (
            <>
              {/* STEP 1: Select / Confirm Dataset */}
              {currentStep === 1 && (
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                  <div className="bg-slate-800/80 p-8 rounded-2xl max-w-md w-full border border-slate-700 shadow-xl">
                    <Database className="text-indigo-400 mx-auto mb-4" size={36} />
                    <h3 className="text-xl font-bold text-white mb-2">Dataset Confirmed</h3>
                    <p className="text-slate-400 mb-6 text-sm">
                      Active dataset: <strong className="text-indigo-300">{activeDataset.filename}</strong><br/>
                      ({activeDataset.row_count} rows, {datasetColumns.length} columns)
                    </p>
                    <button onClick={() => setCurrentStep(2)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-lg transition flex items-center gap-2 mx-auto shadow-lg shadow-indigo-600/30">
                      Continue to Outcome <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Select Outcome */}
              {currentStep === 2 && (
                <div className="flex-grow flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white">Select Target Outcome</h3>
                    <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full font-medium">Required (Y)</span>
                  </div>
                  <p className="text-slate-400 mb-6 text-sm">Which target variable are you trying to understand, explain, or predict?</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 max-h-[320px] overflow-y-auto pr-2">
                    {datasetColumns.map(col => (
                      <button 
                        key={col} 
                        onClick={() => {
                          setOutcome(col);
                          // Clear from candidates if it was selected
                          setCandidates(prev => prev.filter(c => c !== col));
                          setEnvironments(prev => prev.filter(c => c !== col));
                        }} 
                        className={`p-3 rounded-lg border text-sm transition-all font-medium ${outcome === col ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>

                  <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-800">
                    <button 
                      onClick={() => setCurrentStep(1)} 
                      className="px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition flex items-center gap-1.5"
                    >
                      <ArrowLeft size={16} /> Back to Dataset
                    </button>
                    <button 
                      onClick={() => setCurrentStep(3)} 
                      disabled={!outcome} 
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      Next Step <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Candidate Causes */}
              {currentStep === 3 && (
                <div className="flex-grow flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white">Select Candidate Causes</h3>
                    <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full font-medium">
                      {candidates.length} Selected
                    </span>
                  </div>
                  <p className="text-slate-400 mb-6 text-sm">Which variables should the engine investigate as potential causes for <strong>{outcome}</strong>? (X)</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 max-h-[320px] overflow-y-auto pr-2">
                    {datasetColumns.filter(c => c !== outcome).map(col => (
                      <button 
                        key={col} 
                        onClick={() => toggleCandidate(col)} 
                        className={`p-3 rounded-lg border text-sm transition-all flex items-center justify-between ${candidates.includes(col) ? 'bg-indigo-900/50 border-indigo-500 text-indigo-200' : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                      >
                        <span className="truncate">{col}</span>
                        {candidates.includes(col) && <CheckCircle size={14} className="text-indigo-400 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-800">
                    <button 
                      onClick={() => setCurrentStep(2)} 
                      className="px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition flex items-center gap-1.5"
                    >
                      <ArrowLeft size={16} /> Back to Outcome
                    </button>
                    <button 
                      onClick={() => setCurrentStep(4)} 
                      disabled={candidates.length === 0} 
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      Next Step <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}
              
              {/* STEP 4: Environment Variables */}
              {currentStep === 4 && (
                <div className="flex-grow flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-white">Select Environment Variables</h3>
                    <span className="text-xs bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-full font-medium">
                      Optional ({environments.length} selected)
                    </span>
                  </div>
                  <p className="text-slate-400 mb-6 text-sm">
                    Identify variables that split your data into different contexts (e.g. Hospital ID, Year, Region). 
                    These will be used for Invariant Risk Minimization (IRM). If your dataset is from a single context, you can proceed directly to the next step.
                  </p>
                  
                  {availableEnvColumns.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6 max-h-[300px] overflow-y-auto pr-2">
                      {availableEnvColumns.map(col => (
                        <button 
                          key={col} 
                          onClick={() => toggleEnvironment(col)} 
                          className={`p-3 rounded-lg border text-sm transition-all flex items-center justify-between ${
                            environments.includes(col) 
                              ? 'bg-amber-900/50 border-amber-500 text-amber-200' 
                              : candidates.includes(col)
                                ? 'bg-slate-950/80 border-slate-700/60 text-slate-400 hover:border-slate-500'
                                : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-slate-500'
                          }`}
                        >
                          <span className="truncate">{col}</span>
                          {environments.includes(col) ? (
                            <CheckCircle size={14} className="text-amber-400 shrink-0" />
                          ) : candidates.includes(col) ? (
                            <span className="text-[10px] text-indigo-400/80 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/40">Cause</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-6 mb-6 text-center">
                      <p className="text-slate-300 text-sm font-medium mb-1">
                        All variables have been assigned as Target or Candidate Causes.
                      </p>
                      <p className="text-slate-400 text-xs">
                        No additional context columns remaining. The scientific engine will automatically evaluate invariance via automated cross-fold distribution splits.
                      </p>
                    </div>
                  )}

                  <div className="mt-auto pt-6 flex items-center justify-between border-t border-slate-800">
                    <button 
                      onClick={() => setCurrentStep(3)} 
                      className="px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition flex items-center gap-1.5"
                    >
                      <ArrowLeft size={16} /> Back to Causes
                    </button>
                    <button 
                      onClick={() => setCurrentStep(5)} 
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                    >
                      {environments.length > 0 ? 'Next Step' : 'Next Step (Skip / Single Context)'} <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}
              
              {/* STEP 5: Discovery Method */}
              {currentStep === 5 && (
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                  <div className="bg-slate-800/80 p-8 rounded-2xl max-w-lg w-full border border-slate-700 shadow-xl">
                    <Activity className="text-indigo-400 mx-auto mb-4" size={36} />
                    <h3 className="text-xl font-bold text-white mb-2">Discovery Method & Architecture</h3>
                    <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                      The scientific pipeline runs constraint-based PC Directed Acyclic Graph (DAG) discovery, Invariant Risk Minimization (IRM / ICP) across contexts, and Doubly Robust Average Treatment Effect (ATE) estimation.
                    </p>
                    <div className="flex items-center justify-between gap-4 pt-2">
                      <button 
                        onClick={() => setCurrentStep(4)} 
                        className="px-4 py-2 text-slate-400 hover:text-white text-sm font-semibold rounded-lg hover:bg-slate-700/50 transition flex items-center gap-1.5"
                      >
                        <ArrowLeft size={16} /> Back
                      </button>
                      <button onClick={() => setCurrentStep(6)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-lg transition flex items-center gap-2 shadow-lg shadow-indigo-600/30">
                        Continue to Configuration <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: Run Analysis */}
              {currentStep === 6 && (
                <div className="flex-grow flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <button 
                      onClick={() => setCurrentStep(5)} 
                      className="px-3 py-1.5 text-slate-400 hover:text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition inline-flex items-center gap-1.5"
                    >
                      <ArrowLeft size={16} /> Back to Method
                    </button>
                    <span className="text-xs text-indigo-400 font-mono">Dataset: {activeDataset?.filename}</span>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-4 flex gap-3">
                    <Activity className="text-emerald-400 shrink-0 mt-0.5" size={18} />
                    <div className="text-sm text-emerald-200">
                      <strong>Scientific Causal Engine Ready:</strong> Executing PC-Algorithm causal discovery, Invariant Risk Minimization (IRM), and Doubly Robust ATE estimation with 95% bootstrap confidence intervals for target <code>{outcome}</code> {environments.length > 0 ? <span>across context: <code>{environments.join(', ')}</code></span> : <span>under automated cross-fold context splitting</span>}.
                    </div>
                  </div>

                  <PipelineConfig 
                    onStartPipeline={handleStartPipeline} 
                    datasetId={activeDataset?.id} 
                    outcome={outcome} 
                    candidates={candidates} 
                    environments={environments} 
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CausalEngine;
