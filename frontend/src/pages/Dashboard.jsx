import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DataIngestion from '../components/upload/DataIngestion';
import PipelineConfig from '../components/config/PipelineConfig';
import FeatureRankChart from '../components/results/FeatureRankChart';
import GradCamViewer from '../components/results/GradCamViewer';
import CausalDAG from '../components/results/CausalDAG';
import InferenceModal from '../components/inference/InferenceModal';
import { getStatus, getResults, getGradCam } from '../services/api';

const Dashboard = () => {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState(null);
  const [gradCam, setGradCam] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    if (jobId && status !== 'COMPLETED') {
      interval = setInterval(async () => {
        try {
          const res = await getStatus(jobId);
          setStatus(res.data.status);
          if (res.data.status === 'COMPLETED') {
            clearInterval(interval);
            fetchResults(jobId);
          }
        } catch (error) {
          console.error(error);
          clearInterval(interval);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [jobId, status]);

  const fetchResults = async (id) => {
    try {
      const res = await getResults(id);
      setResults(res.data);
      // Mock fetch gradcam
      const gcRes = await getGradCam(id, "sample_img_1");
      setGradCam(gcRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="max-w-6xl mx-auto mt-8 px-4"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Analyst Dashboard</h2>
        <button 
          onClick={() => navigate('/auth')}
          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-bold py-2 px-4 rounded-lg transition-colors border border-red-500/30"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
        <DataIngestion />
        <PipelineConfig onJobStarted={(id) => {
          setJobId(id);
          setStatus('RUNNING');
          setResults(null);
          setGradCam(null);
        }} />
        
        {status && (
          <div className="p-4 bg-slate-900 rounded-lg shadow-xl flex items-center justify-between">
            <span className="font-semibold text-slate-300">Pipeline Status:</span>
            <span className={`px-3 py-1 rounded text-sm font-bold ${status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400 animate-pulse'}`}>
              {status}
            </span>
          </div>
        )}
        <InferenceModal />
      </div>

      <div className="space-y-6">
        {results ? (
          <>
            <FeatureRankChart data={results} />
            <CausalDAG data={results} />
            <GradCamViewer gradCamData={gradCam} />
          </>
        ) : (
          <div className="h-full min-h-[400px] rounded-lg border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-500 bg-slate-900/50">
            Run the pipeline to generate causal insights.
          </div>
        )}
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
