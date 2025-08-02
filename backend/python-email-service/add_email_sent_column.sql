-- Add email_sent column to messages table for tracking email notifications
-- Run this on your database to enable proper email notification tracking

-- Check if column already exists (optional check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'email_sent'
    ) THEN
        -- Add the email_sent column
        ALTER TABLE messages ADD COLUMN email_sent BOOLEAN DEFAULT FALSE;
        
        -- Add an index for performance
        CREATE INDEX idx_messages_email_sent ON messages(email_sent);
        
        -- Add a comment
        COMMENT ON COLUMN messages.email_sent IS 'Tracks whether an email notification has been sent for this message';
        
        RAISE NOTICE 'Added email_sent column to messages table';
    ELSE
        RAISE NOTICE 'email_sent column already exists in messages table';
    END IF;
END $$; 