// src/lib/api.ts
import axios from "axios";

export const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  withCredentials: false,
  headers: { "Content-Type": "application/json" },
});

export async function askOllama(message: string) {
  const res = await fetch("http://127.0.0.1:8000/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: 1, message }),
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as { reply: string };
}
