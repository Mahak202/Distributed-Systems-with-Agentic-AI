// src/features/books/booksForm.tsx
import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { createBook, updateBook } from "./booksSlice";
import type { Book } from "./booksSlice";
import type { AppDispatch } from "../../app/store";

export default function BookForm({
  editing,
  onDone,
}: {
  editing: Book | null;
  onDone: () => void;
}) {
  const dispatch = useDispatch<AppDispatch>();

  const [title, setTitle] = useState("");
  const [publication_year, setYear] = useState<number | "">("");
  const [isbn, setIsbn] = useState("");
  const [author_id, setAuthorId] = useState<number | "">("");
  const [available_copies, setAvailable] = useState<number | "">(1);

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setYear(editing.publication_year);
      setIsbn(editing.isbn);
      setAuthorId(editing.author_id);
      setAvailable(editing.available_copies);
    } else {
      setTitle("");
      setYear("");
      setIsbn("");
      setAuthorId("");
      setAvailable(1);
    }
  }, [editing]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isbn.trim().length < 5) {
      alert("ISBN must be at least 5 characters");
      return;
    }
    if (publication_year === "" || author_id === "" || available_copies === "") {
      alert("Year, Author ID, and Available copies are required");
      return;
    }

    const payload = {
      title: title.trim(),
      publication_year: Number(publication_year),
      isbn: isbn.trim(),
      author_id: Number(author_id),
      available_copies: Number(available_copies),
    };

    if (editing) {
      await dispatch(updateBook({ id: editing.id, data: payload }));
      onDone();
    } else {
      await dispatch(createBook(payload));
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      style={{ border: "1px solid #2e2e2e", padding: 16, borderRadius: 8 }}
    >
      <h3>{editing ? `Update: ${editing.title}` : "Create New Book"}</h3>

      <label>
        Title
        <br />
        <input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <br />
      <br />

      <label>
        Publication Year
        <br />
        <input
          type="number"
          value={publication_year}
          onChange={(e) =>
            setYear(e.target.value === "" ? "" : Number(e.target.value))
          }
          required
          min={0}
        />
      </label>
      <br />
      <br />

      <label>
        ISBN
        <br />
        <input
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
          required
          minLength={5}
        />
      </label>
      <br />
      <br />

      <label>
        Author ID
        <br />
        <input
          type="number"
          value={author_id}
          onChange={(e) =>
            setAuthorId(e.target.value === "" ? "" : Number(e.target.value))
          }
          required
          min={1}
        />
      </label>
      <br />
      <br />

      <label>
        Available Copies
        <br />
        <input
          type="number"
          value={available_copies}
          onChange={(e) =>
            setAvailable(e.target.value === "" ? "" : Number(e.target.value))
          }
          required
          min={0}
        />
      </label>
      <br />
      <br />

      <button type="submit">{editing ? "Update" : "Create"}</button>
      {editing && (
        <button
          type="button"
          style={{ marginLeft: 8 }}
          onClick={() => onDone()}
        >
          Cancel
        </button>
      )}
    </form>
  );
}
