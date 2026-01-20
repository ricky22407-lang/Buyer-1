
export enum OrderStatus {
  PENDING = '待處理',
  CONFIRMED = '已確認',
  PAID = '已付款',
  SHIPPED = '已出貨',
  MODIFIED = '修改單'
}

export type OrderSource = 'manual' | 'image' | 'monitor';

export interface RawOrder {
  buyerName: string;
  itemName: string;
  quantity: number;
  rawText: string;
  detectedPrice?: number;
  isModification?: boolean;
  selectedSpec?: string;
  groupName?: string; // New field for identifying the source group
}

export interface Order extends RawOrder {
  id: string;
  price: number;
  status: OrderStatus;
  timestamp: number;
  source?: OrderSource;
  groupName: string; // Mandatory in processed order
}

// --- New Product & Promotion Types ---

export type ProductType = '連線' | '預購' | '現貨';

export interface BulkRule {
  qty: number;
  price: number;
  isUnitPrice?: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  type: ProductType;
  specs?: string[];
  closingTime?: string;
  bulkRules: BulkRule[];
  timestamp: number;
  description?: string;
  purchasedQty?: number;
  purchaseNotes?: string;
}

// --- Trend Discovery Types ---
export interface TrendItem {
  id: string;
  name: string;
  description: string;
  estimatedPrice: number;
  sourcePlatform: string; // e.g., 'Xiaohongshu', 'Threads'
  sourceUrl?: string;
  imageUrl?: string; // New: Try to get image url
  reason: string; // Why is it trending?
}

export interface AnalysisResult {
  orders: RawOrder[];
  products: Product[];
  aiInteractions: AiInteraction[];
}

export interface AiInteraction {
  id: string;
  buyerName: string;
  question: string;
  suggestedReply: string;
  timestamp: number;
}

export type SortField = 'buyerName' | 'itemName' | 'status' | 'timestamp';
export type SortDirection = 'asc' | 'desc';
