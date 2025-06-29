import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { openaiKey, mistralKey } = await request.json()

    // In a real application, you might want to validate the keys
    // by making a test API call to each service

    // For now, we'll just return success
    // The keys will be passed with each battle request
    return NextResponse.json({
      success: true,
      message: "API keys configured successfully",
    })
  } catch (error) {
    console.error("API key configuration error:", error)
    return NextResponse.json({ error: "Failed to configure API keys" }, { status: 500 })
  }
}
