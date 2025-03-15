require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid'); // استخدام uuid
const Game = require('./models/Game'); // تأكد أن هذا المسار صحيح

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the 'public' directory
app.use(express.static('public'));
app.use(express.json()); // مهم عشان نقدر نستقبل بيانات JSON في الطلبات

// MongoDB connection (replace with your actual connection string)
const mongoUri = process.env.MONGO_URI;

mongoose.connect(mongoUri)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Function to generate a short game ID (ممكن تستخدمها أو لا، حسب تصميم اللعبة)
function generateShortId() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // أحرف وأرقام
  let shortId = '';
  for (let i = 0; i < 6; i++) { // طول الـ ID هو 6 خانات
    shortId += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return shortId;
}

// Create a new game
app.post('/api/games', async (req, res) => {
    const gameId = generateShortId(); // أو أي طريقة ثانية لتوليد ID
    const newGame = new Game({
        id: gameId,
        question: req.body.question, // السؤال اللي المستخدم دخله
        maxPredictors: 5, // العدد الأقصى للاعبين (ممكن تخليه متغير)
    });
    try {
        await newGame.save();
        res.json({ gameId });
    } catch (error) {
        res.status(500).json({ error: 'Error creating game' });
    }
});

// Join a game
app.post('/api/games/:gameId/join', async (req, res) => {
    const { gameId } = req.params;
    const { username } = req.body;
    try {
        const game = await Game.findOne({ id: gameId });
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        if (Object.keys(game.predictors).length >= game.maxPredictors) {
            return res.status(400).json({ error: 'Game is full' });
        }

        // Get current predictor count for color selection
        const predictorCount = Object.keys(game.predictors).length;

        const predictorId = uuidv4(); // توليد ID فريد للاعب
        game.predictors.set(predictorId, {
            id: predictorId,
            username,
            avatarColor: getAvatarColor(predictorCount),
            joinedAt: new Date(),
        });

        await game.save();
        // إرسال تحديث لكل اللاعبين المتصلين باللعبة
        io.to(gameId).emit('predictor_update', {
            count: Object.keys(game.predictors).length,
            total: game.maxPredictors,
        });
        res.json({
            predictorId,
            game: {
                id: game.id,
                question: game.question,
                predictorCount: Object.keys(game.predictors).length, // عدد اللاعبين الحاليين
                maxPredictors: game.maxPredictors, // العدد الأقصى للاعبين
            },
        });
    } catch (error) {
        res.status(500).json({ error: 'Error joining game' });
    }
});
// Submit a prediction
app.post('/api/games/:gameId/predict', async (req, res) => {
    const { gameId } = req.params;
    const { predictorId, prediction } = req.body;
    try {
        const game = await Game.findOne({ id: gameId });
        if (!game) {
            return res.status(404).json({ error: 'Game not found' });
        }
        // التأكد من أن اللاعب موجود في قائمة اللاعبين في اللعبة
        if (!game.predictors.has(predictorId)) {
            return res.status(403).json({ error: 'Not a valid predictor for this game' });
        }
        // التأكد من أن اللعبة ما زالت تستقبل توقعات (ما وصل عدد التوقعات للحد الأقصى)
        if (game.predictions.size >= game.maxPredictors) {
             return res.status(400).json({ error: 'Maximum predictions reached, game is closed' });
        }

        // إضافة التوقع إلى ماب التوقعات في اللعبة
        game.predictions.set(predictorId, { content: prediction, submittedAt: new Date() });
        await game.save();

        const predictionsCount = game.predictions.size; // عدد التوقعات الحالي
        const allPredictionsSubmitted = predictionsCount === game.maxPredictors; // هل اكتمل عدد التوقعات؟
        // إرسال تحديث لجميع اللاعبين في الغرفة بعدد التوقعات
        io.to(gameId).emit('prediction_update', { count: predictionsCount, total: game.maxPredictors });

        // إذا اكتمل عدد التوقعات، أرسل كل التوقعات
        if (allPredictionsSubmitted && !game.revealedToAll) {
          game.revealedToAll = true;
          await game.save();

          const predictionsArray = [];

          // Iterate through each prediction
          for (const [pid, predictionData] of game.predictions.entries()) {
            // Get the predictor information
            const predictor = game.predictors.get(pid);

            // Add to the array with the right structure
            predictionsArray.push({
              predictor,
              prediction: predictionData
            });
          }

          io.to(gameId).emit('all_predictions_revealed', { predictions: predictionsArray });
        }
        res.json({ success: true, predictionsCount, allPredictionsSubmitted });
    } catch (error) {
        res.status(500).json({ error: 'Error submitting prediction' });
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('a user connected');

    // لما اللاعب ينضم للعبة
    socket.on('join_game', (gameId) => {
        socket.join(gameId); // إضافة اللاعب إلى غرفة (Room) خاصة باللعبة
        console.log(`User joined game room: ${gameId}`);
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        // ممكن هنا نضيف منطق (Logic) للتعامل مع مغادرة اللاعب للعبة (إزالته من قائمة اللاعبين، إلخ)
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Function to get different avatar colors ( بسيطة، ممكن تعدلها)
function getAvatarColor(index) {
    const colors = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8']; // ألوان مختلفة
    return colors[index % colors.length]; // نرجع لون بناءً على رقم اللاعب
}