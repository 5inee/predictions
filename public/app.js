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
    const gameQuestionDisplay = document.querySelector('#gameScreen .game-title');
    const gameCodeDisplay = document.querySelector('#gameCode span');
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

    // دوال لإظهار وإخفاء شاشة التحميل
    function showLoading() {
        document.getElementById('loadingOverlay').style.display = 'flex';
    }

    function hideLoading() {
        document.getElementById('loadingOverlay').style.display = 'none';
    }

    // دالة لعرض الإشعارات
    function showToast(message, isSuccess = false) {
        const backgroundColor = isSuccess
            ? "linear-gradient(to right, #2ecc71, #27ae60)" // أخضر
            : "linear-gradient(to right, #e74c3c, #c0392b)"; // أحمر

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
                borderRadius: "10px",
            },
            onClick: function () { }
        }).showToast();
    }


    // Event Listeners

    // 1. إنشاء لعبة جديدة
    createGameBtn.addEventListener('click', () => {
        joinScreen.style.display = 'none';
        createGameScreen.style.display = 'block';
        // Clear any previous error messages
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

        showLoading(); // إظهار شاشة التحميل
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

            //  رسالة نجاح
            showToast(`Game created! Your Game Code is: ${data.gameId}`, true);

            // Clear the secret code input for security
            secretCodeInput.value = '';

        } catch (error) {
            console.error('Error creating game:', error);
            showToast('Failed to create game. Please try again.');
        } finally {
            hideLoading(); // إخفاء شاشة التحميل
        }
    });

    // 2. الانضمام إلى لعبة
    joinGameBtn.addEventListener('click', async () => {
        const gameId = gameIdInput.value.trim();
        const username = usernameInput.value.trim();

        if (!gameId || !username) {
            showToast('Please enter both Game ID and your name');
            return;
        }

        showLoading(); // إظهار شاشة التحميل
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
            waitingMessage.style.display = 'block';
            statusMessage.style.display = 'none';
            predictionsList.style.display = 'none';

            socket.emit('join_game', currentGameId);

        } catch (error) {
            console.error('Error joining game:', error);
            showToast(error.message || 'Failed to join game. Please try again.');
        } finally {
            hideLoading(); // إخفاء شاشة التحميل
        }
    });

    // لصق التوقع
    pastePredictionBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            predictionInput.value = text;
        } catch (err) {
            console.error('Failed to read clipboard:', err);
            showToast('Failed to paste. Please make sure you have copied text to your clipboard.');
        }
    });

    // مسح التوقع
    clearPredictionBtn.addEventListener('click', () => {
        predictionInput.value = '';
    });

    // 3. إرسال التوقع
    submitPredictionBtn.addEventListener('click', async () => {
        const prediction = predictionInput.value.trim();

        if (!prediction) {
            showToast("Please paste your prediction before submitting.");
            return;
        }

        if (hasSubmitted) {
            showToast('You have already submitted a prediction');
            return;
        }

        showLoading(); // إظهار شاشة التحميل
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
            statusMessage.style.display = 'block';
            hasSubmitted = true;

        } catch (error) {
            console.error('Error submitting prediction:', error);
            showToast(error.message || 'Failed to submit prediction. Please try again.');
        } finally {
            hideLoading(); // إخفاء شاشة التحميل
        }
    });

    // Socket.IO Event Handlers

    socket.on('predictor_update', (data) => {
        if (playerCountDisplay) {
            playerCountDisplay.textContent = `Players: ${data.count}/${data.total}`;
              // إذا وصل عدد اللاعبين للحد الأقصى، نخفي رسالة الانتظار
            if (data.count === data.total) {
                waitingMessage.style.display = 'none';
            }
        }
    });

    // تحديث عدد التوقعات
    socket.on('prediction_update', (data) => {
        if (predictionCount) {
            predictionCount.style.display = 'block';
            predictionCount.textContent = `Predictions: ${data.count}/${data.total}`;
        }
    });

    // عرض كل التوقعات
    socket.on('all_predictions_revealed', (data) => {
        statusMessage.style.display = 'none';
        predictionCount.style.display = 'none';
        predictionsContainer.innerHTML = '';

        data.predictions.forEach((item) => {
            const { predictor, prediction } = item;
            const isCurrentUser = predictor.id === currentPredictorId;

            const predictionCard = document.createElement('div');
            predictionCard.className = 'prediction-card';

            const submittedAt = new Date(prediction.submittedAt);
            const timeString = submittedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

            const formattedPrediction = prediction.content.replace(/\n/g, '<br>');

            predictionCard.innerHTML = `
        <div class="prediction-header">
          <div class="predictor-info">
            <div class="predictor-avatar" style="background-color: ${predictor.avatarColor}">
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

        predictionsList.style.display = 'block';
    });
});