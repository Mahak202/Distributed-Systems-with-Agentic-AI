# app/routers/authors.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/authors", tags=["authors"])

@router.post("", response_model=schemas.AuthorOut, status_code=status.HTTP_201_CREATED)
def create_author(payload: schemas.AuthorCreate, db: Session = Depends(get_db)):
    author = models.Author(**payload.model_dump())
    db.add(author)
    try:
        db.commit()
        db.refresh(author)
    except IntegrityError:
        db.rollback()
        # Likely unique email violation
        raise HTTPException(status_code=409, detail="Email already exists")
    return author

@router.get("", response_model=schemas.AuthorsPage)
def list_authors(
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    total = db.scalar(select(func.count()).select_from(models.Author)) or 0
    items = db.execute(
        select(models.Author)
        .offset((page - 1) * size)
        .limit(size)
        .order_by(models.Author.id)
    ).scalars().all()
    return {"items": items, "meta": {"page": page, "size": size, "total": total}}

@router.get("/{author_id}", response_model=schemas.AuthorOut)
def get_author(author_id: int, db: Session = Depends(get_db)):
    author = db.get(models.Author, author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    return author

@router.put("/{author_id}", response_model=schemas.AuthorOut)
def update_author(author_id: int, payload: schemas.AuthorUpdate, db: Session = Depends(get_db)):
    author = db.get(models.Author, author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(author, field, value)
    try:
        db.commit()
        db.refresh(author)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already exists")
    return author

@router.delete("/{author_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_author(author_id: int, db: Session = Depends(get_db)):
    author = db.get(models.Author, author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    # Prevent deletion if books exist
    count_books = db.scalar(
        select(func.count()).select_from(models.Book).where(models.Book.author_id == author_id)
    )
    if count_books and count_books > 0:
        raise HTTPException(status_code=400, detail="Cannot delete author with existing books")
    db.delete(author)
    db.commit()
    return None

# Extra endpoint: all books by an author
@router.get("/{author_id}/books", response_model=schemas.BooksPage)
def list_books_by_author(
    author_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    # 404 if author missing
    if not db.get(models.Author, author_id):
        raise HTTPException(status_code=404, detail="Author not found")
    total = db.scalar(
        select(func.count()).select_from(models.Book).where(models.Book.author_id == author_id)
    ) or 0
    items = db.execute(
        select(models.Book).where(models.Book.author_id == author_id)
        .offset((page - 1) * size)
        .limit(size)
        .order_by(models.Book.id)
    ).scalars().all()
    return {"items": items, "meta": {"page": page, "size": size, "total": total}}
