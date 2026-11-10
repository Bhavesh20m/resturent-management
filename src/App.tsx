import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { StaffAuthModal } from './components/StaffAuthModal';
import { OwnerPortal } from './views/owner/OwnerPortal';
import { WaiterPortal } from './views/waiter/WaiterPortal';
import { KitchenPortal } from './views/kitchen/KitchenPortal';
import { CustomerPortal } from './views/customer/CustomerPortal';
import { DemoAccessPage } from './views/demo/DemoAccessPage';
import { Loader2, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

const MainRouter: React.FC = () => {
  const {
    currentPath,
    isLoading,
    activeToast,
    dismissToast,
    isStaffAuthenticated,
    setIsStaffAuthenticated,
    setCurrentStaffUser,
    setCurrentRole,
    navigateTo,
  } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <h2 className="text-sm font-bold tracking-tight">Connecting to DineFlow Cloud Firestore...</h2>
        <p className="text-xs text-slate-400 mt-1">Bootstrapping 20 tables, live menu & inventory</p>
      </div>
    );
  }

  // Check if route is customer-facing
  const isCustomerRoute = currentPath.startsWith('/customer') || currentPath === '/' || currentPath === '';

  // 1. Customer-Facing Route: Isolated, Direct, No Admin/Staff Navigation
  if (isCustomerRoute) {
    const tableMatch = currentPath.match(/\/customer\/[^/]+\/table\/(\d+)/);
    const orderMatch = currentPath.match(/\/customer\/order\/([^/]+)/);
    const billMatch = currentPath.match(/\/customer\/bill\/([^/]+)/);

    let customerContent = <CustomerPortal tableNumberParam={5} />;

    if (tableMatch) {
      const tableNum = parseInt(tableMatch[1], 10) || 5;
      customerContent = <CustomerPortal tableNumberParam={tableNum} />;
    } else if (orderMatch) {
      customerContent = <CustomerPortal orderIdParam={orderMatch[1]} />;
    } else if (billMatch) {
      customerContent = <CustomerPortal billTableIdParam={billMatch[1]} />;
    }

    return (
      <div className="min-h-screen flex flex-col bg-[#f8fafc] font-sans antialiased text-slate-900 selection:bg-emerald-500 selection:text-white">
        {/* Customer view only - NO staff navbar, NO admin portal switcher */}
        <div className="flex-1">{customerContent}</div>

        {/* Global Notification Toast */}
        {activeToast && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-200">
            <div
              className={`flex items-start gap-3 p-3.5 rounded-xl shadow-xl border max-w-sm w-full backdrop-blur-md ${
                activeToast.type === 'success'
                  ? 'bg-emerald-950/90 text-white border-emerald-800'
                  : activeToast.type === 'warning'
                  ? 'bg-amber-950/90 text-white border-amber-800'
                  : activeToast.type === 'alert'
                  ? 'bg-rose-950/90 text-white border-rose-800'
                  : 'bg-slate-900/90 text-white border-slate-700'
              }`}
            >
              {activeToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
              {activeToast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
              {activeToast.type === 'alert' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
              {activeToast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}

              <div className="flex-1 min-w-0 text-xs">
                <h5 className="font-bold leading-tight">{activeToast.title}</h5>
                <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{activeToast.message}</p>
              </div>

              <button
                onClick={dismissToast}
                className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Staff-Facing Routes: Protected by Staff Authentication Barrier
  if (!isStaffAuthenticated) {
    return (
      <StaffAuthModal
        onAuthenticated={(staffMember) => {
          setIsStaffAuthenticated(true);
          setCurrentStaffUser(staffMember);
          setCurrentRole(staffMember.role);
          if (staffMember.role === 'owner' || staffMember.role === 'manager') {
            navigateTo('/owner/dashboard');
          } else if (staffMember.role === 'waiter') {
            navigateTo('/waiter/tables');
          } else if (staffMember.role === 'kitchen') {
            navigateTo('/kitchen/orders');
          }
        }}
        onExitToCustomer={() => {
          navigateTo('/customer/dineflow-demo/table/5');
        }}
      />
    );
  }

  // 3. Authenticated Staff Experience with Staff Navbar
  let staffContent = <DemoAccessPage />;
  if (currentPath.startsWith('/owner')) {
    staffContent = <OwnerPortal />;
  } else if (currentPath.startsWith('/waiter')) {
    staffContent = <WaiterPortal />;
  } else if (currentPath.startsWith('/kitchen')) {
    staffContent = <KitchenPortal />;
  } else if (currentPath === '/demo-access') {
    staffContent = <DemoAccessPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans antialiased text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Staff Top Navbar */}
      <Navbar />

      {/* Staff Portal Content View */}
      <div className="flex-1">{staffContent}</div>

      {/* Global Notification Toast */}
      {activeToast && (
        <div className="fixed top-16 right-4 z-50 animate-in slide-in-from-top duration-200">
          <div
            className={`flex items-start gap-3 p-3.5 rounded-xl shadow-xl border max-w-sm w-full backdrop-blur-md ${
              activeToast.type === 'success'
                ? 'bg-emerald-950/90 text-white border-emerald-800'
                : activeToast.type === 'warning'
                ? 'bg-amber-950/90 text-white border-amber-800'
                : activeToast.type === 'alert'
                ? 'bg-rose-950/90 text-white border-rose-800'
                : 'bg-slate-900/90 text-white border-slate-700'
            }`}
          >
            {activeToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {activeToast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
            {activeToast.type === 'alert' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
            {activeToast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0 text-xs">
              <h5 className="font-bold leading-tight">{activeToast.title}</h5>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">{activeToast.message}</p>
            </div>

            <button
              onClick={dismissToast}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainRouter />
    </AppProvider>
  );
}
