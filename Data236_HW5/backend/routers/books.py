# app/routers/books.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/books", tags=["books"])

@router.post("", response_model=schemas.BookOut, status_code=status.HTTP_201_CREATED)
def create_book(payload: schemas.BookCreate, db: Session = Depends(get_db)):
    # Ensure author exists
    if not db.get(models.Author, payload.author_id):
        raise HTTPException(status_code=400, detail="author_id does not exist")
    book = models.Book(**payload.model_dump())
    db.add(book)
    try:
        db.commit()
        db.refresh(book)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="ISBN already exists")
    return book

@router.get("", response_model=schemas.BooksPage)
def list_books(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count()).select_from(models.Book)) or 0
    items = db.execute(
        select(models.Book)
        .offset((page - 1) * size)
        .limit(size)
        .order_by(models.Book.id)
    ).scalars().all()
    return {"items": items, "meta": {"page": page, "size": size, "total": total}}

@router.get("/{book_id}", response_model=schemas.BookOut)
def get_book(book_id: int, db: Session = Depends(get_db)):
    book = db.get(models.Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@router.put("/{book_id}", response_model=schemas.BookOut)
def update_book(book_id: int, payload: schemas.BookUpdate, db: Session = Depends(get_db)):
    book = db.get(models.Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    data = payload.model_dump(exclude_unset=True)
    # If author_id is being changed, ensure it exists
    new_author_id = data.get("author_id")
    if new_author_id and not db.get(models.Author, new_author_id):
        raise HTTPException(status_code=400, detail="author_id does not exist")
    for field, value in data.items():
        setattr(book, field, value)
    try:
        db.commit()
        db.refresh(book)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="ISBN already exists")
    return book

@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_book(book_id: int, db: Session = Depends(get_db)):
    book = db.get(models.Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    db.delete(book)
    db.commit()
    return None
