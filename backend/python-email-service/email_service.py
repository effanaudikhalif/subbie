import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from jinja2 import Environment, FileSystemLoader
from config import config
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.from_email = config.EMAIL_FROM_ADDRESS
        self.from_name = config.EMAIL_FROM_NAME
        self.provider = config.EMAIL_PROVIDER
        
        # Setup Jinja2 template environment
        self.template_env = Environment(
            loader=FileSystemLoader('templates')
        )
        
        # Setup SendGrid if configured
        if self.provider == "sendgrid" and config.SENDGRID_API_KEY:
            self.sendgrid_client = SendGridAPIClient(api_key=config.SENDGRID_API_KEY)
        else:
            self.sendgrid_client = None
    
    def send_smtp_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email using SMTP"""
        try:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT) as server:
                server.starttls()
                server.login(config.SMTP_USER, config.SMTP_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"SMTP email sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"SMTP email failed to {to_email}: {e}")
            return False
    
    def send_sendgrid_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email using SendGrid"""
        try:
            message = Mail(
                from_email=self.from_email,
                to_emails=to_email,
                subject=subject,
                html_content=html_content
            )
            
            response = self.sendgrid_client.send(message)
            logger.info(f"SendGrid email sent to {to_email}, status: {response.status_code}")
            return True
        except Exception as e:
            logger.error(f"SendGrid email failed to {to_email}: {e}")
            return False
    
    def send_email(self, to_email: str, subject: str, html_content: str) -> bool:
        """Send email using configured provider"""
        if self.provider == "sendgrid" and self.sendgrid_client:
            return self.send_sendgrid_email(to_email, subject, html_content)
        else:
            return self.send_smtp_email(to_email, subject, html_content)
    
    def render_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """Render HTML email template"""
        try:
            template = self.template_env.get_template(template_name)
            return template.render(**context)
        except Exception as e:
            logger.error(f"Template rendering failed for {template_name}: {e}")
            return ""
    
    def send_message_notification(self, recipient_email: str, sender_name: str, message_preview: str, conversation_url: str) -> bool:
        """Send a new message notification email"""
        subject = f"New message from {sender_name} on Subly"
        
        context = {
            'sender_name': sender_name,
            'message_preview': message_preview,
            'conversation_url': conversation_url,
            'app_name': 'Subly'
        }
        
        html_content = self.render_template('message_notification.html', context)
        
        if html_content:
            return self.send_email(recipient_email, subject, html_content)
        return False

    def send_listing_added_notification(self, recipient_email: str, host_name: str, listing_title: str, listing_address: str, listing_price: str, start_date: str, end_date: str, listing_url: str) -> bool:
        """Send a listing added notification email"""
        subject = f"Your listing '{listing_title}' has been added to Subly"
        
        context = {
            'host_name': host_name,
            'listing_title': listing_title,
            'listing_address': listing_address,
            'listing_price': listing_price,
            'start_date': start_date,
            'end_date': end_date,
            'listing_url': listing_url,
            'app_name': 'Subly'
        }
        
        html_content = self.render_template('listing_added.html', context)
        
        if html_content:
            return self.send_email(recipient_email, subject, html_content)
        return False

    def send_listing_edited_notification(self, recipient_email: str, host_name: str, listing_title: str, listing_address: str, listing_price: str, start_date: str, end_date: str, listing_url: str) -> bool:
        """Send a listing edited notification email"""
        subject = f"Your listing '{listing_title}' has been updated on Subly"
        
        context = {
            'host_name': host_name,
            'listing_title': listing_title,
            'listing_address': listing_address,
            'listing_price': listing_price,
            'start_date': start_date,
            'end_date': end_date,
            'listing_url': listing_url,
            'app_name': 'Subly'
        }
        
        html_content = self.render_template('listing_edited.html', context)
        
        if html_content:
            return self.send_email(recipient_email, subject, html_content)
        return False

    def send_listing_deleted_notification(self, recipient_email: str, host_name: str, listing_title: str, listing_address: str, listing_price: str, removal_date: str, dashboard_url: str) -> bool:
        """Send a listing deleted notification email"""
        subject = f"Your listing '{listing_title}' has been removed from Subly"
        
        context = {
            'host_name': host_name,
            'listing_title': listing_title,
            'listing_address': listing_address,
            'listing_price': listing_price,
            'removal_date': removal_date,
            'dashboard_url': dashboard_url,
            'app_name': 'Subly'
        }
        
        html_content = self.render_template('listing_deleted.html', context)
        
        if html_content:
            return self.send_email(recipient_email, subject, html_content)
        return False

    def send_listing_expired_notification(self, recipient_email: str, host_name: str, listing_title: str, listing_address: str, listing_price: str, end_date: str, expiration_date: str, dashboard_url: str) -> bool:
        """Send a listing expired notification email"""
        subject = f"Your listing '{listing_title}' has expired on Subly"
        
        context = {
            'host_name': host_name,
            'listing_title': listing_title,
            'listing_address': listing_address,
            'listing_price': listing_price,
            'end_date': end_date,
            'expiration_date': expiration_date,
            'dashboard_url': dashboard_url,
            'app_name': 'Subly'
        }
        
        html_content = self.render_template('listing_expired.html', context)
        
        if html_content:
            return self.send_email(recipient_email, subject, html_content)
        return False

email_service = EmailService() 