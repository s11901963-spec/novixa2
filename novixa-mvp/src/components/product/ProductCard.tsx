"use client";

import { Product } from "@/types";
import { Star, Truck, Shield, ExternalLink } from "lucide-react";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
}

export default function ProductCard({ product, onSelect }: ProductCardProps) {
  const discount = getDiscountPercentage(product.originalPrice, product.price);

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group cursor-pointer"
      onClick={() => onSelect(product)}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 bg-gray-200 rounded-lg animate-shimmer" />
        </div>
        {discount > 0 && (
          <div className="absolute top-3 right-3 bg-error text-white text-xs font-bold px-2 py-1 rounded-lg">
            -{discount}%
          </div>
        )}
        {product.availability === "limited" && (
          <div className="absolute top-3 left-3 bg-accent text-white text-xs font-bold px-2 py-1 rounded-lg">
            كمية محدودة
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2 leading-tight">
            {product.name}
          </h3>
        </div>

        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
          {product.description}
        </p>

        {/* Supplier */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 text-accent fill-accent" />
            <span className="text-sm font-medium">{product.supplier.rating}</span>
          </div>
          {product.supplier.verified && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-success text-xs rounded-full">
              <Shield className="w-3 h-3" />
              موثق
            </span>
          )}
        </div>

        {/* Price */}
        <div className="flex items-end justify-between gap-2 mb-3">
          <div>
            {product.originalPrice && (
              <span className="text-sm text-gray-400 line-through block">
                {formatPrice(product.originalPrice, product.currency)}
              </span>
            )}
            <span className="text-xl font-bold text-primary">
              {formatPrice(product.price, product.currency)}
            </span>
          </div>
        </div>

        {/* Shipping */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <Truck className="w-4 h-4" />
          <span>شحن: {formatPrice(product.shippingCost, product.currency)}</span>
          <span className="text-gray-400">•</span>
          <span>{product.shippingDays} يوم</span>
        </div>

        {/* Action */}
        <button className="w-full py-2.5 bg-primary/10 hover:bg-primary hover:text-white text-primary rounded-xl transition-colors font-medium">
          عرض التفاصيل
        </button>
      </div>
    </div>
  );
}
