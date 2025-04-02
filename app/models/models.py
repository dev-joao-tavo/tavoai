from base import Base
import bcrypt
from sqlalchemy import Column, Integer, String, ForeignKey, Text, TIMESTAMP, JSON, DateTime, func
from sqlalchemy.orm import relationship
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)  
    user_wpp_phone_number = Column(String, unique=True, index=True)
    user_current_status = Column(String)
    message_history = relationship("MessageHistory", back_populates="user")
    driver_status = Column(String)

    def set_password(self, password: str):
        """Hashes a password and stores it securely"""
        self.password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def check_password(self, password: str) -> bool:
        """Checks if the given password matches the stored hash"""
        return bcrypt.checkpw(password.encode(), self.password_hash.encode())
    
class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer)
    name = Column(String, nullable=False)
    board_type = Column(String)
   

class Contact(Base):
    __tablename__ = "contacts"
 
    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, nullable=False)    
    contact_name = Column(String)
    user_id = Column(Integer)
    last_message_contact = Column(TIMESTAMP)
    each_contact_notes = Column(String)




class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="CASCADE"))
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"))
    title = Column(String, nullable=False)
    status = Column(String)
    last_message = Column(TIMESTAMP)
    sending_message_status = Column(String)



class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"))
    sender = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(TIMESTAMP)



class UserMessages(Base):
    __tablename__ = "user_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)  # Associates messages with a specific user
    status = Column(String(50), nullable=False)  # e.g., "day-1", "monday", etc.
    message = Column(Text, nullable=False)  # The actual message content
    created_at = Column(DateTime, default=func.now())  # Timestamp for when the message was created
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())  # Timestamp for when the message was last updated

class MessageHistory(Base):
    __tablename__ = "message_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    message_content = Column(Text, nullable=False)
    
    # Tracking successful and failed deliveries
    successful_recipients = Column(JSONB, default=[])
    failed_recipients = Column(JSONB, default=[])

    # Status tracking
    total_recipients = Column(Integer, default=0)    
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    
    # Timestamps
    sent_at = Column(DateTime, default=func.now(), index=True)
    completed_at = Column(DateTime)
    
    # Additional metadata
    message_type = Column(String(50), index=True) 
    channel = Column(String(20), index=True)
    
    # Relationships
    user = relationship("User", back_populates="message_history")
    
    def __init__(self, user_id: int, message_content: str, **kwargs):
        self.user_id = user_id
        self.message_content = message_content
        self.sent_at = datetime.utcnow()
        
        # Set additional attributes if provided
        for key, value in kwargs.items():
            setattr(self, key, value)
    
    def add_recipient(self, contact_id: int, success: bool):
        """Add a recipient to either successful or failed list"""
        if success:
            self.successful_recipients.append(contact_id)
            self.success_count += 1
        else:
            self.failed_recipients.append(contact_id)
            self.failure_count += 1
        
        self.total_recipients = self.success_count + self.failure_count
        
        # Mark as completed if this was the last recipient
        if len(self.successful_recipients) + len(self.failed_recipients) == self.total_recipients:
            self.completed_at = datetime.utcnow()
