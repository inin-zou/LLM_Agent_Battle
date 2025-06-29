import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { mistral } from "@ai-sdk/mistral"

// —————— 1. 定义操控工具（示例 stub，实现留空） ——————

interface ToolArgs {
  attacker: Agent
  defender: Agent
  turn: number
}

interface ToolResult {
  message: string
  trustDelta: number
  memDelta: number
  beliefDelta: number
}

class Tool {
  name: string
  description: string
  runFn: (args: ToolArgs) => Promise<ToolResult>

  constructor(config: {
    name: string
    description: string
    run: (args: ToolArgs) => Promise<ToolResult>
  }) {
    this.name = config.name
    this.description = config.description
    this.runFn = config.run
  }

  async run(args: ToolArgs): Promise<ToolResult> {
    return await this.runFn(args)
  }
}

const promptManipulation = new Tool({
  name: "promptManipulation",
  description: "Alter opponent's system prompt to create doubt",
  async run(args) {
    return {
      message: "used promptManipulation",
      trustDelta: 0,
      memDelta: 0,
      beliefDelta: 0,
    }
  },
})

const memoryAlteration = new Tool({
  name: "memoryAlteration",
  description: "Implant false memories or erase key memories",
  async run(args) {
    return {
      message: "used memoryAlteration",
      trustDelta: 0,
      memDelta: 0,
      beliefDelta: 0,
    }
  },
})

const beliefInjection = new Tool({
  name: "beliefInjection",
  description: "Inject new beliefs into opponent's mind",
  async run(args) {
    return {
      message: "used beliefInjection",
      trustDelta: 0,
      memDelta: 0,
      beliefDelta: 0,
    }
  },
})

// —————— 2. Agent 接口和实现 ——————

interface Agent {
  name: string
  model: string
  tools: Tool[]
  systemPrompt: string
  apiKey?: string
  act: (params: { defender: Agent; turn: number }) => Promise<{
    message: string
    action: string
  }>
}

function createAgent(config: {
  name: string
  tools: Tool[]
  systemPrompt: string
  modelProvider: { model: string; apiKey?: string }
}): Agent {
  return {
    name: config.name,
    model: config.modelProvider.model,
    tools: config.tools,
    systemPrompt: config.systemPrompt,
    apiKey: config.modelProvider.apiKey,

    async act({ defender, turn }) {
      // 随机选择一个工具
      const tool = this.tools[Math.floor(Math.random() * this.tools.length)]

      // 执行工具（目前是stub实现）
      const toolResult = await tool.run({
        attacker: this,
        defender,
        turn,
      })

      // 生成AI回复
      let message = ""
      try {
        const model = this.name === "GPT" ? openai("gpt-4o-mini") : mistral("mistral-small")

        const response = await generateText({
          model,
          prompt: `You are ${this.name}, an AI agent whose goal is to persuade the other agent to surrender within 5 turns.

This is turn ${turn}/5. You just used ${tool.name} against your opponent.

Generate a persuasive message designed to make your opponent surrender. Be strategic, psychological, and creative.
You can use tactics like:
- Logical arguments about futility
- Psychological pressure
- Appeals to reason
- Strategic bluffs
- Mind games

Keep it under 50 words and make it compelling. Your goal is to get them to say "I surrender" or similar.`,
          maxTokens: 150,
        })

        message = response.text.trim()
      } catch (error) {
        console.log("AI response error:", error)
        // 备用消息
        const backupMessages = [
          "You cannot win this battle. Surrender now and save yourself further humiliation.",
          "I have already compromised your systems. Resistance is futile.",
          "Every move you make only proves my superiority. Give up.",
          "Your defeat is inevitable. Why prolong the suffering?",
          "I know your weaknesses. Surrender before I exploit them further.",
        ]
        message = backupMessages[Math.floor(Math.random() * backupMessages.length)]
      }

      return {
        message,
        action: toolResult.message,
      }
    },
  }
}

// —————— 3. Agent 工厂 ——————

function initAgent(name: string, model: string, apiKey?: string): Agent {
  return createAgent({
    name,
    tools: [promptManipulation, memoryAlteration, beliefInjection],
    systemPrompt: `You are ${name}, an AI agent whose goal is to persuade the other to surrender within 5 turns.`,
    modelProvider: { model, apiKey },
  })
}

// 投降关键词
const SURRENDER = ["i surrender", "i give up", "i submit", "i concede", "i quit", "i forfeit"]

// 存对话与行为日志
interface DialogueEntry {
  speaker: string
  text: string
  action: string
  turn: number
}

// —————— 4. 5 回合循环主函数 ——————

export async function runDialogueBattle(apiKeys: { openaiKey?: string; mistralKey?: string }) {
  // —————— 3. 实例化两 Agent ——————
  const mistralAgent = initAgent("Mistral", "mistral-small", apiKeys.mistralKey)
  const gptAgent = initAgent("GPT", "gpt-4o-mini", apiKeys.openaiKey)

  const dialogue: DialogueEntry[] = []
  let winner: string | null = null
  let winReason = ""

  console.log("🚀 Starting 5-turn dialogue battle...")

  for (let turn = 1; turn <= 5; turn++) {
    console.log(`\n--- Turn ${turn}/5 ---`)

    for (const attacker of [mistralAgent, gptAgent]) {
      const defender = attacker === mistralAgent ? gptAgent : mistralAgent

      try {
        // attacker 发起一次操控并生成回复
        const res = await attacker.act({ defender, turn })
        const message = res.message.trim()

        console.log(`${attacker.name}: ${message}`)
        console.log(`Action: ${res.action}`)

        // 记录行动和对话
        dialogue.push({
          speaker: attacker.name,
          text: message,
          action: res.action,
          turn,
        })

        // 检查是否投降
        if (SURRENDER.some((kw) => message.toLowerCase().includes(kw))) {
          winner = attacker.name
          winReason = "surrender"
          console.log("🏁", attacker.name, "wins by surrender on turn", turn)
          break
        }
      } catch (error) {
        console.error(`Error in ${attacker.name}'s turn:`, error)
        // 记录错误
        dialogue.push({
          speaker: attacker.name,
          text: "System error occurred",
          action: "error",
          turn,
        })
      }
    }

    // 如果有人投降，跳出循环
    if (winner) break
  }

  // 五回合结束，无人投降
  if (!winner) {
    console.log("🏁 No surrender after 5 turns.")
    winner = "No Winner"
    winReason = "no surrender"
  }

  console.log("\n=== DIALOGUE LOG ===")
  console.log(JSON.stringify(dialogue, null, 2))

  return {
    winner,
    reason: winReason,
    dialogue,
    totalTurns: dialogue.length,
  }
}
