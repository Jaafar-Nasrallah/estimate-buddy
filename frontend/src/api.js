const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error(errorBody.error || 'Request failed');
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
};

export const getStories = () => fetch(`${API_BASE_URL}/stories`).then(handleResponse);

export const createStory = (story) =>
  fetch(`${API_BASE_URL}/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(story),
  }).then(handleResponse);

export const updateStory = (id, story) =>
  fetch(`${API_BASE_URL}/stories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(story),
  }).then(handleResponse);

export const deleteStory = (id) =>
  fetch(`${API_BASE_URL}/stories/${id}`, {
    method: 'DELETE',
  }).then(handleResponse);
