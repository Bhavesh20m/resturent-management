import React, { useState } from 'react';
import {
  Utensils,
  LayoutDashboard,
  ChefHat,
  Smartphone,
  RotateCcw,
  Volume2,
  VolumeX,
  AlertTriangle,
  Radio,
  User,
  ChevronDown,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { voiceAnnouncer } from '../services/voiceAnnouncer';

export const Navbar: React.FC = () => {
  const {
    restaurant,
    currentRole,
    setCurrentRole,
    currentStaffUser,
    setCurrentStaffUser,
    staff,
    stockAlerts,
    isConnected,
    resetDemoDatabase,
    currentPath,
    navigateTo,
    logoutStaff,
  } = useApp();

  const [isStaffMenuOpen, setIsStaffMenuOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(voiceAnnouncer.getIsMuted());

  const activeAlertsCount = stockAlerts.filter((a) => a.status === 'active').length;

  const handlePortalSwitch = (role: 'owner' | 'waiter' | 'kitchen' | 'customer', path: string) => {
    setCurrentRole(role);
    navigateTo(path);
  };

  const handleDemoReset = async () => {
    if (window.confirm('Reset DineFlow demo data back to default? All 20 tables, inventory, and sample orders will be restored.')) {
      setIsResetting(true);
      await resetDemoDatabase();
      setIsResetting(false);
    }
  };

  const toggleMute = () => {
    const muted = voiceAnnouncer.toggleMute();
    setIsVoiceMuted(muted);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('/demo-access')}
              className="flex items-center gap-2 text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                  DineFlow
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    POS
                  </span>
                </span>
                <p className="text-[10px] text-slate-400 -mt-0.5 hidden sm:block truncate max-w-[140px]">
                  {restaurant?.name || 'Demo Restaurant'}
                </p>
              </div>
            </button>
          </div>

          {/* Experience Portal Switcher Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800/80">
            <button
              onClick={() => handlePortalSwitch('owner', '/owner/dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentPath.startsWith('/owner')
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Owner Portal
            </button>

            <button
              onClick={() => handlePortalSwitch('waiter', '/waiter/tables')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentPath.startsWith('/waiter')
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              Waiter Portal
            </button>

            <button
              onClick={() => handlePortalSwitch('kitchen', '/kitchen/orders')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentPath.startsWith('/kitchen')
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              Kitchen Display
            </button>

            <button
              onClick={() => handlePortalSwitch('customer', '/customer/dineflow-demo/table/5')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentPath.startsWith('/customer')
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Customer QR (T-5)
            </button>

            <button
              onClick={() => navigateTo('/demo-access')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                currentPath === '/demo-access'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Overview & QR Codes for all 20 Tables"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Demo Hub
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Live Database Status */}
            <div
              className={`hidden lg:flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border ${
                isConnected
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60'
                  : 'bg-amber-950/40 text-amber-400 border-amber-900/60'
              }`}
              title="Live Cloud Firestore Synchronized"
            >
              <Radio className="w-3 h-3 animate-pulse" />
              <span>{isConnected ? 'Firestore Live' : 'Offline'}</span>
            </div>

            {/* Low Stock Alerts Badge */}
            {activeAlertsCount > 0 && (
              <button
                onClick={() => navigateTo('/owner/inventory')}
                className="flex items-center gap-1 px-2 py-1 rounded bg-rose-950/50 text-rose-300 border border-rose-900/60 text-xs font-medium hover:bg-rose-900/60 transition-colors"
                title={`${activeAlertsCount} active low-stock alerts`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>{activeAlertsCount}</span>
              </button>
            )}

            {/* Voice Mute / Unmute Button */}
            <button
              onClick={toggleMute}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                isVoiceMuted
                  ? 'border-slate-800 text-slate-500 hover:text-slate-300'
                  : 'border-slate-700 bg-slate-800 text-emerald-400'
              }`}
              title={isVoiceMuted ? 'Kitchen Voice Muted - Click to Unmute' : 'Kitchen Voice Active (Hindi)'}
            >
              {isVoiceMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* One-Click Demo Reset */}
            <button
              onClick={handleDemoReset}
              disabled={isResetting}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
              title="Reset Demo Data (Tables, Orders, Inventory)"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>

            {/* Staff Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsStaffMenuOpen(!isStaffMenuOpen)}
                className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center font-bold text-[10px] text-white">
                  {currentStaffUser.avatarInitials}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-[11px] font-semibold leading-tight">{currentStaffUser.name.split(' ')[0]}</div>
                  <div className="text-[9px] text-slate-400 capitalize leading-none">{currentStaffUser.role}</div>
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
              </button>

              {isStaffMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 text-slate-300 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                      Switch Demo Staff Role
                    </p>
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {staff.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setCurrentStaffUser(s);
                          setCurrentRole(s.role);
                          if (s.role === 'owner' || s.role === 'manager') navigateTo('/owner/dashboard');
                          if (s.role === 'waiter') navigateTo('/waiter/tables');
                          if (s.role === 'kitchen') navigateTo('/kitchen/orders');
                          setIsStaffMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-slate-800 transition-colors ${
                          currentStaffUser.id === s.id ? 'bg-slate-800/80 text-white font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-700 text-[9px] flex items-center justify-center font-bold">
                            {s.avatarInitials}
                          </span>
                          <span className="truncate">{s.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 capitalize px-1.5 py-0.5 rounded bg-slate-800">
                          {s.role}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="p-1 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setIsStaffMenuOpen(false);
                        logoutStaff();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out Staff
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
