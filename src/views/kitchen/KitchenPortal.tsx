import React, { useState, useEffect, useMemo } from 'react';
import {
  ChefHat,
  Flame,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Play,
  RotateCcw,
  Sliders,
  Layers,
  Archive,
  Check,
  Pause,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Order, OrderStatus, KitchenStationId, StockAlert } from '../../types';
import { updateOrderStatus, requestReplenishment, resolveStockAlert } from '../../services/db';
import { voiceAnnouncer } from '../../services/voiceAnnouncer';

export const KitchenPortal: React.FC = () => {
  const {
    orders,
    inventory,
    stockAlerts,
    currentStaffUser,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'live_tickets' | 'stations' | 'kitchen_inventory' | 'alerts' | 'voice_console' | 'completed'
  >('live_tickets');

  const [selectedStation, setSelectedStation] = useState<KitchenStationId | 'all'>('all');

  // Voice announcement status & controls
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(voiceAnnouncer.isAudioEnabled());
  const [hasHindiVoice, setHasHindiVoice] = useState<boolean>(voiceAnnouncer.hasHindiVoice());
  const [isMuted, setIsMuted] = useState<boolean>(voiceAnnouncer.getIsMuted());
  const [volume, setVolume] = useState<number>(voiceAnnouncer.getVolume());
  const [voiceHistory, setVoiceHistory] = useState(voiceAnnouncer.getHistory());
  const [selectedVoiceName, setSelectedVoiceName] = useState(voiceAnnouncer.getSelectedVoiceName());
  const [isTestingSpeaker, setIsTestingSpeaker] = useState(false);

  // Subscribe to voice announcer changes
  useEffect(() => {
    const unsub = voiceAnnouncer.subscribe(() => {
      setIsAudioEnabled(voiceAnnouncer.isAudioEnabled());
      setHasHindiVoice(voiceAnnouncer.hasHindiVoice());
      setIsMuted(voiceAnnouncer.getIsMuted());
      setVolume(voiceAnnouncer.getVolume());
      setVoiceHistory([...voiceAnnouncer.getHistory()]);
      setSelectedVoiceName(voiceAnnouncer.getSelectedVoiceName());
    });
    return unsub;
  }, []);

  const handleEnableVoice = () => {
    const ok = voiceAnnouncer.enableAudio();
    if (ok) {
      setIsAudioEnabled(true);
      showToast('Kitchen Voice Enabled', 'Hindi speech synthesis is active for incoming tickets', 'success');
    }
  };

  const handleSpeakerTest = async () => {
    setIsTestingSpeaker(true);
    await voiceAnnouncer.testSpeaker();
    setIsTestingSpeaker(false);
  };

  // Kitchen Stations definition
  const stations: { id: KitchenStationId; name: string; color: string }[] = [
    { id: 'indian_kitchen', name: 'Indian Kitchen & Tandoor', color: 'border-amber-400 bg-amber-50/40 text-amber-900' },
    { id: 'chinese_kitchen', name: 'Chinese Wok Station', color: 'border-red-400 bg-red-50/40 text-red-900' },
    { id: 'pizza_station', name: 'Stone Pizza Oven', color: 'border-orange-400 bg-orange-50/40 text-orange-900' },
    { id: 'grill', name: 'Grill & Fryer Station', color: 'border-stone-400 bg-stone-50/40 text-stone-900' },
    { id: 'beverages', name: 'Beverage & Barista Bar', color: 'border-blue-400 bg-blue-50/40 text-blue-900' },
    { id: 'desserts', name: 'Desserts & Sweets Pantry', color: 'border-purple-400 bg-purple-50/40 text-purple-900' },
  ];

  // Filter orders for Kitchen Display
  const activeTickets = useMemo(() => {
    return orders.filter(
      (o) =>
        (o.status === 'NEW' || o.status === 'CONFIRMED' || o.status === 'SENT_TO_KITCHEN' || o.status === 'PREPARING') &&
        (selectedStation === 'all' || o.items.some((it) => it.kitchenStation === selectedStation))
    );
  }, [orders, selectedStation]);

  const readyOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'READY');
  }, [orders]);

  const completedOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'SERVED' || o.status === 'COMPLETED');
  }, [orders]);

  const handleUpdateTicketStatus = async (order: Order, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(order.id, newStatus, order.tableId, order.tableNumber);
      if (newStatus === 'READY') {
        showToast('Ticket Ready', `Order ${order.orderNumber} sent to waiter pass`, 'success');
        voiceAnnouncer.announceOrder(order, 'ready');
      }
    } catch (err) {
      console.error('Update ticket error:', err);
    }
  };

  const handleRequestStockReplenish = async (itemId: string, itemName: string) => {
    try {
      await requestReplenishment(itemId, currentStaffUser.name);
      showToast('Replenishment Requested', `Manager alerted for ${itemName}`, 'info');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col md:flex-row">
      {/* Kitchen Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900/90 border-r border-slate-800 p-4 shrink-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 px-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm">
              <ChefHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white tracking-tight">Kitchen KDS</h2>
              <p className="text-[10px] text-slate-400">Station Chef Console</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('live_tickets')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'live_tickets'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                Live Cooking Tickets
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-400">
                {activeTickets.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('stations')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'stations'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Preparation Stations
              </span>
              <span className="text-[10px] text-slate-400">6</span>
            </button>

            <button
              onClick={() => setActiveTab('kitchen_inventory')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'kitchen_inventory'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Archive className="w-4 h-4" />
                Kitchen Inventory
              </span>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'alerts'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Low Stock Alerts
              </span>
              {stockAlerts.filter((a) => a.status === 'active').length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white">
                  {stockAlerts.filter((a) => a.status === 'active').length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('voice_console')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'voice_console'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <Volume2 className="w-4 h-4" />
                Hindi Voice Console
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isAudioEnabled && !isMuted ? 'bg-emerald-400' : 'bg-slate-500'
                }`}
              />
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'completed'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Completed Orders
              </span>
              <span className="text-[10px] text-slate-400">{completedOrders.length}</span>
            </button>
          </nav>
        </div>

        {/* Voice status card in sidebar */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Hindi KDS Voice</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                isAudioEnabled
                  ? isMuted
                    ? 'bg-amber-950 text-amber-400'
                    : 'bg-emerald-950 text-emerald-400'
                  : 'bg-rose-950 text-rose-400'
              }`}
            >
              {isAudioEnabled ? (isMuted ? 'MUTED' : 'ACTIVE') : 'OFF'}
            </span>
          </div>

          {!isAudioEnabled ? (
            <button
              onClick={handleEnableVoice}
              className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold rounded-lg transition-colors"
            >
              ENABLE KITCHEN VOICE
            </button>
          ) : (
            <div className="text-[10px] text-slate-400 truncate">
              {hasHindiVoice ? 'hi-IN Hindi Synthesizer' : 'English Indian Fallback'}
            </div>
          )}
        </div>
      </aside>

      {/* Main Kitchen Content Area */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {/* ============================================================== */}
        {/* 1. LIVE COOKING TICKETS (KDS)                                  */}
        {/* ============================================================== */}
        {activeTab === 'live_tickets' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Live Kitchen Tickets</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono">
                    {activeTickets.length} active
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  New incoming orders announced automatically in Hindi
                </p>
              </div>

              {/* Station Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
                <button
                  onClick={() => setSelectedStation('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedStation === 'all'
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All Stations
                </button>
                {stations.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStation(st.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      selectedStation === st.id
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {st.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Tickets Grid */}
            {activeTickets.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/60 rounded-2xl border border-slate-800 p-6">
                <ChefHat className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-300">Kitchen Display is Clear</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Place an order from the Customer QR Menu (Table 5) to see ticket generation and hear voice announcements.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTickets.map((ticket) => {
                  const minutesElapsed = Math.floor(
                    (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60)
                  );
                  const isUrgent = minutesElapsed > 15;

                  return (
                    <div
                      key={ticket.id}
                      className={`bg-slate-900 rounded-2xl border flex flex-col justify-between overflow-hidden shadow-md transition-all ${
                        isUrgent
                          ? 'border-rose-500 ring-1 ring-rose-500/50'
                          : ticket.status === 'PREPARING'
                          ? 'border-amber-500/80'
                          : 'border-slate-800'
                      }`}
                    >
                      {/* Ticket Header */}
                      <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-extrabold text-sm border border-amber-500/30">
                            T{ticket.tableNumber}
                          </span>
                          <div>
                            <span className="text-xs font-bold text-white font-mono block">
                              {ticket.orderNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 capitalize">
                              {ticket.source} Order
                            </span>
                          </div>
                        </div>

                        {/* Timer */}
                        <div className="flex items-center gap-1 text-xs font-mono font-bold">
                          <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-400' : 'text-slate-400'}`} />
                          <span className={isUrgent ? 'text-rose-400 animate-pulse' : 'text-slate-300'}>
                            {minutesElapsed}m
                          </span>
                        </div>
                      </div>

                      {/* Ticket Items */}
                      <div className="p-4 space-y-3 flex-1">
                        {ticket.items.map((it, idx) => (
                          <div key={idx} className="flex items-start justify-between text-xs">
                            <div className="flex items-start gap-2">
                              <span className="w-5 h-5 rounded bg-slate-800 text-amber-400 font-extrabold flex items-center justify-center text-[11px] shrink-0">
                                {it.quantity}
                              </span>
                              <div>
                                <span className="font-bold text-white text-xs">{it.name}</span>
                                {it.selectedVariant && (
                                  <span className="text-[10px] text-slate-400 block">
                                    • {it.selectedVariant.name}
                                  </span>
                                )}
                                {it.specialInstructions && (
                                  <span className="text-[10px] text-amber-300 font-medium block">
                                    Note: {it.specialInstructions}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400">
                              {it.kitchenStation.split('_')[0]}
                            </span>
                          </div>
                        ))}

                        {/* Allergy warning if any */}
                        {ticket.allergies && (
                          <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-900/60 text-[10px] text-rose-300 flex items-center gap-1.5">
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>ALLERGY NOTE: {ticket.allergies}</span>
                          </div>
                        )}
                      </div>

                      {/* Ticket Action Buttons */}
                      <div className="p-3 bg-slate-950/40 border-t border-slate-800/80 flex items-center gap-2">
                        {ticket.status !== 'PREPARING' ? (
                          <button
                            onClick={() => handleUpdateTicketStatus(ticket, 'PREPARING')}
                            className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Start Cooking
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateTicketStatus(ticket, 'READY')}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Mark Ready to Serve
                          </button>
                        )}

                        <button
                          onClick={() => voiceAnnouncer.announceOrder(ticket, 'urgent')}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                          title="Replay Voice Announcement in Hindi"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. PREPARATION STATIONS VIEW                                   */}
        {/* ============================================================== */}
        {activeTab === 'stations' && (
          <div className="space-y-4">
            <div>
              <h1 className="text-base font-bold text-white">Preparation Station Assignments</h1>
              <p className="text-xs text-slate-400">
                Dishes are automatically routed to their designated stations
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stations.map((st) => {
                const stationOrders = orders.filter(
                  (o) =>
                    (o.status === 'NEW' || o.status === 'PREPARING') &&
                    o.items.some((it) => it.kitchenStation === st.id)
                );

                return (
                  <div key={st.id} className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <h3 className="text-xs font-bold text-white">{st.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono">
                        {stationOrders.length} pending
                      </span>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1.5 min-h-[60px]">
                      {stationOrders.length === 0 ? (
                        <p className="text-slate-500 text-[11px] italic">No active orders queued for this station.</p>
                      ) : (
                        stationOrders.map((ord) => (
                          <div key={ord.id} className="flex justify-between text-[11px] text-slate-300">
                            <span>
                              Table {ord.tableNumber} ({ord.orderNumber})
                            </span>
                            <span className="text-amber-400 capitalize">{ord.status.toLowerCase()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. KITCHEN INVENTORY & VISIBILITY                              */}
        {/* ============================================================== */}
        {activeTab === 'kitchen_inventory' && (
          <div className="space-y-4 max-w-5xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-base font-bold text-white">Kitchen Ingredient Stock Levels</h1>
                <p className="text-xs text-slate-400">
                  Live ingredient balances; request replenishment directly to inventory manager
                </p>
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Ingredient</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Current Stock</th>
                      <th className="py-3 px-4">Min. Required</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {inventory.slice(0, 15).map((item) => {
                      const isLow = item.currentStock <= item.minStock;
                      const isOut = item.currentStock === 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-bold text-white">{item.name}</td>
                          <td className="py-3 px-4 text-slate-400">{item.storageLocation}</td>
                          <td className="py-3 px-4 font-mono font-semibold">
                            {item.currentStock} {item.unit}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono">
                            {item.minStock} {item.unit}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                isOut
                                  ? 'bg-rose-950 text-rose-400'
                                  : isLow
                                  ? 'bg-amber-950 text-amber-400'
                                  : 'bg-emerald-950 text-emerald-400'
                              }`}
                            >
                              {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'Optimal'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {isLow && (
                              <button
                                onClick={() => handleRequestStockReplenish(item.id, item.name)}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[10px] font-bold"
                              >
                                Request Restock
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. LOW STOCK ALERTS TAB                                        */}
        {/* ============================================================== */}
        {activeTab === 'alerts' && (
          <div className="space-y-4 max-w-3xl">
            <div>
              <h1 className="text-base font-bold text-white">Active Stock Alerts</h1>
              <p className="text-xs text-slate-400">
                Ingredients currently below safety threshold
              </p>
            </div>

            {stockAlerts.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 rounded-2xl border border-slate-800 p-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-200">All Ingredient Levels Optimal</h3>
                <p className="text-xs text-slate-400 mt-1">No low-stock alerts at this moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stockAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-2xl bg-slate-900 border border-rose-500/50 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{alert.itemName}</h4>
                        <p className="text-[11px] text-slate-400">
                          Current: <strong className="text-rose-400">{alert.currentStock} {alert.unit}</strong> • Minimum Required: {alert.minStock} {alert.unit}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => resolveStockAlert(alert.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                    >
                      Acknowledge
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 5. HINDI VOICE CONSOLE & QUEUE                                 */}
        {/* ============================================================== */}
        {activeTab === 'voice_console' && (
          <div className="space-y-4 max-w-3xl">
            <div>
              <h1 className="text-base font-bold text-white">Hindi Kitchen Voice Console</h1>
              <p className="text-xs text-slate-400">
                SpeechSynthesis engine with hi-IN locale, voice queue and speaker testing
              </p>
            </div>

            {/* Voice Engine Setup Card */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xs font-bold text-white">Speech Synthesis Engine</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Voice Active: <strong className="text-amber-400">{selectedVoiceName}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!isAudioEnabled ? (
                    <button
                      onClick={handleEnableVoice}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs"
                    >
                      ENABLE KITCHEN VOICE
                    </button>
                  ) : (
                    <button
                      onClick={handleSpeakerTest}
                      disabled={isTestingSpeaker}
                      className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      {isTestingSpeaker ? 'Testing Speaker...' : 'Speaker Test (हिंदी)'}
                    </button>
                  )}
                </div>
              </div>

              {/* Volume Slider & Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-400 text-[11px] font-semibold mb-1.5">
                    Synthesizer Volume ({Math.round(volume * 100)}%):
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => voiceAnnouncer.setVolume(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] font-semibold mb-1.5">
                    Audio State:
                  </label>
                  <button
                    onClick={() => voiceAnnouncer.toggleMute()}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
                      isMuted
                        ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                        : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    }`}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    {isMuted ? 'Muted (Click to Unmute)' : 'Active (Click to Mute)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Announcement History Log */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Recent Announcements Queue & History
              </h3>

              {voiceHistory.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">
                  No announcements recorded yet. New incoming orders will appear here automatically.
                </p>
              ) : (
                <div className="space-y-2">
                  {voiceHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-amber-300 font-sans">{item.textHindi}</p>
                        <p className="text-[10px] text-slate-400 font-sans">{item.textEnglish}</p>
                        <span className="text-[9px] text-slate-500 font-mono">{item.timestamp}</span>
                      </div>

                      <button
                        onClick={() => voiceAnnouncer.replayAnnouncement(item.id)}
                        className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                        title="Replay this announcement"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 6. COMPLETED ORDERS                                            */}
        {/* ============================================================== */}
        {activeTab === 'completed' && (
          <div className="space-y-4 max-w-4xl">
            <div>
              <h1 className="text-base font-bold text-white">Completed Kitchen Orders</h1>
              <p className="text-xs text-slate-400">History of dishes cooked and delivered</p>
            </div>

            <div className="space-y-2">
              {completedOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white">{ord.orderNumber}</span>
                    <span className="text-slate-400 ml-2">Table {ord.tableNumber}</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-900">
                    Served
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
