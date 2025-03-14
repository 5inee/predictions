const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { Pool } = require('pg');
const shortid = require('shortid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// تكوين قاعدة بيانات PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // متغير بيئة Railway
  ssl: {
    rejectUnauthorized: false, // يجب تعديل هذا في بيئة الإنتاج
  },
});

async function connectToDatabase() {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL');
    return client;
  } catch (err) {
    console.error('Error connecting to PostgreSQL', err);
    throw err;
  }
}

// تهيئة مجلد public لتقديم الملفات الثابتة (HTML, CSS, JS)
app.use(express.static('public'));
app.use(express.json()); // لتمكين تحليل JSON في الطلبات

// إنشاء جدول الألعاب في PostgreSQL إذا لم يكن موجودًا
async function createGamesTable() {
  const client = await connectToDatabase();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS games (
        gameId VARCHAR(6) PRIMARY KEY,
        question TEXT,
        players TEXT[],
        predictions JSON[]
      )
    `);
  } finally {
    client.release();
  }
}

createGamesTable();

// إنشاء لعبة جديدة
app.post('/createGame', async (req, res) => {
  const question = req.body.question;
  const gameId = shortid.generate().substring(0, 6); // رمز تعريف فريد 6 خانات
  const client = await connectToDatabase();

  try {
    await client.query(
      'INSERT INTO games (gameId, question, players, predictions) VALUES ($1, $2, $3, $4)',
      [gameId, question, [], []]
    );
    res.json({ gameId });
  } catch (err) {
    console.error('Error creating game', err);
    res.status(500).json({ error: 'Failed to create game' });
  } finally {
    client.release();
  }
});

// الانضمام إلى لعبة
app.post('/joinGame', async (req, res) => {
  const gameId = req.body.gameId;
  const playerName = req.body.playerName;
  const client = await connectToDatabase();

  try {
    const result = await client.query('SELECT * FROM games WHERE gameId = $1', [gameId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    const game = result.rows[0];

    if (game.players.length >= 5) {
      return res.status(400).json({ error: 'Game is full' });
    }

    await client.query('UPDATE games SET players = array_append(players, $1) WHERE gameId = $2', [
      playerName,
      gameId,
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error joining game', err);
    res.status(500).json({ error: 'Failed to join game' });
  } finally {
    client.release();
  }
});

// استقبال التوقعات
io.on('connection', (socket) => {
  socket.on('submitPrediction', async ({ gameId, playerName, prediction }) => {
    const client = await connectToDatabase();

    try {
      await client.query(
        'UPDATE games SET predictions = array_append(predictions, $1) WHERE gameId = $2',
        [{ playerName, prediction }, gameId]
      );

      const result = await client.query('SELECT * FROM games WHERE gameId = $1', [gameId]);
      const game = result.rows[0];

      if (game.predictions.length === game.players.length) {
        io.to(gameId).emit('allPredictions', game.predictions);
      } else {
        socket.emit('predictionCount', game.predictions.length);
      }

      socket.join(gameId); // انضمام المستخدم إلى غرفة اللعبة
    } catch (err) {
      console.error('Error submitting prediction', err);
    } finally {
      client.release();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});