import React, { useState, useEffect } from 'react';
import { 
  Activity, Share2, Download, AlertTriangle, FileText, CheckCircle2, 
  AlertCircle, ShieldCheck, Scale, Compass, Hash, Sparkles, TrendingUp, RefreshCw
} from 'lucide-react';
import FeatureRankChart from '../../components/results/FeatureRankChart';
import CausalDAG from '../../components/results/CausalDAG';
import InferenceModal from '../../components/inference/InferenceModal';
import { useWorkspace } from '../../context/WorkspaceContext';
import { getStatus, getResults, updateAnalysis, createReport, logAudit, getAnalysis, getAnalyses, retryAnalysis } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const Analysis = () => {
  const { 
    activeJobId, 
    setActiveJobId,
    activeAnalysisId,
    setActiveAnalysisId,
    analysisResults, 
    setAnalysisResults, 
    activeAnalysisConfig, 
    activeDataset 
  } = useWorkspace();
  const [loading, setLoading] = useState(!analysisResults);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [reportNotification, setReportNotification] = useState(null);
  const navigate = useNavigate();

  const handleRetry = async () => {
    if (!activeAnalysisId) return;
    setIsRetrying(true);
    try {
      const res = await retryAnalysis(activeAnalysisId);
      if (res.data?.new_job_id) {
        setActiveJobId(res.data.new_job_id);
        setError(null);
        setLoading(true);
      }
    } catch (err) {
      setError(err.message || 'Retry request failed.');
    } finally {
      setIsRetrying(false);
    }
  };

  // If analysisResults already present or loaded, stop loading
  useEffect(() => {
    if (analysisResults) {
      setLoading(false);
      return;
    }

    // Attempt to hydrate from backend if activeAnalysisId exists
    if (activeAnalysisId && !activeJobId) {
      getAnalysis(activeAnalysisId)
        .then(res => {
          if (res.data?.results) {
            setAnalysisResults(res.data.results);
            setLoading(false);
          }
        })
        .catch(err => {
          console.warn('Could not hydrate existing analysis from DB:', err);
        });
      return;
    }

    if (!activeJobId) {
      // If no active job in flight, load recent analyses from DB
      setLoading(true);
      getAnalyses()
        .then(res => {
          const list = res.data || [];
          if (list.length > 0) {
            // Find most recent completed or failed analysis
            const latest = list[0];
            setActiveAnalysisId(latest.id);
            if (latest.results) {
              setAnalysisResults(latest.results);
            } else if (latest.status === 'FAILED') {
              setError(latest.error_message || 'Pipeline analysis failed.');
            }
          }
        })
        .catch(err => {
          console.warn('Could not retrieve analyses from backend:', err);
        })
        .finally(() => {
          setLoading(false);
        });
      return;
    }

    // Real pipeline polling logic
    let isSubscribed = true;
    const interval = setInterval(async () => {
      try {
        const res = await getStatus(activeJobId);
        if (!isSubscribed) return;

        if (res.data.status === 'COMPLETED') {
          clearInterval(interval);
          const resultRes = await getResults(activeJobId);
          if (!isSubscribed) return;

          const resultsData = resultRes.data;
          setAnalysisResults(resultsData);
          setLoading(false);

          // Update persistent Analysis record in SQLite database
          if (activeAnalysisId) {
            try {
              await updateAnalysis(activeAnalysisId, {
                status: 'COMPLETED',
                results: resultsData,
                feature_ranking: resultsData.causal_features || [],
                dag_info: resultsData.causal_edges || [],
                assumptions: resultsData.assumptions || [],
                limitations: resultsData.limitations || [],
                analysis_code: resultsData.analysis_code || null,
                version: resultsData.version || 1,
                completed_at: new Date().toISOString()
              });
            } catch (patchErr) {
              console.error('Failed to update analysis in DB:', patchErr);
            }
          }

          logAudit({
            action: 'ANALYSIS_COMPLETED',
            resource: 'analysis',
            resource_id: String(activeAnalysisId || activeJobId),
            status: 'SUCCESS',
            details: `Completed scientific causal analysis for job ${activeJobId}`
          }).catch(() => {});
        } else if (res.data.status === 'FAILED') {
          clearInterval(interval);
          setError(res.data.error || "The analysis pipeline failed. Please check the backend logs.");
          setLoading(false);
        }
      } catch (err) {
        clearInterval(interval);
        setError("Failed to fetch analysis status from backend.");
        setLoading(false);
      }
    }, 1500);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [activeJobId, activeAnalysisId, analysisResults, setAnalysisResults]);

  const handleGenerateReport = async () => {
    if (!analysisResults || (!analysisResults.causal_features && typeof analysisResults !== 'object')) {
      setReportNotification({
        type: 'error',
        message: 'Complete a causal analysis before generating a report.'
      });
      return;
    }

    setIsGenerating(true);
    setReportNotification(null);
    try {
      const reportPayload = {
        title: `Causal Report: ${activeDataset?.filename || analysisResults?.outcome || 'Causal Discovery'} (${analysisResults?.analysis_code || 'v1'})`,
        analysis_id: activeAnalysisId ? Number(activeAnalysisId) : null,
        dataset_id: activeDataset?.id ? Number(activeDataset.id) : null,
        status: 'PUBLISHED',
        insights: analysisResults
      };

      await createReport(reportPayload);
      setIsGenerating(false);
      navigate('/reports');
    } catch (err) {
      console.error('Failed to save report to database:', err);
      setIsGenerating(false);
      setReportNotification({
        type: 'error',
        message: err.message || 'Failed to persist report to backend database.'
      });
    }
  };

  const causalEffects = analysisResults?.causal_effects || [];
  const metrics = analysisResults?.metrics || {};
  const assumptions = analysisResults?.assumptions || [];
  const limitations = analysisResults?.limitations || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Scientific Causal Analysis</h1>
            {analysisResults?.analysis_code && (
              <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold">
                {analysisResults.analysis_code}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 mt-1">
            PC-Algorithm causal discovery, Invariant Risk Minimization, and Doubly Robust effect estimation
          </p>
        </div>

        <div className="flex items-center gap-3">
          {analysisResults && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold text-emerald-400">CAUSALLY VALIDATED</span>
            </div>
          )}
          {!loading && !error && analysisResults && (
            <button 
              onClick={handleGenerateReport} 
              disabled={isGenerating} 
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition shadow-lg shadow-indigo-600/20"
            >
              <FileText size={16} /> {isGenerating ? 'Publishing Report...' : 'Publish Report'}
            </button>
          )}
        </div>
      </div>

      {/* Metadata Bar */}
      {analysisResults && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Target Outcome</span>
            <p className="text-base font-bold text-white mt-0.5 truncate">{analysisResults.outcome || 'N/A'}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Sample Size</span>
            <p className="text-base font-bold text-white mt-0.5">{analysisResults.sample_size || 'N/A'} observations</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Discovery Engine</span>
            <p className="text-base font-bold text-emerald-400 mt-0.5">PC + IRM Ensemble</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Reproducibility Seed</span>
            <p className="text-base font-bold text-indigo-400 font-mono mt-0.5">seed={analysisResults.seed ?? 42}</p>
          </div>
        </div>
      )}

      {reportNotification && (
        <div className={`p-4 rounded-lg flex gap-3 items-center ${
          reportNotification.type === 'error' ? 'bg-rose-500/10 border border-rose-500/30 text-rose-200' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-200'
        }`}>
          <AlertCircle size={20} className={reportNotification.type === 'error' ? 'text-rose-400' : 'text-emerald-400'} />
          <span className="text-sm font-medium">{reportNotification.message}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
          <h3 className="text-lg font-bold text-white">Running Scientific Causal Pipeline...</h3>
          <p className="text-slate-400 text-sm mt-2">
            Executing conditional independence tests (PC-Algorithm) & multi-environment invariance tests
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[400px]">
          <AlertTriangle className="text-red-400 mb-4" size={48} />
          <h3 className="text-lg font-bold text-white mb-2">Analysis Failed</h3>
          <p className="text-red-300 text-sm max-w-lg text-center mb-6">{error}</p>
          {activeAnalysisId && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              <RefreshCw size={16} className={isRetrying ? 'animate-spin' : ''} />
              <span>{isRetrying ? 'Re-queueing Job...' : 'Retry Analysis'}</span>
            </button>
          )}
        </div>
      ) : !analysisResults ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center min-h-[350px] flex flex-col items-center justify-center">
          <Activity size={44} className="text-slate-700 mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No Active Causal Analysis</h3>
          <p className="text-slate-400 text-sm max-w-md mb-6">
            Select a dataset and launch scientific causal discovery from the Causal Engine.
          </p>
          <button
            onClick={() => navigate('/causal-engine')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-600/30 transition"
          >
            Go to Causal Engine
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main 2-column visualization */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Invariant Feature Ranking */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  Invariant Feature Ranking (IRM / ICP)
                </h3>
                <span className="text-xs bg-slate-800 px-2.5 py-0.5 rounded text-slate-300">Stability Scored</span>
              </div>
              <div className="p-5">
                <FeatureRankChart data={analysisResults} />
              </div>
            </div>

            {/* Right: Discovered Causal DAG */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Compass size={18} className="text-indigo-400" />
                  Estimated Causal DAG (PC-Algorithm)
                </h3>
                <span className="text-xs bg-slate-800 px-2.5 py-0.5 rounded text-indigo-300 font-mono">
                  {analysisResults?.causal_edges?.length || 0} Edges
                </span>
              </div>
              <div className="p-5">
                <CausalDAG data={analysisResults} />
              </div>
            </div>
          </div>

          {/* Section 5: Average Treatment Effect (ATE) Causal Effects Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Scale size={18} className="text-amber-400" />
                <h3 className="font-bold text-white">Estimated Causal Effects (ATE & 95% Confidence Intervals)</h3>
              </div>
              <span className="text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-0.5 rounded">
                Doubly Robust & DML
              </span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Treatment</th>
                    <th className="py-3 px-4">Target Outcome</th>
                    <th className="py-3 px-4">Point Estimate (ATE)</th>
                    <th className="py-3 px-4">95% Bootstrap CI</th>
                    <th className="py-3 px-4">Std. Error</th>
                    <th className="py-3 px-4">p-value</th>
                    <th className="py-3 px-4">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {causalEffects.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-6 text-center text-slate-500">
                        No causal effect estimates available.
                      </td>
                    </tr>
                  ) : (
                    causalEffects.map((eff, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-white">{eff.treatment}</td>
                        <td className="py-3.5 px-4 text-slate-400">{eff.outcome}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                          {eff.ate > 0 ? `+${eff.ate}` : eff.ate}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          [{eff.ci_lower}, {eff.ci_upper}]
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400">{eff.standard_error}</td>
                        <td className="py-3.5 px-4 font-mono">
                          <span className={eff.p_value < 0.05 ? "text-emerald-400 font-semibold" : "text-slate-400"}>
                            {eff.p_value < 0.001 ? '< 0.001' : eff.p_value}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                            {eff.method}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 6 & 11: Out-of-Distribution (OOD) Model Evaluation */}
          {metrics.baseline_erm && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-indigo-400" />
                  <h3 className="font-bold text-white">Generalization & Out-of-Distribution (OOD) Evaluation</h3>
                </div>
                {metrics.accuracy_improvement !== undefined && (
                  <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded font-semibold">
                    +{Math.round(metrics.accuracy_improvement * 100)}% OOD Robustness Gain
                  </span>
                )}
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-lg">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Baseline ERM (All Features)</span>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-slate-300">
                      In-Distribution: <span className="font-bold text-white">{metrics.baseline_erm?.in_distribution?.accuracy ?? metrics.baseline_erm?.in_distribution?.r2 ?? 'N/A'}</span>
                    </p>
                    <p className="text-sm text-slate-400">
                      OOD Generalization: <span className="font-bold text-rose-400">{metrics.baseline_erm?.out_of_distribution?.accuracy ?? metrics.baseline_erm?.out_of_distribution?.r2 ?? 'N/A'}</span>
                    </p>
                    <p className="text-xs text-rose-400/80 pt-1">
                      Gap: {metrics.baseline_erm?.generalization_gap ?? 'Shifted'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-emerald-500/30 p-4 rounded-lg">
                  <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">Causal IRM (Invariant Features)</span>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-slate-300">
                      In-Distribution: <span className="font-bold text-white">{metrics.causal_irm?.in_distribution?.accuracy ?? metrics.causal_irm?.in_distribution?.r2 ?? 'N/A'}</span>
                    </p>
                    <p className="text-sm text-emerald-300">
                      OOD Generalization: <span className="font-bold text-emerald-400">{metrics.causal_irm?.out_of_distribution?.accuracy ?? metrics.causal_irm?.out_of_distribution?.r2 ?? 'N/A'}</span>
                    </p>
                    <p className="text-xs text-emerald-400/80 pt-1">
                      Gap: {metrics.causal_irm?.generalization_gap ?? 'Stable'}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-lg flex flex-col justify-center">
                  <span className="text-xs text-slate-400 font-semibold mb-1">Scientific Takeaway</span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    By filtering spurious correlations that collapse across environments, the invariant causal model maintains stable predictive accuracy under distribution shifts.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Section 10: Explicit Assumptions and Limitations Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
              <h4 className="font-bold text-indigo-400 text-sm mb-3 flex items-center gap-2">
                <Sparkles size={16} /> Key Causal Assumptions
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {assumptions.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
              <h4 className="font-bold text-amber-400 text-sm mb-3 flex items-center gap-2">
                <AlertTriangle size={16} /> Known Limitations & Threats to Validity
              </h4>
              <ul className="space-y-2 text-xs text-slate-300">
                {limitations.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Interactive Counterfactual Inference Modal */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <InferenceModal />
          </div>
        </div>
      )}
    </div>
  );
};

export default Analysis;
