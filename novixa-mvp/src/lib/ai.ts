import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export interface ProductAnalysisResult {
  productName: string;
  category: string;
  specs: Record<string, string>;
  searchQuery: string;
  confidence: number;
}

export async function analyzeProductImage(
  imageBase64: string
): Promise<ProductAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `حلل هذه الصورة وحدد المنتج الموجود فيها. 
              أريد:
              1. اسم المنتج بالعربية
              2. الفئة (إلكترونيات، ملابس، إلخ)
              3. أهم المواصفات (الماركة، الموديل، الحجم، إلخ)
              4. استعلام بحث بالعربية للعثور على منتجات مشابهة
              
              رد JSON فقط بهذا الشكل:
              {
                "productName": "اسم المنتج",
                "category": "الفئة",
                "specs": {"المواصفة": "القيمة"},
                "searchQuery": "استعلام البحث",
                "confidence": 0.95
              }`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    return JSON.parse(content) as ProductAnalysisResult;
  } catch (error) {
    console.error("Error analyzing product:", error);
    throw new Error("فشل في تحليل الصورة. يرجى المحاولة مرة أخرى.");
  }
}

export async function generateProductDescription(
  productName: string,
  specs: Record<string, string>
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `اكتب وصفاً تسويقياً مختصراً وجذاباً للمنتج التالي بالعربية:
          الاسم: ${productName}
          المواصفات: ${JSON.stringify(specs)}
          
          الوصف يجب أن يكون:
          - 2-3 أسطر
          - جذاب للمستهلك
          - يبرز أهم الميزات
          - لا يحتوي على كلام تسويقي مبالغ فيه`,
        },
      ],
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content || "منتج ممتاز بمواصفات عالية.";
  } catch (error) {
    console.error("Error generating description:", error);
    return "منتج ممتاز بمواصفات عالية.";
  }
}

export async function generateSearchQuery(
  userInput: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: `حول هذا المدخل من المستخدم إلى استعلام بحث محسّن للمنتجات:
          "${userInput}"
          
          المطلوب:
          - استعلام بحث واضح ومحدد بالعربية
          - يحتوي على الفئة والمواصفات الرئيسية
          - مناسب لمحركات بحث المنتجات`,
        },
      ],
      max_tokens: 100,
    });

    return response.choices[0]?.message?.content || userInput;
  } catch (error) {
    console.error("Error generating search query:", error);
    return userInput;
  }
}
