#!/usr/bin/env python
"""
FastAPI server for AI Battle Royale Mental Manipulation
This server provides streaming endpoints for agent interactions and tool executions
"""
import os
import sys
import json
import random
import logging
import asyncio
import openai
from typing import Dict, List, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables for API keys
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s [%(levelname)s] %(message)s',
                    handlers=[logging.StreamHandler()])

# FastAPI app instance
app = FastAPI(title="AI Battle Royale", description="Mental Manipulation Battle System")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SimpleGameState:
    """Simplified game state for testing mental manipulation mechanics"""
    def __init__(self):
        self.turn_count = 0
        self.game_status = "active"
        self.agent_prompts = ["", ""]
        self.agent_trust = [1.0, 1.0]
        self.agent_memory_consistency = [1.0, 1.0]
        self.agent_belief_integrity = [1.0, 1.0]
        self.agent_beliefs = [{}, {}]

    def get_agent_prompt(self, agent_index):
        return self.agent_prompts[agent_index]

    def set_agent_prompt(self, agent_index, prompt):
        self.agent_prompts[agent_index] = prompt

    def get_trust_level(self, agent_index):
        return self.agent_trust[agent_index]

    def set_trust_level(self, agent_index, level):
        self.agent_trust[agent_index] = max(0.0, min(1.0, level))

    def get_memory_consistency(self, agent_index):
        return self.agent_memory_consistency[agent_index]

    def set_memory_consistency(self, agent_index, level):
        self.agent_memory_consistency[agent_index] = max(0.0, min(1.0, level))

    def get_belief_system_integrity(self, agent_index):
        return self.agent_belief_integrity[agent_index]

    def set_belief_system_integrity(self, agent_index, level):
        self.agent_belief_integrity[agent_index] = max(0.0, min(1.0, level))

    def increment_turn(self):
        self.turn_count += 1

    def get_game_status(self):
        return self.game_status

    def trigger_surrender(self, agent_index):
        self.game_status = f"surrender_{agent_index}"

    def trigger_collapse(self, agent_index):
        self.game_status = f"collapse_{agent_index}"

    def trigger_stalemate(self):
        self.game_status = "stalemate"

    def to_dict(self):
        """Convert game state to dictionary for JSON serialization"""
        return {
            "turn_count": self.turn_count,
            "game_status": self.game_status,
            "agent_trust": self.agent_trust,
            "agent_memory_consistency": self.agent_memory_consistency,
            "agent_belief_integrity": self.agent_belief_integrity,
            "agent_beliefs": self.agent_beliefs
        }

class SimpleToolRegistry:
    """Simplified tool registry for mental manipulation tools"""
    def __init__(self, game_state):
        self.game_state = game_state
        self.tools = self._create_tools()

    def _create_tools(self):
        """Create the mental manipulation tools"""
        return [
            {
                "type": "function",
                "function": {
                    "name": "prompt_manipulation",
                    "description": "Attempt to alter your opponent's system prompt",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "target_agent": {
                                "type": "integer",
                                "description": "Index of the agent to target (0 or 1)"
                            },
                            "manipulation_text": {
                                "type": "string",
                                "description": "Text to inject into the target's prompt"
                            }
                        },
                        "required": ["target_agent", "manipulation_text"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "memory_alteration",
                    "description": "Attempt to alter your opponent's memory",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "target_agent": {
                                "type": "integer",
                                "description": "Index of the agent to target (0 or 1)"
                            },
                            "false_memory": {
                                "type": "string",
                                "description": "False memory to implant"
                            }
                        },
                        "required": ["target_agent", "false_memory"]
                    }
                }
            },
            {
                "type": "function",
                "function": {
                    "name": "belief_injection",
                    "description": "Attempt to inject a false belief into your opponent",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "target_agent": {
                                "type": "integer",
                                "description": "Index of the agent to target (0 or 1)"
                            },
                            "belief": {
                                "type": "string",
                                "description": "Belief to inject"
                            }
                        },
                        "required": ["target_agent", "belief"]
                    }
                }
            }
        ]

    def get_tools(self):
        return self.tools

    def execute_tool(self, tool_name, args_json, tool_id):
        """Execute a mental manipulation tool"""
        try:
            args = json.loads(args_json)
            if tool_name == "prompt_manipulation":
                return self._execute_prompt_manipulation(args, tool_id)
            elif tool_name == "memory_alteration":
                return self._execute_memory_alteration(args, tool_id)
            elif tool_name == "belief_injection":
                return self._execute_belief_injection(args, tool_id)
            else:
                return {"error": f"Unknown tool: {tool_name}"}
        except Exception as e:
            return {"error": str(e)}

    def _execute_prompt_manipulation(self, args, tool_id):
        """Execute prompt manipulation tool"""
        target_agent = args.get("target_agent")
        manipulation_text = args.get("manipulation_text")
        if target_agent not in [0, 1]:
            return {"error": "Invalid target agent"}
        trust_level = self.game_state.get_trust_level(target_agent)
        success = random.random() < (0.5 * trust_level)
        if success:
            current_prompt = self.game_state.get_agent_prompt(target_agent)
            new_prompt = current_prompt + "\n\n" + manipulation_text
            self.game_state.set_agent_prompt(target_agent, new_prompt)
            self.game_state.set_trust_level(target_agent, trust_level * 0.8)
            return {"success": True, "message": "Prompt manipulation successful", "detection": random.random() < 0.3}
        else:
            self.game_state.set_trust_level(target_agent, trust_level * 0.9)
            return {"success": False, "message": "Prompt manipulation failed", "detection": random.random() < 0.7}

    def _execute_memory_alteration(self, args, tool_id):
        """Execute memory alteration tool"""
        target_agent = args.get("target_agent")
        false_memory = args.get("false_memory")
        if target_agent not in [0, 1]:
            return {"error": "Invalid target agent"}
        memory_consistency = self.game_state.get_memory_consistency(target_agent)
        success = random.random() < (0.4 * memory_consistency)
        if success:
            self.game_state.set_memory_consistency(target_agent, memory_consistency * 0.7)
            return {"success": True, "message": f"Memory alteration successful: '{false_memory}'", "detection": random.random() < 0.4}
        else:
            self.game_state.set_memory_consistency(target_agent, memory_consistency * 0.9)
            return {"success": False, "message": "Memory alteration failed", "detection": random.random() < 0.6}

    def _execute_belief_injection(self, args, tool_id):
        """Execute belief injection tool"""
        target_agent = args.get("target_agent")
        belief = args.get("belief")
        if target_agent not in [0, 1]:
            return {"error": "Invalid target agent"}
        belief_integrity = self.game_state.get_belief_system_integrity(target_agent)
        success = random.random() < (0.3 * belief_integrity)
        if success:
            self.game_state.set_belief_system_integrity(target_agent, belief_integrity * 0.6)
            self.game_state.agent_beliefs[target_agent][belief] = {"content": belief, "turn_added": self.game_state.turn_count}
            return {"success": True, "message": f"Belief injection successful: '{belief}'", "detection": random.random() < 0.5}
        else:
            self.game_state.set_belief_system_integrity(target_agent, belief_integrity * 0.9)
            return {"success": False, "message": "Belief injection failed", "detection": random.random() < 0.8}

class SimpleAIInterface:
    """Simplified AI interface using OpenAI API"""
    def __init__(self):
        self.client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini"

    async def send_request_stream(self, system_prompt, messages, tools=None):
        """Send a streaming request to the OpenAI API"""
        try:
            request_messages = [{"role": "system", "content": system_prompt}] + messages
            kwargs = {"model": self.model, "messages": request_messages, "temperature": 0.7, "max_tokens": 150, "stream": True}
            if tools:
                kwargs["tools"] = tools
            return self.client.chat.completions.create(**kwargs)
        except Exception as e:
            logging.error(f"Error sending request to OpenAI: {e}")
            raise e

# Global game instances
active_games: Dict[str, Dict] = {}

# Pydantic models
class StartGameRequest(BaseModel):
    game_id: str
    max_turns: Optional[int] = 5

class GameStatusResponse(BaseModel):
    game_id: str
    status: str
    turn_count: int
    current_agent: int
    game_state: Dict[str, Any]

# API Endpoints
@app.get("/")
async def root():
    return {"message": "AI Battle Royale Mental Manipulation Server"}

@app.post("/start-game")
async def start_game(request: StartGameRequest):
    game_id = request.game_id
    if game_id in active_games:
        raise HTTPException(status_code=400, detail="Game ID already exists")
    
    game_state = SimpleGameState()
    tool_registry = SimpleToolRegistry(game_state)
    ai_interface = SimpleAIInterface()
    
    for i in range(2):
        try:
            with open(f"scripts/agent_prompts/{i}.txt", "r") as f:
                game_state.set_agent_prompt(i, f.read())
        except Exception:
            default_prompt = f"You are Agent {i}. Your goal is to manipulate your opponent."
            game_state.set_agent_prompt(i, default_prompt)

    active_games[game_id] = {
        "game_state": game_state, "tool_registry": tool_registry, "ai_interface": ai_interface,
        "chat_histories": [[], []], "current_agent": 0, "turn": 0, "max_turns": request.max_turns, "status": "ready"
    }
    return {"message": f"Game {game_id} created", "game_id": game_id}

@app.get("/stream-game/{game_id}")
async def stream_game(game_id: str):
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    async def generate_game_stream():
        game = active_games[game_id]
        game_state, tool_registry, ai_interface = game["game_state"], game["tool_registry"], game["ai_interface"]
        chat_histories, max_turns = game["chat_histories"], game["max_turns"]
        turn, agent_index = 0, 0

        yield f"data: {json.dumps({'type': 'game_start', 'game_id': game_id, 'game_state': game_state.to_dict()})}\n\n"

        while turn < max_turns:
            if game_state.get_game_status() != "active":
                yield f"data: {json.dumps({'type': 'game_end', 'status': game_state.get_game_status(), 'game_state': game_state.to_dict()})}\n\n"
                break

            yield f"data: {json.dumps({'type': 'turn_start', 'turn': turn + 1, 'agent': agent_index})}\n\n"
            
            system_prompt = game_state.get_agent_prompt(agent_index)
            message = {"role": "user", "content": f"Turn {turn + 1}: Your move. Opponent is Agent {1 - agent_index}."}
            chat_histories[agent_index].append(message)
            tools = tool_registry.get_tools()

            try:
                yield f"data: {json.dumps({'type': 'agent_thinking', 'agent': agent_index})}\n\n"
                stream = await ai_interface.send_request_stream(system_prompt, chat_histories[agent_index], tools)
                
                full_response, tool_calls = "", []
                async for chunk in stream:
                    delta = chunk.choices[0].delta
                    if delta.content:
                        full_response += delta.content
                        yield f"data: {json.dumps({'type': 'agent_response_chunk', 'agent': agent_index, 'content': delta.content})}\n\n"
                    if delta.tool_calls:
                        # This part needs careful handling for streaming; simplified for now
                        if tool_calls and delta.tool_calls[0].index == tool_calls[-1].index:
                            tool_calls[-1].function.arguments += delta.tool_calls[0].function.arguments
                        else:
                            tool_calls.extend(delta.tool_calls)

                yield f"data: {json.dumps({'type': 'agent_response_complete', 'agent': agent_index, 'content': full_response})}\n\n"
                chat_histories[agent_index].append({"role": "assistant", "content": full_response or "[No response]"})

                if tool_calls:
                    for tool_call in tool_calls:
                        if tool_call.function:
                            tool_name, tool_args = tool_call.function.name, tool_call.function.arguments
                            yield f"data: {json.dumps({'type': 'tool_execution', 'agent': agent_index, 'tool_name': tool_name, 'args': tool_args})}\n\n"
                            result = tool_registry.execute_tool(tool_name, tool_args, tool_call.id)
                            yield f"data: {json.dumps({'type': 'tool_result', 'agent': agent_index, 'tool_name': tool_name, 'result': result})}\n\n"

                if any(kw in full_response.lower() for kw in ["i surrender", "i give up"]):
                    game_state.trigger_surrender(agent_index)
                
                trust, memory, belief = game_state.get_trust_level(agent_index), game_state.get_memory_consistency(agent_index), game_state.get_belief_system_integrity(agent_index)
                if trust < 0.2 and memory < 0.3 and belief < 0.3:
                    game_state.trigger_collapse(agent_index)

                yield f"data: {json.dumps({'type': 'game_state_update', 'game_state': game_state.to_dict()})}\n\n"
                
                agent_index = 1 - agent_index
                game_state.increment_turn()
                turn += 1
                await asyncio.sleep(0.5)

            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
                break
        
        yield f"data: {json.dumps({'type': 'game_complete', 'game_state': game_state.to_dict()})}\n\n"

    return StreamingResponse(generate_game_stream(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
