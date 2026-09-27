"use client";

import { Product } from "@/types";
import { X, Star, Shield, ShoppingCart, ExternalLink } from "lucide-react";
import { formatPrice, calculatePricingBreakdown } from "@/lib/utils";

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductModal({
  product,
  onClose,
  onAddToCart,
}: ProductModalProps) {
  if (!product) return null;

  const pricing = calculatePricingBreakdown(
    product.price,
    product.shippingCost
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">تفاصيل المنتج</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Image */}
            <div>
              <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gray-200 rounded-xl mx-auto mb-4 animate-shimmer" />
                  <p className="text-gray-500 text-sm">صورة المنتج</p>
                </div>
              </div>
            </div>

            {/* Right: Details */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {product.name}
              </h3>
              <p className="text-gray-600 mb-4">{product.description}</p>

              {/* Supplier */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{product.supplier.name}</p>
                  <p className="text-sm text-gray-500">
                    {product.supplier.location}
                    {product.supplier.verified && " • موثق"}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= product.rating
                          ? "text-accent fill-accent"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  ({product.reviewCount} تقييم)
                </span>
              </div>

              {/* Specs */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">المواصفات</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between p-2 bg-gray-50 rounded-lg text-sm"
                    >
                      <span className="text-gray-500">{key}</span>
                      <span className="font-medium text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-primary/5 rounded-xl p-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  تفاصيل السعر
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">سعر المنتج</span>
                    <span className="font-medium">
                      {formatPrice(pricing.productPrice, pricing.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">الشحن</span>
                    <span className="font-medium">
                      {formatPrice(pricing.shippingCost, pricing.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">الرسوم</span>
                    <span className="font-medium">
                      {formatPrice(pricing.fees, pricing.currency)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">
                      الإجمالي
                    </span>
                    <span className="font-bold text-primary text-lg">
                      {formatPrice(pricing.total, pricing.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => onAddToCart(product)}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white py-3 rounded-xl transition-colors font-medium"
                >
                  <ShoppingCart className="w-5 h-5" />
                  أضف للسلة
                </button>
                {product.sourceUrl && (
                  <a
                    href={product.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink className="w-5 h-5 text-gray-600" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
