document.addEventListener('DOMContentLoaded', () => {
    // Initialize socket connection
    const socket = io();

    // DOM Elements - Screens
    const joinScreen = document.getElementById('joinScreen');
    const createGameScreen = document.getElementById('createGameScreen');
    const gameScreen = document.getElementById('gameScreen');
    
    // DOM Elements - Join Screen
    const gameIdInput = document.getElementById('gameId');
    const usernameInput = document.getElementById('username');
    const joinGameBtn = document.getElementById('joinGameBtn');
    const createGameBtn = document.getElementById('createGameBtn');
    
    // DOM Elements - Create Game Screen
    const gameQuestionInput = document.getElementById('gameQuestion');
    const secretCodeInput = document.getElementById('secretCode');
    const secretCodeError = document.getElementById('secretCodeError');
    const createNewGameBtn = document.getElementById('createNewGameBtn');
    const backToJoinBtn = document.getElementById('backToJoinBtn');
    
    // DOM Elements - Game Screen
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
    const predictionCountText = document.querySelector('.counter-text');
    const predictionsList = document.getElementById('predictionsList');
    const predictionsContainer = document.getElementById('predictionsContainer');

    // App State
    let currentGameId = null;
    let currentPredictorId = null;
    let hasSubmitted = false;
    let currentUsername = '';

    // Secret code constant
    const CORRECT_SECRET_CODE = '021';

    // Helper Functions
    function showToast(message, isSuccess = false) {
        const backgroundColor = isSuccess
            ? "linear-gradient(to right, #06d6a0, #05b889)" // Success green
            : "linear-gradient(to right, #ef476f, #d63f61)"; // Error red

        Toastify({
            text: message,
            duration: 3000,
            newWindow: true,
            close: true,
            gravity: "top",
            position: "center",
            stopOnFocus: true,
            style: {
                background: backgroundColor,
                borderRadius: "12px",
            },
            onClick: function () { }
        }).showToast();
    }

    function showScreen(screen) {
        // Hide all screens
        joinScreen.style.display = 'none';
        createGameScreen.style.display = 'none';
        gameScreen.style.display = 'none';
        
        // Show the requested screen
        screen.style.display = 'block';
    }

    function generateAvatarColor(username) {
        // Simple hash function to generate consistent colors
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        // Generate HSL color with fixed saturation and lightness
        const hue = hash % 360;
        return `hsl(${hue}, 70%, 60%)`;
    }

    // Event Listeners - Navigation
    createGameBtn.addEventListener('click', () => {
        showScreen(createGameScreen);
        secretCodeError.style.display = 'none';
        secretCodeInput.classList.remove('shake');
        gameQuestionInput.value = '';
        secretCodeInput.value = '';
    });

    backToJoinBtn.addEventListener('click', () => {
        showScreen(joinScreen);
    });

    // Event Listeners - Create Game
    createNewGameBtn.addEventListener('click', async () => {
        const question = gameQuestionInput.value.trim();
        const secretCode = secretCodeInput.value.trim();

        if (!question) {
            showToast('Please enter a question for the game.');
            gameQuestionInput.focus();
            return;
        }

        // Validate the secret code
        if (secretCode !== CORRECT_SECRET_CODE) {
            showToast('Invalid secret code');
            secretCodeError.style.display = 'block';
            secretCodeInput.classList.add('shake');
            secretCodeInput.focus();

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

            if (!response.ok) {
                throw new Error('Failed to create game');
            }

            const data = await response.json();
            
            // Auto-fill the game ID in the join screen
            gameIdInput.value = data.gameId;
            
            showScreen(joinScreen);
            showToast(`Game created! Your Game Code is: ${data.gameId}`, true);

            // Clear the secret code input for security
            secretCodeInput.value = '';

        } catch (error) {
            console.error('Error creating game:', error);
            showToast('Failed to create game. Please try again.');
        }
    });

    // Event Listeners - Join Game
    joinGameBtn.addEventListener('click', async () => {
        const gameId = gameIdInput.value.trim();
        const username = usernameInput.value.trim();

        if (!gameId) {
            showToast('Please enter a Game Code');
            gameIdInput.focus();
            return;
        }

        if (!username) {
            showToast('Please enter your name');
            usernameInput.focus();
            return;
        }

        try {
            const response = await fetch(`/api/games/${gameId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to join game');
            }

            const data = await response.json();
            
            // Update app state
            currentGameId = data.game.id;
            currentPredictorId = data.predictorId;
            currentUsername = username;

            // Update UI
            showScreen(gameScreen);
            
            // Show user info
            userInfoElement.style.display = 'flex';
            usernameDisplay.textContent = username;
            userAvatar.textContent = username.charAt(0).toUpperCase();
            userAvatar.style.backgroundColor = generateAvatarColor(username);
            
            // Update game info
            gameQuestionDisplay.textContent = data.game.question;
            gameCodeDisplay.textContent = data.game.id;
            
            // Reset UI state
            predictionForm.style.display = 'block';
            predictionInput.value = '';
            predictionInput.removeAttribute('readonly');
            submitPredictionBtn.disabled = false;
            waitingMessage.style.display = 'block';
            statusMessage.style.display = 'none';
            predictionsList.style.display = 'none';
            predictionCount.style.display = 'none';
            hasSubmitted = false;

            // Join the game room
            socket.emit('join_game', currentGameId);

        } catch (error) {
            console.error('Error joining game:', error);
            showToast(error.message || 'Failed to join game. Please try again.');
        }
    });

    // Event Listeners - Game Screen
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

    pastePredictionBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            predictionInput.value = text;
            predictionInput.focus();
        } catch (err) {
            console.error('Failed to read clipboard:', err);
            showToast('Failed to paste. Please make sure you have copied text to your clipboard.');
        }
    });

    clearPredictionBtn.addEventListener('click', () => {
        predictionInput.value = '';
        predictionInput.focus();
    });

    submitPredictionBtn.addEventListener('click', async () => {
        const prediction = predictionInput.value.trim();

        if (!prediction) {
            showToast("Please enter or paste your prediction before submitting.");
            predictionInput.focus();
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
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit prediction');
            }

            const data = await response.json();
            
            // Update UI
            predictionInput.setAttribute('readonly', true);
            submitPredictionBtn.disabled = true;
            hasSubmitted = true;

            // Show appropriate message based on all predictions submitted
            if (data.allPredictionsSubmitted) {
                statusMessage.innerHTML = '<i class="fas fa-check-circle"></i><span>Your prediction has been sent. Below you will find all the contestants\' predictions, including your own.</span>';
            } else {
                statusMessage.innerHTML = '<i class="fas fa-check-circle"></i><span>Your prediction has been sent. The predictions will be revealed when all players have submitted.</span>';
            }
            statusMessage.style.display = 'block';
            
            // Show prediction count if not all predictions submitted
            if (!data.allPredictionsSubmitted) {
                predictionCount.style.display = 'block';
            }

        } catch (error) {
            console.error('Error submitting prediction:', error);
            showToast(error.message || 'Failed to submit prediction. Please try again.');
        }
    });

    // Socket.IO Event Handlers
    socket.on('predictor_update', (data) => {
        if (data.gameId === currentGameId) {
            playerCountDisplay.textContent = `Players: ${data.count}/${data.total}`;
            
            // If all players have joined, hide the waiting message
            if (data.count === data.total) {
                waitingMessage.style.display = 'none';
            } else {
                waitingMessage.style.display = 'block';
            }
        }
    });

    socket.on('prediction_update', (data) => {
        if (data.gameId === currentGameId) {
            predictionCountText.textContent = `Predictions: ${data.count}/${data.total}`;
            
            // Only show the prediction count if the user has submitted
            if (hasSubmitted) {
                predictionCount.style.display = 'block';
            }
        }
    });

    socket.on('all_predictions_revealed', (data) => {
        if (data.gameId === currentGameId) {
            // Update UI
            statusMessage.style.display = 'none';
            predictionCount.style.display = 'none';
            waitingMessage.style.display = 'none';
            
            // Clear and populate predictions
            predictionsContainer.innerHTML = '';
            
            data.predictions.forEach((item) => {
                const { predictor, prediction } = item;
                const isCurrentUser = predictor.id === currentPredictorId;
                
                const predictionCard = document.createElement('div');
                predictionCard.className = 'prediction-card';
                
                if (isCurrentUser) {
                    predictionCard.classList.add('highlight');
                }
                
                const avatarColor = generateAvatarColor(predictor.username);
                const submittedAt = new Date(prediction.submittedAt);
                const timeString = submittedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                
                // Format prediction content for HTML display
                const formattedPrediction = prediction.content.replace(/\n/g, '<br>');
                
                predictionCard.innerHTML = `
                    <div class="prediction-header">
                        <div class="predictor-info">
                            <div class="predictor-avatar" style="background-color: ${avatarColor}">
                                ${predictor.username.charAt(0).toUpperCase()}
                            </div>
                            <div class="predictor-name">
                                ${predictor.username} ${isCurrentUser ? '(You)' : ''}
                            </div>
                        </div>
                        <div class="timestamp">${timeString}</div>
                    </div>
                    <div class="prediction-content">${formattedPrediction}</div>
                `;
                
                predictionsContainer.appendChild(predictionCard);
            });
            
            // Show the predictions list with a fade-in effect
            predictionsList.classList.add('fade-in');
            predictionsList.style.display = 'block';
        }
    });

    // Handle connection and disconnection
    socket.on('connect', () => {
        console.log('Connected to server');
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
    
    socket.on('error', (error) => {
        console.error('Socket error:', error);
        showToast('Connection error. Please refresh the page.');
    });

    // Initial setup
    showScreen(joinScreen);
});