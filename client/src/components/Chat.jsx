import { useState, useEffect, useRef } from 'react'

export default function Chat({ socket, roomId, user }) {
  const [messages, setMessages] = useState([
    { id: 1, system: true, text: 'This chat is end-to-end encrypted.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ])
  const [input, setInput] = useState('')
  const bottomRef = useRef()

  useEffect(() => {
    if (!socket) return
    const handleMsg = (message) => {
      setMessages(prev => [...prev, { ...message, own: message.senderId === user.id }])
    }
    socket.on('chat-message', handleMsg)
    return () => socket.off('chat-message', handleMsg)
  }, [socket, user.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    if (!input.trim()) return
    const message = {
      id:       Date.now(),
      sender:   user.name,
      senderId: user.id,
      initials: user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
      color:    '#7c6bff',
      text:     input.trim(),
      time:     new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      own:      true
    }
    // Show it locally right away, then broadcast to the room
    setMessages(prev => [...prev, message])
    if (socket) socket.emit('chat-message', { roomId, message })
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 bg-[#111118] border-b border-purple-900/20 flex items-center gap-3">
        <span className="text-base">💬</span>
        <span className="font-bold text-sm" style={{ fontFamily: 'Syne, sans-serif' }}>Room Chat</span>
        <span className="ml-auto text-xs text-teal-400 flex items-center gap-1">🔒 Encrypted</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map(m => (
          <div key={m.id} className={`flex gap-2 ${m.own ? 'flex-row-reverse' : ''}`}>
            {!m.system && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: m.color + '20', color: m.color, fontFamily: 'Syne, sans-serif' }}>
                {m.initials}
              </div>
            )}
            <div className={`max-w-xs rounded-xl px-3 py-2 text-sm
              ${m.system ? 'bg-teal-900/20 border border-teal-800/30 text-teal-400 text-xs mx-auto'
                : m.own ? 'bg-purple-600/20 border border-purple-700/30'
                : 'bg-[#18181f] border border-purple-900/20'}`}>
              {!m.own && !m.system && <div className="text-xs text-gray-500 mb-1 font-medium">{m.sender}</div>}
              <div className="text-gray-200 leading-relaxed">{m.text}</div>
              {!m.system && <div className="text-xs text-gray-600 mt-1 flex items-center gap-1">{m.time} · 🔒</div>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 bg-[#111118] border-t border-purple-900/20 flex items-center gap-2">
        <input
          className="flex-1 bg-[#18181f] border border-purple-900/20 rounded-xl px-4 py-2.5 text-sm
            text-white placeholder-gray-600 outline-none focus:border-purple-500 transition-colors"
          placeholder="Send an encrypted message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button onClick={send}
          className="w-10 h-10 bg-purple-600 hover:bg-purple-500 rounded-xl flex items-center justify-center
            text-white transition-all hover:shadow-lg hover:shadow-purple-900/40">
          ➤
        </button>
      </div>
    </div>
  )
}
