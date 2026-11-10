import React, { useState } from 'react';
import {
  Utensils,
  LayoutDashboard,
  ChefHat,
  Smartphone,
  QrCode,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Volume2,
  FileText,
  Users,
  Printer,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { QrCodeModal } from '../../components/QrCodeModal';

export const DemoAccessPage: React.FC = () => {
  const { restaurant, tables, resetDemoDatabase, navigateTo, showToast } = useApp();
  const [selectedQrTable, setSelectedQrTable] = useState<number | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const handleReset = async () => {
    if (window.confirm('Reset DineFlow demo data back to default? All 20 tables, inventory, and sample orders will be restored.')) {
      setIsResetting(true);
      await resetDemoDatabase();
      setIsResetting(false);
    }
  };

  const portalCards = [
    {
      title: 'Owner & Manager Portal',
      role: 'owner',
      route: '/owner/dashboard',
      description: 'Executive dashboard, real sales analytics, interactive floor map, digital menu catalog, inventory control, and reports.',
      icon: LayoutDashboard,
      badge: 'Full Operational Control',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    },
    {
      title: 'Waiter Mobile Portal',
      role: 'waiter',
      route: '/waiter/tables',
      description: 'Interactive floor tables, ready-to-serve food alerts, 1-click customer call waiter resolution, manual POS orders, and cash settlement.',
      icon: Utensils,
      badge: 'Floor Staff Only',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      title: 'Kitchen Display (KDS)',
      role: 'kitchen',
      route: '/kitchen/orders',
      description: 'Live order tickets, 6 preparation stations, kitchen inventory visibility, and real Web Speech Hindi voice announcements.',
      icon: ChefHat,
      badge: 'Hindi Voice Announcements',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      title: 'Customer QR Website (Table 5)',
      role: 'customer',
      route: '/customer/dineflow-demo/table/5',
      description: 'Mobile-first dining menu, dish customization, instant ordering, live kitchen timeline, permanent Call Waiter button, and demo billing.',
      icon: Smartphone,
      badge: 'NFC & QR Ready',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20">
      {/* Hero Banner */}
      <div className="bg-slate-900 text-white border-b border-slate-800 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/60 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Live Cloud Firestore Backend
                </span>
                <span className="text-[11px] text-slate-400">Asia/Kolkata (IST)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                DineFlow Demonstration Hub
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Experience connected real-time restaurant operations across four distinct roles using one unified database.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition-colors disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                {isResetting ? 'Resetting Demo...' : 'Reset Demo Data'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* 4 Separate Experiences Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {portalCards.map((portal) => {
            const IconComp = portal.icon;
            return (
              <div
                key={portal.route}
                className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${portal.badgeColor}`}>
                      {portal.badge}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-1">{portal.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    {portal.description}
                  </p>
                </div>

                <button
                  onClick={() => navigateTo(portal.route)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  Launch {portal.title.split(' ')[0]}
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* 20 Table QR & NFC Matrix */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-600" />
                All 20 Tables — QR Codes & NFC Links
              </h3>
              <p className="text-xs text-slate-500">
                Click any table to test its customer session or view/download its individual QR code
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Total Tables: {tables.length}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {tables.map((t) => (
              <div
                key={t.id}
                className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between hover:bg-slate-100/70 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-slate-900">
                      Table {t.tableNumber}
                    </span>
                    <button
                      onClick={() => setSelectedQrTable(t.tableNumber)}
                      className="p-1 text-slate-400 hover:text-slate-800 rounded"
                      title="Download QR PNG"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">{t.section}</span>
                </div>

                <button
                  onClick={() => navigateTo(`/customer/dineflow-demo/table/${t.tableNumber}`)}
                  className="mt-2.5 w-full py-1 text-[11px] font-bold bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  Open Menu →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* End-to-End Testing Verification Guide */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Step-by-Step Test Scenarios (12 Verification Tests)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-900 block mb-1">TEST 1 & 2: QR Order & Recipe Deduction</strong>
              <p className="text-[11px]">
                Open Customer QR Table 5, order Paneer Butter Masala (200g paneer, 150g tomatoes, 30g butter). Check waiter and kitchen display, then inspect Inventory to verify exact deduction.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-900 block mb-1">TEST 3: Idempotency Protection</strong>
              <p className="text-[11px]">
                Orders mark `inventoryDeducted: true`. Confirming an already deducted order never triggers a second ingredient decrement.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-900 block mb-1">TEST 4 & 5: Low-Stock & Hindi Voice</strong>
              <p className="text-[11px]">
                Lower paneer stock below minStock (2000g) to trigger real-time alert. Enable Kitchen Voice to hear real SpeechSynthesis announcements in Hindi (hi-IN).
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <strong className="text-slate-900 block mb-1">TEST 6, 7 & 11: Call Waiter & Demo Split Payments</strong>
              <p className="text-[11px]">
                Click "Call Waiter" or "Request Bill" on customer mobile screen. See waiter portal highlight the table instantly. Settle bill with 2-way split demo payment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      {selectedQrTable && (
        <QrCodeModal
          tableNumber={selectedQrTable}
          restaurantSlug={restaurant?.slug || 'dineflow-demo'}
          onClose={() => setSelectedQrTable(null)}
        />
      )}
    </div>
  );
};
