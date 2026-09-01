"use client";

import { useState, useRef, useEffect } from "react";
import MapView from "./MapView";

type Message = {
  role: "user" | "model";
  text: string;
};

type ActiveMap = {
  place: string;
  latitude: number;
  longitude: number;
};

type ActiveMusic = {
  trackName: string;
  artist: string;
  albumArt: string;
  embedUrl: string;
  spotifyUrl: string;
};

const EXIT_MAP_PHRASES = [
  "back to chat",
  "close map",
  "exit map",
  "go back",
  "go back to chat",
  "stop map",
  "return to chat",
  "close the map",
];

// Key used to remember, per-browser, how many of the earliest messages
// should stay hidden from the display after a "Clear chat" tap. The
// full message list (and what gets sent to Gemini) is never touched —
// this only affects what renders on screen.
const CLEAR_INDEX_KEY = "my-ai-chat-clear-index";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [mode, setMode] = useState<"chat" | "map">("chat");
  const [activeMap, setActiveMap] = useState<ActiveMap | null>(null);
  const [activeMusic, setActiveMusic] = useState<ActiveMusic | null>(null);
  const [clearIndex, setClearIndex] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CLEAR_INDEX_KEY);
    if (stored) setClearIndex(parseInt(stored, 10) || 0);

    fetch("/api/messages")
      .then((res) => res.json())
      .then((data) => {
        if (data.messages) {
          setMessages(
            data.messages.map((m: { role: "user" | "model"; content: string }) => ({
              role: m.role,
              text: m.content,
            }))
          );
        }
      })
      .catch((err) => console.error("Failed to load history:", err))
      .finally(() => setHistoryLoaded(true));
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, loading]);

  function backToChat() {
    setMode("chat");
  }

  function clearChatDisplay() {
    // Only hides messages up to this point from view — the full
    // `messages` array keeps growing underneath and is still what
    // gets sent to Gemini as history, so nothing is actually forgotten.
    setClearIndex(messages.length);
    localStorage.setItem(CLEAR_INDEX_KEY, String(messages.length));
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    if (mode === "map" && EXIT_MAP_PHRASES.includes(text.toLowerCase())) {
      setInput("");
      backToChat();
      return;
    }

    const newMessages: Message[] = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Full history always sent, regardless of what's hidden
          // on screen — this is what keeps memory intact after Clear.
          message: text,
          history: messages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "model", text: `Error: ${data.error ?? "unknown error"}` },
        ]);
      } else if (data.type === "map") {
        setMessages((m) => [...m, { role: "model", text: data.text }]);
        setActiveMap({
          place: data.place,
          latitude: data.latitude,
          longitude: data.longitude,
        });
        setMode("map");
      } else if (data.type === "music") {
        setMessages((m) => [...m, { role: "model", text: data.text }]);
        setActiveMusic({
          trackName: data.trackName,
          artist: data.artist,
          albumArt: data.albumArt,
          embedUrl: data.embedUrl,
          spotifyUrl: data.spotifyUrl,
        });
      } else {
        setMessages((m) => [...m, { role: "model", text: data.text }]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "model", text: "Error: could not reach the server." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const visibleMessages = messages.slice(clearIndex);

  const chatPanel = (
    <div className="chat-panel">
      <div className="chat-header">
        <h1>MY AI</h1>
        <div className="chat-header-actions">
          {messages.length > clearIndex && (
            <button className="clear-chat-btn" onClick={clearChatDisplay}>
              Clear
            </button>
          )}
          {mode === "map" && (
            <button className="back-to-chat-btn" onClick={backToChat}>
              ← Back to chat
            </button>
          )}
        </div>
      </div>

      <div className="chat-log" ref={logRef}>
        {!historyLoaded && (
          <div className="bubble model pending">loading history…</div>
        )}
        {clearIndex > 0 && visibleMessages.length === 0 && (
          <div className="chat-cleared-note">
            Chat cleared — still remembers everything, just tidied up.
          </div>
        )}
        {visibleMessages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
        {loading && <div className="bubble model pending">thinking…</div>}
      </div>

      <div className="chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Say something…"
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );

  return (
    <div className={`app-shell mode-${mode}`}>
      <div className="pane-primary">
        {mode === "map" && activeMap ? (
          <MapView
            place={activeMap.place}
            latitude={activeMap.latitude}
            longitude={activeMap.longitude}
          />
        ) : (
          chatPanel
        )}
      </div>

      <div className="pane-secondary">
        <div className="pane-secondary-music">
          {activeMusic ? (
            <div className="music-widget">
              <div className="music-widget-header">
                <span>Now Playing</span>
                <button
                  className="music-close-btn"
                  onClick={() => setActiveMusic(null)}
                  aria-label="Close player"
                >
                  ×
                </button>
              </div>
              <iframe
                // ?autoplay=1 tells Spotify's embed to start playing
                // immediately instead of waiting for a manual click.
                src={`${activeMusic.embedUrl}?utm_source=generator&autoplay=1`}
                width="100%"
                height="152"
                style={{ border: 0, borderRadius: 8 }}
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="music-widget-empty">No music playing</div>
          )}
        </div>

        <div className="pane-secondary-chat">
          {mode === "map" ? chatPanel : null}
        </div>
      </div>
    </div>
  );
}