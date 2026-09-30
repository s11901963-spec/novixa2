"use client";

import { useEffect, useState } from "react";
import { ApiStatus } from "@/types";

const STYLES: Record<ApiStatus["state"] | "checking", { dot: string; label: string }> = {
  checking: { dot: "bg-gray-300 animate-pulse", label: "جارٍ فحص الربط…" },
  connected: { dot: "bg-green-500", label: "متصل بـ 1688" },
  error: { dot: "bg-red-500", label: "غير متصل بـ 1688" },
  not_configured: { dot: "bg-gray-400", label: "بيانات تجريبية" },
};

export default function ApiStatusBadge() {
  const [status, setStatus] = useState<ApiStatus | null>(null);

  const load = (refresh: boolean) =>
    fetch(`/api/status${refresh ? "?refresh=1" : ""}`)
      .then((res) => res.json())
      .then(setStatus)
      .catch(() =>
        setStatus({
          state: "error",
          message: "تعذّر الوصول إلى خادم الموقع.",
          checkedAt: new Date().toISOString(),
        })
      );

  useEffect(() => {
    load(false);
  }, []);

  const recheck = () => {
    setStatus(null);
    load(true);
  };

  const style = STYLES[status?.state ?? "checking"];

  return (
    <button
      onClick={recheck}
      title={status ? `${status.message} (اضغط لإعادة الفحص)` : undefined}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
      <span className="hidden sm:inline">{style.label}</span>
    </button>
  );
}
