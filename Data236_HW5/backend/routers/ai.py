# backend/routers/ai.py
from __future__ import annotations

import os
from typing import List

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..deps import get_db

router = APIRouter(prefix="/ai", tags=["ai"])

# Use the tag that exists locally (see your /api/tags output)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/chat")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1:latest")

async def call_ollama(messages: List[dict]) -> str:
    """
    Calls the Ollama local server with a messages array and returns the assistant reply text.
    """
    async with httpx.AsyncClient(timeout=90) as client:
        r = await client.post(
            OLLAMA_URL,
            json={"model": OLLAMA_MODEL, "messages": messages, "stream": False},
        )
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail=f"Ollama error: {r.text}")
        data = r.json()
        return (data.get("message") or {}).get("content", "")

@router.post("/chat", response_model=schemas.ChatOut)
async def chat(body: schemas.ChatIn, db: Session = Depends(get_db)):
    """
    Sends a user message to a conversation. If conversation_id is absent, creates one.
    Persists both user and assistant messages, then returns {conversation_id, reply}.
    """
    # --- find or create conversation ---
    if body.conversation_id:
        conv = db.get(models.Conversation, body.conversation_id)
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
    else:
        title = (body.title or body.message.strip()[:60]) or "New Chat"
        conv = models.Conversation(user_id=body.user_id, title=title)
        db.add(conv)
        db.flush()  # populate conv.id

    # --- save user message ---
    db.add(
        models.ChatMessage(
            conversation_id=conv.id,
            role="user",
            content=body.message,
        )
    )
    db.flush()

    # --- build short history for the model (last ~12 messages) ---
    q = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.conversation_id == conv.id)
        .order_by(models.ChatMessage.id.asc())
    )
    msgs = [{"role": m.role, "content": m.content} for m in q.all()]
    history = msgs[-12:] if msgs else [{"role": "user", "content": body.message}]

    # Optional: prepend a system prompt if you want consistent behavior
    # history = [{"role": "system", "content": "You are a helpful assistant."}] + history

    # --- call Ollama ---
    reply_text = await call_ollama(history)

    # --- persist assistant reply ---
    db.add(
        models.ChatMessage(
            conversation_id=conv.id,
            role="assistant",
            content=reply_text,
        )
    )
    db.commit()

    return schemas.ChatOut(conversation_id=conv.id, reply=reply_text)

@router.get("/conversations", response_model=schemas.ConversationsOut)
def list_conversations(
    user_id: int = Query(..., gt=0),
    db: Session = Depends(get_db),
):
    """
    Returns all conversations for a user (most recent first).
    """
    rows = (
        db.query(models.Conversation)
        .filter(models.Conversation.user_id == user_id)
        .order_by(models.Conversation.id.desc())
        .all()
    )
    return {"items": rows}

@router.get("/messages/{conversation_id}", response_model=schemas.MessagesOut)
def list_messages(conversation_id: int, db: Session = Depends(get_db)):
    """
    Returns all messages in a conversation (oldest first).
    """
    rows = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.conversation_id == conversation_id)
        .order_by(models.ChatMessage.id.asc())
        .all()
    )
    return {"items": rows}
