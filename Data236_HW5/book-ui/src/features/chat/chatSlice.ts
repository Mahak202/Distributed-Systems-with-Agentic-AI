import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../lib/api";
import type { RootState } from "../../app/store";

/** ===== Types ===== */
export type Role = "user" | "assistant" | "system";

export interface Conversation {
  id: number;
  user_id: number;
  title: string;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  id?: number;
  conversation_id: number;
  role: Role;
  content: string;
  created_at?: string;
}

export interface SendPayload {
  user_id: number;
  message: string;
  conversation_id?: number;
  title?: string;
}

type MessagesByConv = Record<number, ChatMessage[]>;

interface ChatState {
  userId: number;
  conversations: Conversation[];
  messagesByConv: MessagesByConv;
  currentConversationId: number | null;

  loadingConversations: boolean;
  loadingMessages: boolean;
  sending: boolean;

  error: string | null;
}

const initialState: ChatState = {
  userId: 1, // you can wire this to auth later
  conversations: [],
  messagesByConv: {},
  currentConversationId: null,

  loadingConversations: false,
  loadingMessages: false,
  sending: false,

  error: null,
};

/** ===== Helpers to normalize API shapes (paged vs array) ===== */
function listFromAny<T>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data.items)) return data.items as T[];
  return [];
}

function ensureArray<T>(v: T | T[] | undefined | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/** ===== Thunks ===== */
export const fetchConversations = createAsyncThunk<
  Conversation[],
  { user_id: number }
>("chat/fetchConversations", async ({ user_id }, { rejectWithValue }) => {
  try {
    const res = await api.get("/ai/conversations", { params: { user_id } });
    return listFromAny<Conversation>(res.data);
  } catch (err: any) {
    return rejectWithValue(err?.response?.data?.detail ?? "Failed to load conversations");
  }
});

export const fetchMessages = createAsyncThunk<
  { conversation_id: number; messages: ChatMessage[] },
  { conversation_id: number }
>("chat/fetchMessages", async ({ conversation_id }, { rejectWithValue }) => {
  try {
    const res = await api.get(`/ai/messages/${conversation_id}`);
    const messages = listFromAny<ChatMessage>(res.data);
    return { conversation_id, messages };
  } catch (err: any) {
    return rejectWithValue(err?.response?.data?.detail ?? "Failed to load messages");
  }
});

/**
 * POST /ai/chat
 * Expected backend responses (we support both):
 *  A) { conversation_id: number, reply: string }
 *  B) { conversation_id: number, messages: ChatMessage[] }
 */
export const sendMessage = createAsyncThunk<
  { conversation_id: number; userEcho: ChatMessage; replyMessages: ChatMessage[]; title?: string; user_id: number },
  SendPayload
>("chat/sendMessage", async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post("/ai/chat", payload);

    const cid: number =
      res.data?.conversation_id ??
      res.data?.conversationId ??
      payload.conversation_id!;

    // Build a local echo of the user message
    const userEcho: ChatMessage = {
      id: undefined,
      conversation_id: cid,
      role: "user",
      content: payload.message,
      created_at: new Date().toISOString(),
    };

    // Normalize assistant reply as messages[]
    let replyMessages: ChatMessage[] = [];

    if (typeof res.data?.reply === "string") {
      replyMessages = [
        {
          id: undefined,
          conversation_id: cid,
          role: "assistant",
          content: res.data.reply,
          created_at: new Date().toISOString(),
        },
      ];
    } else if (Array.isArray(res.data?.messages)) {
      // If backend returns full messages array, keep assistant ones
      const msgs = res.data.messages as ChatMessage[];
      replyMessages = msgs.filter((m) => m.role !== "user");
    }

    // Fallback if backend returned nothing
    if (replyMessages.length === 0) {
      replyMessages = [
        {
          conversation_id: cid,
          role: "assistant",
          content: "(no reply)",
          created_at: new Date().toISOString(),
        },
      ];
    }

    return {
      conversation_id: cid,
      userEcho,
      replyMessages,
      title: payload.title,
      user_id: payload.user_id,
    };
  } catch (err: any) {
    return rejectWithValue(err?.response?.data?.detail ?? "Send failed");
  }
});

/** ===== Slice ===== */
const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setCurrentConversation(state, action: PayloadAction<number | null>) {
      state.currentConversationId = action.payload;
      state.error = null;
    },
    setUserId(state, action: PayloadAction<number>) {
      state.userId = action.payload;
    },
    resetChat(state) {
      state.conversations = [];
      state.messagesByConv = {};
      state.currentConversationId = null;
      state.error = null;
      state.loadingConversations = false;
      state.loadingMessages = false;
      state.sending = false;
    },
  },
  extraReducers: (b) => {
    // conversations
    b.addCase(fetchConversations.pending, (s) => {
      s.loadingConversations = true;
      s.error = null;
    });
    b.addCase(fetchConversations.fulfilled, (s, a) => {
      s.loadingConversations = false;
      s.conversations = a.payload;
    });
    b.addCase(fetchConversations.rejected, (s, a) => {
      s.loadingConversations = false;
      s.error = String(a.payload ?? a.error.message);
    });

    // messages
    b.addCase(fetchMessages.pending, (s) => {
      s.loadingMessages = true;
      s.error = null;
    });
    b.addCase(fetchMessages.fulfilled, (s, a) => {
      s.loadingMessages = false;
      const { conversation_id, messages } = a.payload;
      s.messagesByConv[conversation_id] = messages;
    });
    b.addCase(fetchMessages.rejected, (s, a) => {
      s.loadingMessages = false;
      s.error = String(a.payload ?? a.error.message);
    });

    // send
    b.addCase(sendMessage.pending, (s) => {
      s.sending = true;
      s.error = null;
    });
    b.addCase(sendMessage.fulfilled, (s, a) => {
      s.sending = false;
      const { conversation_id, userEcho, replyMessages, title, user_id } = a.payload;

      // Ensure messages array exists
      s.messagesByConv[conversation_id] ??= [];

      // Append user echo + assistant replies
      s.messagesByConv[conversation_id].push(userEcho, ...replyMessages);

      // If this is a brand new conversation, add it to list
      const exists = s.conversations.some((c) => c.id === conversation_id);
      if (!exists) {
        s.conversations.unshift({
          id: conversation_id,
          title: title ?? userEcho.content.slice(0, 40),
          user_id,
          created_at: new Date().toISOString(),
        });
      }

      // Focus the conversation
      s.currentConversationId = conversation_id;
    });
    b.addCase(sendMessage.rejected, (s, a) => {
      s.sending = false;
      s.error = String(a.payload ?? a.error.message);
    });
  },
});

export const { setCurrentConversation, setUserId, resetChat } = chatSlice.actions;

/** ===== Selectors ===== */
export const selectChatUserId = (s: RootState) => s.chat.userId;
export const selectConversations = (s: RootState) => s.chat.conversations;
export const selectCurrentConversationId = (s: RootState) => s.chat.currentConversationId;
export const selectMessagesForCurrent = (s: RootState) => {
  const id = s.chat.currentConversationId;
  return id ? s.chat.messagesByConv[id] ?? [] : [];
};
export const selectChatLoading = (s: RootState) =>
  s.chat.loadingConversations || s.chat.loadingMessages || s.chat.sending;
export const selectChatError = (s: RootState) => s.chat.error;

export default chatSlice.reducer;
