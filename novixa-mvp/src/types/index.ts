export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  specs: Record<string, string>;
  supplier: Supplier;
  price: number;
  currency: string;
  originalPrice?: number;
  shippingCost: number;
  shippingDays: number;
  rating: number;
  reviewCount: number;
  availability: "in_stock" | "limited" | "out_of_stock";
  moq?: number;
  tags: string[];
  sourceUrl?: string;
}

export interface Supplier {
  id: string;
  name: string;
  location: string;
  country: string;
  rating: number;
  verified: boolean;
  yearsActive: number;
  responseRate: number;
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

export interface SearchResult {
  query: string;
  products: Product[];
  totalResults: number;
  searchTime: number;
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
