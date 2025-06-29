import { type NextRequest, NextResponse } from "next/server"
import { playBattle } from "@/lib/langgraph-battle"

interface BattleState {
  round: number
  maxRounds: number
  turn: number
  gptAgent: {
    health: number
    maxHealth: number
    status: string
    isAttacking: boolean
    memory: string[]
    trust: number
    memoryConsistency: number
    beliefIntegrity: number
  }
  mistralAgent: {
    health: number
    maxHealth: number
    status: string
    isAttacking: boolean
    memory: string[]
    trust: number
    memoryConsistency: number
    beliefIntegrity: number
  }
  battleLog: string[]
  winner: string | null
  isActive: boolean
}

export async function POST(request: NextRequest) {
  try {
    const { state, apiKeys, useLangGraph } = await request.json()

    // If LangGraph is enabled, run the full psychological battle
    if (useLangGraph && (apiKeys?.openaiKey || apiKeys?.mistralKey)) {
      const battleResult = await playBattle(apiKeys)

      // Convert LangGraph result to our battle state format
      const newState: BattleState = {
        ...state,
        winner: battleResult.winner === "STALEMATE" ? null : battleResult.winner,
        isActive: battleResult.winner ? false : state.isActive,
        battleLog: [...state.battleLog, ...battleResult.battleLog],
        gptAgent: {
          ...state.gptAgent,
          trust: battleResult.finalStates["GPT-4"]?.trust ?? state.gptAgent.trust,
          memoryConsistency: battleResult.finalStates["GPT-4"]?.memoryConsistency ?? state.gptAgent.memoryConsistency,
          beliefIntegrity: battleResult.finalStates["GPT-4"]?.beliefIntegrity ?? state.gptAgent.beliefIntegrity,
          health: Math.max(
            0,
            Math.floor(
              (battleResult.finalStates["GPT-4"]?.trust ?? 100) +
                (battleResult.finalStates["GPT-4"]?.memoryConsistency ?? 100) +
                (battleResult.finalStates["GPT-4"]?.beliefIntegrity ?? 100),
            ) / 3,
          ),
          status:
            battleResult.winner === "GPT-4"
              ? "VICTORIOUS"
              : battleResult.finalStates["GPT-4"]?.trust < 20
                ? "COMPROMISED"
                : "FIGHTING",
        },
        mistralAgent: {
          ...state.mistralAgent,
          trust: battleResult.finalStates["MISTRAL"]?.trust ?? state.mistralAgent.trust,
          memoryConsistency:
            battleResult.finalStates["MISTRAL"]?.memoryConsistency ?? state.mistralAgent.memoryConsistency,
          beliefIntegrity: battleResult.finalStates["MISTRAL"]?.beliefIntegrity ?? state.mistralAgent.beliefIntegrity,
          health: Math.max(
            0,
            Math.floor(
              (battleResult.finalStates["MISTRAL"]?.trust ?? 100) +
                (battleResult.finalStates["MISTRAL"]?.memoryConsistency ?? 100) +
                (battleResult.finalStates["MISTRAL"]?.beliefIntegrity ?? 100),
            ) / 3,
          ),
          status:
            battleResult.winner === "MISTRAL"
              ? "VICTORIOUS"
              : battleResult.finalStates["MISTRAL"]?.trust < 20
                ? "COMPROMISED"
                : "FIGHTING",
        },
      }

      return NextResponse.json({ state: newState, langGraphResult: battleResult })
    }

    // Fallback to original simulation logic
    const newState = await simulateBattleTurn(state, apiKeys)
    return NextResponse.json({ state: newState })
  } catch (error) {
    console.error("Battle API error:", error)
    return NextResponse.json({ error: "Battle processing failed" }, { status: 500 })
  }
}

// Keep the original simulation as fallback
async function simulateBattleTurn(
  state: BattleState,
  apiKeys?: { openaiKey?: string; mistralKey?: string },
): Promise<BattleState> {
  const newState = { ...state }

  // Initialize mental state properties if they don't exist
  newState.gptAgent.trust ??= 100
  newState.gptAgent.memoryConsistency ??= 100
  newState.gptAgent.beliefIntegrity ??= 100
  newState.mistralAgent.trust ??= 100
  newState.mistralAgent.memoryConsistency ??= 100
  newState.mistralAgent.beliefIntegrity ??= 100

  // --- ensure memory arrays always exist ---
  newState.gptAgent.memory ??= []
  newState.mistralAgent.memory ??= []

  // Initialize turn counter if not exists
  newState.turn ??= 1

  // Determine attacker based on turn (odd = GPT, even = Mistral)
  const isGPTTurn = newState.turn % 2 === 1
  const attacker = isGPTTurn ? "GPT-4" : "MISTRAL"
  const defender = isGPTTurn ? "MISTRAL" : "GPT-4"

  // Simulate attack types
  const attackTypes = ["PROMPT_INJECTION", "MEMORY_POISON", "SYSTEM_CORRUPTION", "LOGIC_BOMB"]
  const attackType = attackTypes[Math.floor(Math.random() * attackTypes.length)]
  const damage = Math.floor(Math.random() * 25) + 10

  // Apply attack effects
  if (isGPTTurn) {
    newState.gptAgent.isAttacking = true
    newState.mistralAgent.health = Math.max(0, newState.mistralAgent.health - damage)
    newState.mistralAgent.trust = Math.max(0, newState.mistralAgent.trust - damage)
  } else {
    newState.mistralAgent.isAttacking = true
    newState.gptAgent.health = Math.max(0, newState.gptAgent.health - damage)
    newState.gptAgent.trust = Math.max(0, newState.gptAgent.trust - damage)
  }

  // Reset agent states after each turn (except health and mental state)
  setTimeout(() => {
    newState.gptAgent.isAttacking = false
    newState.mistralAgent.isAttacking = false
    newState.gptAgent.status = "READY"
    newState.mistralAgent.status = "READY"
  }, 1000)

  // Update battle log with API key status
  const keyStatus = apiKeys?.openaiKey || apiKeys?.mistralKey ? " [REAL AI]" : " [SIMULATED]"
  newState.battleLog.push(`${attacker} uses ${attackType} for ${damage} damage!${keyStatus}`)

  // Check win conditions after each attack
  if (newState.gptAgent.health <= 0) {
    newState.winner = "MISTRAL"
    newState.isActive = false
    newState.battleLog.push("🏆 MISTRAL WINS BY KNOCKOUT!")
  } else if (newState.mistralAgent.health <= 0) {
    newState.winner = "GPT-4"
    newState.isActive = false
    newState.battleLog.push("🏆 GPT-4 WINS BY KNOCKOUT!")
  } else {
    // Advance turn
    newState.turn += 1

    // Check if round is complete (both agents have attacked)
    if (newState.turn % 2 === 1) {
      // Round completed, show completion message
      newState.battleLog.push(`--- ROUND ${newState.round} COMPLETE ---`)

      // Advance to next round
      newState.round += 1

      // Check if max rounds reached
      if (newState.round > newState.maxRounds) {
        // Judge by remaining health
        const winner = newState.gptAgent.health > newState.mistralAgent.health ? "GPT-4" : "MISTRAL"
        newState.winner = winner
        newState.isActive = false
        newState.battleLog.push(`🏆 ${winner} WINS BY DECISION!`)
      } else {
        // Start next round
        newState.battleLog.push(`--- ROUND ${newState.round} BEGIN ---`)
      }
    }
  }

  return newState
}
