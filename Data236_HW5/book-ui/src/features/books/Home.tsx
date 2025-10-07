// src/features/books/home.tsx
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchBooks,
  deleteBook,
  selectBooks,
  selectBooksLoading,
  selectBooksError,
} from "./booksSlice";
import type { Book } from "./booksSlice";
import type { AppDispatch } from "../../app/store";
import BookForm from "./booksForm";

export default function Home() {
  const dispatch = useDispatch<AppDispatch>();
  const books = useSelector(selectBooks);
  const loading = useSelector(selectBooksLoading);
  const error = useSelector(selectBooksError);

  const [editing, setEditing] = useState<Book | null>(null);
  const [idToEdit, setIdToEdit] = useState<number | "">("");

  useEffect(() => {
    dispatch(fetchBooks());
  }, [dispatch]);

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto" }}>
      <h1>Library Manager (FastAPI + Redux Toolkit)</h1>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
        {/* LEFT: List */}
        <div>
          <h2>Books</h2>
          {loading && <p>Loading…</p>}
          {error && <p style={{ color: "crimson" }}>{error}</p>}

          <div style={{ marginBottom: 12 }}>
            <input
              placeholder="Enter ID to edit…"
              type="number"
              value={idToEdit}
              onChange={(e) =>
                setIdToEdit(e.target.value === "" ? "" : Number(e.target.value))
              }
              style={{ width: 160, marginRight: 8 }}
            />
            <button
              onClick={() => {
                if (idToEdit === "") return;
                const found = books.find((x) => x.id === Number(idToEdit));
                if (found) setEditing(found);
                else alert("No book with that ID in the list.");
              }}
            >
              Load by ID
            </button>
          </div>

          {books.length === 0 ? (
            <p>No books yet. Create one on the right.</p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0 }}>
              {books.map((b) => (
                <li
                  key={b.id}
                  style={{
                    border: "1px solid #2e2e2e",
                    padding: 12,
                    marginBottom: 12,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{b.title}</div>
                  <div>Year: {b.publication_year}</div>
                  <div>ISBN: {b.isbn}</div>
                  <div>Author ID: {b.author_id}</div>
                  <div>Available: {b.available_copies}</div>
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <button onClick={() => setEditing(b)}>Edit</button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${b.title}"?`)) {
                          dispatch(deleteBook(b.id));
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* RIGHT: Create/Update form */}
        <div>
          <BookForm
            key={editing?.id ?? "create"}
            editing={editing}
            onDone={() => setEditing(null)}
          />
        </div>
      </div>
    </div>
  );
}
