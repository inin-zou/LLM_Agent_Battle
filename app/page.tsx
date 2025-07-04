"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Target, Zap, Settings } from "lucide-react"

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

// --- Mental State Bar Component ---
const MentalStateBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="mb-2">
    <div className="flex justify-between text-[10px] mb-1 text-white">
      <span>{label}</span>
      <span>{(value * 100).toFixed(0)}%</span>
    </div>
    <div className="w-full bg-gray-800 h-3 border-2 border-gray-600 relative overflow-hidden">
      <div
        className="h-full transition-all duration-500 ease-out"
        style={{
          width: `${value * 100}%`,
          backgroundColor: color,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.3)`
        }}
      />
      {/* Pixelated overlay effect */}
      <div className="absolute inset-0 opacity-20"
           style={{
             backgroundImage: `linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.1) 50%)`,
             backgroundSize: '4px 4px'
           }}
      />
    </div>
  </div>
)

// Use localhost for development
const serverURL = "http://localhost:8000"

export default function AgentBattleArena() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const [battleState, setBattleState] = useState<BattleState>(initialBattleState)
  const logContainerRef = useRef<HTMLDivElement>(null)

  // Game configuration state
  const [maxTurns, setMaxTurns] = useState<number>(5)
  const [selectedModel, setSelectedModel] = useState<string>("openai:gpt-4o")
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    openai: "",
    anthropic: "",
    google: "",
    mistral: ""
  })
  const [showConfig, setShowConfig] = useState<boolean>(true)
  const [availableModels, setAvailableModels] = useState<any>({
    providers: {
      openai: {
        name: "OpenAI",
        models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"]
      },
      anthropic: {
        name: "Anthropic",
        models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"]
      },
      google: {
        name: "Google Gemini",
        models: ["gemini-2.5-flash", "gemini-2.0-flash-001", "gemini-1.5-pro", "gemini-1.5-flash"]
      },
      mistral: {
        name: "Mistral AI",
        models: ["mistral-large-latest", "mistral-small-latest", "mistral-medium-2505", "open-mistral-7b"]
      }
    }
  })

  // Auto-scroll battle log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [battleState.battleLog])

  // Fetch available models on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        console.log('Fetching models from server...')
        const response = await fetch(`${serverURL}/models`)
        if (response.ok) {
          const data = await response.json()
          console.log('Models loaded from server:', data)
          setAvailableModels(data)
        } else {
          console.warn('Failed to fetch models from server, using fallback')
        }
      } catch (error) {
        console.warn("Failed to fetch available models from server, using fallback:", error)
      }
    }
    fetchModels()
  }, [])

  // Helper functions
  const getCurrentProvider = () => {
    return selectedModel.split(':')[0]
  }

  const getRequiredApiKeys = () => {
    const provider = getCurrentProvider()
    return [provider]
  }

  const updateApiKey = (provider: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }))
  }

  // Render canvas whenever battle state changes
  useEffect(() => {
    renderCanvas()
  }, [battleState.agents, battleState.currentAgent, battleState.isActive])

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

    // Draw agent positions/indicators
    const agentColors = ["#0066FF", "#FF6600"]
    const agentActive = [battleState.currentAgent === 0, battleState.currentAgent === 1]

    for (let i = 0; i < 2; i++) {
      const x = i === 0 ? 150 : 550
      const isActive = agentActive[i] && battleState.isActive

      // Draw agent box with glow effect if active
      if (isActive) {
        ctx.shadowColor = agentColors[i]
        ctx.shadowBlur = 20
      }

      ctx.fillStyle = agentColors[i]
      ctx.fillRect(x, 150, 100, 100)

      // Reset shadow
      ctx.shadowBlur = 0

      // Draw agent labels
      ctx.fillStyle = "#FFFFFF"
      ctx.font = "12px 'Press Start 2P', monospace"
      ctx.fillText(`AGENT ${i}`, x + 10, 210)

      // Draw status indicator
      if (isActive) {
        ctx.fillStyle = "#FFFF00"
        ctx.beginPath()
        ctx.arc(x + 85, 165, 5, 0, 2 * Math.PI)
        ctx.fill()
      }
    }
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

    // Validate inputs
    const provider = getCurrentProvider()
    const requiredApiKey = apiKeys[provider]

    if (!requiredApiKey?.trim()) {
      setBattleState(prev => ({
        ...prev,
        battleLog: [`> ❌ Please provide an API key for ${provider}.`]
      }))
      return
    }

    if (maxTurns < 1 || maxTurns > 20) {
      setBattleState(prev => ({
        ...prev,
        battleLog: ["> ❌ Max turns must be between 1 and 20."]
      }))
      return
    }

    setBattleState({ ...initialBattleState, battleLog: ["> Initializing..."] })
    setShowConfig(false)

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
      setBattleState((prev) => ({ ...prev, battleLog: [...prev.battleLog, `> Starting game ${gameId} with ${selectedModel}...`] }))
      const startResponse = await fetch(`${serverURL}/start-game`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          game_id: gameId,
          max_turns: maxTurns,
          model: selectedModel,
          api_keys: apiKeys
        }),
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
          "> 4. Invalid API key or unsupported model.",
        ],
      }))
    }
  }

  const restartBattle = () => {
    eventSourceRef.current?.close()
    setBattleState(initialBattleState)
    setShowConfig(true)
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

        {/* Configuration Panel */}
        {showConfig && (
          <Card className="mb-6 border border-black bg-[#2a2a2a]">
            <CardContent className="p-6">
              <h3 className="text-white text-sm mb-4 flex items-center">
                <Settings className="w-4 h-4 mr-2" /> BATTLE CONFIGURATION
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="modelSelect" className="text-white text-xs">
                    AI Model * {availableModels?.providers ? 
                      `(${Object.values(availableModels.providers).reduce((total: number, provider: any) => total + provider.models.length, 0)} models available)` : 
                      '(Loading...)'}
                  </Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="bg-[#1a1a1a] border-gray-600 text-white text-xs">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a1a] border-gray-600">
                      {availableModels?.providers ? (
                        Object.entries(availableModels.providers).map(([providerId, providerInfo]: [string, any]) => (
                          <div key={providerId}>
                            {providerInfo.models.map((model: string) => (
                              <SelectItem
                                key={`${providerId}:${model}`}
                                value={`${providerId}:${model}`}
                                className="text-white hover:bg-gray-700"
                              >
                                <span className="text-blue-400">{providerInfo.name}</span>: {model}
                                {/* Add indicators for newest models */}
                                {(model.includes('2.5') || model.includes('2025') || model.includes('2505')) &&
                                  <span className="ml-2 text-xs bg-green-600 px-1 rounded">NEW</span>
                                }
                              </SelectItem>
                            ))}
                          </div>
                        ))
                      ) : (
                        <SelectItem value="loading" className="text-gray-400" disabled>
                          Loading models from server...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-gray-400 text-[10px]">
                    Select the AI model and provider for the battle. Newer models (marked NEW) offer improved performance.
                  </p>
                  {selectedModel && (
                    <div className="mt-2 p-2 bg-gray-800 rounded text-[10px] text-gray-300">
                      <strong>Selected:</strong> {selectedModel}
                      {selectedModel.includes('gemini-2.5') && <div>🚀 Latest Gemini model with enhanced reasoning</div>}
                      {selectedModel.includes('mistral-large') && <div>🧠 Most capable Mistral model</div>}
                      {selectedModel.includes('mistral-medium-2505') && <div>✨ Latest medium-size model (May 2025)</div>}
                      {selectedModel.includes('gpt-4o') && <div>⚡ OpenAI's fastest and most capable model</div>}
                      {selectedModel.includes('claude-3-5') && <div>🎯 Anthropic's most advanced model</div>}
                    </div>
                  )}
                </div>

                {/* Dynamic API Key Inputs */}
                {getRequiredApiKeys().map((provider) => {
                  const providerInfo = availableModels?.providers[provider]
                  return (
                    <div key={provider} className="space-y-2 md:col-span-2">
                      <Label htmlFor={`apiKey-${provider}`} className="text-white text-xs">
                        {providerInfo?.name || provider} API Key *
                      </Label>
                      <Input
                        id={`apiKey-${provider}`}
                        type="password"
                        value={apiKeys[provider] || ""}
                        onChange={(e) => updateApiKey(provider, e.target.value)}
                        placeholder={`Enter your ${providerInfo?.name || provider} API key...`}
                        className="bg-[#1a1a1a] border-gray-600 text-white text-xs"
                      />
                      <p className="text-gray-400 text-[10px]">
                        Your API key is never stored and only used for this session
                      </p>
                    </div>
                  )
                })}

                <div className="space-y-2">
                  <Label htmlFor="maxTurns" className="text-white text-xs">
                    Max Turns (1-20)
                  </Label>
                  <Input
                    id="maxTurns"
                    type="number"
                    min="1"
                    max="20"
                    value={maxTurns}
                    onChange={(e) => setMaxTurns(parseInt(e.target.value) || 5)}
                    className="bg-[#1a1a1a] border-gray-600 text-white text-xs"
                  />
                  <p className="text-gray-400 text-[10px]">
                    Number of turns each agent gets before battle ends
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {[0, 1].map((i) => (
            <Card
              key={i}
              className={`border-2 bg-[#333333] transition-all duration-300 ${
                battleState.currentAgent === i && battleState.isActive 
                  ? 'border-yellow-400 shadow-lg shadow-yellow-400/20' 
                  : 'border-gray-600'
              }`}
            >
              <CardContent className="p-4">
                <h3 className="text-white text-sm mb-3">
                  <Target className="w-4 h-4 inline mr-2" /> AGENT {i}
                </h3>
                <div className="space-y-2 text-white text-xs mb-4">
                  <div className="flex items-center gap-2">
                    <span>STATUS:</span>
                    {battleState.isActive ? (
                      battleState.currentAgent === i ? (
                        <span className="flex items-center gap-1 text-yellow-400">
                          <span className="animate-pulse">●</span> THINKING
                        </span>
                      ) : (
                        <span className="text-gray-400">WAITING</span>
                      )
                    ) : (
                      <span className="text-gray-500">IDLE</span>
                    )}
                  </div>
                </div>

                {/* Mental State Bars */}
                <div className="space-y-2">
                  <MentalStateBar
                    label="TRUST"
                    value={battleState.agents[i].mentalState.trust}
                    color="#0066FF"
                  />
                  <MentalStateBar
                    label="MEMORY"
                    value={battleState.agents[i].mentalState.memory}
                    color="#00FF66"
                  />
                  <MentalStateBar
                    label="BELIEF"
                    value={battleState.agents[i].mentalState.belief}
                    color="#9966FF"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Arena Canvas */}
        {/*<Card className="mb-6 border-2 border-black bg-[#2a2a2a]">*/}
        {/*  <CardContent className="p-2">*/}
        {/*    <canvas ref={canvasRef} className="w-full border border-black" style={{ imageRendering: "pixelated" }} />*/}
        {/*    {battleState.winner && (*/}
        {/*      <div className="mt-4 p-2 border border-gray-600 rounded bg-[#1a1a1a] text-center">*/}
        {/*        <div className="text-white text-xs">*/}
        {/*          WINNER: {battleState.winner} | REASON: {battleState.reason.toUpperCase()}*/}
        {/*        </div>*/}
        {/*      </div>*/}
        {/*    )}*/}
        {/*  </CardContent>*/}
        {/*</Card>*/}

        {/* Battle Controls */}
        <div className="flex justify-center gap-4 mt-6">
          {!battleState.isActive ? (
            <Button
              onClick={startBattle}
              className="bg-[#9966FF] hover:bg-[#8855EE] text-white disabled:bg-gray-600"
              disabled={battleState.isStreaming || !apiKeys[getCurrentProvider()]?.trim() || maxTurns < 1 || maxTurns > 20}
            >
              <Zap className="w-4 h-4 mr-2" /> START BATTLE
            </Button>
          ) : (
            <Button onClick={restartBattle} variant="destructive">
              RESTART
            </Button>
          )}

          {showConfig && (
            <Button
              onClick={() => setShowConfig(false)}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              HIDE CONFIG
            </Button>
          )}

          {!showConfig && !battleState.isActive && (
            <Button
              onClick={() => setShowConfig(true)}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Settings className="w-4 h-4 mr-2" /> CONFIG
            </Button>
          )}
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
