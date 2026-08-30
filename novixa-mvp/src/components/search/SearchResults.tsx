"use client";

import { Product } from "@/types";
import { Search } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";

interface SearchResultsProps {
  products: Product[];
  query: string;
  loading: boolean;
  onSelectProduct: (product: Product) => void;
}

export default function SearchResults({
  products,
  query,
  loading,
  onSelectProduct,
}: SearchResultsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="aspect-square bg-gray-100 animate-shimmer" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-100 rounded animate-shimmer" />
              <div className="h-3 bg-gray-100 rounded w-3/4 animate-shimmer" />
              <div className="h-6 bg-gray-100 rounded w-1/2 animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0 && query) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          لم نجد منتجات مطابقة
        </h3>
        <p className="text-gray-600">
          جرب البحث بكلمات مختلفة أو ارفع صورة للمنتج
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {query ? `نتائج البحث عن "${query}"` : "منتجات مقترحة"}
        </h2>
        <span className="text-sm text-gray-500">
          {products.length} منتج
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSelect={onSelectProduct}
          />
        ))}
      </div>
    </div>
  );
}
