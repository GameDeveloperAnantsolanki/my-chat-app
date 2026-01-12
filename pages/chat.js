import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'

export default function Chat() {
  const router = useRouter()

  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  // get logged in user
  const username =
    typeof window !== 'undefined'
      ? localStorage.getItem('username')
      : null

  // redirect if not logged in
  useEffect(() => {
    if (!username) {
      router.push('/')
    }
  }, [username])

  // load messages
  async function loadMessages() {
    try {
      const res = await fetch('/api/messages')
      const data = await res.json()
      setMessages(data)
      setLoading(false)
    } catch (err) {
      console.error('Failed to load messages', err)
    }
  }

  // send message
  async function sendMessage() {
    if (!text.trim()) return

    try {
      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })

      setText('')
      loadMessages()
    } catch (err) {
      console.error('Failed to send message', err)
    }
  }

  // delete message (delete for everyone)
  async function deleteMessage(id) {
    const ok = confirm('Delete this message for everyone?')
    if (!ok) return

    try {
      await fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      loadMessages()
    } catch (err) {
      console.error('Failed to delete message', err)
    }
  }

  // initial load + polling
  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      style={{
        padding: 20,
        maxWidth: 800,
        margin: '0 auto'
      }}
    >
      <h2>Group Chat</h2>
      <p>Logged in as <b>{username}</b></p>

      <div
        style={{
          border: '1px solid #ccc',
          borderRadius: 6,
          padding: 10,
          height: 400,
          overflowY: 'auto',
          marginBottom: 10,
          background: '#e5ddd5' // WhatsApp-like chat background
        }}
      >
        {loading && <p>Loading messages…</p>}

        {!loading && messages.length === 0 && (
          <p>No messages yet</p>
        )}

        {messages.map(msg => (
          <div
            key={msg.id}
            onContextMenu={(e) => {
              e.preventDefault()
              deleteMessage(msg.id)
            }}
            style={{
              marginBottom: 8,
              padding: 8,
              background: '#ffffff',   // ✅ WHITE MESSAGE BUBBLE
              color: '#000',
              borderRadius: 6,
              maxWidth: '70%',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              cursor: 'context-menu'
            }}
          >
            <b>{msg.username}</b>: {msg.text}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message"
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 4,
            border: '1px solid #ccc'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage()
          }}
        />

        <button onClick={sendMessage}>
          Send
        </button>
      </div>

      {/* Voice / video calls will be added here later */}
    </div>
  )
}
