import { Product, PricingBreakdown } from "@/types";

export function formatPrice(amount: number, currency: string = "SAR"): string {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function calculatePricingBreakdown(
  productPrice: number,
  shippingCost: number,
  currency: string = "SAR",
  feesPercent: number = 2.5,
  taxPercent: number = 0
): PricingBreakdown {
  const fees = productPrice * (feesPercent / 100);
  const taxes = productPrice * (taxPercent / 100);
  const total = productPrice + shippingCost + fees + taxes;

  return {
    productPrice,
    shippingCost,
    fees,
    taxes,
    total,
    currency,
  };
}

export function getDiscountPercentage(
  originalPrice: number | undefined,
  currentPrice: number
): number {
  if (!originalPrice || originalPrice <= currentPrice) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

export function generateMockProducts(query: string): Product[] {
  const baseProducts: Omit<Product, "id">[] = [
    {
      source: "demo",
      name: `شاشة كمبيوتر gaming 27 بوصة ${query}`,
      description: "شاشة ألعاب عالية الأداء بدقة 2K ومعدل تحديث 144Hz",
      category: "إلكترونيات",
      imageUrl: null,
      specs: {
        size: "27 بوصة",
        resolution: "2K (2560x1440)",
        refreshRate: "144Hz",
        responseTime: "1ms",
        ports: "HDMI, DisplayPort",
      },
      supplier: {
        id: "sup-1",
        name: "Shenzhen Tech Display Co.",
        location: "Shenzhen, China",
        country: "China",
        rating: 4.7,
        verified: true,
        yearsActive: 8,
        responseRate: 95,
      },
      price: 1850,
      currency: "SAR",
      originalPrice: 2200,
      shippingCost: 45,
      shippingDays: 12,
      rating: 4.5,
      reviewCount: 328,
      availability: "in_stock",
      tags: ["gaming", "monitor", "2K", "144Hz"],
      sourceUrl: "https://example.com/product/1",
    },
    {
      source: "demo",
      name: `شاشة احترافية 32 بوصة ${query}`,
      description: "شاشة احترافية للمصممين والمطورين بألوان دقيقة",
      category: "إلكترونيات",
      imageUrl: null,
      specs: {
        size: "32 بوصة",
        resolution: "4K UHD",
        refreshRate: "60Hz",
        responseTime: "5ms",
        ports: "USB-C, HDMI, DisplayPort",
      },
      supplier: {
        id: "sup-2",
        name: "Guangzhou Electronics Ltd.",
        location: "Guangzhou, China",
        country: "China",
        rating: 4.5,
        verified: true,
        yearsActive: 5,
        responseRate: 88,
      },
      price: 2400,
      currency: "SAR",
      originalPrice: 2800,
      shippingCost: 55,
      shippingDays: 15,
      rating: 4.3,
      reviewCount: 156,
      availability: "in_stock",
      tags: ["professional", "4K", "design"],
      sourceUrl: "https://example.com/product/2",
    },
    {
      source: "demo",
      name: `لابتوب ألعاب ${query}`,
      description: "لابتوب ألعاب قوي بمعالج latest generation وكارت شاشة dedi",
      category: "كمبيوتر",
      imageUrl: null,
      specs: {
        processor: "Intel Core i7-13700H",
        graphics: "RTX 4060 8GB",
        ram: "16GB DDR5",
        storage: "1TB SSD",
        display: '15.6" FHD 144Hz',
      },
      supplier: {
        id: "sup-3",
        name: "Dragon Computer Tech",
        location: "Shenzhen, China",
        country: "China",
        rating: 4.6,
        verified: true,
        yearsActive: 6,
        responseRate: 92,
      },
      price: 4500,
      currency: "SAR",
      originalPrice: 5200,
      shippingCost: 80,
      shippingDays: 18,
      rating: 4.4,
      reviewCount: 892,
      availability: "in_stock",
      moq: 1,
      tags: ["laptop", "gaming", "RTX", "i7"],
      sourceUrl: "https://example.com/product/3",
    },
  ];

  return baseProducts.map((product, index) => ({
    ...product,
    id: `demo-${index}`,
  }));
}
