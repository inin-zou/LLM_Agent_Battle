import { type NextRequest, NextResponse } from "next/server"
import { playBattle } from "@/lib/langgraph-agents"

export async function POST(request: NextRequest) {
  try {
    const { apiKeys } = await request.json()

    console.log("🚀 Starting LangGraph Battle...")

    // 执行完整的心理战对战
    const result = await playBattle(apiKeys)

    console.log("🏆 Battle Result:", result)
    console.log("💭 Final Mental States:", result.finalMentalStates)
    console.log("🔮 Injected Beliefs:", result.injectedBeliefs)
    console.log("📝 Final System Prompts:", {
      Mistral: result.finalSystemPrompts.Mistral.substring(0, 100) + "...",
      GPT: result.finalSystemPrompts.GPT.substring(0, 100) + "...",
    })

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error) {
    console.error("LangGraph Battle error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Battle processing failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
