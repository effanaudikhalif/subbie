from supabase import create_client, Client
from config import config
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class Database:
    def __init__(self):
        self.supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user information by user ID"""
        try:
            response = self.supabase.table('users').select('*').eq('id', user_id).execute()
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f"Error getting user {user_id}: {e}")
            return None
    
    def get_new_messages(self, last_check_time: str) -> List[Dict[str, Any]]:
        """Get new messages since last check"""
        try:
            # Get all messages since last check time (no email_sent filtering)
            response = self.supabase.table('messages').select('*').gte('sent_at', last_check_time).execute()
            logger.info(f"Found {len(response.data)} recent messages since {last_check_time}")
            return response.data
        except Exception as e:
            logger.error(f"Error getting new messages: {e}")
            return []
    
    def get_conversation_participants(self, conversation_id: str) -> List[Dict[str, Any]]:
        """Get participants of a conversation"""
        try:
            response = self.supabase.table('conversations').select('*').eq('id', conversation_id).execute()
            if response.data:
                conversation = response.data[0]
                # Get participants (guest_id and host_id)
                participants = []
                if conversation.get('guest_id'):
                    guest = self.get_user_by_id(conversation['guest_id'])
                    if guest:
                        participants.append(guest)
                if conversation.get('host_id'):
                    host = self.get_user_by_id(conversation['host_id'])
                    if host:
                        participants.append(host)
                return participants
            return []
        except Exception as e:
            logger.error(f"Error getting conversation participants: {e}")
            return []
    
    def mark_message_notified(self, message_id: str):
        """Log that a message notification was sent (no database tracking)"""
        # Since we're not using email_sent column, just log it
        logger.info(f"Email notification sent for message {message_id} (not tracked in database)")

db = Database() 