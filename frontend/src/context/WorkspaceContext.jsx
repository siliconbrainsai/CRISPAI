import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDataset, getAnalysis, getDatasets } from '../services/api';

const WorkspaceContext = createContext();

export const WorkspaceProvider = ({ children }) => {
  const [activeDataset, setActiveDatasetState] = useState(null);
  const [activeJobId, setActiveJobIdState] = useState(() => sessionStorage.getItem('crisp_active_job_id') || null);
  const [activeAnalysisId, setActiveAnalysisIdState] = useState(() => sessionStorage.getItem('crisp_active_analysis_id') || null);
  const [activeAnalysisConfig, setActiveAnalysisConfigState] = useState(() => {
    try {
      const stored = sessionStorage.getItem('crisp_active_analysis_config');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [analysisResults, setAnalysisResultsState] = useState(null);
  const [isHydrating, setIsHydrating] = useState(true);

  // Setters with sessionStorage sync for session resilience across refreshes
  const setActiveDataset = (dataset) => {
    setActiveDatasetState(dataset);
    if (dataset?.id) {
      sessionStorage.setItem('crisp_active_dataset_id', dataset.id);
    } else {
      sessionStorage.removeItem('crisp_active_dataset_id');
    }
  };

  const setActiveJobId = (jobId) => {
    setActiveJobIdState(jobId);
    if (jobId) {
      sessionStorage.setItem('crisp_active_job_id', jobId);
    } else {
      sessionStorage.removeItem('crisp_active_job_id');
    }
  };

  const setActiveAnalysisId = (analysisId) => {
    setActiveAnalysisIdState(analysisId);
    if (analysisId) {
      sessionStorage.setItem('crisp_active_analysis_id', analysisId);
    } else {
      sessionStorage.removeItem('crisp_active_analysis_id');
    }
  };

  const setActiveAnalysisConfig = (config) => {
    setActiveAnalysisConfigState(config);
    if (config) {
      sessionStorage.setItem('crisp_active_analysis_config', JSON.stringify(config));
    } else {
      sessionStorage.removeItem('crisp_active_analysis_config');
    }
  };

  const setAnalysisResults = (results) => {
    setAnalysisResultsState(results);
  };

  // Rehydration on page load / browser refresh
  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      setIsHydrating(true);
      try {
        const storedDatasetId = sessionStorage.getItem('crisp_active_dataset_id');
        if (storedDatasetId) {
          try {
            const res = await getDataset(storedDatasetId);
            if (isMounted) setActiveDatasetState(res.data);
          } catch (e) {
            console.warn('Could not rehydrate dataset by ID, checking list...', e);
            const listRes = await getDatasets();
            if (isMounted && listRes.data && listRes.data.length > 0) {
              setActiveDataset(listRes.data[0]);
            }
          }
        } else {
          // If no stored ID, load the most recent dataset from backend if available
          const listRes = await getDatasets();
          if (isMounted && listRes.data && listRes.data.length > 0) {
            setActiveDataset(listRes.data[0]);
          }
        }

        const storedAnalysisId = sessionStorage.getItem('crisp_active_analysis_id');
        if (storedAnalysisId) {
          try {
            const res = await getAnalysis(storedAnalysisId);
            if (isMounted && res.data) {
              setActiveAnalysisIdState(res.data.id);
              if (res.data.results) {
                setAnalysisResultsState(res.data.results);
              }
              if (!activeAnalysisConfig && res.data.outcome) {
                setActiveAnalysisConfigState({
                  outcome: res.data.outcome,
                  candidates: res.data.candidates || [],
                  environments: res.data.environments || [],
                  date: res.data.created_at
                });
              }
            }
          } catch (e) {
            console.warn('Could not rehydrate analysis by ID', e);
          }
        }
      } catch (err) {
        console.error('WorkspaceContext rehydration error:', err);
      } finally {
        if (isMounted) setIsHydrating(false);
      }
    };

    hydrate();
    return () => { isMounted = false; };
  }, []);

  return (
    <WorkspaceContext.Provider value={{
      activeDataset,
      setActiveDataset,
      activeJobId,
      setActiveJobId,
      activeAnalysisId,
      setActiveAnalysisId,
      activeAnalysisConfig,
      setActiveAnalysisConfig,
      analysisResults,
      setAnalysisResults,
      isHydrating
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => useContext(WorkspaceContext);

