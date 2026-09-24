import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, AlertCircle, Clock, User, Activity, Loader2, RefreshCw, ShieldAlert, Filter, Download } from 'lucide-react';
import { getAuditLogs } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const AuditLog = () => {
  const { canViewAudit, role, workspaceName } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState('ALL');

  const fetchLogs = useCallback(async () => {
    if (!canViewAudit) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getAuditLogs();
      setLogs(res.data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setError(err.message || 'Unable to retrieve audit logs.');
    } finally {
      setLoading(false);
    }
  }, [canViewAudit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadgeColor = (action) => {
    if (!action) return 'bg-slate-800 text-slate-300 border-slate-700';
    if (action.includes('UPLOAD')) return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
    if (action.includes('DELETE')) return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    if (action.includes('START')) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    if (action.includes('COMPLETED') || action.includes('GENERATED')) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    if (action.includes('FAILED')) return 'bg-red-500/20 text-red-300 border-red-500/30';
    if (action.includes('EXPERIMENT')) return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `crisp_audit_trail_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // RBAC Access Guard
  if (!canViewAudit) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto my-12 shadow-2xl">
        <ShieldAlert className="text-amber-400 mx-auto mb-4" size={44} />
        <h2 className="text-xl font-bold text-white mb-2">Audit Access Restricted</h2>
        <p className="text-slate-400 text-sm mb-4">
          The governance and immutable audit trail is restricted to <span className="text-purple-400 font-bold">Admin</span> users. 
          Your active role is <span className="text-indigo-400 font-semibold">{role}</span>.
        </p>
        <p className="text-xs text-slate-500">
          To review compliance records, please request administrative elevation or switch to an Administrator profile.
        </p>
      </div>
    );
  }

  const filteredLogs = logs.filter(log => {
    if (actionFilter === 'ALL') return true;
    return log.action === actionFilter;
  });

  const uniqueActions = Array.from(new Set(logs.map(l => l.action).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit & Provenance Trail</h1>
          <p className="text-sm text-slate-400 mt-1">Immutable ledger of tenant activities, pipeline jobs, and data mutations</p>
        </div>
        
        <div className="flex items-center gap-3">
          {logs.length > 0 && (
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
              title="Export Audit Ledger"
            >
              <Download size={14} />
              <span>Export Ledger</span>
            </button>
          )}
          <button 
            onClick={fetchLogs}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
            title="Refresh Audit Logs"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Filter size={14} />
          <span>Filter by Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="ALL">All Actions ({logs.length})</option>
            {uniqueActions.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-500">
          Workspace: <span className="text-indigo-400 font-semibold">{workspaceName}</span>
        </div>
      </div>

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center shadow-lg">
          <Loader2 className="animate-spin text-indigo-400 mb-3" size={32} />
          <h3 className="text-lg font-bold text-white mb-1">Retrieving Audit Trail...</h3>
          <p className="text-slate-400 text-sm">Querying immutable persistence ledger</p>
        </div>
      ) : error ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center shadow-lg">
          <AlertCircle className="text-rose-400 mb-3" size={40} />
          <h3 className="text-lg font-bold text-white mb-1">Audit Ledger Offline</h3>
          <p className="text-slate-400 text-sm max-w-sm mb-4">{error}</p>
          <button 
            onClick={fetchLogs}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition"
          >
            Retry
          </button>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center shadow-lg">
          <ShieldCheck size={48} className="text-slate-700 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Matching Records</h3>
          <p className="text-slate-400 max-w-md">No audit log entries matched the selected filter.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Timestamp</th>
                  <th className="px-6 py-4 font-medium">Action</th>
                  <th className="px-6 py-4 font-medium">Resource</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-6 py-4 flex items-center gap-2 whitespace-nowrap text-slate-400 text-xs">
                      <Clock size={13} className="text-slate-500" />
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {log.resource || log.resource_type || 'system'}
                      {log.resource_id && <span className="text-slate-500 ml-1">#{log.resource_id}</span>}
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className={`font-semibold ${log.status === 'SUCCESS' ? 'text-emerald-400' : log.status === 'FAILED' ? 'text-rose-400' : 'text-slate-400'}`}>
                        {log.status || 'SUCCESS'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-300 max-w-md truncate" title={log.details}>
                      {log.details || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;
