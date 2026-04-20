'use client'

export default function ChatInput() {
  return (
    <input
      data-testid="chat-input"
      type="text"
      placeholder="Ask your AI assistant..."
      disabled
      className="w-full bg-bg-primary text-text-primary text-sm rounded-lg px-3 py-2 border border-border-subtle disabled:opacity-50 font-sans"
    />
  )
}
