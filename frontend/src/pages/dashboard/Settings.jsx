import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-400 mt-1">Manage platform configurations</p>
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center min-h-[400px] text-center shadow-lg">
        <SettingsIcon size={48} className="text-slate-700 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Workspace Configuration</h3>
        <p className="text-slate-400 max-w-md">Only Workspace Admins can modify global settings.</p>
      </div>
    </div>
  );
};

export default Settings;
