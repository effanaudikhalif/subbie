"use client";
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";

interface ChatBoxProps {
  listingId: string;
  hostId: string;
  allowHostChat?: boolean;
  conversationId?: string;
  disableAutoScroll?: boolean;
  fullWidth?: boolean;
  hideHeader?: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  sent_at: string;
}

export default function ChatBox({ listingId, hostId, allowHostChat, conversationId: propConversationId, disableAutoScroll, fullWidth, hideHeader }: ChatBoxProps) {
  const { user } = useAuth();
  const userId = typeof user?.id === 'string' ? user.id : null;
  const [conversationId, setConversationId] = useState<string | null>(propConversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (!disableAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Find or create conversation on mount, unless conversationId is provided
  useEffect(() => {
    if (propConversationId) {
      setConversationId(propConversationId);
      setLoading(false);
      return;
    }
    if (!userId) return;
    async function getOrCreateConversation() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("http://localhost:4000/api/conversations/find-or-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listing_id: listingId,
            guest_id: userId,
            host_id: hostId,
          }),
        });
        const convo = await res.json();
        setConversationId(convo.id);
      } catch (e) {
        setError("Failed to load conversation.");
      } finally {
        setLoading(false);
      }
    }
    getOrCreateConversation();
  }, [listingId, hostId, userId, propConversationId]);

  // Fetch messages when conversationId is set
  useEffect(() => {
    if (!conversationId) return;
    let isMounted = true;
    async function fetchMessages() {
      try {
        const res = await fetch(`http://localhost:4000/api/messages/conversation/${conversationId}`);
        const msgs = await res.json();
        if (isMounted) setMessages(msgs);
      } catch (e) {
        if (isMounted) setError("Failed to load messages.");
      }
    }
    fetchMessages();
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [conversationId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId || !userId) return;
    setSending(true);
    try {
      const res = await fetch("http://localhost:4000/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: conversationId,
          sender_id: userId,
          body: input.trim(),
        }),
      });
      if (res.ok) {
        setInput("");
        // Optimistically add message
        setMessages((msgs) => [
          ...msgs,
          {
            id: Math.random().toString(),
            sender_id: userId,
            body: input.trim(),
            sent_at: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-gray-100 rounded-xl p-6 text-center text-black mt-8">
        <div className="mb-2 font-semibold">Log in to chat with the host</div>
      </div>
    );
  }

  if (userId === hostId && !allowHostChat) {
    return (
      <div className="bg-gray-100 rounded-xl p-6 text-center text-black mt-8">
        <div className="mb-2 font-semibold">This is your listing</div>
        <div className="text-sm text-gray-600">You can't message yourself</div>
      </div>
    );
  }

  return (
    <div
      className={
        fullWidth
          ? "bg-gray-50 rounded-2xl shadow p-4 h-full flex flex-col"
          : "bg-gray-50 rounded-2xl shadow p-4 mt-8 max-w-2xl mx-auto border border-gray-200"
      }
    >
      {!hideHeader && (
        <div className="font-bold text-lg mb-2 text-black">Chat with the host</div>
      )}
      <div
        className={
          fullWidth
            ? "flex-1 bg-white rounded-xl p-4 mb-4 border border-gray-100 flex flex-col"
            : "h-64 overflow-y-auto bg-white rounded-xl p-4 mb-4 border border-gray-100 flex flex-col"
        }
        style={fullWidth ? undefined : { minHeight: 200 }}
      >
        {loading ? (
          <div className="text-gray-400 text-center my-auto">Loading chat...</div>
        ) : error ? (
          <div className="text-red-500 text-center my-auto">{error}</div>
        ) : messages.length === 0 ? (
          <div className="text-gray-400 text-center my-auto">No messages yet. Say hello!</div>
        ) : (
          messages.map((msg) => {
            const isUser = userId && msg.sender_id === userId;
            return (
              <div
                key={msg.id + msg.sent_at}
                className={`mb-2 flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`px-4 py-2 rounded-2xl max-w-xs break-words shadow text-sm ${
                    isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-black'
                  }`}
                >
                  {msg.body}
                  <div className={`text-xs mt-1 text-right ${isUser ? 'text-white' : 'text-black'}`}>
                    {new Date(msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-black bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type your message..."
          disabled={sending}
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:bg-blue-700 transition disabled:opacity-60"
          disabled={sending || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
} 