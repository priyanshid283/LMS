import secrets
import string
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from models import User
from auth import get_password_hash

def generate_reset_token() -> str:
    """Generate a secure random token for password reset"""
    alphabet = string.ascii_letters + string.digits
    token = ''.join(secrets.choice(alphabet) for _ in range(32))
    return token

def get_token_expiry(minutes: int = 30) -> datetime:
    """Get expiration time for reset token"""
    return datetime.utcnow() + timedelta(minutes=minutes)

def send_reset_email(email: str, token: str, reset_url: str = "http://localhost:5173/reset-password"):
    """
    Send password reset email
    In production, use a proper email service like SendGrid, Mailgun, or SMTP
    """
    reset_link = f"{reset_url}?token={token}"
    
    # Email content
    subject = "Password Reset Request - AI Learning Platform"
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password for your AI Learning Platform account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="{reset_link}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 30 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <br>
        <p>Best regards,<br>AI Learning Platform Team</p>
    </body>
    </html>
    """
    
    # For development, just print the token (remove in production)
    print(f"\n{'='*50}")
    print(f"PASSWORD RESET TOKEN FOR {email}")
    print(f"Token: {token}")
    print(f"Reset Link: {reset_link}")
    print(f"{'='*50}\n")
    
    return True

def create_password_reset_token(db: Session, email: str):
    """Create a password reset token for user"""
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        return None
    
    # Generate token and set expiry (30 minutes)
    token = generate_reset_token()
    user.reset_token = token
    user.reset_token_expires = get_token_expiry(30)
    
    db.commit()
    
    # Send email with reset link
    send_reset_email(email, token)
    
    return user

def reset_password(db: Session, token: str, new_password: str):
    """Reset user password using token"""
    user = db.query(User).filter(
        User.reset_token == token,
        User.reset_token_expires > datetime.utcnow()
    ).first()
    
    if not user:
        return None
    
    # Update password
    user.password = get_password_hash(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    
    db.commit()
    
    return user

def validate_reset_token(db: Session, token: str):
    """Validate if reset token is valid"""
    user = db.query(User).filter(
        User.reset_token == token,
        User.reset_token_expires > datetime.utcnow()
    ).first()
    
    return user is not None