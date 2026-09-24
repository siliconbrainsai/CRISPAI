import React, { useState, useEffect, useCallback } from 'react';
import { Database, Search, Filter, MoreVertical, FileText, Loader2, AlertCircle, RefreshCw, CheckCircle, ArrowRight, Trash2, Eye, ShieldAlert } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import DataIngestion from '../../components/upload/DataIngestion';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useAuth } from '../../context/AuthContext';
import { getDatasets, deleteDataset } from '../../services/api';

const DataSources = () => {
  const { activeDataset, setActiveDataset } = useWorkspace();
  const { canUpload, canDelete, role } = useAuth();
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDatasets();
      const list = res.data || [];
      setDatasets(list);
      // If there is no active dataset selected yet but datasets exist, select the first one
      if (!activeDataset && list.length > 0) {
        setActiveDataset(list[0]);
      }
    } catch (err) {
      console.error('Failed to load datasets:', err);
      setError(err.message || 'Backend unavailable. Unable to load datasets.');
    } finally {
      setLoading(false);
    }
  }, [activeDataset, setActiveDataset]);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleDelete = async (datasetId) => {
    if (!window.confirm('Are you sure you want to soft delete this dataset?')) return;
    setDeletingId(datasetId);
    try {
      await deleteDataset(datasetId);
      await fetchDatasets();
    } catch (err) {
      alert(err.message || 'Failed to delete dataset.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDatasets = datasets.filter(d => 
    d.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Data Sources</h1>
          <p className="text-sm text-slate-400 mt-1">Multi-tenant dataset management and ingestion</p>
        </div>
        <button 
          onClick={fetchDatasets}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition"
          title="Refresh Datasets"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          {canUpload ? (
            <DataIngestion onDatasetUploaded={() => fetchDatasets()} />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-3">
              <ShieldAlert className="text-amber-400 mx-auto" size={32} />
              <h3 className="text-base font-bold text-white">Upload Restricted</h3>
              <p className="text-xs text-slate-400">
                Your assigned role (<span className="text-indigo-400 font-semibold">{role}</span>) has read-only access. Dataset uploads require <span className="font-semibold text-slate-300">Data Scientist</span> or <span className="font-semibold text-slate-300">Admin</span> privileges.
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Available Datasets</h3>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search datasets..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                <Loader2 className="animate-spin text-indigo-400 mb-3" size={32} />
                <p className="text-sm">Loading datasets from database...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <AlertCircle className="text-rose-400 mb-3" size={36} />
                <h4 className="text-white font-semibold mb-1">Backend Unavailable</h4>
                <p className="text-slate-400 text-sm max-w-sm mb-4">{error}</p>
                <button 
                  onClick={fetchDatasets}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg transition"
                >
                  Retry
                </button>
              </div>
            ) : filteredDatasets.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
                <Database size={40} className="text-slate-700 mb-3" />
                <h4 className="text-white font-semibold mb-1">No datasets found</h4>
                <p className="text-sm max-w-sm">No active datasets in your tenant workspace. Use the upload panel to begin.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-y border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-medium">Dataset Name</th>
                      <th className="px-4 py-3 font-medium">Rows</th>
                      <th className="px-4 py-3 font-medium">Columns</th>
                      <th className="px-4 py-3 font-medium">Upload Date</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredDatasets.map((ds) => {
                      const isActive = activeDataset?.id === ds.id;
                      const columnsCount = Array.isArray(ds.schema_definition) 
                        ? ds.schema_definition.length 
                        : (ds.schema_definition ? Object.keys(ds.schema_definition).length : 0);

                      return (
                        <tr key={ds.id} className={`hover:bg-slate-800/50 transition ${isActive ? 'bg-indigo-950/20' : ''}`}>
                          <td className="px-4 py-4 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded flex items-center justify-center ${isActive ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-800 text-slate-400'}`}>
                              <FileText size={16} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Link 
                                  to={`/data-sources/${ds.id}`}
                                  className="font-semibold text-white hover:text-indigo-400 transition"
                                >
                                  {ds.filename}
                                </Link>
                                {isActive && (
                                  <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30">
                                    ACTIVE
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500">ID #{ds.id}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">{ds.row_count}</td>
                          <td className="px-4 py-4">{columnsCount}</td>
                          <td className="px-4 py-4 text-slate-400">
                            {new Date(ds.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <Link
                                to={`/data-sources/${ds.id}`}
                                className="text-xs font-semibold px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition inline-flex items-center gap-1"
                                title="View Schema & Details"
                              >
                                <Eye size={12} />
                                <span>Details</span>
                              </Link>

                              <button
                                onClick={() => {
                                  setActiveDataset(ds);
                                  navigate('/causal-engine');
                                }}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition inline-flex items-center gap-1.5 ${
                                  isActive 
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-500' 
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                }`}
                              >
                                <span>Analyze</span>
                                <ArrowRight size={13} />
                              </button>

                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(ds.id)}
                                  disabled={deletingId === ds.id}
                                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                  title="Soft Delete Dataset"
                                >
                                  <Trash2 size={14} className={deletingId === ds.id ? 'animate-spin' : ''} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="mt-4 flex justify-between items-center text-xs text-slate-500">
              <span>Showing {filteredDatasets.length} dataset{filteredDatasets.length !== 1 ? 's' : ''}</span>
              <span className="text-[11px] text-slate-600">Enterprise Tenant Scoped</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataSources;
