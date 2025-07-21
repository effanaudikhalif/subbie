"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import ChatBox from "../../components/ChatBox";
import Navbar from "../../components/Navbar";
import PrivacyMap from "../../components/PrivacyMap";
import { useSearchParams, useRouter } from "next/navigation";

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
  const router = useRouter();
  const userId = typeof user?.id === 'string' ? user.id : null;
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [guestProfiles, setGuestProfiles] = useState<Record<string, UserProfile>>({});
  const [listingTitles, setListingTitles] = useState<Record<string, string>>({});
  const [listingDetails, setListingDetails] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    async function fetchConversations() {
      if (!isMounted) return;
      setLoading(true);
      const res = await fetch(`http://localhost:4000/api/conversations/user/${userId}`);
      const data = await res.json();
      // Fetch messages for each conversation to check if there are actual messages
      const conversationsWithMessages = await Promise.all(
        data.map(async (conversation: Conversation) => {
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

  // Reset image index when selected conversation changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selected]);

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

  // Helper to get the other user's id for a conversation
  function getOtherUserId(convo: Conversation) {
    if (!userId) return '';
    return convo.guest_id === userId ? convo.host_id : convo.guest_id;
  }

  if (!user) {
    return <div className="p-8 text-center text-gray-600">Log in to view your messages.</div>;
  }

  const currentListing = selected && listingDetails[selected.listing_id];
  const images = currentListing?.images && currentListing.images.length > 0 
    ? currentListing.images 
    : [{ url: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80" }];
  const showPrev = currentImageIndex > 0;
  const showNext = currentImageIndex < images.length - 1;

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden">
      <Navbar />
      <div className="flex flex-1 mt-25 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r border-gray-200 bg-white p-6 flex flex-col overflow-hidden">
          <h2 className="text-xl font-bold mb-4 text-black flex-shrink-0">Inbox</h2>
          {loading ? (
            <div className="text-gray-400">Loading...</div>
          ) : conversations.length === 0 ? (
            <div className="text-gray-400">No messages yet.</div>
          ) : (
            <ul className="flex-1 overflow-y-auto scrollbar-hide">
              {conversations.map((c) => (
                <li
                  key={c.id}
                  className={`mb-2 rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selected?.id === c.id ? "bg-blue-50 border-blue-400" : ""}`}
                  onClick={() => setSelected(c)}
                >
                  <div className="font-semibold text-black">
                    {guestProfiles[getOtherUserId(c)]?.name || "User"}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{listingTitles[c.listing_id] || "Listing"}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Center: Chat area */}
        <div className="flex-1 flex flex-col border-r border-gray-200 overflow-hidden">
          {selected ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="border-b border-gray-200 px-6 py-3 bg-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  {guestProfiles[getOtherUserId(selected)]?.avatar_url ? (
                    <img src={guestProfiles[getOtherUserId(selected)].avatar_url} alt={guestProfiles[getOtherUserId(selected)].name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-700">
                      {guestProfiles[getOtherUserId(selected)]?.name ? guestProfiles[getOtherUserId(selected)].name[0] : 'U'}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-lg text-black">
                      {guestProfiles[getOtherUserId(selected)]?.name || "User"}
                    </div>
                    <div className="text-xs text-gray-500">Boston University student</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-hidden p-2">
                <ChatBox 
                  listingId={selected.listing_id}
                  hostId={selected.host_id}
                  allowHostChat={true}
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
        <div className="w-96 border-l border-gray-200 bg-white p-6 flex flex-col overflow-hidden">
          {selected && currentListing ? (
            <div className="overflow-y-auto scrollbar-hide">
              <button 
                className="bg-white border border-black text-black px-3 py-1 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm mb-4 w-fit"
                onClick={() => router.push(`/listings/${selected.listing_id}`)}
              >
                Listing Page
              </button>
              <div className="font-bold text-lg text-black mb-4">{currentListing.title}</div>
              {/* Gallery */}
              <div className="relative w-full h-48 mb-6">
                <img
                  src={images[currentImageIndex]?.url.startsWith('/uploads/') ? `http://localhost:4000${images[currentImageIndex].url}` : images[currentImageIndex].url}
                  alt={currentListing.title}
                  className="w-full h-48 object-cover rounded-xl"
                />
                {showPrev && (
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-opacity-100 transition-all"
                    onClick={() => setCurrentImageIndex(currentImageIndex - 1)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="black" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {showNext && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-opacity-100 transition-all"
                    onClick={() => setCurrentImageIndex(currentImageIndex + 1)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="black" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
                {/* Image counter */}
                {images.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {currentImageIndex + 1} / {images.length}
                  </div>
                )}
              </div>
              <div className="font-semibold text-black mb-2">About this place</div>
              <div className="text-gray-700 mb-4">{currentListing.description}</div>
              <div className="font-semibold text-black mb-2">Location</div>
              <div className="mb-4">
                <PrivacyMap
                  latitude={currentListing.latitude}
                  longitude={currentListing.longitude}
                  city={currentListing.city}
                  state={currentListing.state}
                  neighborhood={currentListing.neighborhood}
                  height="200px"
                />
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