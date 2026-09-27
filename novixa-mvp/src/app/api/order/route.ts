import { NextResponse } from "next/server";
import { Order, CartItem, Address } from "@/types";

export async function POST(request: Request) {
  try {
    const { items, shippingAddress, customerEmail }: Order = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "السلة فارغة" },
        { status: 400 }
      );
    }

    // In a real app, this would:
    // 1. Create order in database
    // 2. Process payment
    // 3. Send confirmation email
    // 4. Notify supplier

    const order: Order = {
      id: `ORD-${Date.now()}`,
      items,
      totalAmount: items.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      ),
      shippingCost: items.reduce(
        (sum, item) => sum + (item.product.shippingCost ?? 0),
        0
      ),
      status: "pending",
      createdAt: new Date(),
      customerEmail: customerEmail || "",
      shippingAddress: shippingAddress || {} as Address,
    };

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "فشل في إنشاء الطلب" },
      { status: 500 }
    );
  }
}
