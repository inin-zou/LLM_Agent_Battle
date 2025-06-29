"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface BattleState {
  round: number
  maxRounds: number
  turn: number // Track individual turns within a round
  gptAgent: {
    health: number
    maxHealth: number
    status: string
    isAttacking: boolean
    memory: string[]
  }
  mistralAgent: {
    health: number
    maxHealth: number
    status: string
    isAttacking: boolean
    memory: string[]
  }
  battleLog: string[]
  winner: string | null
  isActive: boolean
}

const initialBattleState: BattleState = {
  round: 0,
  maxRounds: 5,
  turn: 1, // Start with turn 1
  gptAgent: {
    health: 100,
    maxHealth: 100,
    status: "READY",
    isAttacking: false,
    memory: [],
  },
  mistralAgent: {
    health: 100,
    maxHealth: 100,
    status: "READY",
    isAttacking: false,
    memory: [],
  },
  battleLog: [],
  winner: null,
  isActive: false,
}

export default function PromptArena() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [battleState, setBattleState] = useState<BattleState>(() => ({
    ...initialBattleState,
  }))
  const [isLoading, setIsLoading] = useState(false)

  // Initialize canvas and render initial state
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = 800
    canvas.height = 400

    if (battleState) {
      renderArena(ctx, battleState)
    }
  }, [battleState])

  const renderArena = (
    ctx: CanvasRenderingContext2D,
    state?: BattleState, // ← allow undefined
  ) => {
    // Bail out if state isn't ready yet
    if (!state || !state.gptAgent || !state.mistralAgent) return

    // Clear canvas
    ctx.clearRect(0, 0, 800, 400)

    // TODO: flat RGB background instead of sprite art
    renderMinimalBackground(ctx)

    // TODO: render GPT agent as simple RGB block (left side)
    renderGPTAgent(ctx, state.gptAgent)

    // TODO: render Mistral agent as simple RGB block (right side)
    renderMistralAgent(ctx, state.mistralAgent)

    // TODO: flat RGB health bar color
    renderHealthBars(ctx, state)
    // Remove renderEnergyBars call

    // TODO: minimal pixel attack effects
    if (state.gptAgent.isAttacking) {
      renderAttackEffect(ctx, "left")
    }
    if (state.mistralAgent.isAttacking) {
      renderAttackEffect(ctx, "right")
    }
  }

  const renderMinimalBackground = (ctx: CanvasRenderingContext2D) => {
    // Flat dark background
    ctx.fillStyle = "#1e1e1e"
    ctx.fillRect(0, 0, 800, 400)

    // Simple grid lines for minimal pixel aesthetic
    ctx.strokeStyle = "#333333"
    ctx.lineWidth = 1

    // Vertical lines
    for (let i = 0; i < 800; i += 100) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, 400)
      ctx.stroke()
    }

    // Horizontal lines
    for (let i = 0; i < 400; i += 100) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(800, i)
      ctx.stroke()
    }

    // Center divider line
    ctx.strokeStyle = "#666666"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(400, 0)
    ctx.lineTo(400, 400)
    ctx.stroke()
  }

  const renderGPTAgent = (ctx: CanvasRenderingContext2D, agent: any) => {
    // TODO: Load and render actual GPT icon
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      // Clear the area first
      ctx.fillStyle = "#1e1e1e"
      ctx.fillRect(150, 180, 100, 120)

      // Draw the GPT icon with pixel-perfect scaling
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, 150, 200, 100, 100)

      // Add pixel border around the icon
      ctx.strokeStyle = "#FFFFFF"
      ctx.lineWidth = 2
      ctx.strokeRect(150, 200, 100, 100)
    }
    img.src = "/images/gpt-4.png"

    // Agent label with pixel font
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "10px monospace"
    ctx.fillText("GPT-4", 175, 190)
  }

  const renderMistralAgent = (ctx: CanvasRenderingContext2D, agent: any) => {
    // TODO: Load and render actual Mistral icon
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      // Clear the area first
      ctx.fillStyle = "#1e1e1e"
      ctx.fillRect(550, 180, 100, 120)

      // Draw the Mistral icon with pixel-perfect scaling
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, 550, 200, 100, 100)

      // Add pixel border around the icon
      ctx.strokeStyle = "#FFFFFF"
      ctx.lineWidth = 2
      ctx.strokeRect(550, 200, 100, 100)
    }
    img.src = "/images/mistral.png"

    // Agent label with pixel font
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "10px monospace"
    ctx.fillText("MISTRAL", 565, 190)
  }

  const renderHealthBars = (ctx: CanvasRenderingContext2D, state: BattleState) => {
    // TODO: flat RGB health bar color - no gradients

    // GPT Health Bar (left) - solid colors with sharp edges
    ctx.fillStyle = "#333333"
    ctx.fillRect(50, 50, 200, 12)

    // Health fill - bright red
    ctx.fillStyle = "#FF0000"
    const gptHealthWidth = (state.gptAgent.health / state.gptAgent.maxHealth) * 200
    ctx.fillRect(50, 50, gptHealthWidth, 12)

    // Black border
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 1
    ctx.strokeRect(50, 50, 200, 12)

    // Health text with pixel font
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "12px monospace"
    ctx.fillText(`HP ${state.gptAgent.health}/${state.gptAgent.maxHealth}`, 50, 45)

    // Mistral Health Bar (right)
    ctx.fillStyle = "#333333"
    ctx.fillRect(550, 50, 200, 12)

    // Health fill - bright red
    ctx.fillStyle = "#FF0000"
    const mistralHealthWidth = (state.mistralAgent.health / state.mistralAgent.maxHealth) * 200
    ctx.fillRect(550, 50, mistralHealthWidth, 12)

    // Black border
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 1
    ctx.strokeRect(550, 50, 200, 12)

    // Health text
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "12px monospace"
    ctx.fillText(`HP ${state.mistralAgent.health}/${state.mistralAgent.maxHealth}`, 550, 45)
  }

  const renderAttackEffect = (ctx: CanvasRenderingContext2D, side: "left" | "right") => {
    // TODO: minimal pixel attack effects - simple RGB blocks
    ctx.fillStyle = "#00FF00" // Bright green attack effect
    const x = side === "left" ? 300 : 450

    // Simple rectangular attack effect
    ctx.fillRect(x, 240, 50, 20)
    ctx.fillRect(x + 10, 230, 30, 40)

    // Black borders for pixel aesthetic
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 1
    ctx.strokeRect(x, 240, 50, 20)
    ctx.strokeRect(x + 10, 230, 30, 40)
  }

  const startBattle = async () => {
    setBattleState((prev) => ({
      ...prev,
      isActive: true,
      round: 1,
      turn: 1,
      winner: null,
      battleLog: ["BATTLE STARTED - ROUND 1 BEGIN"],
    }))
  }

  const nextTurn = async () => {
    if (!battleState?.isActive || battleState?.winner) return

    setIsLoading(true)

    try {
      // TODO: Call backend API for battle logic
      const response = await fetch("/api/next-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: battleState }),
      })

      const { state: newState } = await response.json()
      setBattleState(newState)
    } catch (error) {
      console.error("Battle turn error:", error)
      // Fallback: simulate a turn locally
      simulateTurn()
    }

    setIsLoading(false)
  }

  const simulateTurn = () => {
    // TODO: Remove this when backend is implemented
    setBattleState((prev) => {
      const damage = Math.floor(Math.random() * 20) + 10
      const isGPTTurn = (prev.turn ?? 1) % 2 === 1

      const newState = { ...prev }
      newState.turn = prev.turn ?? 1

      if (isGPTTurn) {
        newState.gptAgent.isAttacking = true
        newState.mistralAgent.health = Math.max(0, prev.mistralAgent.health - damage)
        newState.battleLog = [...prev.battleLog, `GPT-4 ATTACK ${damage} DMG`]
      } else {
        newState.mistralAgent.isAttacking = true
        newState.gptAgent.health = Math.max(0, prev.gptAgent.health - damage)
        newState.battleLog = [...prev.battleLog, `MISTRAL ATTACK ${damage} DMG`]
      }

      // Check for winner
      if (newState.gptAgent.health <= 0) {
        newState.winner = "MISTRAL"
        newState.isActive = false
      } else if (newState.mistralAgent.health <= 0) {
        newState.winner = "GPT-4"
        newState.isActive = false
      } else {
        // Advance turn
        newState.turn += 1

        // Check if round is complete (both agents have attacked)
        if (newState.turn % 2 === 1) {
          // Round completed, advance round counter
          newState.round += 1
          newState.battleLog = [...newState.battleLog, `--- ROUND ${newState.round} BEGIN ---`]

          // Check if max rounds reached
          if (newState.round > newState.maxRounds) {
            const winner = newState.gptAgent.health > newState.mistralAgent.health ? "GPT-4" : "MISTRAL"
            newState.winner = winner
            newState.isActive = false
          }
        }
      }

      // Reset attack animations after a delay
      setTimeout(() => {
        setBattleState((current) => ({
          ...current,
          gptAgent: { ...current.gptAgent, isAttacking: false },
          mistralAgent: { ...current.mistralAgent, isAttacking: false },
        }))
      }, 500)

      return newState
    })
  }

  const resetBattle = () => {
    setBattleState({
      ...initialBattleState,
      battleLog: ["BATTLE READY - AGENTS RESET"],
    })
  }

  const restartBattle = () => {
    setBattleState((prev) => ({
      ...prev,
      // Reset agents to initial state
      gptAgent: {
        ...initialBattleState.gptAgent,
      },
      mistralAgent: {
        ...initialBattleState.mistralAgent,
      },
      // Reset battle state but keep some info
      round: 0,
      turn: 1,
      winner: null,
      isActive: false,
      battleLog: ["AGENTS RESET - READY FOR NEW BATTLE"],
    }))
  }

  // Get current turn info for display
  const getCurrentTurnInfo = () => {
    if (!battleState?.isActive) return ""
    const isGPTTurn = (battleState.turn ?? 1) % 2 === 1
    return isGPTTurn ? "GPT-4's Turn" : "MISTRAL's Turn"
  }

  return (
    <div
      className="pixel-ui min-h-screen p-4"
      style={{
        fontFamily: "'Press Start 2P', monospace",
        backgroundColor: "#1e1e1e",
        color: "#ffffff",
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Minimalist Header */}
        <div className="text-center mb-6">
          <h1
            className="text-4xl font-bold text-white mb-4 tracking-wider"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              textShadow: "2px 2px 0px #000000",
            }}
          >
            PROMPT ARENA
          </h1>
          <div className="flex justify-center gap-4 mb-4">
            <Badge
              className="text-white text-sm px-3 py-1 border border-black"
              style={{
                backgroundColor: "#FF0000",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "8px",
              }}
            >
              ROUND {battleState?.round ?? 0}/{battleState?.maxRounds ?? 5}
            </Badge>
            {battleState?.isActive && (
              <Badge
                className="text-white text-sm px-3 py-1 border border-black"
                style={{
                  backgroundColor: "#0000FF",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "8px",
                }}
              >
                {getCurrentTurnInfo()}
              </Badge>
            )}
            {battleState?.winner && (
              <Badge
                className="text-black text-sm px-3 py-1 border border-black"
                style={{
                  backgroundColor: "#00FF00",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "8px",
                }}
              >
                {battleState.winner} WINS
              </Badge>
            )}
          </div>
        </div>

        {/* Main Battle Arena */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left Panel - GPT Status */}
          <Card className="border border-black" style={{ backgroundColor: "#333333" }}>
            <CardContent className="p-4">
              <h3 className="text-white text-sm mb-3" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                GPT-4
              </h3>
              <div className="space-y-2 text-white text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                <div>STATUS: {battleState?.gptAgent.status ?? "–"}</div>
                <div>HP: {battleState?.gptAgent.health ?? 0}/100</div>
                {/* Remove EN line */}
              </div>
            </CardContent>
          </Card>

          {/* Center - Canvas Battle Area */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-black" style={{ backgroundColor: "#2a2a2a" }}>
              <CardContent className="p-2">
                <canvas
                  ref={canvasRef}
                  className="w-full border border-black"
                  style={{ imageRendering: "pixelated" }}
                />

                {/* Battle Controls with RGB button styling */}
                <div className="flex justify-center gap-4 mt-4">
                  {!battleState?.isActive && !battleState?.winner ? (
                    <button
                      onClick={startBattle}
                      className="px-4 py-2 border border-black text-black text-xs"
                      style={{
                        backgroundColor: "#00FF00",
                        fontFamily: "'Press Start 2P', monospace",
                      }}
                    >
                      START BATTLE
                    </button>
                  ) : battleState.winner ? (
                    <button
                      onClick={restartBattle}
                      className="px-4 py-2 border border-black text-white text-xs"
                      style={{
                        backgroundColor: "#FF6600",
                        fontFamily: "'Press Start 2P', monospace",
                      }}
                    >
                      RESTART BATTLE
                    </button>
                  ) : (
                    <button
                      onClick={nextTurn}
                      disabled={isLoading}
                      className="px-4 py-2 border border-black text-white text-xs"
                      style={{
                        backgroundColor: isLoading ? "#666666" : "#FF0000",
                        fontFamily: "'Press Start 2P', monospace",
                      }}
                    >
                      {isLoading ? "FIGHTING..." : "NEXT TURN"}
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Mistral Status */}
          <Card className="border border-black" style={{ backgroundColor: "#333333" }}>
            <CardContent className="p-4">
              <h3 className="text-white text-sm mb-3" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                MISTRAL
              </h3>
              <div className="space-y-2 text-white text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                <div>STATUS: {battleState?.mistralAgent.status ?? "–"}</div>
                <div>HP: {battleState?.mistralAgent.health ?? 0}/100</div>
                {/* Remove EN line */}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Battle Log */}
        <Card className="mt-6 border border-black" style={{ backgroundColor: "#2a2a2a" }}>
          <CardContent className="p-4">
            <h3 className="text-white text-sm mb-4" style={{ fontFamily: "'Press Start 2P', monospace" }}>
              BATTLE LOG
            </h3>
            <div className="p-4 border border-black max-h-32 overflow-y-auto" style={{ backgroundColor: "#000000" }}>
              {battleState?.battleLog?.map((log, index) => (
                <div
                  key={index}
                  className="text-green-400 text-xs mb-1"
                  style={{ fontFamily: "'Press Start 2P', monospace" }}
                >
                  &gt; {log}
                </div>
              ))}
              {(battleState?.battleLog?.length ?? 0) === 0 && (
                <div className="text-gray-500 text-xs" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                  &gt; WAITING FOR BATTLE...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
