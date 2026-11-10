import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  Restaurant,
  Table,
  Order,
  InventoryItem,
  MenuProduct,
  Recipe,
  MenuCategory,
  ServiceRequest,
  StockAlert,
  Bill,
  StaffMember,
  UserRole,
} from '../types';
import {
  DEMO_RESTAURANT_ID,
  initialCategories,
  initialStaff,
} from '../data/initialDemoData';
import {
  initializeDatabase,
  subscribeToRestaurant,
  subscribeToTables,
  subscribeToOrders,
  subscribeToInventory,
  subscribeToServiceRequests,
  subscribeToStockAlerts,
  subscribeToBills,
  subscribeToMenuProducts,
  subscribeToRecipes,
} from '../services/db';
import { voiceAnnouncer } from '../services/voiceAnnouncer';
import { testFirestoreConnection } from '../firebase';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
}

interface AppContextType {
  restaurant: Restaurant | null;
  tables: Table[];
  orders: Order[];
  inventory: InventoryItem[];
  menuProducts: MenuProduct[];
  recipes: Recipe[];
  categories: MenuCategory[];
  serviceRequests: ServiceRequest[];
  stockAlerts: StockAlert[];
  bills: Bill[];
  staff: StaffMember[];
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentStaffUser: StaffMember;
  setCurrentStaffUser: (member: StaffMember) => void;
  isLoading: boolean;
  isConnected: boolean;
  activeToast: ToastMessage | null;
  showToast: (title: string, message: string, type?: ToastMessage['type']) => void;
  dismissToast: () => void;
  resetDemoDatabase: () => Promise<void>;
  isStaffAuthenticated: boolean;
  setIsStaffAuthenticated: (val: boolean) => void;
  logoutStaff: () => void;
  currentPath: string;
  navigateTo: (path: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [menuProducts, setMenuProducts] = useState<MenuProduct[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories] = useState<MenuCategory[]>(initialCategories);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [staff] = useState<StaffMember[]>(initialStaff);

  const [currentRole, setCurrentRole] = useState<UserRole>('owner');
  const [currentStaffUser, setCurrentStaffUser] = useState<StaffMember>(initialStaff[0]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [activeToast, setActiveToast] = useState<ToastMessage | null>(null);

  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('dineflow_staff_auth') === 'true';
    }
    return false;
  });

  const handleSetStaffAuth = (val: boolean) => {
    setIsStaffAuthenticated(val);
    if (typeof window !== 'undefined') {
      if (val) {
        sessionStorage.setItem('dineflow_staff_auth', 'true');
      } else {
        sessionStorage.removeItem('dineflow_staff_auth');
      }
    }
  };

  const logoutStaff = () => {
    handleSetStaffAuth(false);
    navigateTo('/customer/dineflow-demo/table/5');
  };

  // Track client URL / path for internal routing
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const showToast = (title: string, message: string, type: ToastMessage['type'] = 'info') => {
    const toast: ToastMessage = {
      id: `toast-${Date.now()}`,
      title,
      message,
      type,
    };
    setActiveToast(toast);
    setTimeout(() => {
      setActiveToast((current) => (current?.id === toast.id ? null : current));
    }, 4500);
  };

  const dismissToast = () => setActiveToast(null);

  // Initialize DB and verify connection
  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        const connected = await testFirestoreConnection();
        if (mounted) setIsConnected(connected);
        await initializeDatabase(false);
      } catch (err) {
        console.error('Failed to bootstrap Firestore:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    bootstrap();

    // Subscribe to collections
    const unsubRest = subscribeToRestaurant(DEMO_RESTAURANT_ID, (data) => {
      if (mounted) setRestaurant(data);
    });

    const unsubTables = subscribeToTables(DEMO_RESTAURANT_ID, (t) => {
      if (mounted) setTables(t);
    });

    const unsubOrders = subscribeToOrders(DEMO_RESTAURANT_ID, (o) => {
      if (mounted) {
        setOrders((prev) => {
          // Detect brand new incoming orders for live notification & Hindi kitchen speech
          if (prev.length > 0 && o.length > prev.length) {
            const newest = o[0];
            if (newest && newest.status === 'NEW') {
              showToast(
                `New Order ${newest.orderNumber}`,
                `Table ${newest.tableNumber} placed an order for ₹${newest.total}`,
                'info'
              );
              // Trigger kitchen announcement
              voiceAnnouncer.announceOrder(newest, 'new');
            }
          }
          return o;
        });
      }
    });

    const unsubInv = subscribeToInventory(DEMO_RESTAURANT_ID, (inv) => {
      if (mounted) setInventory(inv);
    });

    const unsubReq = subscribeToServiceRequests(DEMO_RESTAURANT_ID, (reqs) => {
      if (mounted) {
        setServiceRequests((prev) => {
          if (prev.length > 0 && reqs.length > prev.length) {
            const newest = reqs[0];
            if (newest && newest.status === 'pending') {
              showToast(
                `Table ${newest.tableNumber} Request`,
                `Customer requested: ${newest.type.replace('_', ' ').toUpperCase()}`,
                'warning'
              );
            }
          }
          return reqs;
        });
      }
    });

    const unsubAlerts = subscribeToStockAlerts(DEMO_RESTAURANT_ID, (alerts) => {
      if (mounted) setStockAlerts(alerts);
    });

    const unsubBills = subscribeToBills(DEMO_RESTAURANT_ID, (b) => {
      if (mounted) setBills(b);
    });

    const unsubProds = subscribeToMenuProducts(DEMO_RESTAURANT_ID, (p) => {
      if (mounted) setMenuProducts(p);
    });

    const unsubRec = subscribeToRecipes(DEMO_RESTAURANT_ID, (r) => {
      if (mounted) setRecipes(r);
    });

    return () => {
      mounted = false;
      unsubRest();
      unsubTables();
      unsubOrders();
      unsubInv();
      unsubReq();
      unsubAlerts();
      unsubBills();
      unsubProds();
      unsubRec();
    };
  }, []);

  const resetDemoDatabase = async () => {
    setIsLoading(true);
    try {
      await initializeDatabase(true);
      showToast('Demo Reset Complete', 'All 20 tables, inventory, recipes, and sample orders have been reset.', 'success');
    } catch (err) {
      console.error('Reset error:', err);
      showToast('Reset Failed', 'Could not reset demo database.', 'alert');
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = useMemo<AppContextType>(
    () => ({
      restaurant,
      tables,
      orders,
      inventory,
      menuProducts,
      recipes,
      categories,
      serviceRequests,
      stockAlerts,
      bills,
      staff,
      currentRole,
      setCurrentRole,
      currentStaffUser,
      setCurrentStaffUser,
      isLoading,
      isConnected,
      activeToast,
      showToast,
      dismissToast,
      resetDemoDatabase,
      isStaffAuthenticated,
      setIsStaffAuthenticated: handleSetStaffAuth,
      logoutStaff,
      currentPath,
      navigateTo,
    }),
    [
      restaurant,
      tables,
      orders,
      inventory,
      menuProducts,
      recipes,
      categories,
      serviceRequests,
      stockAlerts,
      bills,
      staff,
      currentRole,
      currentStaffUser,
      isLoading,
      isConnected,
      activeToast,
      isStaffAuthenticated,
      currentPath,
    ]
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
