import type { Chat, Message } from '../types/chat';

const API_BASE = '/api/chats';

export async function fetchChats(): Promise<Chat[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) {
    throw new Error('Failed to load conversation history');
  }
  const data = await res.json();
  return data.chats || [];
}

export async function createChat(title: string): Promise<Chat> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error('Failed to create conversation');
  }
  const data = await res.json();
  return data.chat;
}

export async function fetchChatMessages(chatId: string): Promise<Message[]> {
  const res = await fetch(`${API_BASE}/${chatId}/messages`);
  if (!res.ok) {
    throw new Error('Failed to load messages for conversation');
  }
  const data = await res.json();
  return data.messages || [];
}

export async function renameChat(chatId: string, title: string): Promise<Chat> {
  const res = await fetch(`${API_BASE}/${chatId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    throw new Error('Failed to rename conversation');
  }
  const data = await res.json();
  return data.chat;
}

export async function deleteChat(chatId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${chatId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error('Failed to delete conversation');
  }
}
