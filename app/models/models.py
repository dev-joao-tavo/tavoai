from sqlalchemy import Column, Integer, String, ForeignKey, Text, TIMESTAMP, Enum
from sqlalchemy.orm import relationship
from base import Base
import bcrypt
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import DateTime, func

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)  # Ensure this matches the migration
    user_wpp_phone_number = Column(String, primary_key=True, index=True)


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




class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="CASCADE"))
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"))
    title = Column(String, nullable=False)
    status = Column(String)
    last_message = Column(TIMESTAMP)



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

