"use client";

import { Upload, Search, ShoppingCart, Truck } from "lucide-react";

const steps = [
  {
    icon: Upload,
    step: "1",
    title: "ارفع صورة أو اكتب وصف",
    description: "استخدم كاميرا هاتفك أو ارفع صورة للمنتج الذي تبحث عنه، أو اكتب وصفاً نصياً",
  },
  {
    icon: Search,
    step: "2",
    title: "الذكاء الاصطناعي يحلل",
    description: "يقوم الذكاء الاصطناعي بتحليل الطلب والبحث عن المنتجات المناسبة من الموردين الحقيقيين",
  },
  {
    icon: ShoppingCart,
    step: "3",
    title: "قارن واختر",
    description: "احصل على قائمة بالخيارات المتاحة مع مقارنة الأسعار والمواصفات والشحن",
  },
  {
    icon: Truck,
    step: "4",
    title: "اشترِ واستلم",
    description: "أكمل عملية الشراء بأمان وسنقوم بتوصيل المنتج إليك مع تتبع الطلب",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            كيف يعمل Novixa؟
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            أربع خطوات بسيطة للعثور على أفضل المنتجات بأسعار تنافسية
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((item, index) => (
            <div key={index} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-1/2 w-full h-0.5 bg-primary/20" />
              )}

              <div className="relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                {/* Step number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {item.step}
                </div>

                {/* Icon */}
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 mt-4">
                  <item.icon className="w-8 h-8 text-primary" />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
