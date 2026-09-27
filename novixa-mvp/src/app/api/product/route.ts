import { NextResponse } from "next/server";
import { HiobuyChannel, describeError, getProductDetail, hiobuyConfigured } from "@/lib/hiobuy";

// Full details (description, attributes, MOQ, images) for a live product.
export async function POST(request: Request) {
  const { id, channel } = (await request.json().catch(() => ({}))) as {
    id?: string;
    channel?: HiobuyChannel;
  };
  if (!id || !channel) {
    return NextResponse.json({ error: "id و channel مطلوبان" }, { status: 400 });
  }
  if (!hiobuyConfigured()) {
    return NextResponse.json({ error: "Hiobuy غير مربوط" }, { status: 503 });
  }

  try {
    return NextResponse.json({ product: await getProductDetail(id, channel) });
  } catch (error) {
    console.error("HIOBuy detail failed:", error);
    return NextResponse.json({ error: describeError(error) }, { status: 502 });
  }
}
