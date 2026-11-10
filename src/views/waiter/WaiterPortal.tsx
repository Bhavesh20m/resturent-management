import React, { useState, useMemo } from 'react';
import {
  Utensils,
  BellRing,
  CheckCircle2,
  Clock,
  Printer,
  Receipt,
  Users,
  Search,
  Plus,
  Send,
  AlertCircle,
  CreditCard,
  DollarSign,
  Coffee,
  Check,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  Table,
  Order,
  ServiceRequest,
  Bill,
  OrderStatus,
  OrderItem,
  MenuProduct,
} from '../../types';
import {
  updateOrderStatus,
  acceptServiceRequest,
  resolveServiceRequest,
  getOrCreateBillForTable,
  processDemoPayment,
  placeOrder,
} from '../../services/db';
import { ReceiptModal } from '../../components/ReceiptModal';
import { QrCodeModal } from '../../components/QrCodeModal';
import { DEMO_RESTAURANT_ID } from '../../data/initialDemoData';

export const WaiterPortal: React.FC = () => {
  const {
    restaurant,
    tables,
    orders,
    serviceRequests,
    bills,
    menuProducts,
    currentStaffUser,
    showToast,
    navigateTo,
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'tables' | 'orders' | 'requests' | 'ready' | 'billing' | 'manual_order'
  >('tables');

  // Selected table for modal/drawer
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [qrModalTableNumber, setQrModalTableNumber] = useState<number | null>(null);
  const [receiptBill, setReceiptBill] = useState<Bill | null>(null);

  // Manual order creation state
  const [manualTableNumber, setManualTableNumber] = useState<number>(1);
  const [manualOrderItems, setManualOrderItems] = useState<OrderItem[]>([]);
  const [manualSearch, setManualSearch] = useState<string>('');

  // Cash payment record state
  const [cashPaymentModalBill, setCashPaymentModalBill] = useState<Bill | null>(null);
  const [cashAmount, setCashAmount] = useState<number>(0);

  // Filter service requests
  const pendingRequests = useMemo(() => {
    return serviceRequests.filter((r) => r.status !== 'resolved');
  }, [serviceRequests]);

  // Ready to serve orders
  const readyOrders = useMemo(() => {
    return orders.filter((o) => o.status === 'READY');
  }, [orders]);

  // Active / live orders
  const liveOrders = useMemo(() => {
    return orders.filter((o) => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
  }, [orders]);

  const handleServeOrder = async (order: Order) => {
    try {
      await updateOrderStatus(order.id, 'SERVED', order.tableId, order.tableNumber);
      showToast('Order Served', `Order ${order.orderNumber} delivered to Table ${order.tableNumber}`, 'success');
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleAcceptRequest = async (req: ServiceRequest) => {
    try {
      await acceptServiceRequest(req.id, currentStaffUser.name);
      showToast('Request Accepted', `Attending to Table ${req.tableNumber}`, 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveRequest = async (req: ServiceRequest) => {
    try {
      await resolveServiceRequest(req.id, req.tableId);
      showToast('Request Resolved', `Table ${req.tableNumber} request cleared`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordCashPayment = async () => {
    if (!cashPaymentModalBill) return;
    const table = tables.find((t) => t.id === cashPaymentModalBill.tableId);
    if (!table) return;

    try {
      const res = await processDemoPayment({
        billId: cashPaymentModalBill.id,
        tableId: table.id,
        amount: cashAmount || cashPaymentModalBill.balanceRemaining,
        method: 'cash',
        recordedByWaiter: currentStaffUser.name,
      });

      showToast('Cash Payment Recorded', `Transaction: ${res.transactionId}`, 'success');
      setCashPaymentModalBill(null);
    } catch (err) {
      console.error('Cash payment record failed:', err);
    }
  };

  const handleSendManualOrder = async () => {
    if (manualOrderItems.length === 0) return;
    const targetTable = tables.find((t) => t.tableNumber === manualTableNumber) || tables[0];
    try {
      const ord = await placeOrder({
        restaurantId: DEMO_RESTAURANT_ID,
        tableId: targetTable.id,
        tableNumber: targetTable.tableNumber,
        source: 'Waiter',
        items: manualOrderItems,
        assignedWaiterId: currentStaffUser.id,
        assignedWaiterName: currentStaffUser.name,
      });

      setManualOrderItems([]);
      setActiveTab('orders');
      showToast('Manual POS Order Created', `Order ${ord.orderNumber} dispatched to kitchen`, 'success');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-slate-900 flex flex-col md:flex-row">
      {/* Waiter Sidebar */}
      <aside className="w-full md:w-60 bg-white border-r border-slate-200/80 p-4 shrink-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2.5 px-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
              WP
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 leading-tight">Waiter Console</h2>
              <p className="text-[10px] text-slate-400 capitalize">{currentStaffUser.name}</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('tables')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'tables'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Utensils className="w-4 h-4" />
                Floor Tables
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/50 text-slate-700">
                {tables.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('requests')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'requests'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <BellRing className="w-4 h-4" />
                Service Calls
              </span>
              {pendingRequests.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white animate-pulse">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('ready')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'ready'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Ready to Serve
              </span>
              {readyOrders.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">
                  {readyOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'orders'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Live Orders
              </span>
              <span className="text-[10px] text-slate-400">{liveOrders.length}</span>
            </button>

            <button
              onClick={() => setActiveTab('billing')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'billing'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Billing & Payments
              </span>
            </button>

            <button
              onClick={() => setActiveTab('manual_order')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'manual_order'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Manual POS Order
              </span>
            </button>
          </nav>
        </div>

        {/* Assigned Shift Card */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mt-6 text-xs">
          <p className="text-[10px] text-slate-400 font-semibold uppercase">My Station</p>
          <p className="font-bold text-slate-800 mt-0.5">{currentStaffUser.name}</p>
          <p className="text-[11px] text-slate-500">Assigned: Tables 1 – 5</p>
        </div>
      </aside>

      {/* Main Waiter Content Area */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        {/* ============================================================== */}
        {/* 1. FLOOR TABLES VIEW                                           */}
        {/* ============================================================== */}
        {activeTab === 'tables' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-base font-bold text-slate-900">Floor Tables Overview</h1>
                <p className="text-xs text-slate-500">Real-time table occupancy, ordering status and service requests</p>
              </div>

              {/* Status Legend Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] font-semibold text-slate-600">
                <span className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available
                </span>
                <span className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Occupied
                </span>
                <span className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Cooking
                </span>
                <span className="flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded-md">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" /> Waiter Call
                </span>
              </div>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
              {tables.map((table) => {
                const hasPendingCall = pendingRequests.some((r) => r.tableId === table.id);
                const tableReadyOrders = readyOrders.filter((o) => o.tableNumber === table.tableNumber);

                let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                if (table.status === 'available') badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                if (table.status === 'occupied') badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                if (table.status === 'preparing') badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                if (table.status === 'food_ready' || tableReadyOrders.length > 0)
                  badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold';
                if (table.status === 'waiter_needed' || hasPendingCall)
                  badgeColor = 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse font-bold';
                if (table.status === 'bill_requested') badgeColor = 'bg-indigo-100 text-indigo-900 border-indigo-300';

                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTable(table)}
                    className={`bg-white rounded-2xl p-4 border transition-all cursor-pointer hover:shadow-md relative ${
                      hasPendingCall
                        ? 'border-rose-400 ring-2 ring-rose-300/40'
                        : 'border-slate-200/90'
                    }`}
                  >
                    {/* Top Row */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-extrabold text-slate-900">
                        Table {table.tableNumber}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrModalTableNumber(table.tableNumber);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                        title="View / Download QR Code"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 mb-3 space-y-0.5">
                      <p className="truncate">{table.section}</p>
                      <p className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Users className="w-3 h-3" /> Cap: {table.capacity} diners
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-semibold border text-center uppercase tracking-wide ${badgeColor}`}>
                      {hasPendingCall ? 'CALL WAITER!' : table.status.replace('_', ' ')}
                    </div>

                    {/* Quick Action Footer */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Server: {table.assignedWaiterName?.split(' ')[0] || 'Unassigned'}</span>
                      <span className="font-bold text-slate-700">Details →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. SERVICE CALLS TAB                                           */}
        {/* ============================================================== */}
        {activeTab === 'requests' && (
          <div className="max-w-3xl space-y-4">
            <div>
              <h1 className="text-base font-bold text-slate-900">Customer Service Requests</h1>
              <p className="text-xs text-slate-500">Live requests submitted from customer mobile devices</p>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No Pending Calls</h3>
                <p className="text-xs text-slate-400 mt-1">All table service calls have been resolved.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-base shrink-0 border border-rose-100">
                        T-{req.tableNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 uppercase">
                            {req.type.replace('_', ' ')}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(req.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {req.notes && (
                          <p className="text-xs text-slate-600 mt-0.5 bg-slate-50 px-2 py-1 rounded border border-slate-200/60 inline-block">
                            "{req.notes}"
                          </p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          Status: <strong className="capitalize text-slate-700">{req.status}</strong>
                          {req.acceptedByWaiterName && ` (Handled by ${req.acceptedByWaiterName})`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {req.status === 'pending' && (
                        <button
                          onClick={() => handleAcceptRequest(req)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => handleResolveRequest(req)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark Done
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. READY TO SERVE TAB                                          */}
        {/* ============================================================== */}
        {activeTab === 'ready' && (
          <div className="max-w-4xl space-y-4">
            <div>
              <h1 className="text-base font-bold text-slate-900">Food Ready at Kitchen Pass</h1>
              <p className="text-xs text-slate-500">Pick up these dishes from the counter and deliver to tables</p>
            </div>

            {readyOrders.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
                <Coffee className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No Food Waiting at Pass</h3>
                <p className="text-xs text-slate-400 mt-1">Kitchen will update tickets as soon as cooking finishes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {readyOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white p-4 rounded-2xl border border-emerald-300 bg-emerald-50/20 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                        <span className="text-sm font-extrabold text-slate-900">
                          Table {ord.tableNumber}
                        </span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          {ord.orderNumber}
                        </span>
                      </div>

                      <div className="space-y-1.5 mb-4">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-slate-800">
                            <span className="font-semibold">
                              {it.quantity}x {it.name}
                            </span>
                            <span className="text-[10px] uppercase text-slate-400">
                              {it.kitchenStation.replace('_', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleServeOrder(ord)}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Check className="w-4 h-4" />
                      Mark Served to Table {ord.tableNumber}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. LIVE ORDERS LIST                                            */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div className="max-w-4xl space-y-4">
            <div>
              <h1 className="text-base font-bold text-slate-900">Active Restaurant Orders</h1>
              <p className="text-xs text-slate-500">Live order status across all tables</p>
            </div>

            <div className="space-y-3">
              {liveOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{ord.orderNumber}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        Table {ord.tableNumber}
                      </span>
                      <span className="text-[10px] text-slate-400">({ord.source} Order)</span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {ord.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Total: ₹{ord.total} • Status: <strong className="text-slate-800">{ord.status}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {ord.status === 'NEW' && (
                      <button
                        onClick={() => updateOrderStatus(ord.id, 'PREPARING', ord.tableId, ord.tableNumber)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Send to Kitchen
                      </button>
                    )}
                    {ord.status === 'READY' && (
                      <button
                        onClick={() => handleServeOrder(ord)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Mark Served
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const bill = await getOrCreateBillForTable(DEMO_RESTAURANT_ID, ord.tableId, ord.tableNumber);
                        setReceiptBill(bill);
                      }}
                      className="p-2 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50"
                      title="Generate / Print Bill"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 5. BILLING & PAYMENTS TAB                                      */}
        {/* ============================================================== */}
        {activeTab === 'billing' && (
          <div className="max-w-4xl space-y-4">
            <div>
              <h1 className="text-base font-bold text-slate-900">Table Billing & Cash Collection</h1>
              <p className="text-xs text-slate-500">Record cash receipts, print bills, and monitor open balances</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {tables
                .filter((t) => t.status !== 'available')
                .map((t) => {
                  const bill = bills.find((b) => b.tableId === t.id);
                  return (
                    <div
                      key={t.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                          <span className="text-sm font-bold text-slate-900">Table {t.tableNumber}</span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              bill?.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {bill?.status || 'Active Diners'}
                          </span>
                        </div>

                        <div className="text-xs space-y-1 mb-4 text-slate-600">
                          <p>Diners: {t.guestCount || 2}</p>
                          <p>
                            Grand Total: <strong className="text-slate-900">₹{bill?.grandTotal || 0}</strong>
                          </p>
                          <p>
                            Balance Due: <strong className="text-indigo-600">₹{bill?.balanceRemaining || 0}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {bill && bill.balanceRemaining > 0 && (
                          <button
                            onClick={() => {
                              setCashPaymentModalBill(bill);
                              setCashAmount(bill.balanceRemaining);
                            }}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            Collect Cash
                          </button>
                        )}
                        {bill && (
                          <button
                            onClick={() => setReceiptBill(bill)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print Receipt
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 6. MANUAL POS ORDER CREATION                                   */}
        {/* ============================================================== */}
        {activeTab === 'manual_order' && (
          <div className="max-w-4xl space-y-4">
            <div>
              <h1 className="text-base font-bold text-slate-900">Manual POS Order Placement</h1>
              <p className="text-xs text-slate-500">Take walk-in table orders directly from the floor</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-700">Assign to Table:</label>
                <select
                  value={manualTableNumber}
                  onChange={(e) => setManualTableNumber(Number(e.target.value))}
                  className="text-xs font-bold py-1.5 px-3 border border-slate-200 rounded-lg bg-slate-50"
                >
                  {tables.map((t) => (
                    <option key={t.id} value={t.tableNumber}>
                      Table {t.tableNumber} ({t.section})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dish search */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search dish to add to order..."
                  value={manualSearch}
                  onChange={(e) => setManualSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              {/* Fast Dish Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                {menuProducts
                  .filter((p) => p.isPublished && p.isAvailable && p.name.toLowerCase().includes(manualSearch.toLowerCase()))
                  .slice(0, 12)
                  .map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setManualOrderItems((prev) => {
                          const existing = prev.find((i) => i.menuProductId === p.id);
                          if (existing) {
                            return prev.map((i) =>
                              i.menuProductId === p.id ? { ...i, quantity: i.quantity + 1 } : i
                            );
                          }
                          return [
                            ...prev,
                            {
                              id: `manual-${Date.now()}-${p.id}`,
                              menuProductId: p.id,
                              name: p.name,
                              price: p.price,
                              quantity: 1,
                              kitchenStation: p.kitchenStation,
                              isVeg: p.isVeg,
                            },
                          ];
                        });
                      }}
                      className="p-2 text-left rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 text-xs transition-colors"
                    >
                      <p className="font-bold text-slate-900 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-500">₹{p.price}</p>
                    </button>
                  ))}
              </div>

              {/* Items in Manual Order */}
              {manualOrderItems.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <h4 className="text-xs font-bold text-slate-900 mb-2">Order Items:</h4>
                  <div className="space-y-1.5 mb-4">
                    {manualOrderItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs">
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">₹{item.price * item.quantity}</span>
                          <button
                            onClick={() =>
                              setManualOrderItems((prev) => prev.filter((i) => i.id !== item.id))
                            }
                            className="text-rose-500 hover:text-rose-700"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSendManualOrder}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Dispatch Order to Kitchen (₹
                    {manualOrderItems.reduce((s, i) => s + i.price * i.quantity, 0)})
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Table Details Slide-over Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 p-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Table {selectedTable.tableNumber} Management
              </h3>
              <button
                onClick={() => setSelectedTable(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="text-xs space-y-2 mb-4 text-slate-600">
              <p>Section: <strong>{selectedTable.section}</strong></p>
              <p>Capacity: <strong>{selectedTable.capacity} Diners</strong></p>
              <p>Status: <strong className="capitalize">{selectedTable.status.replace('_', ' ')}</strong></p>
              <p>Assigned Waiter: <strong>{selectedTable.assignedWaiterName}</strong></p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  setQrModalTableNumber(selectedTable.tableNumber);
                  setSelectedTable(null);
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold"
              >
                Show Customer QR & NFC Link
              </button>
              <button
                onClick={() => {
                  navigateTo(`/customer/dineflow-demo/table/${selectedTable.tableNumber}`);
                  setSelectedTable(null);
                }}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
              >
                Open Customer Menu for Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collect Cash Payment Modal */}
      {cashPaymentModalBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-5 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Record Cash Receipt</h3>
            <p className="text-xs text-slate-500 mb-3">
              Table {cashPaymentModalBill.tableNumber} • Due: ₹{cashPaymentModalBill.balanceRemaining}
            </p>
            <div className="mb-4">
              <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                Cash Received (₹):
              </label>
              <input
                type="number"
                value={cashAmount}
                onChange={(e) => setCashAmount(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCashPaymentModalBill(null)}
                className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordCashPayment}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold"
              >
                Confirm Cash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalTableNumber && (
        <QrCodeModal
          tableNumber={qrModalTableNumber}
          restaurantSlug={restaurant?.slug || 'dineflow-demo'}
          onClose={() => setQrModalTableNumber(null)}
        />
      )}

      {/* Printable Receipt Modal */}
      {receiptBill && (
        <ReceiptModal
          bill={receiptBill}
          restaurant={restaurant}
          onClose={() => setReceiptBill(null)}
        />
      )}
    </div>
  );
};
