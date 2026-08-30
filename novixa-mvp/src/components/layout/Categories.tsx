"use client";

import { CATEGORIES } from "@/lib/data";
import { Laptop, Smartphone, Monitor, Shirt, Home, Gamepad2 } from "lucide-react";

const categoryIcons: Record<string, React.ReactNode> = {
  "إلكترونيات": <Monitor className="w-6 h-6" />,
  "كمبيوتر": <Laptop className="w-6 h-6" />,
  "هواتف ذكية": <Smartphone className="w-6 h-6" />,
  "شاشات": <Monitor className="w-6 h-6" />,
  "ملابس": <Shirt className="w-6 h-6" />,
  "منتجات منزلية": <Home className="w-6 h-6" />,
  "إكسسوارات": <Gamepad2 className="w-6 h-6" />,
  "ألعاب": <Gamepad2 className="w-6 h-6" />,
};

export default function Categories() {
  return (
    <section id="categories" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            تسوق حسب الفئة
          </h2>
          <p className="text-xl text-gray-600">
            استكشف مجموعتنا الواسعة من المنتجات
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => {}}
              className="flex flex-col items-center justify-center p-6 bg-gray-50 hover:bg-primary/5 rounded-2xl transition-colors group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors text-primary">
                {categoryIcons[category] || <Monitor className="w-6 h-6" />}
              </div>
              <span className="font-medium text-gray-900 text-center">
                {category}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
