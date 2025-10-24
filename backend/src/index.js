const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const PORT = process.env.PORT || 4000;

const requiredEnv = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
requiredEnv.forEach((name) => {
  if (!process.env[name]) {
    console.warn(`Warning: environment variable ${name} is not set.`);
  }
});

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool.on('error', (err) => {
  console.error('Unexpected database error', err);
  process.exit(1);
});

const app = express();
app.use(cors());
app.use(express.json());

const createTableIfNeeded = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stories (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      size INTEGER NOT NULL CHECK (size > 0),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

const formatStory = (row) => ({
  id: Number(row.id),
  title: row.title,
  description: row.description || '',
  size: Number(row.size),
});

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/stories', async (_req, res) => {
  try {
    const result = await pool.query('SELECT id, title, description, size FROM stories ORDER BY id ASC');
    res.json(result.rows.map(formatStory));
  } catch (error) {
    console.error('Error fetching stories', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

app.post('/stories', async (req, res) => {
  const { title, description, size } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Title is required' });
  }

  const parsedSize = parseInt(size, 10);
  if (Number.isNaN(parsedSize) || parsedSize <= 0) {
    return res.status(400).json({ error: 'Size must be a positive number' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO stories (title, description, size, updated_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING id, title, description, size',
      [title, description || '', parsedSize]
    );
    res.status(201).json(formatStory(result.rows[0]));
  } catch (error) {
    console.error('Error creating story', error);
    res.status(500).json({ error: 'Failed to create story' });
  }
});

app.put('/stories/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, size } = req.body;

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Title is required' });
  }

  const parsedSize = parseInt(size, 10);
  if (Number.isNaN(parsedSize) || parsedSize <= 0) {
    return res.status(400).json({ error: 'Size must be a positive number' });
  }

  try {
    const result = await pool.query(
      `UPDATE stories
       SET title = $1,
           description = $2,
           size = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, title, description, size`,
      [title, description || '', parsedSize, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json(formatStory(result.rows[0]));
  } catch (error) {
    console.error('Error updating story', error);
    res.status(500).json({ error: 'Failed to update story' });
  }
});

app.delete('/stories/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM stories WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting story', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

app.use((err, _req, res, _next) => {
  console.error('Unexpected error', err);
  res.status(500).json({ error: 'An unexpected error occurred' });
});

const start = async () => {
  try {
    await createTableIfNeeded();
    app.listen(PORT, () => {
      console.log(`Estimate Buddy backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

start();
