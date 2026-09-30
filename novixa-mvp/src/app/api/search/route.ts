import { NextResponse } from "next/server";
import { searchProducts } from "@/lib/data";
import {
  HiobuyChannel,
  describeError,
  detectChannelFromUrl,
  hiobuyConfigured,
  parseProductUrl,
  searchByImage,
  searchByKeyword,
} from "@/lib/hiobuy";
import { SearchResponse } from "@/types";

const CHANNELS: HiobuyChannel[] = ["1688", "taobao"];

// One entry point for every search type: keyword, product link, or image.
// Without a HIOBuy key it answers from mock data and says so (mode: "demo");
// with a key, errors are reported as errors, never silently replaced by mock data.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    keyword?: string;
    url?: string;
    image_base64?: string;
    channel?: HiobuyChannel;
  };
  const channel: HiobuyChannel = CHANNELS.includes(body.channel as HiobuyChannel)
    ? (body.channel as HiobuyChannel)
    : "1688";
  const keyword = body.keyword?.trim() ?? "";
  const url = body.url?.trim() ?? "";
  const image = body.image_base64?.replace(/^data:image\/[a-zA-Z+]+;base64,/, "").trim() ?? "";

  if (!keyword && !url && !image) {
    return NextResponse.json({ error: "أدخل كلمة بحث أو رابطًا أو صورة" }, { status: 400 });
  }

  if (!hiobuyConfigured()) {
    const products = searchProducts(keyword || "");
    return NextResponse.json<SearchResponse>({ mode: "demo", products, total: products.length });
  }

  try {
    if (url) {
      if (!detectChannelFromUrl(url)) {
        return NextResponse.json<SearchResponse>(
          { mode: "live", products: [], total: 0, error: "الرابط يجب أن يكون من 1688 أو Taobao أو Weidian" },
          { status: 400 }
        );
      }
      const product = await parseProductUrl(url);
      return NextResponse.json<SearchResponse>({ mode: "live", products: [product], total: 1 });
    }
    const result = image
      ? await searchByImage(image, channel)
      : await searchByKeyword(keyword, channel);
    return NextResponse.json<SearchResponse>({ mode: "live", ...result });
  } catch (error) {
    console.error("HIOBuy search failed:", error);
    return NextResponse.json<SearchResponse>(
      { mode: "live", products: [], total: 0, error: describeError(error) },
      { status: 502 }
    );
  }
}
