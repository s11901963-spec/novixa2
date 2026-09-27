# Novixa MVP

منصة ذكية لاكتشاف المنتجات ومقارنة الأسعار والشراء من الموردين الحقيقيين.

## المتطلبات

- Node.js 18+
- npm أو yarn

## التثبيت

```bash
# تثبيت التبعيات
npm install

# نسخ ملف البيئة
cp .env.local.example .env.local

# تعديل ملف .env.local وأضف مفتاح Hiobuy
```

## التشغيل

```bash
npm run dev
```

افتح [http://localhost:3000](http://localhost:3000) في المتصفح.

## البناء

```bash
npm run build
npm run start
```

## التقنيات المستخدمة

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS v4
- OpenAI GPT-4o (Vision + Text)
- Lucide React (أيقونات)

## الميزات

### الميزات المُنفّذة (MVP)
- ✅ بحث نصي عن المنتجات
- ✅ رفع صورة وتحليلها بالذكاء الاصطناعي
- ✅ عرض نتائج البحث مع مقارنة الأسعار
- ✅ تفاصيل المنتج مع المواصفات
- ✅ سلة تسوق
- ✅ حساب السعر النهائي (المنتج + الشحن + الرسوم)
- ✅ تصميم RTL للغة العربية
- ✅ تصميم متجاوب للجوال

### الميزات المخططة
- [ ] تكامل حقيقي مع موردين (Alibaba API)
- [ ] نظام دفع (Stripe/Tap)
- [ ] تتبع الطلبات
- [ ] نظام تقييمات للموردين
- [ ] حساب مستخدم
- [ ] إشعارات
- [ ] تطبيق موبايل

## هيكل المشروع

```
src/
├── app/
│   ├── api/              # APIs
│   │   ├── analyze/      # تحليل الصور بالذكاء الاصطناعي
│   │   ├── search/       # بحث المنتجات
│   │   └── order/        # إنشاء طلب
│   ├── globals.css       # التنسيقات العامة
│   ├── layout.tsx        # التخطيط الرئيسي
│   └── page.tsx          # الصفحة الرئيسية
├── components/
│   ├── layout/           # مكونات التخطيط
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── HowItWorks.tsx
│   │   └── Categories.tsx
│   ├── product/          # مكونات المنتجات
│   │   ├── ProductCard.tsx
│   │   ├── ProductModal.tsx
│   │   └── Cart.tsx
│   └── search/           # مكونات البحث
│       ├── SearchBar.tsx
│       └── SearchResults.tsx
├── lib/
│   ├── ai.ts             # OpenAI API wrapper
│   ├── data.ts           # بيانات وهمية
│   └── utils.ts          # دوال مساعدة
└── types/
    └── index.ts          # TypeScript types
```

## البيئة

### متغيرات البيئة المطلوبة

| المتغير | الوصف |
|---------|-------|
| `HIOBUY_API_KEY` | مفتاح Hiobuy للبحث الحقيقي في 1688 وTaobao (بالكلمة، بالصورة، بالرابط). بدونه يعمل الموقع ببيانات تجريبية معلنة |
| `HIOBUY_DEFAULT_LANGUAGE` | لغة عناوين المنتجات من Hiobuy (افتراضيًا `en`) |
| `OPENAI_API_KEY` | اختياري: مسار `/api/analyze` القديم فقط |

### الربط مع Hiobuy

- الكود في `src/lib/hiobuy.ts` ويعمل على السيرفر فقط، فلا يصل المفتاح للمتصفح.
- المسارات: `POST /api/search` (كلمة أو رابط أو صورة)، `POST /api/product` (تفاصيل منتج)، `GET /api/status` (فحص الربط).
- مؤشر الحالة في الهيدر: **أخضر** فقط إذا نجح بحث حقيقي في 1688 عبر Hiobuy، **أحمر** مع السبب إذا فشل، **رمادي** إذا لا يوجد مفتاح.
- يجب أن يكون تطبيقك في لوحة Hiobuy مفعّلًا لقناة 1688 (وTaobao إن أردت)، وله صلاحيات `product:search` و`product:detail`.

## الخطوات القادمة

1. إضافة موردين حقيقيين
2. تكامل مع بوابات الدفع
3. بناء نظام المستخدمين
4. إضافة تتبع الطلبات
5. تحسين محرك البحث

## الترخيص

MIT
