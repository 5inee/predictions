// models/Game.js
const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  question: { type: String, required: true },
  maxPredictors: { type: Number, default: 5 },
  predictors: {
    type: Map,
    of: new mongoose.Schema({
      id: { type: String, required: true },
      username: { type: String, required: true },
      avatarColor: { type: String }, // لون الصورة الرمزية
      joinedAt: { type: Date, default: Date.now }
    }, { _id: false }) // Prevent Mongoose from creating _id for subdocuments
  },
  predictions: {
    type: Map,
    of: new mongoose.Schema({
      content: { type: String, required: true },
      submittedAt: { type: Date, default: Date.now }
    }, { _id: false })
  },
  revealedToAll: { type: Boolean, default: false }, // إضافة revealedToAll إلى السكيما

}, { timestamps: true });

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;