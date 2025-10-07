# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import authors, books, ai

app = FastAPI(
    title="Library Management API",
    version="0.1.0",
)

# Option A: explicit list of allowed dev origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175",
        "http://localhost:5176", "http://127.0.0.1:5176",
        "http://localhost:5177", "http://127.0.0.1:5177",
        "http://localhost:5178", "http://127.0.0.1:5178",
        "http://localhost:3000", "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Alternatively, uncomment this and delete the block above to allow any localhost port ---
# app.add_middleware(
#     CORSMiddleware,
#     allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+$",
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# Auto-create tables for this homework (OK instead of Alembic)
@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)

# Routers
app.include_router(authors.router)
app.include_router(books.router)
app.include_router(ai.router)

# Meta endpoints
@app.get("/", tags=["meta"])
def root():
    return {"status": "ok", "service": "library-api"}

@app.get("/health", tags=["meta"])
def health():
    return {"ok": True}
