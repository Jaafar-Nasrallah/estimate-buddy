import { randomUUID } from 'crypto';

const buildOk = (data) => ({ ok: true, data });
const buildError = (message) => ({ ok: false, error: message });

export default function registerSocketHandlers(io, db, buildRoomState) {
  const getRoomById = db.prepare('SELECT id, owner_token AS ownerToken FROM rooms WHERE id = ?');
  const getRoomRevealState = db.prepare('SELECT votes_revealed AS votesRevealed FROM rooms WHERE id = ?');
  const getParticipantById = db.prepare(
    'SELECT id, room_id AS roomId, name, is_owner AS isOwner FROM participants WHERE id = ?'
  );
  const getParticipantByName = db.prepare('SELECT id FROM participants WHERE room_id = ? AND name = ?');
  const insertParticipant = db.prepare(
    'INSERT INTO participants (id, room_id, name, is_owner) VALUES (?, ?, ?, ?)'
  );
  const updateParticipant = db.prepare(
    'UPDATE participants SET name = ?, is_owner = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?'
  );
  const updateVote = db.prepare(
    'UPDATE participants SET vote = ?, last_active = CURRENT_TIMESTAMP WHERE id = ?'
  );
  const clearVotes = db.prepare('UPDATE participants SET vote = NULL WHERE room_id = ?');
  const setVotesRevealed = db.prepare('UPDATE rooms SET votes_revealed = ? WHERE id = ?');
  const updateStory = db.prepare('UPDATE rooms SET title = ?, description = ?, votes_revealed = 0 WHERE id = ?');

  const emitRoomState = (roomId) => {
    const state = buildRoomState(roomId);
    if (state) {
      io.to(roomId).emit('room_state', state);
    }
  };

  io.on('connection', (socket) => {
    socket.on('join_room', (payload = {}, callback = () => {}) => {
      try {
        const { roomId, name, participantId: providedParticipantId, ownerToken } = payload;
        if (!roomId) {
          callback(buildError('Room ID is required.'));
          return;
        }
        if (!name || typeof name !== 'string') {
          callback(buildError('Name is required.'));
          return;
        }

        const room = getRoomById.get(roomId);
        if (!room) {
          callback(buildError('Room not found.'));
          return;
        }

        const isOwner = Boolean(ownerToken && ownerToken === room.ownerToken);
        let participantId = providedParticipantId;

        if (participantId) {
          const participant = getParticipantById.get(participantId);
          if (!participant || participant.roomId !== roomId) {
            participantId = undefined;
          }
        }

        if (!participantId) {
          const existing = getParticipantByName.get(roomId, name.trim());
          if (existing) {
            participantId = existing.id;
            updateParticipant.run(name.trim(), isOwner ? 1 : 0, participantId);
          } else {
            participantId = randomUUID();
            try {
              insertParticipant.run(participantId, roomId, name.trim(), isOwner ? 1 : 0);
            } catch (err) {
              callback(buildError('Unable to join room. Try a different name.'));
              return;
            }
          }
        } else {
          updateParticipant.run(name.trim(), isOwner ? 1 : 0, participantId);
        }

        socket.data.roomId = roomId;
        socket.data.participantId = participantId;
        socket.data.isOwner = isOwner;
        socket.join(roomId);

        emitRoomState(roomId);

        callback(buildOk({ participantId, isOwner }));
      } catch (error) {
        console.error('join_room error', error);
        callback(buildError('Failed to join room.'));
      }
    });

    socket.on('submit_vote', (payload = {}, callback = () => {}) => {
      try {
        const { vote } = payload;
        const { participantId, roomId } = socket.data;
        if (!participantId || !roomId) {
          callback(buildError('Join a room before voting.'));
          return;
        }
        updateVote.run(vote ?? null, participantId);
        const roomReveal = getRoomRevealState.get(roomId);
        if (!roomReveal || roomReveal.votesRevealed === 0) {
          setVotesRevealed.run(0, roomId);
        }
        emitRoomState(roomId);
        callback(buildOk({}));
      } catch (error) {
        console.error('submit_vote error', error);
        callback(buildError('Failed to submit vote.'));
      }
    });

    socket.on('reveal_votes', (payload = {}, callback = () => {}) => {
      try {
        const { roomId } = socket.data;
        if (!roomId) {
          callback(buildError('Room not joined.'));
          return;
        }
        if (!socket.data.isOwner) {
          callback(buildError('Only the room owner can reveal votes.'));
          return;
        }
        setVotesRevealed.run(1, roomId);
        emitRoomState(roomId);
        callback(buildOk({}));
      } catch (error) {
        console.error('reveal_votes error', error);
        callback(buildError('Failed to reveal votes.'));
      }
    });

    socket.on('reset_votes', (payload = {}, callback = () => {}) => {
      try {
        const { title, description } = payload;
        const { roomId } = socket.data;
        if (!roomId) {
          callback(buildError('Room not joined.'));
          return;
        }
        if (!socket.data.isOwner) {
          callback(buildError('Only the room owner can reset votes.'));
          return;
        }

        if (title || description) {
          updateStory.run(title?.trim() || '', description?.trim() || '', roomId);
        } else {
          setVotesRevealed.run(0, roomId);
        }
        clearVotes.run(roomId);
        emitRoomState(roomId);
        callback(buildOk({}));
      } catch (error) {
        console.error('reset_votes error', error);
        callback(buildError('Failed to reset votes.'));
      }
    });

    socket.on('disconnect', () => {
      const { roomId } = socket.data;
      if (roomId) {
        emitRoomState(roomId);
      }
    });
  });
}
