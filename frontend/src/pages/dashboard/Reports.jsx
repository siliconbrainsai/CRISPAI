import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Download, Eye, AlertCircle, Loader2, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getReports } from '../../services/api';

const Reports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const navigate = useNavigate();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getReports();
      setReports(res.data || []);
    } catch (err) {
      console.error('Failed to load reports from backend:', err);
      setError(err.message || 'Backend unavailable. Unable to load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-sm text-slate-400 mt-1">View and generate executive summaries of causal analyses</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchReports}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
            title="Refresh Reports"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={() => navigate('/causal-engine')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition"
          >
            <Plus size={16} /> New Analysis
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center shadow-lg">
          <Loader2 className="animate-spin text-indigo-400 mb-3" size={32} />
          <h3 className="text-lg font-bold text-white mb-1">Loading Reports...</h3>
          <p className="text-slate-400 text-sm">Fetching verified reports from SQLite database</p>
        </div>
      ) : error ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center shadow-lg">
          <AlertCircle className="text-rose-400 mb-3" size={40} />
          <h3 className="text-lg font-bold text-white mb-1">Backend Unavailable</h3>
          <p className="text-slate-400 text-sm max-w-sm mb-4">{error}</p>
          <button 
            onClick={fetchReports}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition"
          >
            Retry
          </button>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center shadow-lg">
          <FileText size={48} className="text-slate-700 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Reports Available</h3>
          <p className="text-slate-400 max-w-md mb-6">
            You haven't generated any reports yet. Complete a causal analysis and click "Generate Report" to see it stored here.
          </p>
          <button 
            onClick={() => navigate('/causal-engine')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold py-2.5 px-5 rounded-lg transition flex items-center gap-2"
          >
            Run Causal Analysis
          </button>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Report Title</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Analysis ID</th>
                <th className="px-6 py-4 font-medium">Generated Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-slate-800/50 transition">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <FileText size={16} />
                    </div>
                    <div>
                      <span className="font-semibold text-white block">{report.title}</span>
                      <span className="text-xs text-slate-500">Database Record #{report.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1 rounded-full font-medium">
                      {report.status || 'PUBLISHED'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {report.analysis_id ? `Analysis #${report.analysis_id}` : 'General'}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(report.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button 
                      onClick={() => setSelectedReport(report)}
                      className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition" 
                      title="View Report"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
                        a.click();
                      }}
                      className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition" 
                      title="Export JSON"
                    >
                      <Download size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-slate-950/40 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center">
            <span>Showing {reports.length} report{reports.length !== 1 ? 's' : ''} (SQLite Single Source of Truth)</span>
          </div>
        </div>
      )}

      {/* Modal for Report Detail View */}
      {selectedReport && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedReport.title}</h3>
                  <p className="text-xs text-slate-400">Report #{selectedReport.id} • Created {new Date(selectedReport.created_at).toLocaleString()}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReport(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-500 block">Status</span>
                  <span className="font-semibold text-emerald-400">{selectedReport.status || 'PUBLISHED'}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-xs text-slate-500 block">Analysis Reference</span>
                  <span className="font-semibold text-white">
                    {selectedReport.analysis_id ? `Analysis #${selectedReport.analysis_id}` : 'Direct Run'}
                  </span>
                </div>
              </div>

              {selectedReport.insights && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Causal Insights & Feature Scores</h4>
                  <pre className="text-xs text-slate-300 overflow-x-auto p-3 bg-slate-900 rounded-lg border border-slate-800 font-mono">
                    {JSON.stringify(selectedReport.insights, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;

