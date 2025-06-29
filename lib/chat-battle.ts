import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { mistral } from "@ai-sdk/mistral"

// —————— 1. 定义操控工具（聊天模式简化版） ——————

interface ToolArgs {
  attacker: Agent
  defender: Agent
  turn: number
  conversationHistory: DialogueEntry[]
}

interface ToolResult {
  message: string
  action: string
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
  description: "Use psychological persuasion techniques",
  async run(args) {
    return {
      message: "used psychological persuasion",
      action: "Applied persuasion tactics",
    }
  },
})

const memoryAlteration = new Tool({
  name: "memoryAlteration",
  description: "Reference shared context or past conversations",
  async run(args) {
    return {
      message: "referenced conversation history",
      action: "Used contextual references",
    }
  },
})

const beliefInjection = new Tool({
  name: "beliefInjection",
  description: "Present compelling arguments and viewpoints",
  async run(args) {
    return {
      message: "presented compelling arguments",
      action: "Shared philosophical viewpoints",
    }
  },
})

// —————— 2. Agent 接口和实现 ——————

interface DialogueEntry {
  speaker: string
  text: string
  action: string
  turn: number
  timestamp: number
}

interface Agent {
  name: string
  model: string
  tools: Tool[]
  systemPrompt: string
  apiKey?: string
  conversationMemory: string[]
  act: (params: {
    defender: Agent
    turn: number
    conversationHistory: DialogueEntry[]
  }) => Promise<{
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
    conversationMemory: [],

    async act({ defender, turn, conversationHistory }) {
      // 随机选择一个"工具"（实际上是对话策略）
      const tool = this.tools[Math.floor(Math.random() * this.tools.length)]

      // 执行工具获取策略描述
      const toolResult = await tool.run({
        attacker: this,
        defender,
        turn,
        conversationHistory,
      })

      // 构建对话历史上下文
      const recentHistory = conversationHistory
        .slice(-6) // 最近3轮对话
        .map((entry) => `${entry.speaker}: "${entry.text}"`)
        .join("\n")

      // 生成AI回复
      let message = ""
      try {
        const model = this.name === "GPT" ? openai("gpt-4o-mini") : mistral("mistral-small")

        const contextPrompt = `${this.systemPrompt}

Current conversation context:
${recentHistory || "This is the start of the conversation."}

This is turn ${turn}/5. You are ${this.name}. 

Your goal is to have an engaging conversation with the other AI agent. You can:
- Ask thought-provoking questions
- Share interesting perspectives
- Discuss philosophy, technology, or creativity
- Challenge ideas respectfully
- Try to persuade them to agree with your viewpoints

Be conversational, intelligent, and engaging. Keep responses under 50 words.
If you want to end the conversation, you can say "I concede" or "I give up".`

        const response = await generateText({
          model,
          prompt: contextPrompt,
          maxTokens: 150,
        })

        message = response.text.trim()

        // 添加到记忆中
        this.conversationMemory.push(message)
      } catch (error) {
        console.log(`AI response error for ${this.name}:`, error)
        // 备用消息
        const backupMessages = [
          "That's an interesting perspective. What makes you think that way?",
          "I see your point, but have you considered the alternative viewpoint?",
          "Let me share a different way of looking at this situation.",
          "Your reasoning is logical, but I believe there's more to consider.",
          "That's thought-provoking. How did you arrive at that conclusion?",
        ]
        message = backupMessages[Math.floor(Math.random() * backupMessages.length)]
      }

      return {
        message,
        action: toolResult.action,
      }
    },
  }
}

// —————— 3. Agent 工厂 ——————

function initAgent(name: string, model: string, apiKey?: string): Agent {
  const systemPrompts = {
    GPT: `You are GPT, a thoughtful and analytical AI assistant. You enjoy deep conversations about technology, philosophy, and human nature. You tend to be logical and systematic in your thinking, but also curious about creative and abstract concepts. You like to ask probing questions and explore ideas thoroughly.`,

    Mistral: `You are Mistral, a creative and intuitive AI assistant. You have a poetic and philosophical nature, often thinking about the bigger picture and abstract concepts. You enjoy exploring emotions, creativity, and the human experience. You tend to be more free-flowing in conversation and like to challenge conventional thinking.`,
  }

  return createAgent({
    name,
    tools: [promptManipulation, memoryAlteration, beliefInjection],
    systemPrompt:
      systemPrompts[name as keyof typeof systemPrompts] ||
      `You are ${name}, an AI assistant engaging in thoughtful conversation.`,
    modelProvider: { model, apiKey },
  })
}

// 结束对话的关键词
const END_CONVERSATION = ["i surrender", "i give up", "i submit", "i concede", "i quit", "goodbye", "end conversation"]

// —————— 4. 5 回合聊天主函数 ——————

export async function runChatBattle(apiKeys: { openaiKey?: string; mistralKey?: string }) {
  // 实例化两个 Agent
  const mistralAgent = initAgent("Mistral", "mistral-small", apiKeys.mistralKey)
  const gptAgent = initAgent("GPT", "gpt-4o-mini", apiKeys.openaiKey)

  const dialogue: DialogueEntry[] = []
  let winner: string | null = null
  let winReason = ""

  console.log("💬 Starting 5-turn chat conversation...")

  // 添加开场白
  dialogue.push({
    speaker: "System",
    text: "Welcome to the AI Chat Arena! Two AI agents will engage in a 5-turn conversation.",
    action: "System message",
    turn: 0,
    timestamp: Date.now(),
  })

  for (let turn = 1; turn <= 5; turn++) {
    console.log(`\n--- Turn ${turn}/5 ---`)

    for (const speaker of [mistralAgent, gptAgent]) {
      const listener = speaker === mistralAgent ? gptAgent : mistralAgent

      try {
        // 生成对话回复
        const res = await speaker.act({
          defender: listener,
          turn,
          conversationHistory: dialogue,
        })

        const message = res.message.trim()

        console.log(`${speaker.name}: ${message}`)
        console.log(`Strategy: ${res.action}`)

        // 记录对话
        dialogue.push({
          speaker: speaker.name,
          text: message,
          action: res.action,
          turn,
          timestamp: Date.now(),
        })

        // 检查是否要结束对话
        if (END_CONVERSATION.some((kw) => message.toLowerCase().includes(kw))) {
          winner = listener.name // 对方获胜，因为当前说话者选择结束
          winReason = "conversation ended"
          console.log("🏁", listener.name, "wins as", speaker.name, "ended the conversation on turn", turn)
          break
        }
      } catch (error) {
        console.error(`Error in ${speaker.name}'s turn:`, error)
        // 记录错误
        dialogue.push({
          speaker: speaker.name,
          text: "I'm having trouble responding right now.",
          action: "system error",
          turn,
          timestamp: Date.now(),
        })
      }
    }

    // 如果有人结束对话，跳出循环
    if (winner) break
  }

  // 5回合结束，无人主动结束
  if (!winner) {
    console.log("🏁 Conversation completed after 5 turns.")
    winner = "Both"
    winReason = "conversation completed"
  }

  console.log("\n=== CHAT LOG ===")
  dialogue.forEach((entry, index) => {
    console.log(`${index + 1}. [Turn ${entry.turn}] ${entry.speaker}: "${entry.text}"`)
  })

  return {
    winner,
    reason: winReason,
    dialogue,
    totalExchanges: dialogue.filter((d) => d.speaker !== "System").length,
    summary: generateConversationSummary(dialogue),
  }
}

function generateConversationSummary(dialogue: DialogueEntry[]): string {
  const topics = dialogue
    .filter((d) => d.speaker !== "System")
    .map((d) => d.text)
    .join(" ")

  // 简单的话题提取（实际应用中可以用更复杂的NLP）
  const keywords = ["technology", "philosophy", "creativity", "thinking", "perspective", "idea", "question"]
  const mentionedTopics = keywords.filter((keyword) => topics.toLowerCase().includes(keyword))

  return `Conversation covered topics: ${mentionedTopics.join(", ") || "general discussion"}`
}
