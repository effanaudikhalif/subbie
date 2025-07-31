"use client";
import React, { useEffect, useState, useRef, Suspense } from "react";
import { useAuth } from "../../hooks/useAuth";
import ChatBox from "../../components/ChatBox";
import Navbar from "../../components/Navbar";
import PrivacyMap from "../../components/PrivacyMap";
import { useSearchParams, useRouter } from "next/navigation";
import { buildApiUrl, buildAvatarUrl } from "../../utils/api";
import Link from "next/link";
import MobileNavbar from "../../components/MobileNavbar";
import MobileFooter from "../../components/MobileFooter";
import LoadingPage from "../../components/LoadingPage";

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

function MessagesPageContent() {
  const { user, loading: authLoading } = useAuth();
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

  // Mobile detection and view states
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<'inbox' | 'chat' | 'details'>('inbox');

  // MobileNavbar state
  const [where, setWhere] = useState('');
  const [dateRange, setDateRange] = useState([{ startDate: null, endDate: null, key: 'selection' }]);

  // Authentication check - redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
            const checkMobile = () => {
          setIsMobile(window.innerWidth < 1024);
        };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-switch to chat when conversation is selected on mobile
  useEffect(() => {
    if (isMobile && selected) {
      setMobileView('chat');
    }
  }, [selected, isMobile]);

  // Clear selection when returning to inbox
  useEffect(() => {
    if (isMobile && mobileView === 'inbox') {
      setSelected(null);
    }
  }, [mobileView, isMobile]);

  // Search handler for MobileNavbar
  const handleSearch = () => {
    const checkin = dateRange[0].startDate ? new Date(dateRange[0].startDate).toISOString().slice(0,10) : '';
    const checkout = dateRange[0].endDate ? new Date(dateRange[0].endDate).toISOString().slice(0,10) : '';
    router.push(
      `/listings?where=${encodeURIComponent(where)}&checkin=${checkin}&checkout=${checkout}`
    );
  };

  // Draggable column state - responsive to viewport width
  const [columnWidths, setColumnWidths] = useState({
    inbox: 320,
    chat: 600,
    details: 384
  });
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartWidths, setDragStartWidths] = useState({ inbox: 0, chat: 0, details: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag handlers
  const handleMouseDown = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(column);
    setDragStartX(e.clientX);
    setDragStartWidths({ ...columnWidths });
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - dragStartX;
    const containerWidth = containerRef.current.offsetWidth;
    
    if (isDragging === 'details') {
      const newDetailsWidth = Math.max(250, Math.min(500, dragStartWidths.details - deltaX));
      const remainingWidth = containerWidth - dragStartWidths.inbox - newDetailsWidth;
      const newChatWidth = Math.max(300, remainingWidth);
      setColumnWidths({
        inbox: dragStartWidths.inbox,
        chat: newChatWidth,
        details: newDetailsWidth
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  // Initialize column widths based on viewport
  useEffect(() => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const inboxWidth = 320;
      const detailsWidth = 384;
      const chatWidth = Math.max(300, containerWidth - inboxWidth - detailsWidth);
      
      setColumnWidths({
        inbox: inboxWidth,
        chat: chatWidth,
        details: detailsWidth
      });
    }
  }, []);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleMouseMove as any);
      document.addEventListener('touchend', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      (document.body.style as any).webkitUserSelect = 'none';
      (document.body.style as any).mozUserSelect = 'none';
      (document.body.style as any).msUserSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove as any);
      document.removeEventListener('touchend', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      (document.body.style as any).webkitUserSelect = '';
      (document.body.style as any).mozUserSelect = '';
      (document.body.style as any).msUserSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleMouseMove as any);
      document.removeEventListener('touchend', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      (document.body.style as any).webkitUserSelect = '';
      (document.body.style as any).mozUserSelect = '';
      (document.body.style as any).msUserSelect = '';
    };
  }, [isDragging, dragStartX, dragStartWidths]);

  useEffect(() => {
    if (!userId) return;
    let isMounted = true;
    async function fetchConversations() {
      if (!isMounted) return;
      setLoading(true);
      const res = await fetch(buildApiUrl(`/api/conversations/user/${userId}`));
      const data = await res.json();
      // Fetch messages for each conversation to check if there are actual messages
      const conversationsWithMessages = await Promise.all(
        data.map(async (conversation: Conversation) => {
          const messagesRes = await fetch(buildApiUrl(`/api/messages/conversation/${conversation.id}`));
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
          const res = await fetch(buildApiUrl(`/api/users/${id}`));
          if (res.ok) userProfilesObj[id] = await res.json();
        }),
        ...listingIds.map(async (id) => {
          const res = await fetch(buildApiUrl(`/api/listings/${id}`));
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

  // Show loading state while auth is being checked or while loading data
  if (authLoading || loading) {
    return <LoadingPage />;
  }

  // If not authenticated, don't render anything (will redirect to login)
  if (!user) {
    return null;
  }

  const currentListing = selected && listingDetails[selected.listing_id];
  const images = currentListing?.images && currentListing.images.length > 0 
    ? currentListing.images 
    : [{ url: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=800&q=80" }];
  const showPrev = currentImageIndex > 0;
  const showNext = currentImageIndex < images.length - 1;

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden">
      {isMobile ? (
        <MobileNavbar
          where={where}
          setWhere={setWhere}
          dateRange={dateRange}
          setDateRange={setDateRange}
          onSearch={handleSearch}
          isMessagesPage={true}
          listingId={selected ? selected.listing_id : undefined}
          isOwner={selected && currentListing ? userId === currentListing.user_id : false}
        />
      ) : (
        <Navbar />
      )}
      {isMobile ? (
        // Mobile Layout
        <div className="flex-1 mt-20 overflow-hidden">
          {mobileView === 'inbox' && (
            <div className="h-full bg-white flex flex-col">
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-gray-400">Loading...</div>
                ) : conversations.length === 0 ? (
                  <div className="p-4 text-gray-400">No messages yet.</div>
                ) : (
                  <div className="p-4">
                    {conversations.map((c) => (
                      <div
                        key={c.id}
                        className={`mb-3 rounded-lg p-3 cursor-pointer transition border border-gray-100 hover:bg-gray-100 ${selected?.id === c.id ? "bg-blue-50 border-blue-400" : ""}`}
                        onClick={() => setSelected(c)}
                      >
                        <div className="flex items-center gap-3">
                          {guestProfiles[getOtherUserId(c)]?.avatar_url ? (
                            <img
                              src={buildAvatarUrl(guestProfiles[getOtherUserId(c)].avatar_url) || ''}
                              alt={guestProfiles[getOtherUserId(c)].name}
                              className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/profile?userId=${getOtherUserId(c)}`);
                              }}
                            />
                          ) : (
                            <div 
                              className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/profile?userId=${getOtherUserId(c)}`);
                              }}
                            >
                              {guestProfiles[getOtherUserId(c)]?.name ? guestProfiles[getOtherUserId(c)].name[0] : 'U'}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="font-semibold text-black">
                              {guestProfiles[getOtherUserId(c)]?.name ? guestProfiles[getOtherUserId(c)].name.split(' ')[0] : "User"}
                            </div>
                            <div className="text-sm text-gray-500">{listingTitles[c.listing_id] || "Listing"}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
                            {/* Mobile Footer - Only show in inbox view */}
              <MobileFooter />
            </div>
          )}

          {mobileView === 'chat' && selected && (
            <div className="h-full flex flex-col">
              <div className="border-b border-gray-200 px-4 py-3 bg-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileView('inbox')}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  {guestProfiles[getOtherUserId(selected)]?.avatar_url ? (
                    <img
                      src={buildAvatarUrl(guestProfiles[getOtherUserId(selected)].avatar_url) || ''}
                      alt={guestProfiles[getOtherUserId(selected)].name}
                      className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        router.push(`/profile?userId=${getOtherUserId(selected)}`);
                      }}
                    />
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        router.push(`/profile?userId=${getOtherUserId(selected)}`);
                      }}
                    >
                      {guestProfiles[getOtherUserId(selected)]?.name ? guestProfiles[getOtherUserId(selected)].name[0] : 'U'}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-bold text-black">
                      {guestProfiles[getOtherUserId(selected)]?.name ? guestProfiles[getOtherUserId(selected)].name.split(' ')[0] : "User"}
                    </div>
                    <div className="text-xs text-gray-500">{listingTitles[selected.listing_id] || "Listing"}</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
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
          )}

          {mobileView === 'details' && selected && currentListing && (
            <div className="h-full bg-white overflow-y-auto">
              <div className="border-b border-gray-200 px-4 py-3 bg-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setMobileView('chat')}
                    className="p-2 rounded-full hover:bg-gray-100"
                  >
                    <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="flex-1">
                    <div className="font-bold text-black">Listing Details</div>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="mb-4">
                  <div className="flex flex-col gap-2">
                    <div className="text-2xl font-bold text-black">
                      {(() => {
                        const { start, end } = selectedRange;
                        let nights = 1;
                        if (start && end) {
                          const diff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                          nights = diff === 0 ? 1 : diff;
                        }
                        if (!selectedRange.start || !selectedRange.end) {
                          return `${formatPrice(Math.round(currentListing.price_per_night))}`;
                        }
                        if (nights === 1) {
                          return `${formatPrice(Math.round(currentListing.price_per_night))}`;
                        }
                        return `${formatPrice(Math.round(currentListing.price_per_night * nights))}`;
                      })()}
                      <span className="text-sm font-normal text-gray-500">
                        {(() => {
                          const { start, end } = selectedRange;
                          if (!start || !end) return '/night';
                          const diff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                          const nights = diff === 0 ? 1 : diff;
                          return nights === 1 ? '/night' : ` for ${nights} nights`;
                        })()}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {currentListing.bedrooms && (
                        <div className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700 flex items-center gap-1">
                          <img src="/icons/bed.png" alt="bed" className="w-4 h-4" />
                          {currentListing.bedrooms} bed{currentListing.bedrooms !== 1 ? 's' : ''}
                        </div>
                      )}
                      {currentListing.bathrooms && (
                        <div className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700 flex items-center gap-1">
                          <img src="/icons/bath-tub.png" alt="bath" className="w-4 h-4" />
                          {currentListing.bathrooms} bath{currentListing.bathrooms !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="font-bold text-lg text-black mb-2">{currentListing.title}</div>
                  <div className="relative w-full h-48 rounded-xl overflow-hidden">
                    <img
                      src={images[currentImageIndex]?.url.startsWith('/uploads/') ? buildApiUrl(images[currentImageIndex].url) : images[currentImageIndex].url}
                      alt={currentListing.title}
                      className="w-full h-full object-cover"
                    />

                  </div>
                </div>

                {currentListing.start_date && currentListing.end_date && (
                  <div className="mb-6">
                    <div className="font-semibold text-black mb-3">Availability</div>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Available:</span>
                        <span className="font-medium">
                          {new Date(currentListing.start_date).toLocaleDateString()} - {new Date(currentListing.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <div className="font-semibold text-black mb-3">Location</div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-700 mb-2">
                      {currentListing.city}, {currentListing.state}
                    </div>
                    <div className="h-32 rounded-lg overflow-hidden">
                      <PrivacyMap
                        latitude={currentListing.latitude}
                        longitude={currentListing.longitude}
                        city={currentListing.city}
                        state={currentListing.state}
                        neighborhood={currentListing.neighborhood}
                        height="128px"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 transition-colors"
                  onClick={() => {
                    // Check if user is logged in
                    if (!user) {
                      router.push('/login');
                      return;
                    }
                    router.push(`/listings/${selected.listing_id}`);
                  }}
                >
                  {userId === currentListing.user_id ? 'View Your Listing' : 'View Full Details'}
                </button>
              </div>
            </div>
          )}

          {mobileView === 'details' && !selected && (
            <div className="h-full flex items-center justify-center text-gray-400">
              Select a conversation to view details
            </div>
          )}
        </div>
      ) : (
        // Desktop Layout
        <div 
          ref={containerRef}
          className="flex flex-1 mt-25 overflow-hidden"
        >
          {/* Inbox Sidebar */}
          <div 
            style={{ 
              width: `${columnWidths.inbox}px`,
              minWidth: '200px',
              flexShrink: 0
            }}
            className="border-r border-gray-200 bg-white p-6 flex flex-col overflow-hidden"
          >
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
                          src={buildAvatarUrl(guestProfiles[getOtherUserId(c)].avatar_url) || ''}
                          alt={guestProfiles[getOtherUserId(c)].name}
                          className="w-8 h-8 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/profile?userId=${getOtherUserId(c)}`);
                          }}
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-base font-bold text-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/profile?userId=${getOtherUserId(c)}`);
                          }}
                        >
                          {guestProfiles[getOtherUserId(c)]?.name ? guestProfiles[getOtherUserId(c)].name[0] : 'U'}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-black">
                          {guestProfiles[getOtherUserId(c)]?.name ? guestProfiles[getOtherUserId(c)].name.split(' ')[0] : "User"}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{listingTitles[c.listing_id] || "Listing"}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Chat Area */}
          <div 
            style={{ 
              width: `${columnWidths.chat}px`,
              minWidth: '300px',
              flex: 1
            }}
            className="flex flex-col border-r border-gray-200 overflow-hidden"
          >
            {selected ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="border-b border-gray-200 px-6 py-3 bg-white flex-shrink-0">
                  <div className="flex items-center gap-3">
                    {/* Avatar clickable in chat header */}
                    {guestProfiles[getOtherUserId(selected)]?.avatar_url ? (
                      <img
                        src={buildAvatarUrl(guestProfiles[getOtherUserId(selected)].avatar_url) || ''}
                        alt={guestProfiles[getOtherUserId(selected)].name}
                        className="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          router.push(`/profile?userId=${getOtherUserId(selected)}`);
                        }}
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          router.push(`/profile?userId=${getOtherUserId(selected)}`);
                        }}
                      >
                        {guestProfiles[getOtherUserId(selected)]?.name ? guestProfiles[getOtherUserId(selected)].name[0] : 'U'}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-lg text-black">
                        {guestProfiles[getOtherUserId(selected)]?.name ? guestProfiles[getOtherUserId(selected)].name.split(' ')[0] : "User"}
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

          {/* Drag Handle 2 */}
          <div
            className={`w-1 transition-colors relative ${
              isDragging === 'details' 
                ? 'bg-blue-500' 
                : 'bg-gray-200 hover:bg-blue-400'
            } cursor-col-resize select-none`}
            onMouseDown={(e) => handleMouseDown('details', e)}
            onTouchStart={(e) => {
              e.preventDefault();
              const touch = e.touches[0];
              handleMouseDown('details', { clientX: touch.clientX } as React.MouseEvent);
            }}
          >
            <div className="absolute inset-y-0 -left-2 -right-2" />
          </div>

          {/* Details Sidebar */}
          <div 
            style={{ 
              width: `${columnWidths.details}px`,
              minWidth: '250px',
              maxWidth: '500px',
              flexShrink: 0
            }}
            className="border-l border-gray-200 bg-white p-6 flex flex-col overflow-hidden"
          >
            {selected && currentListing ? (
              <div className="overflow-y-auto scrollbar-hide">
                <button 
                  className="bg-white border-2 border-gray-200 text-black px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors w-full"
                  onClick={() => {
                    // Check if user is logged in
                    if (!user) {
                      router.push('/login');
                      return;
                    }
                    router.push(`/listings/${selected.listing_id}`);
                  }}
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

                </div>
                {/* Price (now the section title above the calendar) */}
                {currentListing.price_per_night && (
                  <div className="mb-4">
                    <div className="flex flex-col gap-2">
                      <div className="text-2xl font-bold text-black">
                        {(() => {
                          const { start, end } = selectedRange;
                          let nights = 1;
                          if (start && end) {
                            const diff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                            nights = diff === 0 ? 1 : diff;
                          }
                          if (!selectedRange.start || !selectedRange.end) {
                            return `${formatPrice(Math.round(currentListing.price_per_night))}`;
                          }
                          if (nights === 1) {
                            return `${formatPrice(Math.round(currentListing.price_per_night))}`;
                          }
                          return `${formatPrice(Math.round(currentListing.price_per_night * nights))}`;
                        })()}
                        <span className="text-sm font-normal text-gray-500">
                          {(() => {
                            const { start, end } = selectedRange;
                            if (!start || !end) return '/night';
                            const diff = Math.abs((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                            const nights = diff === 0 ? 1 : diff;
                            return nights === 1 ? '/night' : ` for ${nights} nights`;
                          })()}
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {currentListing.bedrooms && (
                          <div className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700 flex items-center gap-1">
                            <img src="/icons/bed.png" alt="bed" className="w-4 h-4" />
                            {currentListing.bedrooms} bed{currentListing.bedrooms !== 1 ? 's' : ''}
                          </div>
                        )}
                        {currentListing.bathrooms && (
                          <div className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700 flex items-center gap-1">
                            <img src="/icons/bath-tub.png" alt="bath" className="w-4 h-4" />
                            {currentListing.bathrooms} bath{currentListing.bathrooms !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
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
                <div className="mb-4 mt-4">
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
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MessagesPageContent />
    </Suspense>
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
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  
  // Initialize month/year to show the start date if it exists, otherwise today
  const initialDate = selectedRange.start || today;
  const [month, setMonth] = useState(initialDate.getMonth());
  const [year, setYear] = useState(initialDate.getFullYear());

  // Generate days for the current month
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const firstDayWeekday = firstDayOfMonth.getDay();
  const calendarDays = [];
  for (let i = 0; i < firstDayWeekday; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isAvailable = date >= start && date <= end && date >= today;
    let isSelected = false;
    let isStartDate = false;
    let isEndDate = false;

    // Always mark isStartDate if the date matches selectedRange.start
    if (selectedRange.start && date.getTime() === selectedRange.start.getTime()) {
      isStartDate = true;
    }
    // Always mark isEndDate if the date matches selectedRange.end
    if (selectedRange.end && date.getTime() === selectedRange.end.getTime()) {
      isEndDate = true;
    }

    // Range selection logic
    if (selectedRange.start && selectedRange.end) {
      isSelected = date >= selectedRange.start && date <= selectedRange.end;
    }
    // Show hover range when we have a start date but no end date yet
    if (selectedRange.start && !selectedRange.end && hoverDate && date > selectedRange.start && date <= hoverDate) {
      isSelected = true;
    }
    calendarDays.push({
      day,
      isAvailable,
      isSelected,
      isStartDate,
      isEndDate,
      date
    });
  }

  // Handle single date clicks for better UX
  function handleDateClick(dayData: any) {
    if (!dayData.isAvailable) return;
    
    // If no start date is selected, set it as check-in
    if (!selectedRange.start) {
      setSelectedRange({ start: dayData.date, end: null });
    }
    // If start date is selected but no end date, set end date (check-out)
    else if (selectedRange.start && !selectedRange.end) {
      if (dayData.date >= selectedRange.start) {
        setSelectedRange({ start: selectedRange.start, end: dayData.date });
      } else {
        // If selected date is before start date, make it the new start date
        setSelectedRange({ start: dayData.date, end: null });
      }
    }
    // If both dates are selected, start a new selection
    else {
      setSelectedRange({ start: dayData.date, end: null });
    }
  }

  // Handle hover for range preview
  function handleMouseEnter(dayData: any) {
    if (!dayData.isAvailable) return;
    
    // If we have a start date but no end date, show hover preview for future dates
    if (selectedRange.start && !selectedRange.end && dayData.date > selectedRange.start) {
      setHoverDate(dayData.date);
    }
  }

  // Clear hover when leaving calendar
  function handleMouseLeave() {
    setHoverDate(null);
  }

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  }
  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 select-none" onMouseLeave={handleMouseLeave}>
      <div className="flex items-center justify-between mb-2">
        <button onClick={prevMonth} className="text-gray-400 hover:text-black px-2 py-1" disabled={month === today.getMonth() && year === today.getFullYear()}>&lt;</button>
        <div className="text-center text-sm font-medium text-gray-900">{new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        <button onClick={nextMonth} className="text-gray-400 hover:text-black px-2 py-1">&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-gray-500 py-1">{day}</div>
        ))}
        {calendarDays.map((dayData, index) => (
          <div
            key={index}
            className="text-center py-1"
            onClick={dayData && dayData.isAvailable ? () => handleDateClick(dayData) : undefined}
            onMouseEnter={dayData && dayData.isAvailable ? () => handleMouseEnter(dayData) : undefined}
            style={{ cursor: dayData && dayData.isAvailable ? 'pointer' : 'default' }}
          >
            {dayData ? (
              <div className={
                `w-6 h-6 rounded-full flex items-center justify-center mx-auto
                ${dayData.isStartDate
                  ? 'text-white font-semibold'
                  : dayData.isEndDate
                    ? 'text-white font-semibold'
                    : dayData.isSelected
                      ? 'text-[#368a98] border border-[#368a98]'
                      : dayData.isAvailable
                        ? 'hover:bg-gray-100 text-gray-800 border border-transparent'
                        : 'text-gray-400'}
                ${dayData.isStartDate || dayData.isEndDate ? 'bg-[#368a98] border-[#368a98]' : dayData.isSelected ? 'bg-[#368a98]/20' : ''}`
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
        <span className="inline-block w-3 h-3 bg-[#368a98] border border-[#368a98] rounded-full ml-4 mr-1"></span>
        Selected
      </div>
    </div>
  );
} 