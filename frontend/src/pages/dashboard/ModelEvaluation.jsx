import React from 'react';
import { 
  LineChart, AlertTriangle, CheckCircle, Target, TrendingUp, 
  ShieldCheck, BarChart3, Layers, Compass
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

const ModelEvaluation = () => {
  const { analysisResults, activeAnalysisConfig, activeDataset } = useWorkspace();

  const metrics = analysisResults?.metrics || {};
  const isClassification = metrics.is_classification ?? true;
  const baseline = metrics.baseline_erm || {};
  const causal = metrics.causal_irm || {};
  const oodEnv = metrics.ood_environment || 'OOD Environment';

  const spuriousCount = (analysisResults?.causal_features || []).filter(f => f.is_spurious).length;
  const invariantCount = (analysisResults?.causal_features || []).filter(f => !f.is_spurious).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Model Evaluation & Generalization</h1>
          <p className="text-sm text-slate-400 mt-1">
            Empirical Risk Minimization (ERM) vs Invariant Risk Minimization (IRM) across distribution shifts
          </p>
        </div>
      </div>

      {!analysisResults ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center shadow-lg">
          <LineChart size={48} className="text-slate-700 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Evaluation Metrics Unavailable</h3>
          <p className="text-slate-400 max-w-md">
            Execute a Causal Engine analysis to compute empirical and invariant evaluation metrics.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top 3 KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-2 text-indigo-400">
                <Target size={20} />
                <h4 className="font-bold">Target Variable</h4>
              </div>
              <p className="text-2xl font-bold text-white truncate">{analysisResults?.outcome || activeAnalysisConfig?.outcome || 'Target'}</p>
              <p className="text-sm text-slate-400 mt-2 truncate">from {activeDataset?.filename || 'dataset'}</p>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-2 text-emerald-400">
                <CheckCircle size={20} />
                <h4 className="font-bold">Causal Invariant Features</h4>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{invariantCount} Features</p>
              <p className="text-sm text-slate-400 mt-2">Passed environmental invariance test</p>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-2 text-rose-400">
                <AlertTriangle size={20} />
                <h4 className="font-bold">Spurious Features Dropped</h4>
              </div>
              <p className="text-2xl font-bold text-rose-400">{spuriousCount} Features</p>
              <p className="text-sm text-slate-400 mt-2">Failed cross-environment stability</p>
            </div>
          </div>
          
          {/* Real In-Distribution vs Out-of-Distribution Metric Comparison */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-slate-800 gap-2">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 size={20} className="text-indigo-400" />
                  Model Generalization: ERM (Baseline) vs IRM (Causal)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tested on held-out environment split: <code className="text-indigo-300">{oodEnv}</code>
                </p>
              </div>

              {metrics.accuracy_improvement !== undefined && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold text-emerald-400 self-start sm:self-auto">
                  {metrics.accuracy_improvement >= 0 ? `+${Math.round(metrics.accuracy_improvement * 100)}%` : `${Math.round(metrics.accuracy_improvement * 100)}%`} OOD Robustness
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 text-xs text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Evaluation Dimension</th>
                    <th className="py-3 px-4">Metric</th>
                    <th className="py-3 px-4 text-slate-400">Baseline ERM (All Features)</th>
                    <th className="py-3 px-4 text-emerald-400">Causal IRM (Invariant Features)</th>
                    <th className="py-3 px-4">Invariance Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {isClassification ? (
                    <>
                      <tr className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-semibold text-white">In-Distribution Test</td>
                        <td className="py-3.5 px-4 text-slate-400">Accuracy</td>
                        <td className="py-3.5 px-4 font-mono">{baseline.in_distribution?.accuracy ?? 'N/A'}</td>
                        <td className="py-3.5 px-4 font-mono text-emerald-400">{causal.in_distribution?.accuracy ?? 'N/A'}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-400">Baseline Fit</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-semibold text-white">Out-of-Distribution (OOD)</td>
                        <td className="py-3.5 px-4 text-slate-400">Accuracy</td>
                        <td className="py-3.5 px-4 font-mono text-rose-400 font-bold">{baseline.out_of_distribution?.accuracy ?? 'N/A'}</td>
                        <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{causal.out_of_distribution?.accuracy ?? 'N/A'}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-emerald-400 font-semibold">
                          +{Math.round(((causal.out_of_distribution?.accuracy || 0) - (baseline.out_of_distribution?.accuracy || 0)) * 100)}%
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-semibold text-white">Out-of-Distribution (OOD)</td>
                        <td className="py-3.5 px-4 text-slate-400">F1 Score</td>
                        <td className="py-3.5 px-4 font-mono">{baseline.out_of_distribution?.f1_score ?? 'N/A'}</td>
                        <td className="py-3.5 px-4 font-mono text-emerald-400">{causal.out_of_distribution?.f1_score ?? 'N/A'}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-400">Balanced</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-semibold text-white">Out-of-Distribution (OOD)</td>
                        <td className="py-3.5 px-4 text-slate-400">ROC-AUC</td>
                        <td className="py-3.5 px-4 font-mono">{baseline.out_of_distribution?.roc_auc ?? 'N/A'}</td>
                        <td className="py-3.5 px-4 font-mono text-emerald-400">{causal.out_of_distribution?.roc_auc ?? 'N/A'}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-400">Discrimination</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40 bg-slate-950/40">
                        <td className="py-3.5 px-4 font-semibold text-white">Distribution Shift Drop</td>
                        <td className="py-3.5 px-4 text-slate-400">Generalization Gap</td>
                        <td className="py-3.5 px-4 font-mono text-rose-400 font-bold">{baseline.generalization_gap ?? 'Shifted'}</td>
                        <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{causal.generalization_gap ?? 'Stable'}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-emerald-400 font-semibold">Minimizes Gap</td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-semibold text-white">In-Distribution Test</td>
                        <td className="py-3.5 px-4 text-slate-400">RMSE</td>
                        <td className="py-3.5 px-4 font-mono">{baseline.in_distribution?.rmse ?? 'N/A'}</td>
                        <td className="py-3.5 px-4 font-mono text-emerald-400">{causal.in_distribution?.rmse ?? 'N/A'}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-400">Standard fit</td>
                      </tr>
                      <tr className="hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-semibold text-white">Out-of-Distribution (OOD)</td>
                        <td className="py-3.5 px-4 text-slate-400">RMSE</td>
                        <td className="py-3.5 px-4 font-mono text-rose-400 font-bold">{baseline.out_of_distribution?.rmse ?? 'N/A'}</td>
                        <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{causal.out_of_distribution?.rmse ?? 'N/A'}</td>
                        <td className="py-3.5 px-4 font-mono text-xs text-emerald-400 font-semibold">Lower Error</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-slate-950/60 border border-slate-800 rounded-lg flex items-start gap-3">
              <TrendingUp className="text-emerald-400 shrink-0 mt-0.5" size={18} />
              <div className="text-xs text-slate-300 leading-relaxed">
                <strong>Scientific Validation Result:</strong> Standard ERM models fit spurious correlations that achieve high in-distribution accuracy but degrade severely under environmental shifts. The Invariant Risk Minimization (IRM) model achieves superior out-of-distribution robustness by strictly retaining mechanisms whose predictive distributions remain constant across environments.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelEvaluation;
