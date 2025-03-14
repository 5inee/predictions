const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { MongoClient } = require('mongodb');
const shortid = require('shortid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// تكوين قاعدة بيانات MongoDB
const mongoUri = process.env.MONGODB_URI; // متغير بيئة Railway
const client = new MongoClient(mongoUri);

async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    return client.db();
  } catch (err) {
    console.error('Error connecting to MongoDB', err);
    throw err;
  }
}

// تهيئة مجلد public لتقديم الملفات الثابتة (HTML, CSS, JS)
app.use(express.static('public'));
app.use(express.json()); // لتمكين تحليل JSON في الطلبات

// إنشاء لعبة جديدة
app.post('/createGame', async (req, res) => {
  const question = req.body.question;
  const gameId = shortid.generate().substring(0, 6); // رمز تعريف فريد 6 خانات
  const db = await connectToDatabase();

  try {
    await db.collection('games').insertOne({
      gameId,
      question,
      players: [],
      predictions: [],
    });
    res.json({ gameId });
  } catch (err) {
    console.error('Error creating game', err);
    res.status(500).json({ error: 'Failed to create game' });
  }
});

// الانضمام إلى لعبة
app.post('/joinGame', async (req, res) => {
  const gameId = req.body.gameId;
  const playerName = req.body.playerName;
  const db = await connectToDatabase();

  try {
    const game = await db.collection('games').findOne({ gameId });
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.players.length >= 5) {
      return res.status(400).json({ error: 'Game is full' });
    }

    await db.collection('games').updateOne(
      { gameId },
      { $push: { players: playerName } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Error joining game', err);
    res.status(500).json({ error: 'Failed to join game' });
  }
});

// استقبال التوقعات
io.on('connection', (socket) => {
  socket.on('submitPrediction', async ({ gameId, playerName, prediction }) => {
    const db = await connectToDatabase();

    try {
      await db.collection('games').updateOne(
        { gameId },
        { $push: { predictions: { playerName, prediction } } }
      );

      const game = await db.collection('games').findOne({ gameId });

      if (game.predictions.length === game.players.length) {
        io.to(gameId).emit('allPredictions', game.predictions);
      } else {
        socket.emit('predictionCount', game.predictions.length);
      }

      socket.join(gameId); // انضمام المستخدم إلى غرفة اللعبة
    } catch (err) {
      console.error('Error submitting prediction', err);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});