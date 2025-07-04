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
  agents: [JSON.parse(JSON.stringify(initialAgentState)), JSON.parse(JSON.stringify(initialAgentState))],
  turn: 0,
  currentAgent: null,
}

// Use the confirmed API URL
const serverURL = "https://isolated-beth-filipp-4ded91ea.koyeb.app"

export default function AgentBattleArena() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const [battleState, setBattleState] = useState<BattleState>(initialBattleState)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll battle log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [battleState.battleLog])

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
      ctx.font = "8px 'Press Start 2P', monospace"
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
      const newAgents: [AgentState, AgentState] = [
        JSON.parse(JSON.stringify(prevState.agents[0])),
        JSON.parse(JSON.stringify(prevState.agents[1])),
      ]
      let newWinner = prevState.winner
      let newReason = prevState.reason
      let isStreaming = prevState.isStreaming
      let currentAgent = prevState.currentAgent
      let turn = prevState.turn

      const formatLog = (log: string) => `[T-${turn}] AGENT ${currentAgent}: ${log}`

      switch (data.type) {
        case "game_start":
          newLog = [`> Game ${data.game_id} started. Connecting to stream...`]
          break
        case "turn_start":
          currentAgent = data.agent
          turn = data.turn
          newLog.push(`\n--- TURN ${turn} (AGENT ${currentAgent}) ---`)
          break
        case "agent_thinking":
          newLog.push(formatLog("Thinking..."))
          break
        case "agent_response_chunk":
          const lastLog = newLog[newLog.length - 1]
          if (lastLog && lastLog.startsWith(formatLog(""))) {
            newLog[newLog.length - 1] += data.content
          } else {
            newLog.push(formatLog(data.content))
          }
          break
        case "tool_execution":
          if (data.tool_name) {
            newLog.push(formatLog(`uses TOOL: ${data.tool_name}`))
          }
          break
        case "tool_result":
          if (data.result && data.result.message) {
            newLog.push(`> TOOL RESULT: ${data.result.message}`)
            if (data.result.detection) {
              newLog.push(`> DETECTION! Opponent noticed the manipulation.`)
            }
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
            newWinner = `Agent ${1 - Number.parseInt(loser, 10)}`
            newReason = "Opponent Surrendered"
          } else if (data.status?.startsWith("collapse")) {
            const loser = data.status.split("_")[1]
            newWinner = `Agent ${1 - Number.parseInt(loser, 10)}`
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
          newLog.push(`> ❌ SERVER ERROR: ${data.message}`)
          isStreaming = false
          eventSourceRef.current?.close()
          break
      }

      return {
        ...prevState,
        battleLog: newLog,
        agents: newAgents,
        isStreaming,
        winner: newWinner,
        reason: newReason,
        currentAgent,
        turn,
      }
    })
  }

  const startBattle = async () => {
    if (battleState.isStreaming) return

    setBattleState({ ...initialBattleState, battleLog: ["> Initializing..."] })

    const gameId = `battle-${Date.now()}`

    try {
      // Step 1: Health check to verify server is reachable and CORS is OK.
      setBattleState((prev) => ({ ...prev, battleLog: [`> Pinging server at ${serverURL}...`] }))
      const healthCheckResponse = await fetch(serverURL)
      if (!healthCheckResponse.ok) {
        throw new Error(`Server health check failed with status: ${healthCheckResponse.status}`)
      }
      const serverInfo = await healthCheckResponse.json()
      console.log("Server info:", serverInfo)
      setBattleState((prev) => ({ ...prev, battleLog: [...prev.battleLog, `> Server online: ${serverInfo.message}`] }))

      // Step 2: Start the game.
      setBattleState((prev) => ({ ...prev, battleLog: [...prev.battleLog, `> Starting game ${gameId}...`] }))
      const startResponse = await fetch(`${serverURL}/start-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: gameId, max_turns: 5 }),
      })

      if (!startResponse.ok) {
        const errorData = await startResponse.json().catch(() => ({ detail: "Unknown server error." }))
        throw new Error(errorData.detail || "Failed to start game on server.")
      }

      // Step 3: Connect to the streaming endpoint.
      setBattleState((prev) => ({
        ...prev,
        isActive: true,
        isStreaming: true,
        battleLog: [`> Game started. Connecting to event stream...`],
      }))

      const es = new EventSource(`${serverURL}/stream-game/${gameId}`)
      eventSourceRef.current = es

      es.onmessage = handleStreamEvent
      es.onerror = (err) => {
        console.error("EventSource connection error:", err)
        setBattleState((prev) => ({
          ...prev,
          isStreaming: false,
          winner: prev.winner || "Error",
          reason: prev.reason || "Stream Disconnected",
          battleLog: [
            ...prev.battleLog,
            "\n--- CONNECTION LOST ---",
            "> ❌ Lost connection to the battle server.",
            "> The stream was interrupted. Please restart the battle.",
          ],
        }))
        es.close()
      }
    } catch (error: any) {
      console.error("Failed to start battle:", error)
      setBattleState((prev) => ({
        ...prev,
        isActive: false,
        isStreaming: false,
        battleLog: [
          "> ❌ Battle initialization failed.",
          `> URL: ${serverURL}`,
          `> Error: ${error.message}`,
          "> Possible causes:",
          "> 1. The backend server is down or has an error.",
          "> 2. A browser extension is blocking the request.",
          "> 3. The server's CORS policy is misconfigured.",
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
            Agent Battle Arena
          </h1>
          <p className="text-sm text-gray-400 mt-2">Mental Manipulation Battle</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[0, 1].map((i) => (
            <Card key={i} className="border border-black bg-[#333333]">
              <CardContent className="p-4">
                <h3 className="text-white text-sm mb-3">
                  <Target className="w-4 h-4 inline mr-2" /> AGENT {i}
                </h3>
                <div className="space-y-2 text-white text-xs">
                  <div>
                    STATUS: {battleState.isActive ? (battleState.currentAgent === i ? "THINKING" : "WAITING") : "IDLE"}
                  </div>
                  <div>TRUST: {(battleState.agents[i].mentalState.trust * 100).toFixed(0)}%</div>
                  <div>MEMORY: {(battleState.agents[i].mentalState.memory * 100).toFixed(0)}%</div>
                  <div>BELIEF: {(battleState.agents[i].mentalState.belief * 100).toFixed(0)}%</div>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card className="border-2 border-black bg-[#2a2a2a] order-first lg:order-none">
            <CardContent className="p-2">
              <canvas ref={canvasRef} className="w-full border border-black" style={{ imageRendering: "pixelated" }} />
              <div className="flex justify-center gap-4 mt-4">
                {!battleState.isActive ? (
                  <Button
                    onClick={startBattle}
                    className="bg-[#9966FF] hover:bg-[#8855EE] text-white"
                    disabled={battleState.isStreaming}
                  >
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

        <Card className="mt-6 border border-black bg-[#2a2a2a]">
          <CardContent className="p-4">
            <h3 className="text-white text-sm mb-4">BATTLE LOG</h3>
            <div
              ref={logContainerRef}
              className="p-4 border border-black h-60 overflow-y-auto bg-black text-xs text-green-400"
            >
              {battleState.battleLog.map((log, index) => (
                <p key={index} className="whitespace-pre-wrap leading-relaxed">
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
