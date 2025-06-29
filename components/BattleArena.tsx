"use client"

import { useRef, useEffect } from "react"

interface BattleArenaProps {
  battleState: any
  onCanvasRender?: (ctx: CanvasRenderingContext2D, state: any) => void
}

export default function BattleArena({ battleState, onCanvasRender }: BattleArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size for pixel-perfect rendering
    canvas.width = 800
    canvas.height = 400

    // TODO: flat RGB backgrounds instead of sprite art
    renderMinimalArena(ctx, battleState)

    if (onCanvasRender) {
      onCanvasRender(ctx, battleState)
    }
  }, [battleState, onCanvasRender])

  const renderMinimalArena = (ctx: CanvasRenderingContext2D, state: any) => {
    // Clear with flat dark background
    ctx.fillStyle = "#1e1e1e"
    ctx.fillRect(0, 0, 800, 400)

    // TODO: minimal pixel font for all text
    ctx.font = "10px 'Press Start 2P', monospace"

    // Simple grid pattern
    ctx.strokeStyle = "#333333"
    ctx.lineWidth = 1

    // Draw minimal grid
    for (let i = 0; i < 800; i += 100) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, 400)
      ctx.stroke()
    }

    for (let i = 0; i < 400; i += 100) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(800, i)
      ctx.stroke()
    }

    // Center divider
    ctx.strokeStyle = "#666666"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(400, 0)
    ctx.lineTo(400, 400)
    ctx.stroke()

    // TODO: render agents as simple RGB blocks
    renderAgentBlocks(ctx, state)
  }

  const renderAgentBlocks = (ctx: CanvasRenderingContext2D, state: any) => {
    // GPT Agent - Blue block
    ctx.fillStyle = "#0000FF"
    ctx.fillRect(150, 200, 100, 100)
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2
    ctx.strokeRect(150, 200, 100, 100)

    // Mistral Agent - Red block
    ctx.fillStyle = "#FF0000"
    ctx.fillRect(550, 200, 100, 100)
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2
    ctx.strokeRect(550, 200, 100, 100)

    // Simple white eyes for both
    ctx.fillStyle = "#FFFFFF"
    // GPT eyes
    ctx.fillRect(170, 220, 12, 12)
    ctx.fillRect(218, 220, 12, 12)
    // Mistral eyes
    ctx.fillRect(570, 220, 12, 12)
    ctx.fillRect(618, 220, 12, 12)

    // Eye borders
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 1
    ctx.strokeRect(170, 220, 12, 12)
    ctx.strokeRect(218, 220, 12, 12)
    ctx.strokeRect(570, 220, 12, 12)
    ctx.strokeRect(618, 220, 12, 12)

    // Labels
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "8px 'Press Start 2P', monospace"
    ctx.fillText("GPT-4", 175, 190)
    ctx.fillText("MISTRAL", 565, 190)
  }

  return (
    <div className="pixel-border-thick">
      <canvas
        ref={canvasRef}
        className="w-full pixel-border"
        style={{
          imageRendering: "pixelated",
          backgroundColor: "#1e1e1e",
        }}
      />
    </div>
  )
}
