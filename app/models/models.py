from sqlalchemy import Column, Integer, String, ForeignKey, Text, TIMESTAMP, Enum
from sqlalchemy.orm import relationship
from base import Base
import bcrypt

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    chrome_profile = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)  # Ensure this matches the migration

    boards = relationship("Board", back_populates="user")


    def set_password(self, password: str):
        """Hashes a password and stores it securely"""
        self.password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    def check_password(self, password: str) -> bool:
        """Checks if the given password matches the stored hash"""
        return bcrypt.checkpw(password.encode(), self.password_hash.encode())
    
class Board(Base):
    __tablename__ = "boards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)

    user = relationship("User", back_populates="boards")
    cards = relationship("Card", back_populates="board")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, nullable=False)
    contact_name = Column(String, nullable=False)

    cards = relationship("Card", back_populates="contact")


class Card(Base):
    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="CASCADE"))
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"))
    title = Column(String, nullable=False)
    status = Column(Enum("todo", "in-progress", "done", name="card_status"), default="todo")
    last_message = Column(TIMESTAMP)

    board = relationship("Board", back_populates="cards")
    contact = relationship("Contact", back_populates="cards")
    messages = relationship("Message", back_populates="card")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    card_id = Column(Integer, ForeignKey("cards.id", ondelete="CASCADE"))
    sender = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    timestamp = Column(TIMESTAMP)

    card = relationship("Card", back_populates="messages")
