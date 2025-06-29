import { type NextRequest, NextResponse } from "next/server"
import { runChatBattle } from "@/lib/chat-battle"

export async function POST(request: NextRequest) {
  try {
    const { apiKeys } = await request.json()

    console.log("💬 Starting Chat Battle...")

    // 执行5回合聊天对话
    const result = await runChatBattle(apiKeys)

    console.log("🏆 Chat Battle Result:", result)

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error("Chat Battle error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Chat battle processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
