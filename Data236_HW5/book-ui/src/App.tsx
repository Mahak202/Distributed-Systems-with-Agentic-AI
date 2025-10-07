// src/App.tsx
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Home from "./features/books/Home";
import ChatPage from "./features/chat/ChatPage"; // ← make sure default export

export default function App() {
  return (
    <BrowserRouter>
      <div className="p-4">
        <nav className="flex gap-4 mb-6">
          <NavLink to="/" end>Books</NavLink>
          <NavLink to="/chat">LLM Chat</NavLink> {/* ← visible entry point */}
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<ChatPage />} /> {/* ← mount page */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}
