import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useStore } from '@/store/useStore';
import { Navigate } from 'react-router-dom';

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-isuzet-bg text-isuzet-text font-sans selection:bg-brand-primary/30">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;