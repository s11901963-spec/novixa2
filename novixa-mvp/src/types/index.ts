// "demo" = mock data from lib/data.ts; the rest are live HIOBuy channels.
export type ProductSource = "demo" | "1688" | "taobao" | "weidian";

// null means "unknown / not provided by the source" and must be shown as such.
export interface Product {
  id: string;
  source: ProductSource;
  name: string;
  description: string;
  category: string;
  imageUrl: string | null;
  images?: string[];
  specs: Record<string, string>;
  supplier: Supplier;
  price: number;
  currency: string;
  originalPrice?: number;
  shippingCost: number | null;
  shippingDays: number | null;
  rating: number | null;
  reviewCount: number | null;
  salesCount?: number | null;
  availability: "in_stock" | "limited" | "out_of_stock" | "unknown";
  moq?: number | null;
  tags: string[];
  sourceUrl?: string;
}

export interface Supplier {
  id: string;
  name: string;
  location: string | null;
  country: string | null;
  rating: number | null;
  verified: boolean;
  yearsActive: number | null;
  responseRate: number | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  totalAmount: number;
  shippingCost: number;
  status: "pending" | "confirmed" | "shipped" | "delivered";
  createdAt: Date;
  customerEmail: string;
  shippingAddress: Address;
}

export interface Address {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  street: string;
  zipCode: string;
}

export interface SearchResponse {
  mode: "live" | "demo";
  products: Product[];
  total: number;
  error?: string;
}

export interface AIAnalysis {
  productName: string;
  category: string;
  specs: Record<string, string>;
  searchQuery: string;
  confidence: number;
}

export interface PricingBreakdown {
  productPrice: number;
  shippingCost: number;
  fees: number;
  taxes: number;
  total: number;
  currency: string;
}

export interface ApiStatus {
  state: "connected" | "not_configured" | "error";
  message: string;
  checkedAt: string;
}
