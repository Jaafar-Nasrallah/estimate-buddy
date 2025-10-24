import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import { Server } from 'socket.io';
import { customAlphabet } from 'nanoid';
import { randomUUID } from 'crypto';
import registerSocketHandlers from './sockets.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 4000;
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../data/estimatebuddy.db');
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

const app = express();
app.use(cors(CLIENT_ORIGIN ? { origin: CLIENT_ORIGIN } : undefined));
app.use(express.json());

const dbDirectory = path.dirname(DB_PATH);
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const db = new Database(DB_PATH);

const createTables = () => {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      owner_token TEXT NOT NULL,
      votes_revealed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      name TEXT NOT NULL,
      vote TEXT,
      is_owner INTEGER DEFAULT 0,
      last_active TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(room_id, name),
      FOREIGN KEY(room_id) REFERENCES rooms(id) ON DELETE CASCADE
    )
  `).run();
};

createTables();

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 8);

const buildRoomState = (roomId) => {
  const room = db.prepare('SELECT id, title, description, votes_revealed AS votesRevealed FROM rooms WHERE id = ?').get(roomId);
  if (!room) {
    return null;
  }

  const participants = db.prepare(`
    SELECT id, name, vote, is_owner AS isOwner
    FROM participants
    WHERE room_id = ?
    ORDER BY is_owner DESC, name ASC
  `).all(roomId);

  const mappedParticipants = participants.map((participant) => ({
    id: participant.id,
    name: participant.name,
    isOwner: Boolean(participant.isOwner),
    vote: room.votesRevealed ? participant.vote : null,
    hasVoted: participant.vote !== null && participant.vote !== undefined && participant.vote !== ''
  }));

  let average = null;
  if (room.votesRevealed) {
    const numericVotes = participants
      .map((p) => (p.vote !== null ? Number(p.vote) : NaN))
      .filter((value) => !Number.isNaN(value));
    if (numericVotes.length > 0) {
      const sum = numericVotes.reduce((acc, curr) => acc + curr, 0);
      average = (sum / numericVotes.length).toFixed(2);
    }
  }

  return {
    room,
    participants: mappedParticipants,
    average
  };
};

app.post('/api/rooms', (req, res) => {
  const { title, description } = req.body || {};
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Title is required.' });
  }

  const roomId = nanoid();
  const ownerToken = randomUUID();

  db.prepare(
    'INSERT INTO rooms (id, title, description, owner_token) VALUES (?, ?, ?, ?)' 
  ).run(roomId, title.trim(), description?.trim() || '', ownerToken);

  return res.status(201).json({ roomId, ownerToken });
});

app.get('/api/rooms/:id', (req, res) => {
  const { id } = req.params;
  const state = buildRoomState(id);
  if (!state) {
    return res.status(404).json({ error: 'Room not found.' });
  }

  return res.json(state);
});

app.post('/api/rooms/:id/story', (req, res) => {
  const { id } = req.params;
  const { title, description, ownerToken } = req.body || {};
  if (!ownerToken) {
    return res.status(400).json({ error: 'Owner token is required.' });
  }
  const room = db.prepare('SELECT id FROM rooms WHERE id = ? AND owner_token = ?').get(id, ownerToken);
  if (!room) {
    return res.status(403).json({ error: 'Invalid owner token.' });
  }
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Title is required.' });
  }
  db.prepare('UPDATE rooms SET title = ?, description = ?, votes_revealed = 0 WHERE id = ?').run(
    title.trim(),
    description?.trim() || '',
    id
  );
  db.prepare('UPDATE participants SET vote = NULL WHERE room_id = ?').run(id);
  const state = buildRoomState(id);
  return res.json(state);
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: CLIENT_ORIGIN ? { origin: CLIENT_ORIGIN } : undefined
});

registerSocketHandlers(io, db, buildRoomState);

server.listen(PORT, () => {
  console.log(`Estimate Buddy backend listening on port ${PORT}`);
});
