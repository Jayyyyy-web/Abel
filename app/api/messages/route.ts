import { NextResponse } from "next/server";
import { loadHistory } from "@/lib/supabase";

export async function GET() {
  try {
    const messages = await loadHistory();
    return NextResponse.json({ messages });
  } catch (err) {
    console.error("Messages API error:", err);
    return NextResponse.json(
      { error: "Could not load history." },
      { status: 500 }
    );
  }
}