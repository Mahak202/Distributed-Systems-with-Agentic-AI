import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "../../app/store";
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  setCurrentConversation,
  setUserId,
  selectChatUserId,
  selectConversations,
  selectCurrentConversationId,
  selectMessagesForCurrent,
  selectChatLoading,
  selectChatError,
} from "./chatSlice";

const pane: React.CSSProperties = { display: "flex", height: "calc(100vh - 80px)", gap: 16 };
const left: React.CSSProperties = {
  width: 280,
  borderRight: "1px solid #333",
  paddingRight: 12,
  overflowY: "auto",
};
const right: React.CSSProperties = { flex: 1, display: "flex", flexDirection: "column" };
const header: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 };
const convoItem = (active: boolean): React.CSSProperties => ({
  padding: "8px 10px",
  marginBottom: 8,
  borderRadius: 8,
  background: active ? "#27272a" : "#1f1f22",
  cursor: "pointer",
  border: "1px solid #3a3a3a",
});
const msgWrap: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 12,
  border: "1px solid #333",
  borderRadius: 8,
  background: "#0f0f10",
};
const bubble = (role: "user" | "assistant" | "system"): React.CSSProperties => ({
  maxWidth: "70%",
  margin: "6px 0",
  padding: "10px 12px",
  borderRadius: 12,
  whiteSpace: "pre-wrap",
  lineHeight: 1.35,
  background:
    role === "user" ? "#2a3b8f" : role === "assistant" ? "#263a2a" : "#3a3a3a",
  alignSelf: role === "user" ? "flex-end" : "flex-start",
  border: "1px solid #3a3a3a",
  color: "#e7e7e7",
});
const inputRow: React.CSSProperties = { display: "flex", gap: 8, marginTop: 12 };

export default function ChatPage() {
  const dispatch = useDispatch<AppDispatch>();

  const userId = useSelector(selectChatUserId);
  const conversations = useSelector(selectConversations);
  const currentId = useSelector(selectCurrentConversationId);
  const messages = useSelector(selectMessagesForCurrent);
  const loading = useSelector(selectChatLoading);
  const error = useSelector(selectChatError);

  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [userInput, setUserInput] = useState(userId.toString());

  const scrollerRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    dispatch(fetchConversations({ user_id: userId }));
  }, [dispatch, userId]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === currentId) ?? null,
    [conversations, currentId]
  );

  const onSelectConversation = (id: number) => {
    dispatch(setCurrentConversation(id));
    dispatch(fetchMessages({ conversation_id: id }));
  };

  const onSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const payload = {
      user_id: userId,
      message: text.trim(),
      conversation_id: currentId ?? undefined,
      title: currentId ? undefined : (title || text.slice(0, 40)),
    };

    dispatch(sendMessage(payload));
    setText("");
    if (!currentId) setTitle("");
  };

  const onNew = () => {
    dispatch(setCurrentConversation(null));
    setTitle("");
    setText("");
  };

  const onApplyUser = () => {
    const n = Number(userInput);
    if (!Number.isNaN(n) && n > 0) {
      dispatch(setUserId(n));
      dispatch(fetchConversations({ user_id: n }));
    }
  };

  return (
    <div style={{ padding: 20, color: "#e7e7e7" }}>
      <h1 style={{ fontSize: 28, marginBottom: 14 }}>Chat (Ollama + FastAPI + Redux)</h1>

      <div style={header}>
        <input
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="User ID"
          style={{ width: 90, padding: 8, borderRadius: 8, border: "1px solid #333", background: "#18181b", color: "#e7e7e7" }}
        />
        <button onClick={onApplyUser} style={{ padding: "8px 12px", borderRadius: 8, background: "#263a2a", border: "1px solid #3a3a3a", color: "#d1f5d1" }}>
          Load Conversations
        </button>
        <button onClick={onNew} style={{ padding: "8px 12px", borderRadius: 8, background: "#2a3b8f", border: "1px solid #3a3a3a", color: "#d1e0ff" }}>
          + New
        </button>
        {loading && <span style={{ opacity: 0.7 }}>Loading…</span>}
        {error && <span style={{ color: "#ff6b6b" }}>{String(error)}</span>}
      </div>

      <div style={pane}>
        {/* Left: conversations */}
        <div style={left}>
          {conversations.length === 0 && (
            <div style={{ opacity: 0.7 }}>No conversations yet.</div>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              style={convoItem(c.id === currentId)}
              onClick={() => onSelectConversation(c.id)}
              title={c.title}
            >
              <div style={{ fontWeight: 600 }}>{c.title || `Conversation ${c.id}`}</div>
              <div style={{ fontSize: 12, opacity: 0.75 }}>#{c.id} · user {c.user_id}</div>
            </div>
          ))}
        </div>

        {/* Right: messages + composer */}
        <div style={right}>
          <div ref={scrollerRef} style={msgWrap}>
            {currentId == null ? (
              <div style={{ opacity: 0.7 }}>
                Start a new chat: enter a message (and optional title) then Send.
              </div>
            ) : messages.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No messages yet. Say hi!</div>
            ) : (
              messages.map((m, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={bubble(m.role)}>{m.content}</div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={onSend} style={inputRow}>
            {currentId == null && (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="(Optional) Conversation title"
                style={{
                  width: 280,
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #333",
                  background: "#18181b",
                  color: "#e7e7e7",
                }}
              />
            )}
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message…"
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #333",
                background: "#18181b",
                color: "#e7e7e7",
              }}
            />
            <button
              type="submit"
              disabled={loading || !text.trim()}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                background: "#2a3b8f",
                border: "1px solid #3a3a3a",
                color: "#d1e0ff",
                opacity: loading || !text.trim() ? 0.6 : 1,
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
