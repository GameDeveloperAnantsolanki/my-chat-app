import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'

export default function Chat() {
  const router = useRouter()

  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  const longPressTimer = useRef(null)

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
        body: JSON.stringify({
          text,
          username
        })
      })

      setText('')
      loadMessages()
    } catch (err) {
      console.error('Failed to send message', err)
    }
  }

  // delete message
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

  // long press (mobile)
  function handleTouchStart(id) {
    longPressTimer.current = setTimeout(() => {
      deleteMessage(id)
    }, 500)
  }

  function handleTouchEnd() {
    clearTimeout(longPressTimer.current)
  }

  // polling
  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
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
          background: '#e5ddd5'
        }}
      >
        {loading && <p>Loading messages…</p>}

        {!loading && messages.length === 0 && (
          <p>No messages yet</p>
        )}

        {messages.map(msg => {
          // 🇮🇳 FORCE INDIA TIME (Asia/Kolkata)
          const time = new Date(msg.created_at).toLocaleTimeString(
            'en-IN',
            {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }
          )

          return (
            <div
              key={msg.id}
              onContextMenu={(e) => {
                e.preventDefault()
                deleteMessage(msg.id)
              }}
              onTouchStart={() => handleTouchStart(msg.id)}
              onTouchEnd={handleTouchEnd}
              style={{
                marginBottom: 8,
                padding: 8,
                background: '#ffffff',
                color: '#000',
                borderRadius: 6,
                maxWidth: '70%',
                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                cursor: 'context-menu'
              }}
            >
              <div>
                <b>{msg.username}</b>: {msg.text}
              </div>

              <div
                style={{
                  fontSize: 10,
                  color: '#555',
                  marginTop: 4
                }}
              >
                {time}
              </div>
            </div>
          )
        })}
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

        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  )
}
