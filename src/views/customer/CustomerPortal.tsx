import React, { useState, useMemo, useEffect } from 'react';
import {
  Utensils,
  Search,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Clock,
  Flame,
  CheckCircle2,
  BellRing,
  Wifi,
  Gamepad2,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  QrCode,
  ArrowLeft,
  Receipt,
  Users,
  AlertCircle,
  FileText,
  Award,
  Star,
  Gift,
  Sparkles,
  Radio,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  MenuProduct,
  OrderItem,
  Order,
  Table,
  ProductVariant,
  ProductAddon,
  Bill,
  PaymentRecord,
} from '../../types';
import { placeOrder, getOrCreateBillForTable, processDemoPayment } from '../../services/db';
import { ServiceRequestModal } from './ServiceRequestModal';
import { TableGamesModal } from './TableGamesModal';
import { ReceiptModal } from '../../components/ReceiptModal';
import { DEMO_RESTAURANT_ID } from '../../data/initialDemoData';

interface CustomerPortalProps {
  tableNumberParam?: number;
  orderIdParam?: string;
  billTableIdParam?: string;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  tableNumberParam = 5,
  orderIdParam,
  billTableIdParam,
}) => {
  const {
    restaurant,
    menuProducts,
    categories,
    tables,
    orders,
    bills,
    serviceRequests,
    navigateTo,
    showToast,
  } = useApp();

  const [tableNumber, setTableNumber] = useState<number>(tableNumberParam);

  // Sync if tableNumberParam changes
  useEffect(() => {
    if (tableNumberParam) setTableNumber(tableNumberParam);
  }, [tableNumberParam]);

  const currentTable = useMemo(
    () => tables.find((t) => t.tableNumber === tableNumber) || tables[0],
    [tables, tableNumber]
  );

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [vegOnlyFilter, setVegOnlyFilter] = useState<boolean>(false);

  // Cart state
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);

  // Dish Customization Modal
  const [customizingProduct, setCustomizingProduct] = useState<MenuProduct | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | undefined>(undefined);
  const [selectedAddons, setSelectedAddons] = useState<ProductAddon[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState<string>('');

  // Modals & Drawers
  const [isServiceModalOpen, setIsServiceModalOpen] = useState<boolean>(false);
  const [isGamesModalOpen, setIsGamesModalOpen] = useState<boolean>(false);
  const [isWifiModalOpen, setIsWifiModalOpen] = useState<boolean>(false);
  const [isRewardsModalOpen, setIsRewardsModalOpen] = useState<boolean>(false);
  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState<boolean>(false);
  const [receiptBill, setReceiptBill] = useState<Bill | null>(null);

  // Customer Loyalty & Reviews
  const [rewardPoints, setRewardPoints] = useState<number>(150);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewFeedback, setReviewFeedback] = useState<string>('');
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);

  // Payment view state
  const [activeBill, setActiveBill] = useState<Bill | null>(null);
  const [splitCount, setSplitCount] = useState<number>(1);
  const [customPayAmount, setCustomPayAmount] = useState<number>(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentRecord['method']>('upi');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccessTxn, setPaymentSuccessTxn] = useState<string | null>(null);

  // Orders placed for this table
  const tableOrders = useMemo(() => {
    if (!currentTable) return [];
    return orders.filter(
      (o) => o.tableNumber === currentTable.tableNumber && o.status !== 'CANCELLED'
    );
  }, [orders, currentTable]);

  // View state: 'menu' | 'track_order' | 'bill_payment'
  const [viewMode, setViewMode] = useState<'menu' | 'track_order' | 'bill_payment'>(() => {
    if (orderIdParam) return 'track_order';
    if (billTableIdParam) return 'bill_payment';
    return 'menu';
  });

  const activeTrackedOrder = useMemo(() => {
    if (orderIdParam) {
      return orders.find((o) => o.id === orderIdParam) || tableOrders[0];
    }
    return tableOrders[0];
  }, [orders, orderIdParam, tableOrders]);

  // Load bill for table
  useEffect(() => {
    if (viewMode === 'bill_payment' && currentTable) {
      getOrCreateBillForTable(DEMO_RESTAURANT_ID, currentTable.id, currentTable.tableNumber)
        .then((b) => {
          setActiveBill(b);
          setCustomPayAmount(b.balanceRemaining);
        })
        .catch((err) => console.error('Error fetching bill:', err));
    }
  }, [viewMode, currentTable, orders]);

  // Filtered published menu items
  const filteredProducts = useMemo(() => {
    return menuProducts.filter((product) => {
      if (!product.isPublished || !product.isAvailable) return false;
      if (activeCategory !== 'all' && product.categoryId !== activeCategory) return false;
      if (vegOnlyFilter && !product.isVeg) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          product.name.toLowerCase().includes(q) ||
          product.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [menuProducts, activeCategory, vegOnlyFilter, searchQuery]);

  // Cart calculations
  const cartSubtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      const addonsTotal = item.selectedAddons?.reduce((a, b) => a + b.price, 0) || 0;
      return sum + (item.price + addonsTotal) * item.quantity;
    }, 0);
  }, [cartItems]);

  const cartTax = Math.round(cartSubtotal * 0.05 * 100) / 100;
  const cartServiceCharge = Math.round(cartSubtotal * 0.05 * 100) / 100;
  const cartGrandTotal = Math.max(0, Math.round((cartSubtotal + cartTax + cartServiceCharge - appliedDiscount) * 100) / 100);

  // Add to cart helper
  const handleQuickAdd = (product: MenuProduct) => {
    if (product.variants?.length || product.addons?.length) {
      openCustomizationModal(product);
      return;
    }

    setCartItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.menuProductId === product.id);
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx].quantity += 1;
        return next;
      }
      const newItem: OrderItem = {
        id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        menuProductId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        kitchenStation: product.kitchenStation,
        isVeg: product.isVeg,
      };
      return [...prev, newItem];
    });
    showToast('Added to Cart', `${product.name} added`, 'success');
  };

  const openCustomizationModal = (product: MenuProduct) => {
    setCustomizingProduct(product);
    setSelectedVariant(product.variants?.[0]);
    setSelectedAddons([]);
    setSpecialInstructions('');
  };

  const handleAddCustomizedToCart = () => {
    if (!customizingProduct) return;
    const basePrice = customizingProduct.price + (selectedVariant?.priceOffset || 0);

    const newItem: OrderItem = {
      id: `cart-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      menuProductId: customizingProduct.id,
      name: customizingProduct.name,
      price: basePrice,
      quantity: 1,
      selectedVariant,
      selectedAddons: selectedAddons.length ? selectedAddons : undefined,
      specialInstructions: specialInstructions.trim() || undefined,
      kitchenStation: customizingProduct.kitchenStation,
      isVeg: customizingProduct.isVeg,
    };

    setCartItems((prev) => [...prev, newItem]);
    setCustomizingProduct(null);
    showToast('Added to Cart', `${customizingProduct.name} customized and added`, 'success');
  };

  const updateCartQty = (id: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0 || !currentTable) return;
    setIsPlacingOrder(true);
    try {
      const order = await placeOrder({
        restaurantId: DEMO_RESTAURANT_ID,
        tableId: currentTable.id,
        tableNumber: currentTable.tableNumber,
        source: 'QR',
        items: cartItems,
      });

      setCartItems([]);
      setIsCartOpen(false);
      showToast('Order Sent to Kitchen!', `Order ${order.orderNumber} placed successfully`, 'success');
      navigateTo(`/customer/order/${order.id}`);
      setViewMode('track_order');
    } catch (err) {
      console.error('Order placement failed:', err);
      showToast('Failed to Place Order', 'Please try again or call waiter.', 'alert');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleDemoPaymentSubmit = async () => {
    if (!activeBill || !currentTable) return;
    const payAmount = splitCount > 1 ? Math.round((activeBill.grandTotal / splitCount) * 100) / 100 : customPayAmount;

    setIsProcessingPayment(true);
    try {
      const res = await processDemoPayment({
        billId: activeBill.id,
        tableId: currentTable.id,
        amount: Math.min(payAmount, activeBill.balanceRemaining),
        method: selectedPaymentMethod,
        paidBy: `Customer Table ${currentTable.tableNumber}`,
      });

      setPaymentSuccessTxn(res.transactionId);
      // Refresh bill state
      const updated = await getOrCreateBillForTable(DEMO_RESTAURANT_ID, currentTable.id, currentTable.tableNumber);
      setActiveBill(updated);
      showToast('Demo Payment Successful', `Transaction ID: ${res.transactionId}`, 'success');
    } catch (err) {
      console.error('Demo payment error:', err);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-28">
      {/* 1. Mobile Customer Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-2xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {tableNumber}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold text-slate-900 leading-none">
                    Table {tableNumber}
                  </h1>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Live Session
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {restaurant?.name || 'DineFlow Demo Restaurant'}
                </p>
              </div>
            </div>

            {/* Top Customer Quick Action Hub */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => setIsWifiModalOpen(true)}
                className="p-1.5 sm:p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Complimentary Wi-Fi"
              >
                <Wifi className="w-4 h-4 text-slate-700" />
              </button>

              <button
                onClick={() => setIsGamesModalOpen(true)}
                className="p-1.5 sm:p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Table Games & Trivia"
              >
                <Gamepad2 className="w-4 h-4 text-emerald-600" />
              </button>

              <button
                onClick={() => setIsRewardsModalOpen(true)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 transition-colors text-xs font-semibold"
                title="DineFlow Rewards & Points"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[11px] font-bold">{rewardPoints} pts</span>
              </button>

              <button
                onClick={() => setIsReviewsModalOpen(true)}
                className="p-1.5 sm:p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                title="Rate & Review Experience"
              >
                <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
              </button>
            </div>
          </div>

          {/* Sub Navigation Bar: Menu, Track Order, View Bill */}
          <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-100">
            <button
              onClick={() => setViewMode('menu')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                viewMode === 'menu'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              Menu
            </button>

            {tableOrders.length > 0 && (
              <button
                onClick={() => setViewMode('track_order')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                  viewMode === 'track_order'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Track ({tableOrders.length})
              </button>
            )}

            <button
              onClick={() => setViewMode('bill_payment')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${
                viewMode === 'bill_payment'
                  ? 'bg-indigo-600 text-white'
                  : 'text-indigo-600 hover:bg-indigo-50 font-medium'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Bill & Pay
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Customer Body */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {/* ============================================================== */}
        {/* MODE A: DIGITAL MENU BROWSING & ORDERING                       */}
        {/* ============================================================== */}
        {viewMode === 'menu' && (
          <div>
            {/* Search & Veg Only Filter */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search dishes, starters, desserts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                />
              </div>

              {/* Veg Toggle */}
              <button
                onClick={() => setVegOnlyFilter(!vegOnlyFilter)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors shrink-0 ${
                  vegOnlyFilter
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="w-3 h-3 rounded-xs border border-emerald-600 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                </span>
                Veg Only
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-4 no-scrollbar">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                All Dishes
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Dishes List */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 p-6">
                <Utensils className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No dishes match your filter</h3>
                <p className="text-xs text-slate-400 mt-1">Try turning off Veg Only or searching another term.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow flex gap-3.5"
                  >
                    {/* Food Photo */}
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      {/* Veg / Non-veg marker */}
                      <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-xs p-1 rounded-sm shadow-xs">
                        {product.isVeg ? (
                          <div className="w-3 h-3 border border-emerald-600 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          </div>
                        ) : (
                          <div className="w-3 h-3 border border-red-700 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-700" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dish Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {product.name}
                          </h4>
                          <span className="text-xs font-bold text-slate-900 shrink-0">
                            ₹{product.price}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                          <span className="flex items-center gap-0.5 text-amber-600">
                            <Flame className="w-3 h-3" />
                            {product.spiceLevel}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {product.preparationTime}m
                          </span>
                        </div>

                        {/* Add Button */}
                        <button
                          onClick={() => handleQuickAdd(product)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add
                          {(product.variants?.length || product.addons?.length) && (
                            <span className="text-[9px] text-slate-300 font-normal ml-0.5">+</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE B: ORDER TRACKING TIMELINE                                */}
        {/* ============================================================== */}
        {viewMode === 'track_order' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Live Ticket
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  {activeTrackedOrder?.orderNumber || '#ORD-LIVE'}
                </h3>
                <p className="text-xs text-slate-500">
                  Placed at{' '}
                  {activeTrackedOrder?.createdAt
                    ? new Date(activeTrackedOrder.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Just now'}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                    activeTrackedOrder?.status === 'READY'
                      ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                      : activeTrackedOrder?.status === 'PREPARING'
                      ? 'bg-amber-100 text-amber-800'
                      : activeTrackedOrder?.status === 'SERVED'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {activeTrackedOrder?.status.replace('_', ' ')}
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1">
                  ₹{activeTrackedOrder?.total || 0}
                </p>
              </div>
            </div>

            {/* Preparation Timeline */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-wider">
                Kitchen Status Timeline
              </h4>

              <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {[
                  { key: 'NEW', label: 'Order Received', desc: 'Sent straight to head kitchen display' },
                  { key: 'CONFIRMED', label: 'Confirmed & Ingredients Allocated', desc: 'Recipe ingredients deducted from inventory' },
                  { key: 'PREPARING', label: 'Cooking at Station', desc: 'Chef has started flame preparation' },
                  { key: 'READY', label: 'Food Ready to Serve', desc: 'Waiter is picking up from the pass' },
                  { key: 'SERVED', label: 'Served at Table', desc: 'Enjoy your fresh meal!' },
                ].map((step, idx) => {
                  const statusOrder = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'];
                  const currentIndex = statusOrder.indexOf(activeTrackedOrder?.status || 'NEW');
                  const stepIndex = statusOrder.indexOf(step.key);
                  const isDone = currentIndex >= stepIndex;
                  const isCurrent = activeTrackedOrder?.status === step.key;

                  return (
                    <div key={step.key} className="relative flex items-start gap-3 pl-1">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 text-[10px] font-bold ${
                          isDone
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-400 border border-slate-300'
                        }`}
                      >
                        {isDone ? '✓' : idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className={`text-xs font-semibold ${isCurrent ? 'text-emerald-700' : isDone ? 'text-slate-900' : 'text-slate-400'}`}>
                          {step.label}
                        </p>
                        <p className="text-[11px] text-slate-400">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ordered Items summary */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-900 mb-2">Order Items ({activeTrackedOrder?.items.length})</h4>
              <div className="divide-y divide-slate-100">
                {activeTrackedOrder?.items.map((it, i) => (
                  <div key={i} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">
                        {it.quantity}x {it.name}
                      </span>
                      {it.selectedVariant && (
                        <span className="text-[10px] text-slate-500 block">
                          Size: {it.selectedVariant.name}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-slate-900">
                      ₹{it.price * it.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('menu')}
                className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700"
              >
                + Order More Items
              </button>
              <button
                onClick={() => setViewMode('bill_payment')}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-semibold text-white"
              >
                View Table Bill
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE C: BILLING & DEMO PAYMENTS                                */}
        {/* ============================================================== */}
        {viewMode === 'bill_payment' && (
          <div className="space-y-4">
            {/* Demo Environment Safety Notice */}
            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Demo Payment Simulator
                </h4>
                <p className="text-[11px] text-amber-800 leading-snug">
                  DEMO PAYMENT — NO REAL MONEY WILL BE CHARGED. Experience instant simulated UPI, card, and split payment workflows.
                </p>
              </div>
            </div>

            {activeBill ? (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Table {tableNumber} Summary</h3>
                    <p className="text-[11px] text-slate-400">Bill ID: {activeBill.id}</p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      activeBill.status === 'PAID'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeBill.status === 'PARTIALLY_PAID'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {activeBill.status}
                  </span>
                </div>

                {/* Subtotals & Taxes */}
                <div className="space-y-2 text-xs border-b border-slate-100 pb-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span>₹{activeBill.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (5%)</span>
                    <span>₹{activeBill.tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Service Charge (5%)</span>
                    <span>₹{activeBill.serviceCharge.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100">
                    <span>Grand Total</span>
                    <span>₹{activeBill.grandTotal.toFixed(2)}</span>
                  </div>
                  {activeBill.paidAmount > 0 && (
                    <div className="flex justify-between text-xs font-semibold text-emerald-600 pt-1">
                      <span>Paid so far:</span>
                      <span>₹{activeBill.paidAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold text-slate-900 pt-1">
                    <span>Remaining Balance:</span>
                    <span className="text-indigo-600">₹{activeBill.balanceRemaining.toFixed(2)}</span>
                  </div>
                </div>

                {activeBill.balanceRemaining > 0 ? (
                  <>
                    {/* Split Bill Options */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          Split Bill (Optional):
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {splitCount > 1 ? `₹${(activeBill.grandTotal / splitCount).toFixed(2)} per person` : 'Full Bill'}
                        </span>
                      </label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setSplitCount(cnt)}
                            className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                              splitCount === cnt
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {cnt === 1 ? '1 Pay' : `${cnt} Way`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Payment Method Selector */}
                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-1.5">Select Payment Method:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'upi', label: 'UPI (GPay / PhonePe)', icon: QrCode },
                          { id: 'card', label: 'Credit / Debit Card', icon: CreditCard },
                          { id: 'bank_transfer', label: 'Net Banking', icon: FileText },
                          { id: 'cash', label: 'Pay Cash to Waiter', icon: Receipt },
                        ].map((m) => {
                          const IconComp = m.icon;
                          const isSel = selectedPaymentMethod === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setSelectedPaymentMethod(m.id as any)}
                              className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-colors ${
                                isSel
                                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950 font-semibold'
                                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <IconComp className={`w-4 h-4 ${isSel ? 'text-indigo-600' : 'text-slate-400'}`} />
                              <span className="text-xs">{m.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Pay Button */}
                    <button
                      onClick={handleDemoPaymentSubmit}
                      disabled={isProcessingPayment}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isProcessingPayment ? (
                        'Processing Demo Transaction...'
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Pay ₹
                          {splitCount > 1
                            ? (activeBill.grandTotal / splitCount).toFixed(2)
                            : activeBill.balanceRemaining.toFixed(2)}{' '}
                          (Simulate Demo)
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="text-center py-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
                    <h4 className="text-sm font-bold text-emerald-950">Table Bill Fully Settled</h4>
                    <p className="text-xs text-emerald-700 mt-0.5">Thank you! Your receipt is ready.</p>
                    <button
                      onClick={() => setReceiptBill(activeBill)}
                      className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                    >
                      View & Print Official Receipt
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6">
                <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">No Orders Placed Yet</h3>
                <p className="text-xs text-slate-400 mt-1">Order dishes from the menu to generate a table bill.</p>
                <button
                  onClick={() => setViewMode('menu')}
                  className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                >
                  Browse Menu
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* 3. PERMANENT FLOATING CALL WAITER BUTTON                      */}
      {/* ============================================================== */}
      <div className="fixed bottom-4 left-4 z-40">
        <button
          onClick={() => setIsServiceModalOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-xl border border-slate-700/80 transition-all hover:scale-105 active:scale-95"
          title="Call Waiter, Water, Cutlery, Assistance"
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <BellRing className="w-3.5 h-3.5 animate-bounce" />
          </div>
          <span className="text-xs font-bold tracking-tight">Call Waiter</span>
        </button>
      </div>

      {/* 4. Sticky Bottom Cart Bar (if items in cart) */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex items-center gap-3 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <div className="relative">
              <ShoppingCart className="w-4 h-4" />
              <span className="absolute -top-2 -right-2 bg-white text-emerald-800 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {cartItems.reduce((s, i) => s + i.quantity, 0)}
              </span>
            </div>
            <div className="text-left">
              <span className="text-xs font-bold block leading-none">View Cart</span>
              <span className="text-[10px] text-emerald-100 font-semibold leading-none">₹{cartGrandTotal}</span>
            </div>
          </button>
        </div>
      )}

      {/* 5. Food Customization Modal */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm truncate">
                Customize {customizingProduct.name}
              </h3>
              <button
                onClick={() => setCustomizingProduct(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Variants */}
              {customizingProduct.variants && customizingProduct.variants.length > 0 && (
                <div>
                  <label className="font-bold text-slate-800 block mb-2">Choose Portion / Size:</label>
                  <div className="space-y-1.5">
                    {customizingProduct.variants.map((v) => (
                      <label
                        key={v.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                          selectedVariant?.id === v.id
                            ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="variant"
                            checked={selectedVariant?.id === v.id}
                            onChange={() => setSelectedVariant(v)}
                            className="accent-emerald-600"
                          />
                          <span>{v.name}</span>
                        </div>
                        <span className="text-slate-500 font-mono">
                          {v.priceOffset > 0 ? `+₹${v.priceOffset}` : 'Standard'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Add-ons */}
              {customizingProduct.addons && customizingProduct.addons.length > 0 && (
                <div>
                  <label className="font-bold text-slate-800 block mb-2">Add Extra Toppings / Sides:</label>
                  <div className="space-y-1.5">
                    {customizingProduct.addons.map((addon) => {
                      const isChecked = selectedAddons.some((a) => a.id === addon.id);
                      return (
                        <label
                          key={addon.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-colors ${
                            isChecked
                              ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAddons((prev) => [...prev, addon]);
                                } else {
                                  setSelectedAddons((prev) => prev.filter((a) => a.id !== addon.id));
                                }
                              }}
                              className="accent-emerald-600"
                            />
                            <span>{addon.name}</span>
                          </div>
                          <span className="text-slate-500 font-mono">+₹{addon.price}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Special instructions */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Cooking Notes / Allergen Alerts:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Less spicy, no onion/garlic, well done..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={handleAddCustomizedToCart}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                Add Customized Item (₹
                {customizingProduct.price +
                  (selectedVariant?.priceOffset || 0) +
                  selectedAddons.reduce((s, a) => s + a.price, 0)}
                )
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in slide-in-from-bottom duration-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Your Table Cart ({cartItems.length})</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto divide-y divide-slate-100 flex-1">
              {cartItems.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                    {item.selectedVariant && (
                      <p className="text-[10px] text-slate-500">{item.selectedVariant.name}</p>
                    )}
                    {item.selectedAddons && (
                      <p className="text-[10px] text-emerald-700">
                        +{item.selectedAddons.map((a) => a.name).join(', ')}
                      </p>
                    )}
                    <span className="text-xs font-semibold text-slate-800">
                      ₹
                      {(item.price + (item.selectedAddons?.reduce((s, a) => s + a.price, 0) || 0)) *
                        item.quantity}
                    </span>
                  </div>

                  {/* Quantity adjustment buttons */}
                  <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-1 bg-slate-50 shrink-0">
                    <button
                      onClick={() => updateCartQty(item.id, -1)}
                      className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-slate-200 text-slate-700"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-slate-900 w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQty(item.id, 1)}
                      className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-slate-200 text-slate-700"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Bill Breakdown */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>₹{cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (5%)</span>
                <span>₹{cartTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Service Charge (5%)</span>
                <span>₹{cartServiceCharge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-950 pt-1.5 border-t border-slate-200">
                <span>Total Due</span>
                <span>₹{cartGrandTotal.toFixed(2)}</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isPlacingOrder ? 'Sending to Kitchen...' : `Submit Order to Kitchen (₹${cartGrandTotal.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Service Request Modal (Call Waiter / Water / Cutlery / Bill) */}
      {isServiceModalOpen && currentTable && (
        <ServiceRequestModal
          tableNumber={currentTable.tableNumber}
          tableId={currentTable.id}
          existingRequests={serviceRequests}
          onClose={() => setIsServiceModalOpen(false)}
          onRequestSent={() => {
            showToast('Request Sent', 'Floor captain alerted', 'info');
          }}
        />
      )}

      {/* 8. Table Games Modal */}
      {isGamesModalOpen && (
        <TableGamesModal onClose={() => setIsGamesModalOpen(false)} />
      )}

      {/* 9. Wi-Fi Info Modal */}
      {isWifiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 text-center border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Wifi className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Complimentary Wi-Fi</h3>
            <p className="text-xs text-slate-500 mt-1">High-speed guest connection for Table {tableNumber}</p>
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1">
              <div>
                <span className="text-slate-400 block text-[10px]">NETWORK NAME</span>
                <span className="font-bold text-slate-800">{restaurant?.wifiName || 'DineFlow_Guest_WiFi'}</span>
              </div>
              <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[10px]">PASSWORD</span>
                  <span className="font-mono font-bold text-emerald-700">{restaurant?.wifiPassword || 'eatfresh2026'}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(restaurant?.wifiPassword || 'eatfresh2026');
                    showToast('Copied', 'Wi-Fi password copied to clipboard', 'info');
                  }}
                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-semibold rounded-md transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
            <button
              onClick={() => setIsWifiModalOpen(false)}
              className="mt-4 w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* 10. Customer Rewards & Loyalty Modal */}
      {isRewardsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">DineFlow Rewards</h3>
                  <p className="text-[11px] text-slate-500">Customer Loyalty Program</p>
                </div>
              </div>
              <button
                onClick={() => setIsRewardsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-linear-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white mb-4 shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-amber-100">
                    Available Balance
                  </span>
                  <div className="text-2xl font-black mt-0.5">{rewardPoints} Points</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">
                  Gold Tier
                </span>
              </div>
              <p className="text-[11px] text-amber-100 mt-2">
                Earn 10 loyalty points for every ₹100 spent today at Table {tableNumber}.
              </p>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <div className="text-xs font-bold text-slate-900">Flat ₹50 OFF Cart</div>
                  <div className="text-[10px] text-slate-500">Redeem 100 points for instant savings</div>
                </div>
                <button
                  disabled={rewardPoints < 100 || appliedDiscount >= 50}
                  onClick={() => {
                    setRewardPoints((p) => p - 100);
                    setAppliedDiscount(50);
                    setIsRewardsModalOpen(false);
                    showToast('Discount Applied', '₹50 loyalty discount deducted from your cart!', 'success');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  {appliedDiscount >= 50 ? 'Applied' : 'Redeem'}
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                <div>
                  <div className="text-xs font-bold text-slate-900">Free Chef Dessert</div>
                  <div className="text-[10px] text-slate-500">Gulab Jamun with Rabri on orders over ₹600</div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                  Unlocked
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsRewardsModalOpen(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}

      {/* 11. Customer Reviews & Rating Modal */}
      {isReviewsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                  <Star className="w-4 h-4 fill-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Rate Your Experience</h3>
                  <p className="text-[11px] text-slate-500">Table {tableNumber} Dining Feedback</p>
                </div>
              </div>
              <button
                onClick={() => setIsReviewsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reviewSubmitted ? (
              <div className="py-6 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">Thank You for Your Feedback!</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Your {reviewRating}-star review helps the kitchen and floor staff deliver great hospitality.
                </p>
                <button
                  onClick={() => {
                    setIsReviewsModalOpen(false);
                    setReviewSubmitted(false);
                  }}
                  className="mt-5 w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block mb-2 text-center">
                    Overall Satisfaction:
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= reviewRating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Your Comments (Optional):
                  </label>
                  <textarea
                    rows={3}
                    value={reviewFeedback}
                    onChange={(e) => setReviewFeedback(e.target.value)}
                    placeholder="Tell us what you loved or how we can improve..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setReviewSubmitted(true);
                    showToast('Review Submitted', `Thank you for your ${reviewRating}-star review!`, 'success');
                  }}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  Submit Dining Feedback
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 12. Printable Official Receipt Modal */}
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
