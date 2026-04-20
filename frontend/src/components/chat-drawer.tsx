'use client'

import ChatInput from '@/components/chat-input'

interface ChatDrawerProps {
  open: boolean
  onToggle: () => void
}

export default function ChatDrawer({ open, onToggle }: ChatDrawerProps) {
  return (
    <div
      data-testid="chat-panel"
      className={
        open
          ? 'fixed right-0 top-12 w-[360px] h-[calc(100vh-48px)] bg-bg-panel z-20 flex flex-col'
          : 'hidden'
      }
      style={
        open
          ? {
              border: '1px solid rgba(125,133,144,0.2)',
              boxShadow: '0 0 0 1px rgba(32,157,215,0.15), 0 0 8px rgba(32,157,215,0.08)',
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between p-4 border-b border-border-subtle">
        <h2 className="text-base font-semibold">AI Assistant</h2>
        <button
          onClick={onToggle}
          className="text-text-muted hover:text-text-primary text-sm"
        >
          Close
        </button>
      </div>
      <div className="flex-1 p-4 overflow-y-auto" />
      <div className="p-4 border-t border-border-subtle">
        <ChatInput />
      </div>
    </div>
  )
}
