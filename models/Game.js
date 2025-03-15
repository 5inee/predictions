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
            avatarColor: { type: String },
            joinedAt: { type: Date, default: Date.now }
        }, { _id: false }),
        default: {} // هذا السطر هو التغيير
    },
    predictions: {
        type: Map,
        of: new mongoose.Schema({
            content: { type: String, required: true },
            submittedAt: { type: Date, default: Date.now }
        }, { _id: false }),
        default: {} // Make predictions a Map by default
    },
    revealedToAll: { type: Boolean, default: false },

}, { timestamps: true });

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;