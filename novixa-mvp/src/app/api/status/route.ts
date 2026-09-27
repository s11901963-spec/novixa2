import { NextResponse } from "next/server";
import { describeError, hiobuyConfigured, searchByKeyword } from "@/lib/hiobuy";
import { ApiStatus } from "@/types";

export const dynamic = "force-dynamic";

// Each check is a real 1-item search on 1688, so the badge is green only when
// HIOBuy actually answered. Cached to avoid spending quota on every page view.
const CACHE_MS = 5 * 60 * 1000;
let cached: { status: ApiStatus; at: number } | null = null;

export async function GET(request: Request) {
  const refresh = new URL(request.url).searchParams.has("refresh");
  if (cached && !refresh && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json(cached.status);
  }

  let status: ApiStatus;
  if (!hiobuyConfigured()) {
    status = {
      state: "not_configured",
      message: "لا يوجد مفتاح Hiobuy؛ الموقع يعرض بيانات تجريبية.",
      checkedAt: new Date().toISOString(),
    };
  } else {
    try {
      await searchByKeyword("phone case", "1688", 1);
      status = {
        state: "connected",
        message: "متصل بـ 1688 عبر Hiobuy: نجح بحث تجريبي حقيقي.",
        checkedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("HIOBuy status check failed:", error);
      status = { state: "error", message: describeError(error), checkedAt: new Date().toISOString() };
    }
  }

  cached = { status, at: Date.now() };
  return NextResponse.json(status);
}
