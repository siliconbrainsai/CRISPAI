const getLocalData = (key) => JSON.parse(localStorage.getItem(key)) || [];
const setLocalData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// Audit Log Service
export const logAudit = (action, details) => {
  const logs = getLocalData('crisp_audit_logs');
  const newLog = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    user: 'Analyst',
    role: 'Data Scientist',
    action,
    details
  };
  setLocalData('crisp_audit_logs', [newLog, ...logs]);
  return newLog;
};

export const getAuditLogs = () => getLocalData('crisp_audit_logs');

// Reports Service
export const saveReport = (report) => {
  const reports = getLocalData('crisp_reports');
  const newReport = {
    ...report,
    id: Date.now(),
    date: new Date().toISOString()
  };
  setLocalData('crisp_reports', [newReport, ...reports]);
  return newReport;
};

export const getReports = () => getLocalData('crisp_reports');

// Experiments Service
export const saveExperiment = (exp) => {
  const experiments = getLocalData('crisp_experiments');
  const newExp = {
    ...exp,
    id: Date.now(),
    created: new Date().toISOString(),
    status: 'Running'
  };
  setLocalData('crisp_experiments', [newExp, ...experiments]);
  return newExp;
};

export const getExperiments = () => getLocalData('crisp_experiments');
