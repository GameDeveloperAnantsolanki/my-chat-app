import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const chatEndRef = useRef(null)

  const user =
    typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('user'))
      : null

  // ---------------- TIME (+5:30 ADD ONLY) ----------------
  function getISTTime(createdAt) {
    const date = new Date(createdAt)
    const ist =
      date.getTime() +
      (5 * 60 * 60 * 1000) +
      (30 * 60 * 1000)

    const d = new Date(ist)
    const h = d.getHours().toString().padStart(2, '0')
    const m = d.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  }

  // ---------------- LOAD MESSAGES ----------------
  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })

    if (data) setMessages(data)
  }

  // ---------------- SEND TEXT ----------------
  async function sendMessage() {
    if (!text.trim()) return

    await supabase.from('messages').insert({
      sender: user.username,
      type: 'text',
      content: text
    })

    setText('')
  }

  // ---------------- IMAGE UPLOAD ----------------
  async function uploadImage(e) {
    const file = e.target.files[0]
    if (!file) return

    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`

    await supabase.storage
      .from('chat-images')
      .upload(fileName, file)

    const { data } = supabase.storage
      .from('chat-images')
      .getPublicUrl(fileName)

    await supabase.from('messages').insert({
      sender: user.username,
      type: 'image',
      image_url: data.publicUrl
    })
  }

  // ---------------- DELETE (LONG PRESS MOBILE) ----------------
  async function deleteMessage(id) {
    await supabase.from('messages').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  // ---------------- REALTIME ----------------
  useEffect(() => {
    loadMessages()

    const channel = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        payload => {
          setMessages(prev => [...prev, payload.new])
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        payload => {
          setMessages(prev =>
            prev.filter(m => m.id !== payload.old.id)
          )
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ---------------- UI ----------------
  return (
    <div className="chat-container">
      <div className="chat-box">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={
              msg.sender === user.username
                ? 'message sent'
                : 'message received'
            }
            onContextMenu={e => {
              e.preventDefault()
              deleteMessage(msg.id)
            }}
          >
            <div
              className="bubble"
              style={{
                background: '#fff',
                color: '#000',
                padding: 8,
                borderRadius: 6,
                maxWidth: '70%',
                boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
              }}
            >
              {msg.type === 'text' && msg.content}

              {msg.type === 'image' && (
                <img
                  src={msg.image_url}
                  style={{
                    maxWidth: '200px',
                    borderRadius: 6,
                    display: 'block'
                  }}
                />
              )}

              <div
                style={{
                  fontSize: 10,
                  opacity: 0.6,
                  marginTop: 4,
                  textAlign: 'left'
                }}
              >
                {getISTTime(msg.created_at)}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="input-bar">
        <input
          type="file"
          accept="image/*"
          hidden
          id="imageUpload"
          onChange={uploadImage}
        />

        <button
          onClick={() =>
            document.getElementById('imageUpload').click()
          }
        >
          📎
        </button>

        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type a message"
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />

        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  )
}
