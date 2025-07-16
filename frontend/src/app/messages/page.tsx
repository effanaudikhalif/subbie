"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import ChatBox from "../../components/ChatBox";
import Navbar from "../../components/Navbar";
import { useSearchParams } from "next/navigation";

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
  avatar_url?: string;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  sent_at: string;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const userId = typeof user?.id === 'string' ? user.id : null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [guestProfiles, setGuestProfiles] = useState<Record<string, UserProfile>>({});
  const [listingTitles, setListingTitles] = useState<Record<string, string>>({});
  const [listingDetails, setListingDetails] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    async function fetchConversations() {
      if (!isMounted) return;
      setLoading(true);
      const res = await fetch(`http://localhost:4000/api/conversations/user/${userId}`);
      const data = await res.json();
      // Only get conversations where user is the guest (renter), not the host
      const userConversations = data.filter((c: Conversation) => c.guest_id === userId);
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
        const listingId = searchParams.get('listingId');
        const hostId = searchParams.get('hostId');
        
        // If we have URL parameters, include all conversations (even without messages)
        // Otherwise, only show conversations with messages
        const shouldShowAllConversations = !!(listingId && hostId && userId);
        const filteredConversations = shouldShowAllConversations 
          ? conversationsWithMessages 
          : conversationsWithMessages.filter(c => c.hasMessages);
        
        setConversations(filteredConversations);
        
        // Check if we should auto-select a conversation based on URL params
        if (listingId && hostId && userId) {
          // Find the conversation for this specific listing and host
          const targetConversation = filteredConversations.find(
            c => c.listing_id === listingId && c.host_id === hostId
          );
          
          if (targetConversation) {
            setSelected(targetConversation);
          }
        }
        
        setLoading(false);
      }
    }
    fetchConversations();
    return () => { isMounted = false; };
  }, [userId]);

  // Handle URL parameter changes for auto-selecting conversations
  useEffect(() => {
    if (!userId || !conversations.length) return;
    
    const listingId = searchParams.get('listingId');
    const hostId = searchParams.get('hostId');
    
    if (listingId && hostId) {
      // Find the conversation for this specific listing and host
      const targetConversation = conversations.find(
        c => c.listing_id === listingId && c.host_id === hostId
      );
      
      if (targetConversation) {
        setSelected(targetConversation);
      }
    }
  }, [searchParams, userId, conversations]);

  // Fetch guest profiles, listing titles, and listing details for sidebar and right panel
  useEffect(() => {
    async function fetchDetails() {
      // Get all user IDs (both guests and hosts) that are not the current user
      const otherUserIds = Array.from(new Set(
        conversations.map(c => c.guest_id === userId ? c.host_id : c.guest_id)
      ));
      const listingIds = Array.from(new Set(conversations.map(c => c.listing_id)));
      const userProfilesObj: Record<string, UserProfile> = {};
      const listingTitlesObj: Record<string, string> = {};
      const listingDetailsObj: Record<string, any> = {};
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
            listingDetailsObj[id] = listing;
          }
        })
      ]);
      setGuestProfiles(userProfilesObj);
      setListingTitles(listingTitlesObj);
      setListingDetails(listingDetailsObj);
    }
    if (conversations.length > 0) fetchDetails();
  }, [conversations, userId]);

  if (!user) {
    return <div className="p-8 text-center text-gray-600">Log in to view your messages.</div>;
  }

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">
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
                    {guestProfiles[c.host_id]?.name || "Host"}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{listingTitles[c.listing_id] || "Listing"}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Center: Chat area */}
        <div className="flex-1 flex flex-col border-r border-gray-200">
          {selected ? (
            <div className="flex-1 flex flex-col">
              <div className="border-b border-gray-200 px-6 py-4 bg-white">
                <div className="font-bold text-lg text-black">
                  {guestProfiles[selected.host_id]?.name || "Host"}
                </div>
                <div className="text-xs text-gray-500">Listing: {listingTitles[selected.listing_id] || "Listing"}</div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <ChatBox 
                  listingId={selected.listing_id} 
                  hostId={selected.host_id} 
                  allowHostChat={false} 
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
        {/* Right: Listing and user details */}
        <div className="w-96 border-l border-gray-200 bg-white p-6 flex flex-col">
          {selected && listingDetails[selected.listing_id] ? (
            <div>
              {listingDetails[selected.listing_id].images && listingDetails[selected.listing_id].images.length > 0 && (
                <img src={listingDetails[selected.listing_id].images[0].url.startsWith('/uploads/') ? `http://localhost:4000${listingDetails[selected.listing_id].images[0].url}` : listingDetails[selected.listing_id].images[0].url} alt={listingDetails[selected.listing_id].title} className="rounded-xl w-full h-48 object-cover mb-6" />
              )}
              <div className="font-bold text-2xl text-black mb-1">{listingDetails[selected.listing_id].title}</div>
              <div className="text-gray-500 mb-2">{listingDetails[selected.listing_id].city}, {listingDetails[selected.listing_id].state}</div>
              <div className="text-gray-700 mb-4">{listingDetails[selected.listing_id].description}</div>
              <div className="flex items-center gap-3 mb-4">
                {/* Show the host's avatar and info since user is always the guest */}
                {guestProfiles[selected.host_id]?.avatar_url ? (
                  <img src={guestProfiles[selected.host_id].avatar_url} alt={guestProfiles[selected.host_id].name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-700">
                    {guestProfiles[selected.host_id]?.name ? guestProfiles[selected.host_id].name[0] : 'H'}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-black">{guestProfiles[selected.host_id]?.name || "Host"}</div>
                  <div className="text-xs text-gray-500">Host</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-lg">Select a conversation to view details</div>
          )}
        </div>
      </div>
    </div>
  );
} 