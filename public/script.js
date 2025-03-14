const socket = io();

const createGameSection = document.getElementById('createGameSection');
const joinGameSection = document.getElementById('joinGameSection');
const predictionSection = document.getElementById('predictionSection');
const resultsSection = document.getElementById('resultsSection');

const questionInput = document.getElementById('questionInput');
const createGameButton = document.getElementById('createGameButton');
const gameIdInput = document.getElementById('gameIdInput');
const playerNameInput = document.getElementById('playerNameInput');
const joinGameButton = document.getElementById('joinGameButton');
const predictionText = document.getElementById('predictionText');
const submitPredictionButton = document.getElementById('submitPredictionButton');
const predictionsContainer = document.getElementById('predictionsContainer');
const predictionCountDisplay = document.getElementById('predictionCount');

let gameId;
let playerName;

createGameButton.addEventListener('click', async () => {
  const question = questionInput.value;
  const response = await fetch('/createGame', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  });
  const data = await response.json();
  gameId = data.gameId;
  gameIdInput.value = gameId; // تعيين رمز اللعبة في حقل الانضمام
  createGameSection.style.display = 'none'; // اخفاء قسم انشاء اللعبة
});

joinGameButton.addEventListener('click', async () => {
  gameId = gameIdInput.value;
  playerName = playerNameInput.value;
  const response = await fetch('/joinGame', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ gameId, playerName }),
  });
  const data = await response.json();
  if (data.success) {
    joinGameSection.style.display = 'none';
    predictionSection.style.display = 'block';
  } else {
    alert(data.error);
  }
});

submitPredictionButton.addEventListener('click', () => {
  const prediction = predictionText.value;
  socket.emit('submitPrediction', { gameId, playerName, prediction });
  predictionText.value = '';
});

socket.on('allPredictions', (predictions) => {
  predictionSection.style.display = 'none';
  resultsSection.style.display = 'block';
  predictionsContainer.innerHTML = '';
  predictions.forEach((prediction) => {
    const predictionCard = document.createElement('div');
    predictionCard.classList.add('prediction-card');
    predictionCard.innerHTML = `
      <h3>${prediction.playerName}</h3>
      <p>${prediction.prediction}</p>
    `;
    predictionsContainer.appendChild(predictionCard);
  });
});

socket.on('predictionCount', (count) => {
  predictionCountDisplay.textContent = `Predictions: ${count}/5`;
});