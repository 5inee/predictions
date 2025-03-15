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

    const gameQuestionDisplay = document.querySelector('#gameScreen .game-title'); // تم التعديل هنا
    const gameCodeDisplay = document.querySelector('#gameCode span'); // تم التعديل هنا
    const waitingMessage = document.getElementById('waitingMessage');
    const playerCountDisplay = document.querySelector('.player-count'); // تأكد من وجود هذا العنصر

    const predictionForm = document.getElementById('predictionForm');
    const predictionInput = document.getElementById('prediction');
    const submitPredictionBtn = document.getElementById('submitPredictionBtn');
    const pastePredictionBtn = document.getElementById('pastePredictionBtn'); // الزر الجديد
    const clearPredictionBtn = document.getElementById('clearPredictionBtn'); // الزر الجديد

    const statusMessage = document.getElementById('statusMessage');
    const predictionCount = document.getElementById('predictionCount'); // تأكد من وجود هذا العنصر
    const predictionsList = document.getElementById('predictionsList');
    const predictionsContainer = document.getElementById('predictionsContainer');

    // App State
    let currentGameId = null;
    let currentPredictorId = null;
    let hasSubmitted = false;

    // Secret code constant
    const CORRECT_SECRET_CODE = '021'; // تأكد أن هذا هو الكود الصحيح

    // Event Listeners

    // 1. إنشاء لعبة جديدة
    createGameBtn.addEventListener('click', () => {
        joinScreen.style.display = 'none';
        createGameScreen.style.display = 'block';
        // Clear any previous error messages
        secretCodeError.style.display = 'none';
        secretCodeInput.classList.remove('shake'); // في حال كان فيه اهتزاز من محاولة سابقة
    });

    backToJoinBtn.addEventListener('click', () => {
        createGameScreen.style.display = 'none';
        joinScreen.style.display = 'block';
    });

    createNewGameBtn.addEventListener('click', async () => {
        const question = gameQuestionInput.value.trim();
        const secretCode = secretCodeInput.value.trim();

        if (!question) {
            alert('Please enter a question for the game');
            return;
        }

        // Validate the secret code
        if (secretCode !== CORRECT_SECRET_CODE) {
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
                body: JSON.stringify({ question }), // نرسل السؤال فقط
            });

            const data = await response.json();
            gameIdInput.value = data.gameId; // نعرض ID اللعبة للمستخدم

            createGameScreen.style.display = 'none';
            joinScreen.style.display = 'block';

            alert(`Game created! Your Game Code is: ${data.gameId}`);

            // Clear the secret code input for security
            secretCodeInput.value = '';

        } catch (error) {
            console.error('Error creating game:', error);
            alert('Failed to create game. Please try again.');
        }
    });

    // 2. الانضمام إلى لعبة
    joinGameBtn.addEventListener('click', async () => {
        const gameId = gameIdInput.value.trim();
        const username = usernameInput.value.trim();

        if (!gameId || !username) {
            alert('Please enter both Game ID and your name');
            return;
        }

        try {
            const response = await fetch(`/api/games/${gameId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }), // نرسل اسم المستخدم
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to join game');
            }

            const data = await response.json();

            // تهيئة اللعبة
            currentGameId = data.game.id;
            currentPredictorId = data.predictorId;

            // تحديث واجهة المستخدم
            joinScreen.style.display = 'none';
            gameScreen.style.display = 'block';

            userInfoElement.style.display = 'flex'; // إظهار معلومات المستخدم
            usernameDisplay.textContent = username;
            userAvatar.textContent = username.charAt(0).toUpperCase(); // الحرف الأول من الاسم

            gameQuestionDisplay.textContent = data.game.question; // عرض سؤال اللعبة
            gameCodeDisplay.textContent = data.game.id; // عرض ID اللعبة

            // الانضمام إلى غرفة Socket.IO
            socket.emit('join_game', currentGameId);

        } catch (error) {
            console.error('Error joining game:', error);
            alert(error.message || 'Failed to join game. Please try again.');
        }
    });

    // لصق التوقع
    pastePredictionBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            predictionInput.value = text;
        } catch (err) {
            console.error('Failed to read clipboard:', err);
            alert('Failed to paste. Please make sure you have copied text to your clipboard.');
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
            alert("Please paste your prediction before submitting.");
            return;
        }

        if (hasSubmitted) {
            alert('You have already submitted a prediction');
            return;
        }

        try {
            const response = await fetch(`/api/games/${currentGameId}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ predictorId: currentPredictorId, prediction }), // نرسل الـ ID والPrediction
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to submit prediction');
            }

            const data = await response.json();

            // تحديث واجهة المستخدم
            predictionForm.style.display = 'none'; // إخفاء فورم التوقع
            statusMessage.style.display = 'block'; // إظهار رسالة التأكيد
            hasSubmitted = true; // منع المستخدم من الإرسال مرة ثانية

        } catch (error) {
            console.error('Error submitting prediction:', error);
            alert(error.message || 'Failed to submit prediction. Please try again.');
        }
    });

    // Socket.IO Event Handlers

    // تحديث عدد اللاعبين
    socket.on('predictor_update', (data) => {
        if (playerCountDisplay) {
           playerCountDisplay.textContent = `Players: ${data.count}/${data.total}`;
        }

    });

    // تحديث عدد التوقعات
    socket.on('prediction_update', (data) => {
        if (predictionCount) {
            predictionCount.style.display = 'block'; // إظهار العداد
            predictionCount.textContent = `Predictions: ${data.count}/${data.total}`;
        }
    });

    // عرض كل التوقعات
    socket.on('all_predictions_revealed', (data) => {
        statusMessage.style.display = 'none'; // إخفاء رسالة التأكيد
        predictionCount.style.display = 'none'; // إخفاء عداد التوقعات
        predictionsContainer.innerHTML = ''; // مسح أي توقعات سابقة

        data.predictions.forEach((item) => {
            const { predictor, prediction } = item;
            const isCurrentUser = predictor.id === currentPredictorId; // هل هذا توقع المستخدم الحالي؟

            const predictionCard = document.createElement('div');
            predictionCard.className = 'prediction-card'; // كلاس عشان التنسيق

            const submittedAt = new Date(prediction.submittedAt);
            const timeString = submittedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); // تنسيق الوقت

            const formattedPrediction = prediction.content.replace(/\n/g, '<br>'); // تحويل الأسطر الجديدة إلى <br>

            //  استخدام لون الصورة الرمزية
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

        predictionsList.style.display = 'block'; // إظهار قائمة التوقعات
    });
});