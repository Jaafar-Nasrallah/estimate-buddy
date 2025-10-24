import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE, getRoomState } from '../utils/api.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_BASE;

const createSocket = () =>
  io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket'],
    reconnectionAttempts: 5
  });

export default function useRoomSocket(roomId) {
  const socketRef = useRef(null);
  const [state, setState] = useState({ room: null, participants: [], average: null });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!roomId) {
      return;
    }
    let isActive = true;
    setStatus('loading');
    setError(null);
    getRoomState(roomId)
      .then((nextState) => {
        if (isActive) {
          setState(nextState);
          setStatus('ready');
        }
      })
      .catch((err) => {
        if (isActive) {
          setError(err.message);
          setStatus('error');
        }
      });
    return () => {
      isActive = false;
    };
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      return undefined;
    }
    const socket = createSocket();
    socketRef.current = socket;

    socket.on('room_state', (nextState) => {
      setState(nextState);
    });

    socket.on('connect_error', () => {
      setError('Unable to connect to the live updates server.');
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  const emitWithAck = useCallback((event, payload) => {
    const socket = socketRef.current;
    if (!socket) {
      return Promise.reject(new Error('Live connection is not ready yet.'));
    }
    if (!socket.connected) {
      socket.connect();
    }
    return new Promise((resolve, reject) => {
      socket.timeout(5000).emit(event, payload, (response) => {
        if (response?.ok) {
          resolve(response.data);
        } else {
          const message = response?.error || 'Something went wrong.';
          reject(new Error(message));
        }
      });
    });
  }, []);

  const joinRoom = useCallback(
    ({ name, ownerToken, participantId }) =>
      emitWithAck('join_room', {
        roomId,
        name,
        ownerToken,
        participantId
      }),
    [emitWithAck, roomId]
  );

  const submitVote = useCallback(
    (vote) => emitWithAck('submit_vote', { vote }),
    [emitWithAck]
  );

  const revealVotes = useCallback(() => emitWithAck('reveal_votes', {}), [emitWithAck]);

  const resetVotes = useCallback(
    ({ title, description } = {}) => emitWithAck('reset_votes', { title, description }),
    [emitWithAck]
  );

  return {
    state,
    status,
    error,
    joinRoom,
    submitVote,
    revealVotes,
    resetVotes
  };
}
