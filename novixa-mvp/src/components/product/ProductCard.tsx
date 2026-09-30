"use client";

import { Product } from "@/types";
import { Star, Truck, Shield } from "lucide-react";
import { formatPrice, getDiscountPercentage } from "@/lib/utils";
import { SOURCE_LABELS } from "@/lib/sources";

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
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote marketplace CDN images
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-gray-200 rounded-lg animate-shimmer" />
          </div>
        )}
        <div className="absolute top-3 left-3 bg-white/90 text-gray-700 text-xs font-bold px-2 py-1 rounded-lg">
          {SOURCE_LABELS[product.source]}
        </div>
        {discount > 0 && (
          <div className="absolute top-3 right-3 bg-error text-white text-xs font-bold px-2 py-1 rounded-lg">
            -{discount}%
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 line-clamp-2 leading-tight mb-2">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
            {product.description}
          </p>
        )}

        {/* Supplier */}
        <div className="flex items-center gap-2 mb-3 text-sm">
          {product.supplier.rating != null && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-accent fill-accent" />
              <span className="font-medium">{product.supplier.rating}</span>
            </div>
          )}
          {product.supplier.verified && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-success text-xs rounded-full">
              <Shield className="w-3 h-3" />
              موثق
            </span>
          )}
          <span className="text-gray-500 truncate">{product.supplier.name}</span>
        </div>

        {/* Price */}
        <div className="mb-3">
          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through block">
              {formatPrice(product.originalPrice, product.currency)}
            </span>
          )}
          <span className="text-xl font-bold text-primary">
            {formatPrice(product.price, product.currency)}
          </span>
          {product.salesCount != null && (
            <span className="text-xs text-gray-500 mr-2">
              مبيعات في المصدر: {product.salesCount.toLocaleString("ar-SA")}
            </span>
          )}
        </div>

        {/* Shipping */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
          <Truck className="w-4 h-4" />
          {product.shippingCost != null ? (
            <>
              <span>شحن: {formatPrice(product.shippingCost, product.currency)}</span>
              {product.shippingDays != null && (
                <>
                  <span className="text-gray-400">•</span>
                  <span>{product.shippingDays} يوم</span>
                </>
              )}
            </>
          ) : (
            <span>الشحن يُحسب لاحقًا</span>
          )}
        </div>

        {/* Action */}
        <button className="w-full py-2.5 bg-primary/10 hover:bg-primary hover:text-white text-primary rounded-xl transition-colors font-medium">
          عرض التفاصيل
        </button>
      </div>
    </div>
  );
}
