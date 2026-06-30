import { NextResponse } from "next/server";
import { getOrCreateDailyQuote } from "@/lib/daily-quote-server";

export async function GET() {
  const quote = await getOrCreateDailyQuote();
  return NextResponse.json(quote, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
