export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error || 'Something went wrong';
    throw new Error(message);
  }
  return response.json();
};

export const createRoom = async ({ title, description }) => {
  const response = await fetch(`${API_BASE}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description })
  });
  return handleResponse(response);
};

export const getRoomState = async (roomId) => {
  const response = await fetch(`${API_BASE}/api/rooms/${roomId}`);
  return handleResponse(response);
};

export const updateStory = async (roomId, { title, description, ownerToken }) => {
  const response = await fetch(`${API_BASE}/api/rooms/${roomId}/story`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, ownerToken })
  });
  return handleResponse(response);
};
