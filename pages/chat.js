import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';

export default function Chat() {
  const router = useRouter();
  const { user } = router.query;

  const [msg, setMsg] = useState('');
  const [chat, setChat] = useState([]);
  const [inCall, setInCall] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [host, setHost] = useState(null);
  const [participants, setParticipants] = useState([]);

  const localStream = useRef(null);
  const peers = useRef({});
  const audioRefs = useRef({});

  // ---------- TEXT CHAT ----------
  const loadMessages = async () => {
    const res = await fetch('/api/messages');
    const data = await res.json();
    setChat(data);
  };
  const sendMessage = async () => {
    if (!msg.trim()) return;
    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, text: msg })
    });
    setMsg('');
    loadMessages();
  };
  useEffect(() => {
    if (!user) return;
    loadMessages();
    const interval = setInterval(loadMessages, 1000);
    return () => clearInterval(interval);
  }, [user]);
  if (!user) return <p>Loading...</p>;

  // ---------- GROUP VOICE CALL ----------
  const checkCallStatus = async () => {
    const res = await fetch('/api/call-status');
    const data = await res.json();
    setCallActive(data.active);
    setHost(data.host);
    setParticipants(data.participants || []);
  };

  const startCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.current = stream;
    setInCall(true);
    peers.current = {};

    await fetch('/api/call-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true, host: user, participants: [user] })
    });

    pollSignals();
  };

  const joinCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.current = stream;
    setInCall(true);
    pollSignals();
  };

  const endCall = async () => {
    if (localStream.current) localStream.current.getTracks().forEach(t => t.stop());
    Object.values(peers.current).forEach(pc => pc.close());
    peers.current = {};
    setInCall(false);

    if (user === host) {
      await fetch('/api/call-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false, host: null, participants: [] })
      });
    }
  };

  const pollSignals = async () => {
    if (!inCall) return;

    const res = await fetch(`/api/signaling?user=${user}`);
    const incoming = await res.json();

    for (let { from, signal } of incoming) {
      if (!peers.current[from]) {
        const pc = createPeer(from, false);
        peers.current[from] = pc;
        pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await fetch('/api/signaling', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: user, to: from, signal: answer })
        });
      }
    }
    setTimeout(pollSignals, 1000);
  };

  const createPeer = (peerUser, initiator = true) => {
    const pc = new RTCPeerConnection();
    if (localStream.current)
      localStream.current.getTracks().forEach(track => pc.addTrack(track, localStream.current));

    pc.ontrack = e => {
      if (!audioRefs.current[peerUser]) {
        audioRefs.current[peerUser] = document.createElement('audio');
        audioRefs.current[peerUser].autoplay = true;
        audioRefs.current[peerUser].srcObject = e.streams[0];
        document.body.appendChild(audioRefs.current[peerUser]);
      }
    };
    return pc;
  };

  useEffect(() => {
    const interval = setInterval(checkCallStatus, 1000);
    return () => clearInterval(interval);
  }, [user]);

  // ---------- UI ----------
  return (
    <div style={{ padding: '20px' }}>
      <h1>Welcome, {user}</h1>

      {/* TEXT CHAT */}
      <div style={{ border: '1px solid #000', padding: '10px', height: '300px', overflowY: 'scroll' }}>
        {chat.map((m, i) => (
          <p key={i}><b>{m.user}:</b> {m.text}</p>
        ))}
      </div>
      <input
        value={msg}
        onChange={e => setMsg(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>

      {/* VOICE CALL UI */}
      <div style={{ marginTop: '20px' }}>
        {!inCall && !callActive && <button onClick={startCall}>Start Voice Call</button>}
        {!inCall && callActive && user !== host && <button onClick={joinCall}>Join Voice Call</button>}
        {inCall && <button onClick={endCall}>End Call</button>}

        {callActive && !inCall && user !== host && (
          <div style={{ marginTop: '10px', color: 'green', fontWeight: 'bold' }}>
            {host} is in a voice call. Click "Join Voice Call" to participate.
          </div>
        )}
      </div>
    </div>
  );
}
