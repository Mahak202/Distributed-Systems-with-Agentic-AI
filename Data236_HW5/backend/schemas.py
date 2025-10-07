# backend/schemas.py  (adjust path/imports if your file lives under app/)
from __future__ import annotations

from typing import List, Optional, Literal

from pydantic import BaseModel, EmailStr, ConfigDict, Field

# =========================
# Authors
# =========================
class AuthorBase(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: EmailStr

class AuthorCreate(AuthorBase):
    pass

class AuthorUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str]  = Field(default=None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None

class AuthorOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    model_config = ConfigDict(from_attributes=True)

# =========================
# Books
# =========================
class BookBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    isbn: str = Field(min_length=5, max_length=20)
    publication_year: int
    available_copies: int = 1
    author_id: int

class BookCreate(BookBase):
    pass

class BookUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=255)
    isbn: Optional[str] = Field(default=None, min_length=5, max_length=20)
    publication_year: Optional[int] = None
    available_copies: Optional[int] = None
    author_id: Optional[int] = None

class BookOut(BaseModel):
    id: int
    title: str
    isbn: str
    publication_year: int
    available_copies: int
    author_id: int
    model_config = ConfigDict(from_attributes=True)

# Optional pagination wrappers (unused by the chat API but left intact)
class PageMeta(BaseModel):
    page: int
    size: int
    total: int

class AuthorsPage(BaseModel):
    items: List[AuthorOut]
    meta: PageMeta

class BooksPage(BaseModel):
    items: List[BookOut]
    meta: PageMeta

# =========================
# AI Chat (Ollama)
# =========================
Role = Literal["user", "assistant", "system"]

class ChatIn(BaseModel):
    user_id: int
    message: str
    conversation_id: Optional[int] = None
    title: Optional[str] = None

class ChatOut(BaseModel):
    conversation_id: int
    reply: str

class ConversationOut(BaseModel):
    id: int
    user_id: int
    title: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ChatMessageOut(BaseModel):
    id: int
    role: Role
    content: str
    created_at: Optional[str] = None  # if your model has this
    model_config = ConfigDict(from_attributes=True)

class ConversationsOut(BaseModel):
    items: List[ConversationOut]

class MessagesOut(BaseModel):
    items: List[ChatMessageOut]
