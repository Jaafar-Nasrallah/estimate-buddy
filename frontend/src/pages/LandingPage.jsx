import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom } from '../utils/api.js';

export default function LandingPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Please enter a story title.');
      return;
    }
    try {
      setIsSubmitting(true);
      const { roomId, ownerToken } = await createRoom({ title: title.trim(), description });
      navigate(`/room/${roomId}?ownerToken=${ownerToken}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="layout">
      <header className="hero">
        <h1>Estimate Buddy</h1>
        <p>Real-time planning poker for agile teams.</p>
      </header>
      <form className="card" onSubmit={handleSubmit}>
        <h2>Create a Room</h2>
        <label className="field">
          <span>Story Title</span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="As a user I want..."
            required
          />
        </label>
        <label className="field">
          <span>Story Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add extra details or acceptance criteria"
            rows={4}
          />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" className="primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create Room'}
        </button>
      </form>
      <section className="card info">
        <h3>How it works</h3>
        <ol>
          <li>Create a room and share the link with your team.</li>
          <li>Each teammate joins with their name and picks an estimate.</li>
          <li>Reveal the votes to see the spread and average.</li>
          <li>Reset to estimate the next story.</li>
        </ol>
      </section>
    </div>
  );
}
