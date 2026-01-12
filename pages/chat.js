import { useEffect, useState, useRef } from "react";
import Peer from "simple-peer";

export default function Chat() {
  const username =
    typeof window !== "undefined" ? localStorage.getItem("username") : null;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // Voice state
  const [inCall, setInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [peers, setPeers] = useState([]);
  const localStreamRef = useRef();
  const peersRef = useRef([]);

  // Fetch messages
  useEffect(() => {
    if (!username) return;
    const interval = setInterval(async () => {
      const res = await fetch("/api/messages");
      const data = await res.json();
      setMessages(data);
    }, 1500);
    return () => clearInterval(interval);
  }, [username]);

  // Voice call polling (simple demo)
  useEffect(() => {
    if (!username) return;
    if (!inCall) return;

    const interval = setInterval(async () => {
      const res = await fetch("/api/voice/offer");
      const offers = await res.json();
      offers.forEach(async (offer) => {
        // ignore your own offers
        if (offer.data.from === username) return;

        if (!peersRef.current.find((p) => p.id === offer.id)) {
          setIncomingCall(true);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [username, inCall]);

  const startCall = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    setInCall(true);
    setIncomingCall(false);

    // create a peer
    const peer = new Peer({ initiator: true, trickle: false, stream });

    peer.on("signal", async (data) => {
      await fetch("/api/voice/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: username, offer: data }),
      });
    });

    peer.on("stream", (remoteStream) => {
      const audio = document.createElement("audio");
      audio.srcObject = remoteStream;
      audio.autoplay = true;
      document.body.appendChild(audio);
    });

    peersRef.current.push({ id: username, peer });
    setPeers([...peersRef.current]);
  };

  const joinCall = async (offer) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    setInCall(true);
    setIncomingCall(false);

    const peer = new Peer({ initiator: false, trickle: false, stream });

    peer.on("signal", async (data) => {
      await fetch("/api/voice/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: offer.data.from, answer: data }),
      });
    });

    peer.on("stream", (remoteStream) => {
      const audio = document.createElement("audio");
      audio.srcObject = remoteStream;
      audio.autoplay = true;
      document.body.appendChild(audio);
    });

    peer.signal(offer.data.offer);
    peersRef.current.push({ id: offer.id, peer });
    setPeers([...peersRef.current]);
  };

  const sendMessage = async () => {
    if (!text) return;
    await fetch("/api/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, text }),
    });
    setText("");
  };

  if (!username) return <p>Please login first</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>Welcome, {username}</h1>

      {/* Chat box */}
      <div
        style={{
          height: 300,
          overflowY: "scroll",
          border: "1px solid black",
          padding: 10,
        }}
      >
        {messages.map((m) => (
          <p key={m.id}>
            <b>{m.username}:</b> {m.text}
          </p>
        ))}
      </div>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
      />
      <button onClick={sendMessage}>Send</button>

      {/* Voice call controls */}
      {!inCall && (
        <button style={{ marginLeft: 10 }} onClick={startCall}>
          Start Call
        </button>
      )}

      {incomingCall && !inCall && (
        <div
          style={{
            position: "fixed",
            top: 10,
            right: 10,
            background: "yellow",
            padding: 10,
            border: "1px solid black",
            zIndex: 999,
          }}
        >
          <p>Incoming group call!</p>
          <button
            onClick={() => {
              // For demo: pick the first offer to join
              fetch("/api/voice/offer")
                .then((res) => res.json())
                .then((offers) => {
                  if (offers.length > 0) joinCall(offers[0]);
                });
            }}
          >
            Join Call
          </button>
        </div>
      )}
    </div>
  );
}
