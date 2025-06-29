"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X, Key, Eye, EyeOff } from "lucide-react"

interface ApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (keys: { openaiKey: string; mistralKey: string }) => void
  currentKeys: { openaiKey: string; mistralKey: string }
}

export default function ApiKeyModal({ isOpen, onClose, onSave, currentKeys }: ApiKeyModalProps) {
  const [openaiKey, setOpenaiKey] = useState(currentKeys.openaiKey)
  const [mistralKey, setMistralKey] = useState(currentKeys.mistralKey)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [showMistralKey, setShowMistralKey] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Save API keys to localStorage for persistence
      localStorage.setItem("prompt-arena-openai-key", openaiKey)
      localStorage.setItem("prompt-arena-mistral-key", mistralKey)

      onSave({ openaiKey, mistralKey })
      onClose()
    } catch (error) {
      console.error("Failed to save API keys:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset to current values
    setOpenaiKey(currentKeys.openaiKey)
    setMistralKey(currentKeys.mistralKey)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-75" onClick={handleCancel} />

      {/* Modal */}
      <Card
        className="relative w-full max-w-md mx-4 border-2 border-white"
        style={{
          backgroundColor: "#2a2a2a",
          fontFamily: "'Press Start 2P', monospace",
        }}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-white" />
              <CardTitle className="text-white text-sm" style={{ fontFamily: "'Press Start 2P', monospace" }}>
                API KEYS CONFIG
              </CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={handleCancel} className="text-white hover:bg-gray-700 p-1">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* OpenAI API Key */}
          <div className="space-y-2">
            <Label
              htmlFor="openai-key"
              className="text-white text-xs"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              OPENAI API KEY
            </Label>
            <div className="relative">
              <Input
                id="openai-key"
                type={showOpenaiKey ? "text" : "password"}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-..."
                className="bg-black border-white text-white text-xs pr-10"
                style={{ fontFamily: "monospace" }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                onClick={() => setShowOpenaiKey(!showOpenaiKey)}
              >
                {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Mistral API Key */}
          <div className="space-y-2">
            <Label
              htmlFor="mistral-key"
              className="text-white text-xs"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              MISTRAL API KEY
            </Label>
            <div className="relative">
              <Input
                id="mistral-key"
                type={showMistralKey ? "text" : "password"}
                value={mistralKey}
                onChange={(e) => setMistralKey(e.target.value)}
                placeholder="..."
                className="bg-black border-white text-white text-xs pr-10"
                style={{ fontFamily: "monospace" }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 text-gray-400 hover:text-white"
                onClick={() => setShowMistralKey(!showMistralKey)}
              >
                {showMistralKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Info Text */}
          <div className="text-gray-400 text-xs leading-relaxed">
            <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "8px" }}>
              Keys are stored locally in your browser and sent securely to the battle API.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1 border-white text-white hover:bg-gray-700 text-xs bg-transparent"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              CANCEL
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || (!openaiKey.trim() && !mistralKey.trim())}
              className="flex-1 bg-green-600 hover:bg-green-700 text-black text-xs"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              {isSaving ? "SAVING..." : "SAVE"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
