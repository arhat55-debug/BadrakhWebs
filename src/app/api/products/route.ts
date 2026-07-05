import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort");

    let results;
    if (category && category !== "all") {
      results = await db.select().from(products).where(eq(products.category, category as "account" | "topup" | "rent" | "midman"));
    } else {
      results = await db.select().from(products);
    }

    let filtered = results;

    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(s) ||
          p.gameId.toLowerCase().includes(s) ||
          p.tags?.some((t) => t.toLowerCase().includes(s))
      );
    }

    if (sort === "price-asc") {
      filtered = filtered.sort((a, b) => a.basePrice - b.basePrice);
    } else if (sort === "price-desc") {
      filtered = filtered.sort((a, b) => b.basePrice - a.basePrice);
    } else {
      filtered = filtered.sort((a, b) => b.id - a.id);
    }

    return NextResponse.json(filtered);
  } catch (error) {
    console.error("GET /api/products error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await db
      .insert(products)
      .values({
        title: body.title,
        gameId: body.gameId,
        category: body.category as "account" | "topup" | "rent" | "midman",
        status: body.status || "available",
        tags: body.tags || [],
        basePrice: body.basePrice,
        messengerLink: body.messengerLink,
        imageUrls: body.imageUrls || [],
        rent1h: body.rent1h,
        rent12h: body.rent12h,
        rent24h: body.rent24h,
        binds: body.binds || [],
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/products error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID олдсонгүй" }, { status: 400 });
    }

    await db.delete(products).where(eq(products.id, Number(id)));

    return NextResponse.json({ success: true, message: "Амжилттай устгагдлаа" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/products error:", error);
    return NextResponse.json({ error: "Устгахад алдаа гарлаа" }, { status: 500 });
  }
}
