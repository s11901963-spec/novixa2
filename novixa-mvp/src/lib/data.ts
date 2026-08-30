import { Product } from "@/types";
import { generateMockProducts } from "@/lib/utils";

export const MOCK_SUPPLIERS = [
  {
    id: "sup-1",
    name: "Shenzhen Tech Display Co.",
    location: "Shenzhen, China",
    country: "China",
    rating: 4.7,
    verified: true,
    yearsActive: 8,
    responseRate: 95,
  },
  {
    id: "sup-2",
    name: "Guangzhou Electronics Ltd.",
    location: "Guangzhou, China",
    country: "China",
    rating: 4.5,
    verified: true,
    yearsActive: 5,
    responseRate: 88,
  },
  {
    id: "sup-3",
    name: "Dragon Computer Tech",
    location: "Shenzhen, China",
    country: "China",
    rating: 4.6,
    verified: true,
    yearsActive: 6,
    responseRate: 92,
  },
  {
    id: "sup-4",
    name: "Ningbo Trade International",
    location: "Ningbo, China",
    country: "China",
    rating: 4.3,
    verified: false,
    yearsActive: 3,
    responseRate: 75,
  },
];

export function searchProducts(query: string): Product[] {
  const normalizedQuery = query.toLowerCase();
  
  // In a real app, this would call an external API
  // For MVP, we return mock data
  const products = generateMockProducts(query);
  
  return products.filter((product) => {
    const searchText = `${product.name} ${product.description} ${product.category} ${product.tags.join(" ")}`.toLowerCase();
    return searchText.includes(normalizedQuery) || normalizedQuery === "";
  });
}

export function getProductById(id: string): Product | undefined {
  const products = generateMockProducts("");
  return products.find((p) => p.id === id);
}

export function getFeaturedProducts(): Product[] {
  return generateMockProducts("").slice(0, 6);
}

export const CATEGORIES = [
  "إلكترونيات",
  "كمبيوتر",
  "هواتف ذكية",
  "شاشات",
  "ملابس",
  "منتجات منزلية",
  "إكسسوارات",
  "ألعاب",
];
