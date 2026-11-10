import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
  writeBatch,
  query,
  where,
  orderBy,
  deleteField,
  Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Restaurant,
  Table,
  MenuCategory,
  MenuProduct,
  InventoryItem,
  Recipe,
  Order,
  OrderItem,
  OrderStatus,
  ServiceRequest,
  ServiceRequestType,
  StockAlert,
  Bill,
  PaymentRecord,
  StaffMember,
  InventoryMovement,
} from '../types';
import {
  DEMO_RESTAURANT_ID,
  initialRestaurant,
  initialCategories,
  initialTables,
  initialStaff,
  initialInventoryItems,
  initialMenuProducts,
  initialRecipes,
  initialOrders,
  initialBills,
  initialStockAlerts,
} from '../data/initialDemoData';

// Collection Names
export const COLLECTIONS = {
  RESTAURANTS: 'restaurants',
  TABLES: 'tables',
  MENU_CATEGORIES: 'menuCategories',
  MENU_PRODUCTS: 'menuProducts',
  INVENTORY_ITEMS: 'inventoryItems',
  INVENTORY_TRANSACTIONS: 'inventoryTransactions',
  RECIPES: 'recipes',
  ORDERS: 'orders',
  SERVICE_REQUESTS: 'serviceRequests',
  STOCK_ALERTS: 'stockAlerts',
  BILLS: 'bills',
  PAYMENTS: 'payments',
  STAFF: 'staff',
};

// Clean undefined values before writing to Firestore
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(cleanForFirestore) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    // Preserve Firestore FieldValue sentinels like deleteField() or serverTimestamp()
    if ('_methodName' in (data as any) || (data as any).constructor?.name === 'FieldValue') {
      return data;
    }
    const res: any = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        res[key] = cleanForFirestore(value);
      }
    }
    return res;
  }
  return data;
}

// 1. Database Seeder & Demo Reset
export async function initializeDatabase(forceReset: boolean = false): Promise<void> {
  const restDocRef = doc(db, COLLECTIONS.RESTAURANTS, DEMO_RESTAURANT_ID);
  try {
    const restSnap = await getDoc(restDocRef);
    if (restSnap.exists() && !forceReset) {
      // Already initialized
      return;
    }
  } catch (err) {
    console.warn('Initial check error, continuing to seed:', err);
  }

  try {
    console.log('Seeding DineFlow Demo Restaurant database...');
    const batch = writeBatch(db);

    // 1. Restaurant Doc
    batch.set(restDocRef, cleanForFirestore(initialRestaurant));

    // 2. Categories
    for (const cat of initialCategories) {
      batch.set(doc(db, COLLECTIONS.MENU_CATEGORIES, cat.id), cleanForFirestore(cat));
    }

    // 3. Tables (all 20)
    for (const table of initialTables) {
      batch.set(doc(db, COLLECTIONS.TABLES, table.id), cleanForFirestore(table));
    }

    // 4. Staff
    for (const staff of initialStaff) {
      batch.set(doc(db, COLLECTIONS.STAFF, staff.id), cleanForFirestore(staff));
    }

    // 5. Inventory Items (all 30)
    for (const item of initialInventoryItems) {
      batch.set(doc(db, COLLECTIONS.INVENTORY_ITEMS, item.id), cleanForFirestore(item));
    }

    // 6. Menu Products (all 50)
    for (const prod of initialMenuProducts) {
      batch.set(doc(db, COLLECTIONS.MENU_PRODUCTS, prod.id), cleanForFirestore(prod));
    }

    // 7. Recipes
    for (const rec of initialRecipes) {
      batch.set(doc(db, COLLECTIONS.RECIPES, rec.id), cleanForFirestore(rec));
    }

    // 8. Sample Orders
    for (const order of initialOrders) {
      batch.set(doc(db, COLLECTIONS.ORDERS, order.id), cleanForFirestore(order));
    }

    // 9. Sample Bills
    for (const bill of initialBills) {
      batch.set(doc(db, COLLECTIONS.BILLS, bill.id), cleanForFirestore(bill));
    }

    // 10. Sample Stock Alerts
    for (const alert of initialStockAlerts) {
      batch.set(doc(db, COLLECTIONS.STOCK_ALERTS, alert.id), cleanForFirestore(alert));
    }

    await batch.commit();
    console.log('DineFlow database seed completed successfully!');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'batch/seed');
  }
}

// 2. Real-time Listeners
export function subscribeToRestaurant(
  restaurantId: string,
  onUpdate: (data: Restaurant | null) => void
): Unsubscribe {
  const ref = doc(db, COLLECTIONS.RESTAURANTS, restaurantId);
  return onSnapshot(
    ref,
    (snap) => {
      onUpdate(snap.exists() ? (snap.data() as Restaurant) : null);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, COLLECTIONS.RESTAURANTS);
    }
  );
}

export function subscribeToTables(
  restaurantId: string,
  onUpdate: (tables: Table[]) => void
): Unsubscribe {
  const ref = collection(db, COLLECTIONS.TABLES);
  return onSnapshot(
    ref,
    (snap) => {
      const tables: Table[] = [];
      snap.forEach((d) => {
        const data = d.data() as Table;
        if (data.restaurantId === restaurantId) {
          tables.push({ ...data, id: d.id });
        }
      });
      tables.sort((a, b) => a.tableNumber - b.tableNumber);
      onUpdate(tables);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.TABLES);
    }
  );
}

export function subscribeToOrders(
  restaurantId: string,
  onUpdate: (orders: Order[]) => void
): Unsubscribe {
  const ref = collection(db, COLLECTIONS.ORDERS);
  return onSnapshot(
    ref,
    (snap) => {
      const orders: Order[] = [];
      snap.forEach((d) => {
        const data = d.data() as Order;
        if (data.restaurantId === restaurantId) {
          orders.push({ ...data, id: d.id });
        }
      });
      // Sort newest first
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(orders);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.ORDERS);
    }
  );
}

export function subscribeToInventory(
  restaurantId: string,
  onUpdate: (items: InventoryItem[]) => void
): Unsubscribe {
  const ref = collection(db, COLLECTIONS.INVENTORY_ITEMS);
  return onSnapshot(
    ref,
    (snap) => {
      const items: InventoryItem[] = [];
      snap.forEach((d) => {
        const data = d.data() as InventoryItem;
        if (data.restaurantId === restaurantId) {
          items.push({ ...data, id: d.id });
        }
      });
      items.sort((a, b) => a.name.localeCompare(b.name));
      onUpdate(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.INVENTORY_ITEMS);
    }
  );
}

export function subscribeToServiceRequests(
  restaurantId: string,
  onUpdate: (requests: ServiceRequest[]) => void
): Unsubscribe {
  const ref = collection(db, COLLECTIONS.SERVICE_REQUESTS);
  return onSnapshot(
    ref,
    (snap) => {
      const requests: ServiceRequest[] = [];
      snap.forEach((d) => {
        const data = d.data() as ServiceRequest;
        if (data.restaurantId === restaurantId) {
          requests.push({ ...data, id: d.id });
        }
      });
      // Sort pending first, then newest
      requests.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      onUpdate(requests);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.SERVICE_REQUESTS);
    }
  );
}

export function subscribeToStockAlerts(
  restaurantId: string,
  onUpdate: (alerts: StockAlert[]) => void
): Unsubscribe {
  const ref = collection(db, COLLECTIONS.STOCK_ALERTS);
  return onSnapshot(
    ref,
    (snap) => {
      const alerts: StockAlert[] = [];
      snap.forEach((d) => {
        const data = d.data() as StockAlert;
        if (data.restaurantId === restaurantId) {
          alerts.push({ ...data, id: d.id });
        }
      });
      alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(alerts);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.STOCK_ALERTS);
    }
  );
}

export function subscribeToBills(
  restaurantId: string,
  onUpdate: (bills: Bill[]) => void
): Unsubscribe {
  const ref = collection(db, COLLECTIONS.BILLS);
  return onSnapshot(
    ref,
    (snap) => {
      const bills: Bill[] = [];
      snap.forEach((d) => {
        const data = d.data() as Bill;
        if (data.restaurantId === restaurantId) {
          bills.push({ ...data, id: d.id });
        }
      });
      bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(bills);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.BILLS);
    }
  );
}

export function subscribeToMenuProducts(
  restaurantId: string,
  onUpdate: (products: MenuProduct[]) => void
): Unsubscribe {
  const ref = collection(db, COLLECTIONS.MENU_PRODUCTS);
  return onSnapshot(
    ref,
    (snap) => {
      const products: MenuProduct[] = [];
      snap.forEach((d) => {
        const data = d.data() as MenuProduct;
        if (data.restaurantId === restaurantId) {
          products.push({ ...data, id: d.id });
        }
      });
      onUpdate(products);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.MENU_PRODUCTS);
    }
  );
}

export function subscribeToRecipes(
  restaurantId: string,
  onUpdate: (recipes: Recipe[]) => void
): Unsubscribe {
  const ref = collection(db, COLLECTIONS.RECIPES);
  return onSnapshot(
    ref,
    (snap) => {
      const recipes: Recipe[] = [];
      snap.forEach((d) => {
        const data = d.data() as Recipe;
        if (data.restaurantId === restaurantId) {
          recipes.push({ ...data, id: d.id });
        }
      });
      onUpdate(recipes);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, COLLECTIONS.RECIPES);
    }
  );
}

// 3. Order Operations & Recipe Inventory Deduction (Idempotent Transaction)
export async function placeOrder(orderData: {
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  source: 'QR' | 'Waiter' | 'Walk-in' | 'Takeaway';
  items: OrderItem[];
  notes?: string;
  allergies?: string;
  assignedWaiterId?: string;
  assignedWaiterName?: string;
}): Promise<Order> {
  const subtotal = orderData.items.reduce(
    (sum, item) => sum + (item.price + (item.selectedAddons?.reduce((a, b) => a + b.price, 0) || 0)) * item.quantity,
    0
  );
  const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
  const serviceCharge = Math.round(subtotal * 0.05 * 100) / 100; // 5% Service Charge
  const total = Math.round((subtotal + tax + serviceCharge) * 100) / 100;

  const orderNumber = `#ORD-${Math.floor(100 + Math.random() * 900)}`;
  const orderId = `order-${Date.now()}`;
  const now = new Date().toISOString();

  const newOrder: Order = {
    id: orderId,
    restaurantId: orderData.restaurantId,
    orderNumber,
    tableId: orderData.tableId,
    tableNumber: orderData.tableNumber,
    source: orderData.source,
    status: 'NEW',
    items: orderData.items.map((it) => ({
      ...it,
      itemStatus: 'queued',
    })),
    subtotal,
    tax,
    serviceCharge,
    total,
    notes: orderData.notes,
    allergies: orderData.allergies,
    assignedWaiterId: orderData.assignedWaiterId,
    assignedWaiterName: orderData.assignedWaiterName,
    paymentStatus: 'UNPAID',
    inventoryDeducted: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    // Save order
    await setDoc(doc(db, COLLECTIONS.ORDERS, orderId), cleanForFirestore(newOrder));

    // Update table status to 'new_order' or 'occupied'
    const tableRef = doc(db, COLLECTIONS.TABLES, orderData.tableId);
    await updateDoc(tableRef, {
      status: 'new_order',
      currentOrderId: orderId,
      guestCount: 2,
      updatedAt: now,
    });

    return newOrder;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTIONS.ORDERS);
  }
}

// Automatic server-side Firestore transaction deduction with idempotency
export async function deductInventoryForOrder(orderId: string): Promise<boolean> {
  const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);

  try {
    return await runTransaction(db, async (transaction) => {
      // 1. Read the order first
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists()) {
        throw new Error(`Order ${orderId} not found`);
      }
      const order = orderSnap.data() as Order;

      // IDEMPOTENCY CHECK: if already deducted, exit without duplicating
      if (order.inventoryDeducted) {
        console.log(`Order ${order.orderNumber} inventory already deducted. Skipping.`);
        return true;
      }

      // 2. Fetch all recipes to map ingredients
      const recipesSnap = await getDocs(
        query(collection(db, COLLECTIONS.RECIPES), where('restaurantId', '==', order.restaurantId))
      );
      const recipeMap: Map<string, Recipe> = new Map();
      recipesSnap.forEach((d) => {
        const rec = d.data() as Recipe;
        recipeMap.set(rec.menuProductId, rec);
      });

      // Calculate aggregated deduction per inventory item
      const deductions: Map<string, { itemName: string; requiredQty: number; unit: string }> = new Map();

      for (const item of order.items) {
        const recipe = recipeMap.get(item.menuProductId);
        if (recipe && recipe.ingredients) {
          for (const ing of recipe.ingredients) {
            const totalForDish = ing.quantityRequired * item.quantity;
            const existing = deductions.get(ing.inventoryItemId);
            if (existing) {
              existing.requiredQty += totalForDish;
            } else {
              deductions.set(ing.inventoryItemId, {
                itemName: ing.inventoryItemName,
                requiredQty: totalForDish,
                unit: ing.unit,
              });
            }
          }
        }
      }

      // If no recipes matched this order's items, mark as deducted so we don't re-scan
      if (deductions.size === 0) {
        transaction.update(orderRef, {
          inventoryDeducted: true,
          inventoryTransactionRef: `NO-RECIPE-${Date.now()}`,
          updatedAt: new Date().toISOString(),
        });
        return true;
      }

      // 3. READ all referenced inventory items first (Strict Firestore Transaction constraint: all reads before writes!)
      const inventoryDocs: { ref: any; currentStock: number; minStock: number; itemData: InventoryItem }[] = [];

      for (const [invId] of deductions) {
        const invRef = doc(db, COLLECTIONS.INVENTORY_ITEMS, invId);
        const invSnap = await transaction.get(invRef);
        if (invSnap.exists()) {
          const itemData = invSnap.data() as InventoryItem;
          inventoryDocs.push({
            ref: invRef,
            currentStock: itemData.currentStock,
            minStock: itemData.minStock,
            itemData,
          });
        }
      }

      // 4. PERFORM WRITES: Deduct stock, generate alerts if below minStock
      const txnRef = `DED-${order.orderNumber.replace('#', '')}-${Date.now()}`;
      const now = new Date().toISOString();

      for (const invDoc of inventoryDocs) {
        const deductionInfo = deductions.get(invDoc.itemData.id)!;
        const newStock = Math.max(0, invDoc.currentStock - deductionInfo.requiredQty);

        transaction.update(invDoc.ref, {
          currentStock: newStock,
          updatedAt: now,
        });

        // Record stock movement
        const movementRef = doc(collection(db, COLLECTIONS.INVENTORY_TRANSACTIONS));
        const movement: InventoryMovement = {
          id: movementRef.id,
          restaurantId: order.restaurantId,
          inventoryItemId: invDoc.itemData.id,
          itemName: invDoc.itemData.name,
          type: 'DEDUCTION',
          quantityChange: -deductionInfo.requiredQty,
          unit: invDoc.itemData.unit,
          relatedOrderId: order.id,
          reason: `Auto deduction for order ${order.orderNumber} (Table ${order.tableNumber})`,
          timestamp: now,
        };
        transaction.set(movementRef, movement);

        // Check if stock dropped below minimum and create stock alert if needed
        if (newStock <= invDoc.minStock) {
          const alertRef = doc(db, COLLECTIONS.STOCK_ALERTS, `alert-${invDoc.itemData.id}`);
          const alertDoc: StockAlert = {
            id: `alert-${invDoc.itemData.id}`,
            restaurantId: order.restaurantId,
            inventoryItemId: invDoc.itemData.id,
            itemName: invDoc.itemData.name,
            currentStock: newStock,
            minStock: invDoc.minStock,
            unit: invDoc.itemData.unit,
            type: newStock === 0 ? 'out_of_stock' : 'low_stock',
            status: 'active',
            createdAt: now,
          };
          transaction.set(alertRef, alertDoc);
        }
      }

      // 5. Update Order Document as Deducted
      transaction.update(orderRef, {
        inventoryDeducted: true,
        inventoryTransactionRef: txnRef,
        updatedAt: now,
      });

      console.log(`Successfully deducted inventory for order ${order.orderNumber}: ${deductions.size} ingredients updated.`);
      return true;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${COLLECTIONS.ORDERS}/${orderId}`);
  }
}

// 4. Update Order Status
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  tableId?: string,
  tableNumber?: number
): Promise<void> {
  const now = new Date().toISOString();
  try {
    const orderRef = doc(db, COLLECTIONS.ORDERS, orderId);
    await updateDoc(orderRef, {
      status: newStatus,
      updatedAt: now,
    });

    // If order was confirmed or sent to kitchen, trigger recipe inventory deduction!
    if (newStatus === 'CONFIRMED' || newStatus === 'SENT_TO_KITCHEN' || newStatus === 'PREPARING') {
      await deductInventoryForOrder(orderId);
    }

    // Also update table status accordingly
    if (tableId) {
      const tableRef = doc(db, COLLECTIONS.TABLES, tableId);
      let tableStatus: Table['status'] = 'occupied';
      if (newStatus === 'PREPARING') tableStatus = 'preparing';
      if (newStatus === 'READY') tableStatus = 'food_ready';
      if (newStatus === 'SERVED') tableStatus = 'occupied';
      if (newStatus === 'COMPLETED') tableStatus = 'available';

      await updateDoc(tableRef, {
        status: tableStatus,
        updatedAt: now,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, COLLECTIONS.ORDERS);
  }
}

// 5. Service Requests (Call Waiter, Water, Cutlery, Assistance, Bill)
export async function createServiceRequest(params: {
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  type: ServiceRequestType;
  notes?: string;
}): Promise<ServiceRequest> {
  const requestId = `req-${Date.now()}`;
  const now = new Date().toISOString();

  const newRequest: ServiceRequest = {
    id: requestId,
    restaurantId: params.restaurantId,
    tableId: params.tableId,
    tableNumber: params.tableNumber,
    type: params.type,
    status: 'pending',
    notes: params.notes,
    createdAt: now,
  };

  try {
    await setDoc(doc(db, COLLECTIONS.SERVICE_REQUESTS, requestId), cleanForFirestore(newRequest));

    // Update table highlight
    const tableRef = doc(db, COLLECTIONS.TABLES, params.tableId);
    await updateDoc(tableRef, {
      status: params.type === 'bill' ? 'bill_requested' : 'waiter_needed',
      updatedAt: now,
    });

    return newRequest;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTIONS.SERVICE_REQUESTS);
  }
}

export async function acceptServiceRequest(requestId: string, waiterName: string): Promise<void> {
  try {
    const ref = doc(db, COLLECTIONS.SERVICE_REQUESTS, requestId);
    await updateDoc(ref, {
      status: 'accepted',
      acceptedByWaiterName: waiterName,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, COLLECTIONS.SERVICE_REQUESTS);
  }
}

export async function resolveServiceRequest(requestId: string, tableId?: string): Promise<void> {
  const now = new Date().toISOString();
  try {
    const ref = doc(db, COLLECTIONS.SERVICE_REQUESTS, requestId);
    await updateDoc(ref, {
      status: 'resolved',
      resolvedAt: now,
    });

    if (tableId) {
      const tableRef = doc(db, COLLECTIONS.TABLES, tableId);
      await updateDoc(tableRef, {
        status: 'occupied',
        updatedAt: now,
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, COLLECTIONS.SERVICE_REQUESTS);
  }
}

// 6. Billing and Demo Payments
export async function getOrCreateBillForTable(
  restaurantId: string,
  tableId: string,
  tableNumber: number
): Promise<Bill> {
  try {
    // Find open orders for this table
    const ordersSnap = await getDocs(
      query(
        collection(db, COLLECTIONS.ORDERS),
        where('tableId', '==', tableId),
        where('paymentStatus', '!=', 'PAID')
      )
    );

    const openOrders: Order[] = [];
    ordersSnap.forEach((d) => {
      openOrders.push(d.data() as Order);
    });

    const subtotal = openOrders.reduce((sum, o) => sum + o.subtotal, 0);
    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const serviceCharge = Math.round(subtotal * 0.05 * 100) / 100;
    const grandTotal = Math.round((subtotal + tax + serviceCharge) * 100) / 100;

    const billId = `bill-${tableId}`;
    const billRef = doc(db, COLLECTIONS.BILLS, billId);
    const existingSnap = await getDoc(billRef);

    if (existingSnap.exists()) {
      const existing = existingSnap.data() as Bill;
      // If bill is already paid and no new unpaid orders are placed, preserve historical bill & payments
      if (existing.status === 'PAID' && openOrders.length === 0) {
        return existing;
      }
      if (existing.status !== 'PAID') {
        // Refresh with latest order items if amounts changed
        const updatedBill: Bill = {
          ...existing,
          orderIds: openOrders.map((o) => o.id),
          ordersSummary: openOrders.map((o) => ({
            orderNumber: o.orderNumber,
            itemsCount: o.items.reduce((s, it) => s + it.quantity, 0),
            amount: o.total,
          })),
          subtotal,
          tax,
          serviceCharge,
          grandTotal,
          balanceRemaining: Math.max(0, grandTotal - (existing.paidAmount || 0)),
        };
        await updateDoc(billRef, cleanForFirestore(updatedBill));
        return updatedBill;
      }
    }

    const newBill: Bill = {
      id: billId,
      restaurantId,
      tableId,
      tableNumber,
      orderIds: openOrders.map((o) => o.id),
      ordersSummary: openOrders.map((o) => ({
        orderNumber: o.orderNumber,
        itemsCount: o.items.reduce((s, it) => s + it.quantity, 0),
        amount: o.total,
      })),
      subtotal,
      discount: 0,
      tax,
      serviceCharge,
      tip: 0,
      grandTotal,
      paidAmount: 0,
      balanceRemaining: grandTotal,
      status: 'OPEN',
      payments: [],
      createdAt: new Date().toISOString(),
    };

    await setDoc(billRef, cleanForFirestore(newBill));
    return newBill;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, COLLECTIONS.BILLS);
  }
}

export async function processDemoPayment(params: {
  billId: string;
  tableId: string;
  amount: number;
  method: PaymentRecord['method'];
  paidBy?: string;
  recordedByWaiter?: string;
}): Promise<{ success: boolean; transactionId: string; newBalance: number }> {
  const billRef = doc(db, COLLECTIONS.BILLS, params.billId);
  const now = new Date().toISOString();
  const transactionId = `DEMO-TXN-${params.method.toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

  try {
    const paymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}`,
      billId: params.billId,
      tableNumber: 0,
      amount: params.amount,
      method: params.method,
      transactionId,
      status: 'SUCCESS',
      paidBy: params.paidBy || 'Customer',
      ...(params.recordedByWaiter ? { recordedByWaiter: params.recordedByWaiter } : {}),
      createdAt: now,
    };

    const billSnap = await getDoc(billRef);
    if (!billSnap.exists()) {
      throw new Error('Bill not found');
    }
    const bill = billSnap.data() as Bill;
    paymentRecord.tableNumber = bill.tableNumber;

    const newPaidAmount = Math.round((bill.paidAmount + params.amount) * 100) / 100;
    const newBalance = Math.max(0, Math.round((bill.grandTotal - newPaidAmount) * 100) / 100);
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    const billUpdate: any = {
      paidAmount: newPaidAmount,
      balanceRemaining: newBalance,
      status: newStatus,
      payments: [...(bill.payments || []), cleanForFirestore(paymentRecord)],
    };
    if (newStatus === 'PAID') {
      billUpdate.paidAt = now;
    }

    await updateDoc(billRef, billUpdate);

    // If completely paid, mark table orders as PAID & reset table to available or paid
    if (newStatus === 'PAID') {
      const tableRef = doc(db, COLLECTIONS.TABLES, params.tableId);
      await updateDoc(tableRef, {
        status: 'available',
        currentOrderId: deleteField(),
        activeBillId: deleteField(),
        guestCount: deleteField(),
        updatedAt: now,
      });

      // Mark associated orders as PAID
      for (const ordId of bill.orderIds) {
        try {
          await updateDoc(doc(db, COLLECTIONS.ORDERS, ordId), {
            paymentStatus: 'PAID',
            status: 'COMPLETED',
            updatedAt: now,
          });
        } catch (e) {
          console.warn('Order mark paid warning:', e);
        }
      }
    }

    return {
      success: true,
      transactionId,
      newBalance,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, COLLECTIONS.BILLS);
  }
}

// 7. Inventory Stock Updates & Low Stock Alerts
export async function updateInventoryStock(
  itemId: string,
  newStock: number,
  reason: string
): Promise<void> {
  const itemRef = doc(db, COLLECTIONS.INVENTORY_ITEMS, itemId);
  const now = new Date().toISOString();
  try {
    const snap = await getDoc(itemRef);
    if (!snap.exists()) return;
    const item = snap.data() as InventoryItem;
    const diff = newStock - item.currentStock;

    await updateDoc(itemRef, {
      currentStock: newStock,
      updatedAt: now,
    });

    // Record movement
    const movementRef = doc(collection(db, COLLECTIONS.INVENTORY_TRANSACTIONS));
    await setDoc(movementRef, {
      id: movementRef.id,
      restaurantId: item.restaurantId,
      inventoryItemId: itemId,
      itemName: item.name,
      type: diff > 0 ? 'RESTOCK' : 'ADJUSTMENT',
      quantityChange: diff,
      unit: item.unit,
      reason,
      timestamp: now,
    });

    // Manage alert
    const alertRef = doc(db, COLLECTIONS.STOCK_ALERTS, `alert-${itemId}`);
    if (newStock <= item.minStock) {
      await setDoc(alertRef, {
        id: `alert-${itemId}`,
        restaurantId: item.restaurantId,
        inventoryItemId: itemId,
        itemName: item.name,
        currentStock: newStock,
        minStock: item.minStock,
        unit: item.unit,
        type: newStock === 0 ? 'out_of_stock' : 'low_stock',
        status: 'active',
        createdAt: now,
      });
    } else {
      // Resolve alert if stock was increased above minimum
      try {
        await deleteDoc(alertRef);
      } catch (e) {
        // ignore
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, COLLECTIONS.INVENTORY_ITEMS);
  }
}

export async function requestReplenishment(
  itemId: string,
  requestedBy: string
): Promise<void> {
  const itemRef = doc(db, COLLECTIONS.INVENTORY_ITEMS, itemId);
  const now = new Date().toISOString();
  try {
    const snap = await getDoc(itemRef);
    if (!snap.exists()) return;
    const item = snap.data() as InventoryItem;

    const alertRef = doc(db, COLLECTIONS.STOCK_ALERTS, `replenish-${itemId}`);
    await setDoc(alertRef, {
      id: `replenish-${itemId}`,
      restaurantId: item.restaurantId,
      inventoryItemId: itemId,
      itemName: item.name,
      currentStock: item.currentStock,
      minStock: item.minStock,
      unit: item.unit,
      type: 'replenish_requested',
      status: 'active',
      requestedBy,
      createdAt: now,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, COLLECTIONS.STOCK_ALERTS);
  }
}

export async function resolveStockAlert(alertId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTIONS.STOCK_ALERTS, alertId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, COLLECTIONS.STOCK_ALERTS);
  }
}
