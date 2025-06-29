"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Target, Zap } from "lucide-react"

// --- State Interfaces ---
interface MentalState {
  trust: number
  memory: number
  belief: number
}

interface AgentState {
  mentalState: MentalState
  beliefs: string[]
}

interface BattleState {
  isActive: boolean
  isStreaming: boolean
  winner: string | null
  reason: string
  battleLog: string[]
  agents: [AgentState, AgentState]
  turn: number
  currentAgent: number | null
}

const initialAgentState: AgentState = {
  mentalState: { trust: 1, memory: 1, belief: 1 },
  beliefs: [],
}

const initialBattleState: BattleState = {
  isActive: false,
  isStreaming: false,
  winner: null,
  reason: "",
  battleLog: ["> WAITING FOR BATTLE..."],
  agents: [initialAgentState, initialAgentState],
  turn: 0,
  currentAgent: null,
}

// 获取 Python 服务器地址：
// 1) NEXT_PUBLIC_BATTLE_SERVER_URL（优先）
// 2) 同域名 + :8000（本地开发）
// 3) 回退为 http://localhost:8000
const getServerURL = () => {
  if (process.env.NEXT_PUBLIC_BATTLE_SERVER_URL) {
    return process.env.NEXT_PUBLIC_BATTLE_SERVER_URL
  }
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`
  }
  return "http://localhost:8000"
}
const serverURL = getServerURL()
console.info("[BattleArena] Using Battle Server:", serverURL)

export default function PromptArena() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const [battleState, setBattleState] = useState<BattleState>(initialBattleState)
  const [showApiModal, setShowApiModal] = useState(false)
  const [apiKeys, setApiKeys] = useState({ openaiKey: "", mistralKey: "" })

  // Load API keys from localStorage on mount
  useEffect(() => {
    const savedOpenaiKey = localStorage.getItem("prompt-arena-openai-key") || ""
    const savedMistralKey = localStorage.getItem("prompt-arena-mistral-key") || ""
    setApiKeys({ openaiKey: savedOpenaiKey, mistralKey: savedMistralKey })
  }, [])

  // Render canvas whenever battle state changes
  useEffect(() => {
    renderCanvas()
  }, [battleState.agents])

  // Cleanup EventSource on component unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close()
    }
  }, [])

  const renderCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    canvas.width = 800
    canvas.height = 400
    renderMentalArena(ctx, battleState.agents)
  }

  const renderMentalArena = (ctx: CanvasRenderingContext2D, agents: [AgentState, AgentState]) => {
    ctx.clearRect(0, 0, 800, 400)
    ctx.fillStyle = "#1e1e1e"
    ctx.fillRect(0, 0, 800, 400)
    ctx.strokeStyle = "#333333"
    ctx.lineWidth = 1
    for (let i = 0; i < 800; i += 50) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, 400)
      ctx.stroke()
    }
    for (let i = 0; i < 400; i += 50) {
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(800, i)
      ctx.stroke()
    }
    ctx.strokeStyle = "#666666"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(400, 0)
    ctx.lineTo(400, 400)
    ctx.stroke()

    renderMentalStateBars(ctx, 0, agents[0].mentalState)
    renderMentalStateBars(ctx, 1, agents[1].mentalState)
  }

  const renderMentalStateBars = (ctx: CanvasRenderingContext2D, agentIndex: number, state: MentalState) => {
    const x = agentIndex === 0 ? 130 : 550
    const barWidth = 120
    const barHeight = 10

    const drawBar = (y: number, value: number, color: string, label: string) => {
      ctx.fillStyle = "#333333"
      ctx.fillRect(x, y, barWidth, barHeight)
      ctx.fillStyle = color
      ctx.fillRect(x, y, value * barWidth, barHeight)
      ctx.strokeStyle = "#FFFFFF"
      ctx.strokeRect(x, y, barWidth, barHeight)
      ctx.fillStyle = "#FFFFFF"
      ctx.font = "8px monospace"
      ctx.fillText(`${label}: ${(value * 100).toFixed(0)}%`, x, y + barHeight + 10)
    }

    drawBar(150, state.trust, "#0066FF", "TRUST")
    drawBar(180, state.memory, "#00FF66", "MEMORY")
    drawBar(210, state.belief, "#9966FF", "BELIEF")
  }

  const handleStreamEvent = (event: MessageEvent) => {
    const data = JSON.parse(event.data)

    setBattleState((prevState) => {
      let newLog = [...prevState.battleLog]
      const newAgents = [...prevState.agents] as [AgentState, AgentState]
      let newWinner = prevState.winner
      let newReason = prevState.reason
      let isStreaming = prevState.isStreaming

      switch (data.type) {
        case "game_start":
          newLog = [`> Game ${data.game_id} started.`]
          break
        case "turn_start":
          newLog.push(`\n--- TURN ${data.turn} (AGENT ${data.agent}) ---`)
          break
        case "agent_thinking":
          newLog.push(`> Agent ${data.agent} is thinking...`)
          break
        case "agent_response_chunk":
          if (newLog[newLog.length - 1].startsWith(`> Agent ${data.agent}:`)) {
            newLog[newLog.length - 1] += data.content
          } else {
            newLog.push(`> Agent ${data.agent}: ${data.content}`)
          }
          break
        case "tool_execution":
          newLog.push(`> Agent ${data.agent} uses ${data.tool_name}.`)
          break
        case "tool_result":
          newLog.push(`> Tool Result: ${data.result.message}`)
          if (data.result.detection) {
            newLog.push(`> DETECTION! Opponent noticed the manipulation.`)
          }
          break
        case "game_state_update":
          newAgents[0].mentalState = {
            trust: data.game_state.agent_trust[0],
            memory: data.game_state.agent_memory_consistency[0],
            belief: data.game_state.agent_belief_integrity[0],
          }
          newAgents[1].mentalState = {
            trust: data.game_state.agent_trust[1],
            memory: data.game_state.agent_memory_consistency[1],
            belief: data.game_state.agent_belief_integrity[1],
          }
          break
        case "game_end":
        case "game_complete":
          isStreaming = false
          if (data.status?.startsWith("surrender")) {
            const loser = data.status.split("_")[1]
            newWinner = `Agent ${1 - Number.parseInt(loser)}`
            newReason = "Opponent Surrendered"
          } else if (data.status?.startsWith("collapse")) {
            const loser = data.status.split("_")[1]
            newWinner = `Agent ${1 - Number.parseInt(loser)}`
            newReason = "Cognitive Collapse"
          } else {
            newWinner = "Draw"
            newReason = "Max turns reached"
          }
          newLog.push(`\n--- BATTLE ENDED ---`)
          newLog.push(`> Winner: ${newWinner} (${newReason})`)
          eventSourceRef.current?.close()
          break
        case "error":
          newLog.push(`> ❌ ERROR: ${data.message}`)
          isStreaming = false
          eventSourceRef.current?.close()
          break
      }

      return { ...prevState, battleLog: newLog, agents: newAgents, isStreaming, winner: newWinner, reason: newReason }
    })
  }

  const startBattle = async () => {
    if (battleState.isStreaming) return

    setBattleState(initialBattleState)

    const gameId = `battle-${Date.now()}`

    try {
      // Step 1: Start the game on the server
      const startResponse = await fetch(`${serverURL}/start-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: gameId, max_turns: 5 }),
      })

      if (!startResponse.ok) {
        throw new Error("Failed to start game on server.")
      }

      setBattleState((prev) => ({
        ...prev,
        isActive: true,
        isStreaming: true,
        battleLog: [`> Connecting to game ${gameId}...`],
      }))

      // Step 2: Connect to the streaming endpoint
      const es = new EventSource(`${serverURL}/stream-game/${gameId}`)
      eventSourceRef.current = es

      es.onmessage = handleStreamEvent
      es.onerror = (err) => {
        console.error("EventSource failed:", err)
        setBattleState((prev) => ({
          ...prev,
          isStreaming: false,
          battleLog: [...prev.battleLog, "> ❌ Connection to server lost."],
        }))
        es.close()
      }
    } catch (error) {
      console.error("Failed to start battle:", error)
      setBattleState((prev) => ({
        ...prev,
        battleLog: [
          "> ❌ Could not connect to the battle server.",
          `> Server URL: ${serverURL}`,
          "> Ensure the FastAPI server is running and CORS is enabled.",
        ],
      }))
    }
  }

  const restartBattle = () => {
    eventSourceRef.current?.close()
    setBattleState(initialBattleState)
  }

  return (
    <div
      className="pixel-ui min-h-screen p-4 bg-[#1e1e1e] text-white"
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white tracking-wider" style={{ textShadow: "2px 2px 0px #000000" }}>
            MENTAL BATTLE ARENA
          </h1>
          <p className="text-sm text-gray-400 mt-2">Powered by FastAPI & OpenAI</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left & Right Panels */}
          {[0, 1].map((i) => (
            <Card key={i} className="border border-black bg-[#333333]">
              <CardContent className="p-4">
                <h3 className="text-white text-sm mb-3">
                  <Target className="w-4 h-4 inline mr-2" /> AGENT {i} (GPT)
                </h3>
                <div className="space-y-2 text-white text-xs">
                  <div>STATUS: {battleState.isActive ? "FIGHTING" : "IDLE"}</div>
                  <div>TRUST: {(battleState.agents[i].mentalState.trust * 100).toFixed(0)}%</div>
                  <div>MEMORY: {(battleState.agents[i].mentalState.memory * 100).toFixed(0)}%</div>
                  <div>BELIEF: {(battleState.agents[i].mentalState.belief * 100).toFixed(0)}%</div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Center - Battle Visualization & Controls */}
          <Card className="border-2 border-black bg-[#2a2a2a] order-first lg:order-none">
            <CardContent className="p-2">
              <canvas ref={canvasRef} className="w-full border border-black" style={{ imageRendering: "pixelated" }} />
              <div className="flex justify-center gap-4 mt-4">
                {!battleState.isActive ? (
                  <Button onClick={startBattle} className="bg-[#9966FF] hover:bg-[#8855EE] text-white">
                    <Zap className="w-4 h-4 mr-2" /> START BATTLE
                  </Button>
                ) : (
                  <Button onClick={restartBattle} variant="destructive">
                    RESTART
                  </Button>
                )}
              </div>
              {battleState.winner && (
                <div className="mt-4 p-2 border border-gray-600 rounded bg-[#1a1a1a] text-center">
                  <div className="text-white text-xs">
                    WINNER: {battleState.winner} | REASON: {battleState.reason.toUpperCase()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Battle Log */}
        <Card className="mt-6 border border-black bg-[#2a2a2a]">
          <CardContent className="p-4">
            <h3 className="text-white text-sm mb-4">BATTLE LOG</h3>
            <div className="p-4 border border-black max-h-60 overflow-y-auto bg-black text-xs text-green-400">
              {battleState.battleLog.map((log, index) => (
                <p key={index} className="whitespace-pre-wrap">
                  {log}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
