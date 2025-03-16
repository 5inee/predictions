document.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    // DOM Elements
    const joinScreen = document.getElementById('joinScreen');
    const createGameScreen = document.getElementById('createGameScreen');
    const gameScreen = document.getElementById('gameScreen');
    const gameIdInput = document.getElementById('gameId');
    const usernameInput = document.getElementById('username');
    const joinGameBtn = document.getElementById('joinGameBtn');
    const createGameBtn = document.getElementById('createGameBtn');
    const gameQuestionInput = document.getElementById('gameQuestion');
    const secretCodeInput = document.getElementById('secretCode');
    const secretCodeError = document.getElementById('secretCodeError');
    const createNewGameBtn = document.getElementById('createNewGameBtn');
    const backToJoinBtn = document.getElementById('backToJoinBtn');
    const userInfoElement = document.getElementById('userInfo');
    const usernameDisplay = document.getElementById('usernameDisplay');
    const userAvatar = document.getElementById('userAvatar');
    const gameQuestionDisplay = document.querySelector('.game-title');
    const gameCodeDisplay = document.getElementById('gameCodeDisplay');
    const copyButton = document.querySelector('.copy-button');
    const waitingMessage = document.getElementById('waitingMessage');
    const playerCountDisplay = document.querySelector('.player-count');
    const predictionForm = document.getElementById('predictionForm');
    const predictionInput = document.getElementById('prediction');
    const submitPredictionBtn = document.getElementById('submitPredictionBtn');
    const pastePredictionBtn = document.getElementById('pastePredictionBtn');
    const clearPredictionBtn = document.getElementById('clearPredictionBtn');
    const statusMessage = document.getElementById('statusMessage');
    const predictionCount = document.getElementById('predictionCount');
    const predictionsList = document.getElementById('predictionsList');
    const predictionsContainer = document.getElementById('predictionsContainer');

    // App State
    let currentGameId = null;
    let currentPredictorId = null;
    let hasSubmitted = false;

    // Secret code constant
    const CORRECT_SECRET_CODE = '021';

    // Toast notification function with enhanced styling
    function showToast(message, isSuccess = false) {
        const backgroundColor = isSuccess
            ? "linear-gradient(135deg, #06d6a0, #04a57b)" // Success gradient
            : "linear-gradient(135deg, #ef476f, #d13965)"; // Error gradient

        Toastify({
            text: message,
            duration: 3000,
            close: true,
            gravity: "top",
            position: "center",
            stopOnFocus: true,
            style: {
                background: backgroundColor,
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                padding: "12px 20px",
            },
        }).showToast();
    }

    // Event Listeners

    // 1. Create new game
    createGameBtn.addEventListener('click', () => {
        joinScreen.style.display = 'none';
        createGameScreen.style.display = 'block';
        // Clear previous error messages
        secretCodeError.style.display = 'none';
        secretCodeInput.classList.remove('shake');
    });

    backToJoinBtn.addEventListener('click', () => {
        createGameScreen.style.display = 'none';
        joinScreen.style.display = 'block';
    });

    createNewGameBtn.addEventListener('click', async () => {
        const question = gameQuestionInput.value.trim();
        const secretCode = secretCodeInput.value.trim();

        if (!question) {
            showToast('Please enter a question for the game.');
            gameQuestionInput.classList.add('highlight');
            setTimeout(() => {
                gameQuestionInput.classList.remove('highlight');
            }, 2000);
            return;
        }

        // Validate the secret code
        if (secretCode !== CORRECT_SECRET_CODE) {
            showToast('Invalid secret code');
            secretCodeError.style.display = 'block';
            secretCodeInput.classList.add('shake');

            // Remove the shake class after the animation completes
            setTimeout(() => {
                secretCodeInput.classList.remove('shake');
            }, 500);

            return;
        }

        try {
            const response = await fetch('/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }),
            });

            const data = await response.json();
            gameIdInput.value = data.gameId;

            createGameScreen.style.display = 'none';
            joinScreen.style.display = 'block';

            // Success message with game code
            showToast(`Game created! Game Code: ${data.gameId}`, true);

            // Clear the secret code input for security
            secretCodeInput.value = '';

        } catch (error) {
            console.error('Error creating game:', error);
            showToast('Failed to create game. Please try again.');
        }
    });

    // 2. Join a game
    joinGameBtn.addEventListener('click', async () => {
        const gameId = gameIdInput.value.trim();
        const username = usernameInput.value.trim();

        if (!gameId || !username) {
            showToast('Please enter both Game Code and your name');
            return;
        }

        try {
            const response = await fetch(`/api/games/${gameId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to join game');
            }

            const data = await response.json();

            currentGameId = data.game.id;
            currentPredictorId = data.predictorId;

            joinScreen.style.display = 'none';
            gameScreen.style.display = 'block';

            userInfoElement.style.display = 'flex';
            usernameDisplay.textContent = username;
            userAvatar.textContent = username.charAt(0).toUpperCase();

            gameQuestionDisplay.textContent = data.game.question;
            gameCodeDisplay.textContent = data.game.id;

            predictionForm.style.display = 'block';
            waitingMessage.style.display = 'flex';
            statusMessage.style.display = 'none';
            predictionsList.style.display = 'none';

            socket.emit('join_game', currentGameId);

        } catch (error) {
            console.error('Error joining game:', error);
            showToast(error.message || 'Failed to join game. Please try again.');
        }
    });

    // Copy game code to clipboard
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(currentGameId)
            .then(() => {
                showToast('Game Code copied to clipboard!', true);
            })
            .catch(err => {
                console.error('Failed to copy Game Code:', err);
                showToast('Failed to copy Game Code.');
            });
    });

    // Paste prediction from clipboard
    pastePredictionBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            predictionInput.value = text;
        } catch (err) {
            console.error('Failed to read clipboard:', err);
            showToast('Failed to paste. Please make sure you have copied text to your clipboard.');
        }
    });

    // Clear prediction input
    clearPredictionBtn.addEventListener('click', () => {
        predictionInput.value = '';
    });

    // 3. Submit prediction
    submitPredictionBtn.addEventListener('click', async () => {
        const prediction = predictionInput.value.trim();

        if (!prediction) {
            showToast("Please paste your prediction before submitting.");
            predictionInput.classList.add('highlight');
            setTimeout(() => {
                predictionInput.classList.remove('highlight');
            }, 2000);
            return;
        }

        if (hasSubmitted) {
            showToast('You have already submitted a prediction');
            return;
        }

        try {
            const response = await fetch(`/api/games/${currentGameId}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ predictorId: currentPredictorId, prediction }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to submit prediction');
            }

            const data = await response.json();

            predictionForm.style.display = 'none';
            hasSubmitted = true;

            if (data.allPredictionsSubmitted) {
                statusMessage.innerHTML = '<i class="fas fa-check-circle"></i><span>Your prediction has been sent. Below you will find all the contestants\' predictions, including your own.</span>';
            } else {
                statusMessage.innerHTML = '<i class="fas fa-check-circle"></i><span>Your prediction has been sent. The rest of the competitors\' predictions will be revealed when all players have submitted.</span>';
            }
            statusMessage.style.display = 'flex';

            // Show submit success animation
            statusMessage.classList.add('fade-in');

        } catch (error) {
            console.error('Error submitting prediction:', error);
            showToast(error.message || 'Failed to submit prediction. Please try again.');
        }
    });

    // Socket.IO Event Handlers

    socket.on('predictor_update', (data) => {
        if (playerCountDisplay) {
            playerCountDisplay.textContent = `Players: ${data.count}/${data.total}`;
            // Hide waiting message if all players have joined
            if (data.count === data.total) {
                waitingMessage.style.display = 'none';
            }
        }
    });

    // Update prediction count
    socket.on('prediction_update', (data) => {
        if (predictionCount) {
            predictionCount.style.display = 'flex';
            predictionCount.innerHTML = `
                <div class="counter-icon">
                    <i class="fas fa-lightbulb"></i>
                </div>
                <div class="counter-text">Predictions: ${data.count}/${data.total}</div>
            `;
        }
    });

    // Display all predictions
    socket.on('all_predictions_revealed', (data) => {
        statusMessage.style.display = 'none';
        predictionCount.style.display = 'none';
        predictionsContainer.innerHTML = '';

        data.predictions.forEach((item) => {
            const { predictor, prediction } = item;
            const isCurrentUser = predictor.id === currentPredictorId;

            // Generate a consistent color based on username
            const getAvatarColor = (username) => {
                const colors = [
                    '#5e60ce', '#5390d9', '#4ea8de', '#48bfe3', '#56cfe1',
                    '#64dfdf', '#72efdd', '#80ffdb', '#06d6a0', '#f9c74f',
                    '#90be6d', '#43aa8b', '#4d908e', '#577590', '#277da1'
                ];
                
                // Simple hash function to select a color
                let hash = 0;
                for (let i = 0; i < username.length; i++) {
                    hash = username.charCodeAt(i) + ((hash << 5) - hash);
                }
                
                return colors[Math.abs(hash) % colors.length];
            };

            const predictionCard = document.createElement('div');
            predictionCard.className = 'prediction-card fade-in';

            const submittedAt = new Date(prediction.submittedAt);
            const timeString = submittedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

            const formattedPrediction = prediction.content.replace(/\n/g, '<br>');
            const avatarColor = getAvatarColor(predictor.username);

            // Enhanced prediction card template
            predictionCard.innerHTML = `
                <div class="prediction-header">
                    <div class="predictor-info">
                        <div class="predictor-avatar" style="background-color: ${avatarColor}">
                            ${predictor.username.charAt(0).toUpperCase()}
                        </div>
                        <div class="predictor-name">
                            ${predictor.username} ${isCurrentUser ? '<span style="color: var(--primary); font-weight: 700;">(You)</span>' : ''}
                        </div>
                    </div>
                    <div class="timestamp">
                        <i class="far fa-clock"></i> ${timeString}
                    </div>
                </div>
                <div class="prediction-content">${formattedPrediction}</div>
            `;

            predictionsContainer.appendChild(predictionCard);
        });

        predictionsList.style.display = 'block';
    });
});