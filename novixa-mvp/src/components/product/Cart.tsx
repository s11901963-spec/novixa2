"use client";

import { CartItem } from "@/types";
import { X, Trash2, ShoppingBag } from "lucide-react";
import { formatPrice, calculatePricingBreakdown } from "@/lib/utils";

interface CartProps {
  items: CartItem[];
  onClose: () => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
}

export default function Cart({ items, onClose, onRemoveItem, onCheckout }: CartProps) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const shipping = items.reduce(
    (sum, item) => sum + item.product.shippingCost,
    0
  );
  const pricing = calculatePricingBreakdown(subtotal, shipping);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-2xl h-full overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">سلة التسوق</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                السلة فارغة
              </h3>
              <p className="text-gray-600">
                ابدأ بإضافة منتجات إلى سلة التسوق
              </p>
            </div>
          ) : (
            <>
              {/* Items */}
              <div className="space-y-4 mb-6">
                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex gap-4 p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0 animate-shimmer" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 line-clamp-2 mb-1">
                        {item.product.name}
                      </h4>
                      <p className="text-sm text-gray-500 mb-2">
                        الكمية: {item.quantity}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-primary">
                          {formatPrice(item.product.price * item.quantity, item.product.currency)}
                        </span>
                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          className="p-2 text-error hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="border-t border-gray-200 pt-4 space-y-2 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>المجموع الفرعي</span>
                  <span>{formatPrice(pricing.productPrice, pricing.currency)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>الشحن</span>
                  <span>{formatPrice(pricing.shippingCost, pricing.currency)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>الرسوم</span>
                  <span>{formatPrice(pricing.fees, pricing.currency)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-bold">
                  <span>الإجمالي</span>
                  <span className="text-primary">
                    {formatPrice(pricing.total, pricing.currency)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={onCheckout}
                className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-xl font-medium transition-colors"
              >
                إتمام الشراء
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
