"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import ChatBox from "../../components/ChatBox";
import Navbar from "../../components/Navbar";
import PrivacyMap from "../../components/PrivacyMap";
import { useSearchParams, useRouter } from "next/navigation";
import ProfileModal from "../../components/ProfileModal";

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

// Add formatPrice helper at the top level
function formatPrice(price: number) {
  const formatted = Number(price).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  return formatted.startsWith('$') ? formatted : `$${formatted}`;
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
  const [selectedRange, setSelectedRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);

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
                  <div className="flex items-center gap-2">
                    {/* Avatar clickable */}
                    {guestProfiles[getOtherUserId(c)]?.avatar_url ? (
                      <img
                        src={guestProfiles[getOtherUserId(c)].avatar_url}
                        alt={guestProfiles[getOtherUserId(c)].name}
                        className="w-8 h-8 rounded-full object-cover cursor-pointer"
                        onClick={e => { e.stopPropagation(); setProfileModalUserId(getOtherUserId(c)); }}
                      />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-base font-bold text-gray-700 cursor-pointer"
                        onClick={e => { e.stopPropagation(); setProfileModalUserId(getOtherUserId(c)); }}
                      >
                        {guestProfiles[getOtherUserId(c)]?.name ? guestProfiles[getOtherUserId(c)].name[0] : 'U'}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-black">
                        {guestProfiles[getOtherUserId(c)]?.name || "User"}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{listingTitles[c.listing_id] || "Listing"}</div>
                    </div>
                  </div>
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
                  {/* Avatar clickable in chat header */}
                  {guestProfiles[getOtherUserId(selected)]?.avatar_url ? (
                    <img
                      src={guestProfiles[getOtherUserId(selected)].avatar_url}
                      alt={guestProfiles[getOtherUserId(selected)].name}
                      className="w-12 h-12 rounded-full object-cover cursor-pointer"
                      onClick={() => setProfileModalUserId(getOtherUserId(selected))}
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-700 cursor-pointer"
                      onClick={() => setProfileModalUserId(getOtherUserId(selected))}
                    >
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
                className="bg-white border border-gray-200 rounded-2xl px-4 py-2 font-medium shadow-sm hover:bg-gray-50 transition-colors text-black mb-4 w-fit"
                onClick={() => router.push(`/listings/${selected.listing_id}`)}
              >
                {userId === currentListing.user_id ? 'Your Listing' : 'View Listing'}
              </button>
              <div className="font-bold text-lg text-black mb-4 pt-6">{currentListing.title}</div>
              {/* Gallery */}
              <div className="relative w-full h-48 mb-6 group">
                <img
                  src={images[currentImageIndex]?.url.startsWith('/uploads/') ? `http://localhost:4000${images[currentImageIndex].url}` : images[currentImageIndex].url}
                  alt={currentListing.title}
                  className="w-full h-48 object-cover rounded-xl"
                />
                {showPrev && (
                  <button
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-opacity-100 transition-all opacity-0 group-hover:opacity-100"
                    onClick={() => setCurrentImageIndex(currentImageIndex - 1)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="black" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {showNext && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-1 shadow hover:bg-opacity-100 transition-all opacity-0 group-hover:opacity-100"
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
              {/* Price (now the section title above the calendar) */}
              {currentListing.price_per_night && (
                <div className="font-semibold text-black mt-4 mb-2">
                  {(() => {
                    const { start, end } = selectedRange;
                    let nights = 1;
                    if (start && end) {
                      const diff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                      nights = diff === 0 ? 1 : diff;
                    }
                    if (!selectedRange.start || !selectedRange.end) {
                      return `${formatPrice(Math.round(currentListing.price_per_night))} per night`;
                    }
                    if (nights === 1) {
                      return `${formatPrice(Math.round(currentListing.price_per_night))} per night`;
                    }
                    return `${formatPrice(Math.round(currentListing.price_per_night * nights))} for ${nights} nights`;
                  })()}
                </div>
              )}
              {currentListing.start_date && currentListing.end_date ? (
                <CompactCalendar
                  startDate={currentListing.start_date}
                  endDate={currentListing.end_date}
                  selectedRange={selectedRange}
                  setSelectedRange={setSelectedRange}
                />
              ) : (
                <div className="text-gray-500">No calendar available.</div>
              )}
              <div className="font-semibold text-black mt-4 mb-2">Location</div>
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
      {/* Profile Modal for any user */}
      <ProfileModal
        isOpen={!!profileModalUserId}
        userId={profileModalUserId}
        onClose={() => setProfileModalUserId(null)}
      />
    </div>
  );
} 

function CompactCalendar({ startDate, endDate, selectedRange, setSelectedRange }: {
  startDate: string,
  endDate: string,
  selectedRange: { start: Date | null, end: Date | null },
  setSelectedRange: (range: { start: Date | null, end: Date | null }) => void
}) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const rawStart = new Date(startDate);
  const start = rawStart < today ? today : rawStart;
  const end = new Date(endDate);
  const currentDate = new Date();
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragEnd, setDragEnd] = useState<Date | null>(null);

  function getMonthsInRange(start: Date, end: Date) {
    const months = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (current <= last) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  }
  const months = getMonthsInRange(start, end);
  const [currentMonthIdx, setCurrentMonthIdx] = useState(0);
  const monthDate = months[currentMonthIdx];

  function handleMouseDown(dayData: any) {
    if (!dayData.isAvailable) return;
    setDragging(true);
    setDragStart(dayData.date);
    setDragEnd(dayData.date);
  }
  function handleMouseEnter(dayData: any) {
    if (!dragging || !dayData.isAvailable) return;
    setDragEnd(dayData.date);
  }
  function handleMouseUp(dayData: any) {
    if (!dragging || !dayData.isAvailable) return;
    setDragging(false);
    const min = dragStart && dragEnd && dragStart < dragEnd ? dragStart : dragEnd;
    const max = dragStart && dragEnd && dragStart > dragEnd ? dragStart : dragEnd;
    setSelectedRange({
      start: min,
      end: max
    });
    setDragStart(null);
    setDragEnd(null);
  }
  function handleTouchStart(dayData: any) {
    if (!dayData.isAvailable) return;
    setDragging(true);
    setDragStart(dayData.date);
    setDragEnd(dayData.date);
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
    const target = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
    if (target && (target as HTMLElement).dataset && (target as HTMLElement).dataset.day) {
      const day = parseInt((target as HTMLElement).dataset.day!);
      const month = parseInt((target as HTMLElement).dataset.month!);
      const year = parseInt((target as HTMLElement).dataset.year!);
      const date = new Date(year, month, day);
      if (date >= start && date <= end) setDragEnd(date);
    }
  }
  function handleTouchEnd(dayData: any) {
    if (!dragging || !dayData.isAvailable) return;
    setDragging(false);
    const min = dragStart && dragEnd && dragStart < dragEnd ? dragStart : dragEnd;
    const max = dragStart && dragEnd && dragStart > dragEnd ? dragStart : dragEnd;
    setSelectedRange({
      start: min,
      end: max
    });
    setDragStart(null);
    setDragEnd(null);
  }

  if (!monthDate) return null;
  const month = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const firstDayWeekday = firstDayOfMonth.getDay();
  const calendarDays = [];
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    const isAvailable = date >= start && date <= end && date >= today;
    const isToday = date.toDateString() === currentDate.toDateString();
    let isSelected = false;
    if (selectedRange.start && selectedRange.end) {
      isSelected = date >= selectedRange.start && date <= selectedRange.end;
    }
    if (dragStart && dragEnd) {
      const dragMin = dragStart < dragEnd ? dragStart : dragEnd;
      const dragMax = dragStart > dragEnd ? dragStart : dragEnd;
      if (date >= dragMin && date <= dragMax) isSelected = true;
    }
    calendarDays.push({
      day,
      isAvailable,
      isToday,
      isSelected,
      date,
      month: monthDate.getMonth(),
      year: monthDate.getFullYear(),
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 select-none">
      <div className="flex items-center justify-between mb-2">
        <button
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-40"
          onClick={() => setCurrentMonthIdx(idx => Math.max(0, idx - 1))}
          disabled={currentMonthIdx === 0}
          aria-label="Previous month"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="text-center text-sm font-medium text-gray-900">{month}</div>
        <button
          className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-40"
          onClick={() => setCurrentMonthIdx(idx => Math.min(months.length - 1, idx + 1))}
          disabled={currentMonthIdx === months.length - 1}
          aria-label="Next month"
        >
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-gray-500 py-1">{day}</div>
        ))}
        {calendarDays.map((dayData, index) => (
          <div
            key={index}
            className="text-center py-1"
            data-day={dayData?.day}
            data-month={dayData?.month}
            data-year={dayData?.year}
            onMouseDown={dayData && dayData.isAvailable ? () => handleMouseDown(dayData) : undefined}
            onMouseEnter={dayData && dayData.isAvailable ? () => handleMouseEnter(dayData) : undefined}
            onMouseUp={dayData && dayData.isAvailable ? () => handleMouseUp(dayData) : undefined}
            onTouchStart={dayData && dayData.isAvailable ? () => handleTouchStart(dayData) : undefined}
            onTouchMove={handleTouchMove}
            onTouchEnd={dayData && dayData.isAvailable ? () => handleTouchEnd(dayData) : undefined}
            style={{ cursor: dayData && dayData.isAvailable ? 'pointer' : 'default' }}
          >
            {dayData ? (
              <div className={
                `w-6 h-6 rounded-full flex items-center justify-center mx-auto
                ${dayData.isSelected
                  ? 'bg-blue-500 text-white border-blue-600'
                  : dayData.isAvailable
                    ? 'bg-green-100 text-green-800 border border-green-300'
                    : 'text-gray-400'}
                ${dayData.isToday && !dayData.isSelected ? 'ring-2 ring-blue-400' : ''}`
              }>
                {dayData.day}
              </div>
            ) : (
              <div className="w-6 h-6"></div>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-gray-600 text-center">
        <span className="inline-block w-3 h-3 bg-green-100 border border-green-300 rounded-full mr-1"></span>
        Available
        <span className="inline-block w-3 h-3 bg-blue-500 border border-blue-600 rounded-full ml-4 mr-1"></span>
        Selected
      </div>
    </div>
  );
} 