// Server-side client for the HIOBuy Product API (1688 / Taobao / Weidian).
// Adapted from https://github.com/hiobuy/starter (MIT). Import only from route
// handlers: the API key must never reach the browser.
import { Product, ProductSource } from "@/types";

export type HiobuyChannel = "1688" | "taobao" | "weidian";

interface LocalizedText {
  original: string;
  translated: string | null;
}

interface HiobuyPrice {
  original_amount?: number | null;
  display_amount?: number | null;
  original_currency?: string;
  display_currency?: string;
}

interface HiobuyListItem {
  id: string;
  channel: string;
  source_url?: string | null;
  title?: LocalizedText | string;
  price?: HiobuyPrice;
  images?: { url: string }[];
  image?: string | null;
  seller_name?: string | null;
  sales_count?: number | null;
}

interface HiobuyDetail extends HiobuyListItem {
  description?: LocalizedText | null;
  attributes?: { name: string; value: string }[];
  min_order_quantity?: number | null;
}

interface HiobuyList {
  items: HiobuyListItem[];
  total?: number;
}

export class HiobuyApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "HiobuyApiError";
  }
}

export function hiobuyConfigured(): boolean {
  return Boolean(process.env.HIOBUY_API_KEY?.trim());
}

async function hiobuyFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const apiKey = process.env.HIOBUY_API_KEY?.trim();
  if (!apiKey) {
    throw new HiobuyApiError("HIOBUY_API_KEY is not set", 500, "MISSING_API_KEY");
  }
  const base = (process.env.HIOBUY_API_BASE_URL || "https://api.hiobuy.com").replace(/\/$/, "");

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        language: process.env.HIOBUY_DEFAULT_LANGUAGE?.trim() || "en",
        response_format: "standard",
        ...body,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    throw new HiobuyApiError(
      `Cannot reach HIOBuy: ${error instanceof Error ? error.message : String(error)}`,
      502,
      "NETWORK_ERROR"
    );
  }

  const raw = await res.text();
  let data: { error?: { code?: string; message?: string } } | null = null;
  try {
    data = JSON.parse(raw);
  } catch {
    // Not JSON: the answer came from something in between (proxy/firewall),
    // not from HIOBuy. Never report it as a HIOBuy verdict on the key.
  }
  if (!data) {
    throw new HiobuyApiError(raw.slice(0, 200) || `HTTP ${res.status}`, res.status, "NOT_FROM_HIOBUY");
  }
  if (!res.ok) {
    throw new HiobuyApiError(
      data.error?.message || `HIOBuy API error (${res.status})`,
      res.status,
      data.error?.code
    );
  }
  return data as T;
}

function text(value?: LocalizedText | string | null): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.translated || value.original || "";
}

function toProduct(item: HiobuyListItem | HiobuyDetail): Product {
  const price = item.price ?? {};
  const useDisplay = price.display_amount != null;
  const detail = item as HiobuyDetail;

  // Only fields HIOBuy actually returns are filled; everything else stays
  // null so the UI shows it as unknown instead of inventing a value.
  return {
    id: item.id,
    source: item.channel as ProductSource,
    name: text(item.title) || "منتج بدون عنوان",
    description: text(detail.description),
    category: "",
    imageUrl: item.images?.[0]?.url ?? item.image ?? null,
    images: item.images?.map((image) => image.url),
    specs: Object.fromEntries((detail.attributes ?? []).map((a) => [a.name, a.value])),
    supplier: {
      id: item.seller_name ?? "unknown",
      name: item.seller_name ?? "مورد غير معروف",
      location: null,
      country: null,
      rating: null,
      verified: false,
      yearsActive: null,
      responseRate: null,
    },
    price: Number((useDisplay ? price.display_amount : price.original_amount) ?? 0),
    currency: (useDisplay ? price.display_currency : price.original_currency) || "CNY",
    shippingCost: null,
    shippingDays: null,
    rating: null,
    reviewCount: null,
    salesCount: item.sales_count ?? null,
    availability: "unknown",
    moq: detail.min_order_quantity ?? null,
    tags: [],
    sourceUrl: item.source_url ?? undefined,
  };
}

export async function searchByKeyword(keyword: string, channel: HiobuyChannel, pageSize = 20) {
  const data = await hiobuyFetch<HiobuyList>("/v1/products/search", {
    channel,
    keyword,
    page: 1,
    page_size: pageSize,
  });
  return { products: data.items.map(toProduct), total: data.total ?? data.items.length };
}

export async function searchByImage(imageBase64: string, channel: HiobuyChannel) {
  const data = await hiobuyFetch<HiobuyList>("/v1/products/search-by-image", {
    channel,
    image_base64: imageBase64,
    page: 1,
    page_size: 20,
  });
  return { products: data.items.map(toProduct), total: data.total ?? data.items.length };
}

export async function parseProductUrl(url: string) {
  const data = await hiobuyFetch<{ product: HiobuyDetail }>("/v1/products/parse", { url });
  return toProduct(data.product);
}

export async function getProductDetail(id: string, channel: HiobuyChannel) {
  const data = await hiobuyFetch<{ product: HiobuyDetail }>("/v1/products/detail", {
    id,
    channel,
  });
  return toProduct(data.product);
}

export function detectChannelFromUrl(url: string): HiobuyChannel | null {
  const lower = url.toLowerCase();
  if (lower.includes("taobao.com") || lower.includes("tmall.com")) return "taobao";
  if (lower.includes("1688.com")) return "1688";
  if (lower.includes("weidian.com")) return "weidian";
  return null;
}

/** Arabic message for the UI, based on HIOBuy's documented error codes. */
export function describeError(error: unknown): string {
  if (!(error instanceof HiobuyApiError)) return "حدث خطأ غير متوقع أثناء الاتصال بـ Hiobuy.";
  switch (error.code) {
    case "NETWORK_ERROR":
      return "تعذّر الوصول إلى خادم Hiobuy (مشكلة شبكة).";
    case "NOT_FROM_HIOBUY":
      return `الطلب لم يصل إلى Hiobuy؛ الشبكة حجبته (${error.status}): ${error.message}`;
    case "INVALID_API_KEY":
    case "MISSING_KEY":
      return "Hiobuy رفض المفتاح: المفتاح غير صحيح أو ملغى.";
    case "INSUFFICIENT_SCOPE":
      return "المفتاح صحيح لكن ينقصه صلاحيات البحث/التفاصيل (product:search و product:detail) في لوحة Hiobuy.";
    case "CHANNEL_NOT_AUTHORIZED":
    case "UNSUPPORTED_CHANNEL":
      return "المفتاح صحيح لكن قناة 1688/Taobao غير مفعّلة لتطبيقك في لوحة Hiobuy.";
    case "RATE_LIMIT_EXCEEDED":
      return "تم تجاوز حد الاستخدام في Hiobuy مؤقتًا.";
    case "TIMEOUT":
    case "UPSTREAM_ERROR":
      return "Hiobuy لم يتلقَّ ردًا من المصدر (1688/Taobao) في الوقت المحدد.";
  }
  if (error.status === 401) return "Hiobuy رفض المفتاح: المفتاح غير صحيح أو ملغى.";
  return `خطأ من Hiobuy (${error.status}${error.code ? ` ${error.code}` : ""}): ${error.message}`;
}
