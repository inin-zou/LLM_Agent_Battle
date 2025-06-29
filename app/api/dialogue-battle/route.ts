import { type NextRequest, NextResponse } from "next/server"
import { runDialogueBattle } from "@/lib/dialogue-battle"

export async function POST(request: NextRequest) {
  try {
    const { apiKeys } = await request.json()

    console.log("🎭 Starting Dialogue Battle...")

    // 执行5回合对话战斗
    const result = await runDialogueBattle(apiKeys)

    console.log("🏆 Dialogue Battle Result:", result)

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error("Dialogue Battle error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Dialogue battle processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
