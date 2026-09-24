import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FileText, ArrowLeft, Database, Trash2, Play, Calendar, HardDrive, 
  Layers, CheckCircle, AlertTriangle, Loader2 
} from 'lucide-react';
import { getDataset, deleteDataset } from '../../services/api';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';

const DatasetDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setActiveDataset } = useWorkspace();
  const { canDelete, canRunAnalysis } = useAuth();

  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getDataset(id);
        setDataset(res.data);
      } catch (err) {
        setError(err.message || 'Failed to load dataset details.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDataset(id);
      navigate('/data-sources');
    } catch (err) {
      setError(err.message || 'Failed to delete dataset.');
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const handleLaunchAnalysis = () => {
    if (dataset) {
      setActiveDataset(dataset);
      navigate('/causal-engine');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400">
        <Loader2 className="animate-spin text-indigo-500 mb-3" size={32} />
        <p className="text-sm">Loading dataset metadata and schema...</p>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="p-6">
        <Link to="/data-sources" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition">
          <ArrowLeft size={16} /> Back to Data Sources
        </Link>
        <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-8 text-center max-w-lg mx-auto">
          <AlertTriangle className="text-red-400 mx-auto mb-3" size={36} />
          <h2 className="text-lg font-bold text-white mb-1">Dataset Not Found</h2>
          <p className="text-slate-400 text-sm mb-6">{error || 'This dataset may have been soft-deleted or belongs to another workspace.'}</p>
          <Link to="/data-sources" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition">
            Return to Data Sources
          </Link>
        </div>
      </div>
    );
  }

  const columnsList = Array.isArray(dataset.schema_definition) 
    ? dataset.schema_definition 
    : (dataset.schema_definition ? Object.keys(dataset.schema_definition) : []);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/data-sources" className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 mb-2 transition">
            <ArrowLeft size={14} /> All Data Sources
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">{dataset.filename}</h1>
              <p className="text-xs text-slate-400">Tenant Workspace #{dataset.workspace_id} • ID #{dataset.id}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canDelete && (
            <>
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="px-3 py-2 bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-800/50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Trash2 size={14} />
                  <span>Soft Delete</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-red-950/30 border border-red-800/50 p-1 rounded-xl">
                  <span className="text-[11px] text-red-300 font-semibold px-2">Confirm?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-2 py-1 text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}

          {canRunAnalysis && (
            <button
              onClick={handleLaunchAnalysis}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition transform hover:scale-105"
            >
              <Play size={14} className="fill-current" />
              <span>Launch Causal Engine</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Database size={14} /> Total Rows
          </div>
          <div className="text-xl font-black text-white">{dataset.row_count?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Layers size={14} /> Columns
          </div>
          <div className="text-xl font-black text-white">{columnsList.length}</div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <Calendar size={14} /> Uploaded
          </div>
          <div className="text-sm font-semibold text-white mt-1">
            {new Date(dataset.created_at).toLocaleDateString()}
          </div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
            <HardDrive size={14} /> Storage Key
          </div>
          <div className="text-xs font-mono text-indigo-300 truncate mt-1.5" title={dataset.storage_key || dataset.file_path}>
            {dataset.storage_key ? dataset.storage_key.split('/').pop() : 'Local Partition'}
          </div>
        </div>
      </div>

      {/* Schema Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Layers className="text-indigo-400" size={18} />
          Inferred Dataset Schema ({columnsList.length} variables)
        </h3>
        
        {columnsList.length === 0 ? (
          <p className="text-slate-500 text-sm">No column definitions recorded for this dataset.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="text-[10px] text-slate-400 uppercase bg-slate-950/60 border-y border-slate-800">
                <tr>
                  <th className="px-4 py-2.5 font-bold">#</th>
                  <th className="px-4 py-2.5 font-bold">Variable Name</th>
                  <th className="px-4 py-2.5 font-bold">Inferred Type</th>
                  <th className="px-4 py-2.5 font-bold">Causal Role Candidate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {columnsList.map((col, idx) => {
                  const colName = typeof col === 'string' ? col : col.name || `col_${idx}`;
                  const colType = typeof col === 'object' ? col.type : 'float64';
                  const isId = colName.toLowerCase().includes('id');
                  const isTarget = colName.toLowerCase().includes('target') || colName.toLowerCase().includes('outcome') || colName.toLowerCase().includes('y');

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-bold text-white">{colName}</td>
                      <td className="px-4 py-2.5 text-cyan-400">{colType}</td>
                      <td className="px-4 py-2.5">
                        {isId ? (
                          <span className="text-slate-500 text-[10px]">Excluded Identifier</span>
                        ) : isTarget ? (
                          <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-sans font-bold">Outcome Target</span>
                        ) : (
                          <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-sans font-medium">Candidate Feature</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatasetDetail;
