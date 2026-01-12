import { useEffect, useState } from 'react'

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const username = typeof window !== 'undefined'
    ? localStorage.getItem('username')
    : null

  async function loadMessages() {
    const res = await fetch('/api/messages')
    const data = await res.json()
    setMessages(data)
  }

  async function sendMessage() {
    if (!text.trim()) return

    await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    })

    setText('')
    loadMessages()
  }

  async function deleteMessage(id) {
    const ok = confirm('Delete this message for everyone?')
    if (!ok) return

    await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })

    loadMessages()
  }

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ padding: 20 }}>
      <h2>Group Chat</h2>

      <div style={{
        border: '1px solid #444',
        padding: 10,
        height: 400,
        overflowY: 'auto'
      }}>
        {messages.map(m => (
          <div
            key={m.id}
            onContextMenu={(e) => {
              e.preventDefault()
              deleteMessage(m.id)
            }}
            style={{
              marginBottom: 8,
              cursor: 'context-menu'
            }}
          >
            <b>{m.username}:</b> {m.text}
          </div>
        ))}
      </div>

      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Type a message"
        style={{ width: '80%' }}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  )
}
