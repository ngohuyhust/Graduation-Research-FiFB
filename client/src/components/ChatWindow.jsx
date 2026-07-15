// Component chat window dung chung trong giao dien.
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { chatApi } from "../api/chatApi";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { showError } from "./ToastBridge";

export default function ChatWindow({ connectionId }) {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    chatApi
      .messages(connectionId)
      .then((data) => setMessages(data?.items || []))
      .catch(showError);
    chatApi.markRead(connectionId).catch(() => {});
  }, [connectionId]);

  useEffect(() => {
    if (!socket) return undefined;
    socket.emit("chat:join", { connectionId });
    const receive = (message) => {
      if (message.connection_id === connectionId || message.connectionId === connectionId) {
        setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
        if (message.sender_id !== user?.id) chatApi.markRead(connectionId).catch(() => {});
      }
    };
    const onTyping = (event) => {
      if (event.connectionId === connectionId && event.userId !== user?.id) setTyping(Boolean(event.typing));
    };
    socket.on("chat:receive", receive);
    socket.on("chat:typing", onTyping);
    return () => {
      socket.off("chat:receive", receive);
      socket.off("chat:typing", onTyping);
    };
  }, [connectionId, socket, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function handleTyping(value) {
    setContent(value);
    if (!socket) return;
    socket.emit("chat:typing", { connectionId, typing: true });
    window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(() => socket.emit("chat:typing", { connectionId, typing: false }), 800);
  }

  async function submit(event) {
    event.preventDefault();
    const message = content.trim();
    if (!message || sending) return;
    setSending(true);
    setContent("");
    try {
      if (socket?.connected) {
        await new Promise((resolve, reject) => {
          socket.emit("chat:send", { connectionId, content: message }, (response) =>
            response?.ok ? resolve(response.data) : reject(new Error(response?.error)),
          );
        });
      } else {
        const result = await chatApi.send(connectionId, { content: message, messageType: "text" });
        const created = result?.message || result;
        setMessages((current) => [...current, created]);
      }
    } catch (error) {
      setContent(message);
      showError(error);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="panel flex min-h-[65vh] flex-col p-0">
      <div className="border-b border-slate-200 px-5 py-3 text-sm text-slate-500">
        {isConnected ? "Real-time connection active" : "Using REST fallback"}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.map((message) => {
          const mine = (message.senderId || message.sender_id) === user?.id;
          return (
            <div className={`flex ${mine ? "justify-end" : "justify-start"}`} key={message.id}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine ? "bg-mint text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {message.content}
              </div>
            </div>
          );
        })}
        {typing && <div className="text-xs text-slate-400">Typing...</div>}
        <div ref={bottomRef} />
      </div>
      <form className="flex gap-3 border-t border-slate-200 p-4" onSubmit={submit}>
        <input
          className="input"
          placeholder="Write a message..."
          value={content}
          onChange={(event) => handleTyping(event.target.value)}
        />
        <button className="btn-primary px-4" disabled={sending || !content.trim()} type="submit">
          <Send size={17} />
        </button>
      </form>
    </section>
  );
}
