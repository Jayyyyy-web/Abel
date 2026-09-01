import { NextRequest, NextResponse } from "next/server";
import { askGemini, ChatMessage } from "@/lib/gemini";
import { saveMessage } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string = body.message;
    const history: ChatMessage[] = body.history ?? [];

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing 'message' in request body." },
        { status: 400 }
      );
    }

    const result = await askGemini(history, message);

    try {
      await saveMessage("user", message);
      await saveMessage("model", result.text);
    } catch (saveErr) {
      console.error("Failed to save message history:", saveErr);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Something went wrong talking to the model." },
      { status: 500 }
    );
  }
}