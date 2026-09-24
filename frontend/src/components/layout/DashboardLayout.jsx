import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import CausalCopilotDrawer from '../common/CausalCopilotDrawer';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white flex flex-col relative">
      <Navbar />
      <div className="flex-grow flex flex-col w-full">
        <main className="flex-grow w-full">
          <Outlet />
        </main>
      </div>
      {/* Global CRISP Causal Copilot Floating Chat Drawer */}
      <CausalCopilotDrawer />
    </div>
  );
};

export default DashboardLayout;
