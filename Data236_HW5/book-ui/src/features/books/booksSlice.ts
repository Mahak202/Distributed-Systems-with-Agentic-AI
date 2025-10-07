// src/features/books/booksSlice.ts
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../lib/api";
import type { RootState } from "../../app/store";

/* ========= Types ========= */
export type Book = {
  id: number;                 // API may return id or book_id; we normalize
  title: string;
  publication_year: number;
  isbn: string;
  author_id: number;
  available_copies: number;
};

export type BookCreate = Omit<Book, "id">;

type BooksState = {
  items: Book[];
  loading: boolean;
  error: string | null;
};

const initialState: BooksState = { items: [], loading: false, error: null };

/* ========= Helpers ========= */
const extractError = (err: any): string => {
  const d = err?.response?.data;
  if (d?.detail) {
    if (Array.isArray(d.detail)) {
      return d.detail
        .map((e: any) => {
          const loc = Array.isArray(e.loc) ? e.loc.join(".") : e.loc;
          return `${loc}: ${e.msg}`;
        })
        .join("; ");
    }
    if (typeof d.detail === "string") return d.detail;
    try { return JSON.stringify(d.detail); } catch {}
    return String(d.detail);
  }
  return err?.message || "Request failed";
};

const normalizeBook = (b: any): Book => ({
  id: b.id ?? b.book_id,
  title: b.title,
  publication_year: Number(b.publication_year),
  isbn: b.isbn,
  author_id: Number(b.author_id),
  available_copies: Number(b.available_copies ?? 0),
});

/* ========= Thunks ========= */
export const fetchBooks = createAsyncThunk<Book[], void, { rejectValue: string }>(
  "books/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/books");
      const payload = res.data;

      let items: any[] | null = null;
      if (Array.isArray(payload)) {
        items = payload;
      } else if (payload && Array.isArray(payload.items)) {
        // supports paginated shape: { items: [...], meta: {...} }
        items = payload.items;
      }

      if (!items) {
        throw new Error("Unexpected response from GET /books (expected array or {items: []}).");
      }

      return items.map(normalizeBook);
    } catch (err: any) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const createBook = createAsyncThunk<Book, BookCreate, { rejectValue: string }>(
  "books/create",
  async (payload, { rejectWithValue }) => {
    try {
      const res = await api.post("/books", payload);
      return normalizeBook(res.data);
    } catch (err: any) {
      return rejectWithValue(extractError(err));
    }
  }
);

export const updateBook = createAsyncThunk<
  Book,
  { id: number; data: Partial<BookCreate> },
  { rejectValue: string }
>("books/update", async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/books/${id}`, data);
    return normalizeBook(res.data);
  } catch (err: any) {
    return rejectWithValue(extractError(err));
  }
});

export const deleteBook = createAsyncThunk<number, number, { rejectValue: string }>(
  "books/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/books/${id}`);
      return id;
    } catch (err: any) {
      return rejectWithValue(extractError(err));
    }
  }
);

/* ========= Slice ========= */
const booksSlice = createSlice({
  name: "books",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    // fetch
    b.addCase(fetchBooks.pending, (s) => {
      s.loading = true;
      s.error = null;
    });
    b.addCase(fetchBooks.fulfilled, (s, a: PayloadAction<Book[]>) => {
      s.loading = false;
      s.items = a.payload;
    });
    b.addCase(fetchBooks.rejected, (s, a) => {
      s.loading = false;
      s.error = (a.payload as string) ?? a.error.message ?? null;
    });

    // create
    b.addCase(createBook.fulfilled, (s, a: PayloadAction<Book>) => {
      s.items.push(a.payload);
    });
    b.addCase(createBook.rejected, (s, a) => {
      s.error = (a.payload as string) ?? a.error.message ?? null;
    });

    // update
    b.addCase(updateBook.fulfilled, (s, a: PayloadAction<Book>) => {
      const i = s.items.findIndex((x) => x.id === a.payload.id);
      if (i !== -1) s.items[i] = a.payload;
    });
    b.addCase(updateBook.rejected, (s, a) => {
      s.error = (a.payload as string) ?? a.error.message ?? null;
    });

    // delete
    b.addCase(deleteBook.fulfilled, (s, a: PayloadAction<number>) => {
      s.items = s.items.filter((x) => x.id !== a.payload);
    });
    b.addCase(deleteBook.rejected, (s, a) => {
      s.error = (a.payload as string) ?? a.error.message ?? null;
    });
  },
});

/* ========= Selectors & Export ========= */
export const selectBooks = (s: RootState) => s.books.items;
export const selectBooksLoading = (s: RootState) => s.books.loading;
export const selectBooksError = (s: RootState) => s.books.error;

export default booksSlice.reducer;
