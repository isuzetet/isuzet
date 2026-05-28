import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Bell, LayoutDashboard, Package, Users, AlertTriangle, 
  ShieldCheck, Wallet, Map, Eye, BarChart3, Settings2, ChevronLeft, ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore } from '@/store/useStore';

const navItems = [
  { icon: Bell, label: 'Workqueue', path: '/' },
  { icon: LayoutDashboard, label: 'Overview', path: '/overview' },
  { icon: Package, label: 'Loads', path: '/loads' },
  { icon: Users, label: 'Drivers', path: '/drivers' },
  { icon: AlertTriangle, label: 'Incidents', path: '/incidents' },
  { icon: ShieldCheck, label: 'KYC Review', path: '/kyc' },
  { icon: Wallet, label: 'Finance', path: '/finance' },
  { icon: Map, label: 'Corridors', path: '/corridors' },
  { icon: Eye, label: 'Fraud', path: '/fraud' },
  { icon: BarChart3, label: 'Intelligence', path: '/intelligence' },
  { icon: Settings2, label: 'Strategy', path: '/strategy', adminOnly: true },
];

const Sidebar = () => {
  const location = useLocation();
  const { user, sidebarCollapsed, toggleSidebar } = useStore();

  return (
    <aside className={cn(
      "bg-isuzet-surface border-r border-isuzet-border transition-all duration-300 flex flex-col h-screen sticky top-0",
      sidebarCollapsed ? "w-12" : "w-[220px]"
    )}>
      <div className="h-[52px] flex items-center px-3 border-b border-isuzet-border justify-between">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-primary rounded flex items-center justify-center text-white font-bold text-xs">I</div>
            <span className="font-bold text-sm tracking-tight text-isuzet-text">ISUZET <span className="text-brand-accent">OPS</span></span>
          </div>
        )}
        <button onClick={toggleSidebar} className="text-isuzet-secondary hover:text-isuzet-text">
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          if (item.adminOnly && user?.role !== 'SUPER_ADMIN') return null;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 mx-2 rounded-md transition-colors group relative",
                isActive 
                  ? "bg-brand-primary/10 text-brand-primary" 
                  : "text-isuzet-secondary hover:bg-isuzet-border/50 hover:text-isuzet-text"
              )}
            >
              <item.icon size={18} className={cn(isActive ? "text-brand-primary" : "text-isuzet-secondary group-hover:text-isuzet-text")} />
              {!sidebarCollapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-isuzet-surface border border-isuzet-border rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-50">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-isuzet-border">
        {!sidebarCollapsed && (
          <div className="text-[10px] text-isuzet-secondary uppercase tracking-widest font-bold mb-2">System Status</div>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-success animate-pulse" />
            {!sidebarCollapsed && <span className="text-[10px] text-isuzet-secondary">All Engines Online</span>}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;