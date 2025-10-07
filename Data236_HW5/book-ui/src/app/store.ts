// src/app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import booksReducer from "../features/books/booksSlice";
import chatReducer from "../features/chat/chatSlice";

export const store = configureStore({
  reducer: {
    books: booksReducer,
    chat: chatReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

