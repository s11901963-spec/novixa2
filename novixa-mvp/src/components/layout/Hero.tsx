"use client";

import { useState } from "react";
import { ArrowLeft, Zap, Shield, Truck } from "lucide-react";
import SearchBar from "@/components/search/SearchBar";
import { Product } from "@/types";

interface HeroProps {
  onSearch: (query: string) => void;
  onImageUpload: (file: File) => void;
  loading: boolean;
}

export default function Hero({ onSearch, onImageUpload, loading }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white py-20 lg:py-32">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            مدعوم بالذكاء الاصطناعي
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            اكتشف المنتجات بأفضل
            <span className="text-primary block mt-2">الأسعار</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            ارفع صورة أو اكتب وصف للمنتج، وسنساعدك في العثور على أفضل الخيارات
            من الموردين الحقيقيين مع حساب الشحن والتكاليف
          </p>

          {/* Search Bar */}
          <div className="mb-12">
            <SearchBar onSearch={onSearch} onImageUpload={onImageUpload} loading={loading} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">+500</div>
              <div className="text-sm text-gray-600">مورد معتمد</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">+10K</div>
              <div className="text-sm text-gray-600">منتج متوفر</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">15+</div>
              <div className="text-sm text-gray-600">دولة</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
