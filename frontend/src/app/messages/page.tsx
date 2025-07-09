"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import ChatBox from "../../components/ChatBox";
import Navbar from "../../components/Navbar";

interface Conversation {
  id: string;
  listing_id: string;
  guest_id: string;
  host_id: string;
  created_at: string;
  hasMessages?: boolean;
}

interface Listing {
  id: string;
  title: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  sent_at: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const userId = typeof user?.id === 'string' ? user.id : null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [guestProfiles, setGuestProfiles] = useState<Record<string, UserProfile>>({});
  const [listingTitles, setListingTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    async function fetchConversations() {
      if (!isMounted) return;
      setLoading(true);
      const res = await fetch(`http://localhost:4000/api/conversations/user/${userId}`);
      const data = await res.json();
      // Get all conversations where user is either host or guest
      const userConversations = data.filter((c: Conversation) => 
        c.host_id === userId || c.guest_id === userId
      );
      
      // Fetch messages for each conversation to check if there are actual messages
      const conversationsWithMessages = await Promise.all(
        userConversations.map(async (conversation: Conversation) => {
          const messagesRes = await fetch(`http://localhost:4000/api/messages/conversation/${conversation.id}`);
          const messages = await messagesRes.json();
          // Only include conversations that have messages
          return { ...conversation, hasMessages: messages.length > 0 };
        })
      );
      
      if (isMounted) {
        setConversations(conversationsWithMessages.filter(c => c.hasMessages));
        setLoading(false);
      }
    }
    fetchConversations();
  }, [userId]);

  // Fetch guest profiles and listing titles for sidebar
  useEffect(() => {
    async function fetchDetails() {
      // Get all user IDs (both guests and hosts) that are not the current user
      const otherUserIds = Array.from(new Set(
        conversations.map(c => c.guest_id === userId ? c.host_id : c.guest_id)
      ));
      const listingIds = Array.from(new Set(conversations.map(c => c.listing_id)));
      const userProfilesObj: Record<string, UserProfile> = {};
      const listingTitlesObj: Record<string, string> = {};
      await Promise.all([
        ...otherUserIds.map(async (id) => {
          const res = await fetch(`http://localhost:4000/api/users/${id}`);
          if (res.ok) userProfilesObj[id] = await res.json();
        }),
        ...listingIds.map(async (id) => {
          const res = await fetch(`http://localhost:4000/api/listings/${id}`);
          if (res.ok) {
            const listing = await res.json();
            listingTitlesObj[id] = listing.title;
          }
        })
      ]);
      setGuestProfiles(userProfilesObj);
      setListingTitles(listingTitlesObj);
    }
    if (conversations.length > 0) fetchDetails();
  }, [conversations, userId]);

  if (!user) {
    return <div className="p-8 text-center text-gray-600">Log in to view your messages.</div>;
  }

  return (
    <div className="flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex flex-1 pt-20">
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-white p-4 flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-black">Inbox</h2>
          {loading ? (
            <div className="text-gray-400">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="text-gray-400">No messages yet.</div>
          ) : (
            <ul className="flex-1 overflow-y-auto">
              {conversations.map((c) => (
                <li
                  key={c.id}
                  className={`mb-2 rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selected?.id === c.id ? "bg-blue-50 border-blue-400" : ""}`}
                  onClick={() => setSelected(c)}
                >
                  <div className="font-semibold text-black">
                    {c.guest_id === userId 
                      ? guestProfiles[c.host_id]?.name || "Host" 
                      : guestProfiles[c.guest_id]?.name || "Guest"
                    }
                  </div>
                  <div className="text-xs text-gray-500 truncate">{listingTitles[c.listing_id] || "Listing"}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Chat area */}
        <div className="flex-1 flex flex-col">
          {selected ? (
            <div className="flex-1 flex flex-col">
              <div className="border-b border-gray-200 px-6 py-4 bg-white">
                <div className="font-bold text-lg text-black">
                  {selected.guest_id === userId 
                    ? guestProfiles[selected.host_id]?.name || "Host" 
                    : guestProfiles[selected.guest_id]?.name || "Guest"
                  }
                </div>
                <div className="text-xs text-gray-500">Listing: {listingTitles[selected.listing_id] || "Listing"}</div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ChatBox 
                  listingId={selected.listing_id} 
                  hostId={selected.host_id} 
                  allowHostChat={selected.host_id === userId} 
                  conversationId={selected.id} 
                  disableAutoScroll={true}
                  fullWidth={true}
                  hideHeader={true}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">Select a conversation to view messages</div>
          )}
        </div>
      </div>
    </div>
  );
} 