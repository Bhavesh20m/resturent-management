export type UserRole = 'owner' | 'manager' | 'waiter' | 'kitchen' | 'inventory_manager' | 'customer';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  cuisine: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  address: string;
  phone: string;
  taxRate: number; // e.g. 0.05 for 5% GST
  serviceChargeRate: number; // e.g. 0.05 for 5%
  wifiName?: string;
  wifiPassword?: string;
}

export type TableStatus =
  | 'available'
  | 'occupied'
  | 'new_order'
  | 'preparing'
  | 'food_ready'
  | 'waiter_needed'
  | 'bill_requested'
  | 'payment_pending'
  | 'paid';

export interface Table {
  id: string;
  restaurantId: string;
  tableNumber: number;
  capacity: number;
  section: string; // 'Main Dining' | 'Terrace Garden' | 'Private Lounge'
  floor: string; // 'Ground Floor' | '1st Floor'
  status: TableStatus;
  currentOrderId?: string;
  activeBillId?: string;
  assignedWaiterId?: string;
  assignedWaiterName?: string;
  guestCount?: number;
  activeSessionToken?: string;
  seatedAt?: string;
  updatedAt?: string;
}

export interface MenuCategory {
  id: string;
  restaurantId: string;
  name: string;
  iconName: string;
  displayOrder: number;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g. 'Regular', 'Large', 'Half', 'Full'
  priceOffset: number; // e.g. 0, 150
}

export interface ProductAddon {
  id: string;
  name: string;
  price: number;
}

export type KitchenStationId =
  | 'indian_kitchen'
  | 'chinese_kitchen'
  | 'pizza_station'
  | 'grill'
  | 'beverages'
  | 'desserts';

export interface MenuProduct {
  id: string;
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isVeg: boolean;
  spiceLevel: 'Mild' | 'Medium' | 'Spicy' | 'Extra Hot';
  preparationTime: number; // minutes
  isAvailable: boolean;
  isPublished: boolean;
  allergens?: string[];
  kitchenStation: KitchenStationId;
  variants?: ProductVariant[];
  addons?: ProductAddon[];
  discount?: number; // percentage
}

export type InventoryUnit =
  | 'kg'
  | 'g'
  | 'L'
  | 'ml'
  | 'pcs'
  | 'pkts'
  | 'boxes'
  | 'bottles';

export interface InventoryItem {
  id: string;
  restaurantId: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  brand?: string;
  description?: string;
  unit: InventoryUnit;
  currentStock: number;
  minStock: number;
  reorderQty: number;
  costPerUnit: number; // INR
  supplier: string;
  storageLocation: string; // e.g. 'Cold Room #1', 'Dry Pantry', 'Spice Rack'
  expiryDate?: string;
  updatedAt: string;
}

export interface RecipeIngredient {
  inventoryItemId: string;
  inventoryItemName: string;
  quantityRequired: number; // in inventoryItem unit
  unit: InventoryUnit;
}

export interface Recipe {
  id: string;
  restaurantId: string;
  menuProductId: string;
  menuProductName: string;
  servingPortion: string; // e.g. '1 Portion'
  ingredients: RecipeIngredient[];
}

export interface OrderItem {
  id: string;
  menuProductId: string;
  name: string;
  price: number;
  quantity: number;
  selectedVariant?: ProductVariant;
  selectedAddons?: ProductAddon[];
  specialInstructions?: string;
  kitchenStation: KitchenStationId;
  isVeg: boolean;
  itemStatus?: 'queued' | 'preparing' | 'ready' | 'served';
}

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'SENT_TO_KITCHEN'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Order {
  id: string;
  restaurantId: string;
  orderNumber: string; // e.g. '#ORD-101'
  tableId: string;
  tableNumber: number;
  source: 'QR' | 'Waiter' | 'Walk-in' | 'Takeaway';
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  notes?: string;
  allergies?: string;
  assignedWaiterId?: string;
  assignedWaiterName?: string;
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  inventoryDeducted: boolean;
  inventoryTransactionRef?: string;
  createdAt: string;
  updatedAt: string;
}

export type ServiceRequestType =
  | 'call_waiter'
  | 'water'
  | 'cutlery'
  | 'assistance'
  | 'bill'
  | 'other';

export type ServiceRequestStatus = 'pending' | 'accepted' | 'resolved';

export interface ServiceRequest {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  type: ServiceRequestType;
  status: ServiceRequestStatus;
  notes?: string;
  createdAt: string;
  acceptedByWaiterName?: string;
  resolvedAt?: string;
}

export interface StockAlert {
  id: string;
  restaurantId: string;
  inventoryItemId: string;
  itemName: string;
  currentStock: number;
  minStock: number;
  unit: InventoryUnit;
  type: 'low_stock' | 'out_of_stock' | 'replenish_requested';
  status: 'active' | 'resolved';
  createdAt: string;
  requestedBy?: string;
}

export interface BillSplit {
  type: 'equal' | 'custom' | 'by_item';
  splitsCount?: number;
  amountPerPerson?: number;
}

export interface PaymentRecord {
  id: string;
  billId: string;
  orderId?: string;
  tableNumber: number;
  amount: number;
  method: 'cash' | 'upi' | 'card' | 'bank_transfer' | 'apple_pay' | 'google_pay';
  transactionId: string;
  status: 'SUCCESS' | 'FAILED';
  paidBy?: string;
  recordedByWaiter?: string;
  createdAt: string;
}

export interface Bill {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumber: number;
  orderIds: string[];
  ordersSummary: {
    orderNumber: string;
    itemsCount: number;
    amount: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  tip: number;
  grandTotal: number;
  paidAmount: number;
  balanceRemaining: number;
  status: 'OPEN' | 'PARTIALLY_PAID' | 'PAID';
  payments: PaymentRecord[];
  createdAt: string;
  paidAt?: string;
}

export interface StaffMember {
  id: string;
  restaurantId: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  assignedTables?: number[];
  shiftStatus: 'on_shift' | 'off_shift' | 'break';
  avatarInitials: string;
}

export interface VoiceAnnouncement {
  id: string;
  orderId: string;
  orderNumber: string;
  tableNumber: number;
  textHindi: string;
  textEnglish: string;
  status: 'queued' | 'speaking' | 'completed' | 'failed';
  timestamp: string;
}

export interface InventoryMovement {
  id: string;
  restaurantId: string;
  inventoryItemId: string;
  itemName: string;
  type: 'DEDUCTION' | 'RESTOCK' | 'WASTAGE' | 'ADJUSTMENT';
  quantityChange: number;
  unit: InventoryUnit;
  relatedOrderId?: string;
  reason: string;
  timestamp: string;
}
