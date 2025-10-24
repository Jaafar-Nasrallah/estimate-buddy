import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import useRoomSocket from '../hooks/useRoomSocket.js';

const voteOptions = ['1', '2', '3', '5', '8', '13'];

const storageKey = (roomId) => `estimate-buddy:${roomId}:participant`;

const useOwnerTokenQuery = () => {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.search).get('ownerToken'), [location.search]);
};

export default function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const ownerTokenQuery = useOwnerTokenQuery();
  const { state, status, error, joinRoom, submitVote, revealVotes, resetVotes } = useRoomSocket(roomId);
  const [participant, setParticipant] = useState(() => {
    if (!roomId) {
      return null;
    }
    try {
      const raw = localStorage.getItem(storageKey(roomId));
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.error('Failed to read participant from storage', err);
      return null;
    }
  });
  const [nameInput, setNameInput] = useState(participant?.name || '');
  const [selectedVote, setSelectedVote] = useState(null);
  const [pendingVote, setPendingVote] = useState(null);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);
  const [joinError, setJoinError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyDescription, setStoryDescription] = useState('');
  const [shouldSyncStory, setShouldSyncStory] = useState(true);
  const ownerToken = ownerTokenQuery || participant?.ownerToken || null;
  const shareLink = useMemo(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    return `${window.location.origin}/room/${roomId}`;
  }, [roomId]);

  useEffect(() => {
    if (state?.room) {
      if (!participant?.isOwner || shouldSyncStory) {
        setStoryTitle(state.room.title || '');
        setStoryDescription(state.room.description || '');
      }
    }
  }, [participant?.isOwner, shouldSyncStory, state?.room?.description, state?.room?.title]);

  useEffect(() => {
    if (participant && ownerToken && ownerToken !== participant.ownerToken) {
      const next = { ...participant, ownerToken };
      setParticipant(next);
      localStorage.setItem(storageKey(roomId), JSON.stringify(next));
    }
  }, [ownerToken, participant, roomId]);

  useEffect(() => {
    if (ownerTokenQuery && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('ownerToken');
      window.history.replaceState({}, '', url.toString());
    }
  }, [ownerTokenQuery, roomId]);

  useEffect(() => {
    if (!state?.participants || !participant?.participantId) {
      return;
    }
    const me = state.participants.find((p) => p.id === participant.participantId);
    if (me && !me.hasVoted) {
      setSelectedVote(null);
      setPendingVote(null);
    }
    if (me && participant && me.name !== participant.name) {
      const next = { ...participant, name: me.name };
      setParticipant(next);
      localStorage.setItem(storageKey(roomId), JSON.stringify(next));
    }
  }, [state?.participants, participant, roomId]);

  const handleJoin = async (event) => {
    event.preventDefault();
    if (!nameInput.trim()) {
      setJoinError('Please enter your name.');
      return;
    }
    setIsJoining(true);
    setJoinError(null);
    try {
      const response = await joinRoom({
        name: nameInput.trim(),
        ownerToken,
        participantId: participant?.participantId
      });
      const nextParticipant = {
        participantId: response.participantId,
        name: nameInput.trim(),
        isOwner: response.isOwner,
        ownerToken
      };
      setParticipant(nextParticipant);
      localStorage.setItem(storageKey(roomId), JSON.stringify(nextParticipant));
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleVoteSelect = (vote) => {
    setPendingVote((current) => (current === vote ? null : vote));
    setActionError(null);
  };

  const handleVoteSubmit = async (event) => {
    event.preventDefault();
    if (!participant) {
      setActionError('Join the room before voting.');
      return;
    }
    if (!pendingVote) {
      setActionError('Pick a number before submitting your vote.');
      return;
    }
    setActionError(null);
    setIsSubmittingVote(true);
    try {
      await submitVote(pendingVote);
      setSelectedVote(pendingVote);
      setPendingVote(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const handleReveal = async () => {
    if (!participant?.isOwner) {
      return;
    }
    setIsRevealing(true);
    setActionError(null);
    try {
      await revealVotes();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsRevealing(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();
    if (!participant?.isOwner) {
      return;
    }
    setIsResetting(true);
    setActionError(null);
    try {
      setShouldSyncStory(true);
      await resetVotes({ title: storyTitle, description: storyDescription });
      setSelectedVote(null);
      setPendingVote(null);
      if (participant?.isOwner && typeof window !== 'undefined') {
        const wantsNext = window.confirm('Would you like to size another story now?');
        if (wantsNext) {
          localStorage.removeItem(storageKey(roomId));
          navigate('/');
        } else {
          setShouldSyncStory(false);
          setStoryTitle('');
          setStoryDescription('');
        }
      }
    } catch (err) {
      setActionError(err.message);
      setShouldSyncStory(false);
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearVotes = async () => {
    if (!participant?.isOwner) {
      return;
    }
    setIsResetting(true);
    setActionError(null);
    try {
      setShouldSyncStory(true);
      await resetVotes();
      setSelectedVote(null);
      setPendingVote(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setIsResetting(false);
    }
  };

  const participantList = state?.participants ?? [];
  const votesRevealed = Boolean(state?.room?.votesRevealed);
  const facilitatorName = participant?.isOwner
    ? 'You'
    : participantList.find((p) => p.isOwner)?.name || 'Unknown';

  return (
    <div className="layout room">
      <header className="hero">
        <h1>Estimate Buddy</h1>
        <p>Room ID: {roomId}</p>
      </header>

      {status === 'loading' ? <p>Loading room…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!participant ? (
        <form className="card" onSubmit={handleJoin}>
          <h2>Join the Room</h2>
          <label className="field">
            <span>Your Name</span>
            <input
              type="text"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="e.g. Alex"
              required
            />
          </label>
          {joinError ? <p className="error">{joinError}</p> : null}
          <button type="submit" className="primary" disabled={isJoining}>
            {isJoining ? 'Joining…' : 'Join Room'}
          </button>
        </form>
      ) : null}

      {participant ? (
        <section className="card story">
          <div className="story-header">
            <h2>{storyTitle || 'Untitled Story'}</h2>
            <p className="muted">Facilitator: {facilitatorName}</p>
          </div>
          <p className="description">{storyDescription || 'No description provided yet.'}</p>

          {participant.isOwner ? (
            <form className="story-form" onSubmit={handleReset}>
              <div className="share-row">
                <label htmlFor="share-link">Shareable link</label>
                <input
                  id="share-link"
                  value={shareLink}
                  readOnly
                  onFocus={(event) => event.target.select()}
                />
                <small>Send this link to your team (no owner token required).</small>
              </div>
              <h3>Update Story</h3>
              <label className="field">
                <span>Title</span>
                <input
                  value={storyTitle}
                  onChange={(event) => {
                    setShouldSyncStory(false);
                    setStoryTitle(event.target.value);
                  }}
                  required
                />
              </label>
              <label className="field">
                <span>Description</span>
                <textarea
                  value={storyDescription}
                  onChange={(event) => {
                    setShouldSyncStory(false);
                    setStoryDescription(event.target.value);
                  }}
                  rows={4}
                />
              </label>
              <div className="actions">
                <button type="submit" className="primary" disabled={isResetting}>
                  {isResetting ? 'Saving…' : 'Save & Reset Votes'}
                </button>
                <button type="button" onClick={handleClearVotes} disabled={isResetting}>
                  Clear Votes
                </button>
                <button type="button" onClick={handleReveal} disabled={isRevealing || votesRevealed}>
                  {isRevealing ? 'Revealing…' : votesRevealed ? 'Votes Revealed' : 'Reveal Votes'}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      {participant ? (
        <section className="card voting">
          <h3>Pick your estimate</h3>
          <form className="vote-form" onSubmit={handleVoteSubmit}>
            <div className="vote-grid">
              {voteOptions.map((option) => {
                const isActive = pendingVote ? pendingVote === option : selectedVote === option;
                return (
                  <button
                    key={option}
                    type="button"
                    className={isActive ? 'vote active' : 'vote'}
                    onClick={() => handleVoteSelect(option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <button type="submit" className="primary" disabled={isSubmittingVote || !pendingVote}>
              {isSubmittingVote ? 'Submitting…' : 'Submit Vote'}
            </button>
          </form>
          {actionError ? <p className="error">{actionError}</p> : null}
          {votesRevealed && state?.average ? (
            <p className="average">Average (numeric votes only): {state.average}</p>
          ) : null}
        </section>
      ) : null}

      <section className="card participants">
        <h3>Participants</h3>
        <ul>
          {participantList.map((person) => (
            <li key={person.id} className={person.id === participant?.participantId ? 'me' : ''}>
              <div className="name-row">
                <span>{person.name}</span>
                {person.isOwner ? <span className="tag">Owner</span> : null}
              </div>
              <span className="vote-value">
                {votesRevealed ? person.vote || '—' : person.hasVoted ? 'Voted' : 'Waiting…'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
