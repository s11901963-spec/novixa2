"use client";

import { Zap, Search, Shield, Truck, Globe } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "بحث ذكي بالصورة",
    description: "ارفع صورة للمنتج وسيقوم الذكاء الاصطناعي بتحديده والعثور على أفضل الخيارات",
  },
  {
    icon: Globe,
    title: "موردين حقيقيين",
    description: "شبكة واسعة من المصانع والموردين المعتمدين من الصين ودول أخرى",
  },
  {
    icon: Shield,
    title: "أسعار موثوقة",
    description: "نحصل على أسعار حقيقية من الموردين مع مقارنة شاملة",
  },
  {
    icon: Truck,
    title: "شحن موثوق",
    description: "حساب تكاليف الشحن والرسوم مسبقاً مع خيارات شحن متعددة",
  },
  {
    icon: Zap,
    title: "ذكاء اصطناعي متقدم",
    description: "مساعد ذكي يفهم احتياجاتك ويقترح أفضل الخيارات المناسبة لك",
  },
  {
    icon: Shield,
    title: "ضمان الجودة",
    description: "نتحقق من الموردين ونضمن لك تجربة شراء آمنة",
  },
];

export default function Features() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            لماذا Novixa؟
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            نجمع بين قوة الذكاء الاصطناعي وشبكة الموردين الحقيقيين لنجعل
            تجربة التسوق أسهل وأفضل
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
