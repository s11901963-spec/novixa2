import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "الصورة مطلوبة" },
        { status: 400 }
      );
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      // Return mock data for development/demo
      return NextResponse.json({
        productName: "شاشة كمبيوتر",
        category: "إلكترونيات",
        specs: {
          size: "27 بوصة",
          resolution: "2K",
          refreshRate: "144Hz",
        },
        searchQuery: "شاشة كمبيوتر gaming 27 بوصة",
        confidence: 0.85,
      });
    }

    const OpenAI = (await import("openai")).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `حلل هذه الصورة وحدد المنتج الموجود فيها.
              أريد JSON فقط بهذا الشكل:
              {
                "productName": "اسم المنتج بالعربية",
                "category": "الفئة",
                "specs": {"المواصفة": "القيمة"},
                "searchQuery": "استعلام بحث بالعربية"
              }`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "فشل في تحليل الصورة" },
        { status: 500 }
      );
    }

    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      { error: "فشل في تحليل الصورة" },
      { status: 500 }
    );
  }
}
