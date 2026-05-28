import React, { useEffect, useState } from 'react';
import { Bell, LogOut, User, Clock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatWithEthiopian } from '@/lib/ethiopian-calendar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

const TopBar = () => {
  const { user, shockMode, notificationCount, logout } = useStore();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-[52px] bg-isuzet-surface border-b border-isuzet-border flex items-center justify-between px-4 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="text-xs text-isuzet-secondary font-medium">
          OPS Center / <span className="text-isuzet-text">Workqueue</span>
        </div>
        
        {shockMode.active && (
          <Badge variant="destructive" className="animate-pulse bg-brand-danger text-white border-none px-2 py-0.5 text-[10px] font-bold">
            ⚠ SHOCK MODE ACTIVE — LEVEL {shockMode.level}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 text-xs font-mono text-isuzet-text">
            <Clock size={12} className="text-isuzet-secondary" />
            {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })} EAT
          </div>
          <div className="text-[10px] text-isuzet-secondary">
            {formatWithEthiopian(time)}
          </div>
        </div>

        <div className="relative cursor-pointer group">
          <Bell size={18} className="text-isuzet-secondary group-hover:text-isuzet-text transition-colors" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-brand-danger text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-isuzet-surface">
              {notificationCount}
            </span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-isuzet-text leading-none">{user?.name}</span>
                <span className="text-[10px] text-isuzet-secondary leading-none mt-1">{user?.role.replace('_', ' ')}</span>
              </div>
              <Avatar className="h-8 w-8 border border-isuzet-border">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="bg-brand-primary text-white text-xs">
                  {user?.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-isuzet-surface border-isuzet-border text-isuzet-text">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-isuzet-border" />
            <DropdownMenuItem className="focus:bg-isuzet-border focus:text-isuzet-text cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-isuzet-border" />
            <DropdownMenuItem onClick={logout} className="focus:bg-brand-danger/10 focus:text-brand-danger text-brand-danger cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default TopBar;