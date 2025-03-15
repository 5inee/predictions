document.addEventListener('DOMContentLoaded', () => {
    const socket = io(); // إنشاء اتصال Socket.IO

    // عناصر الـ DOM (الواجهة)
    const joinScreen = document.getElementById('joinScreen'); // شاشة الانضمام
    const createGameScreen = document.getElementById('createGameScreen'); // شاشة إنشاء لعبة
    const gameScreen = document.getElementById('gameScreen'); // شاشة اللعبة
    const gameIdInput = document.getElementById('gameId'); // حقل إدخال رمز اللعبة
    const usernameInput = document.getElementById('username'); // حقل إدخال اسم المستخدم
    const joinGameBtn = document.getElementById('joinGameBtn'); // زر "انضم إلى اللعبة"
    const createGameBtn = document.getElementById('createGameBtn'); // زر "إنشاء لعبة جديدة"
    const gameQuestionInput = document.getElementById('gameQuestion'); // حقل إدخال سؤال اللعبة
    const secretCodeInput = document.getElementById('secretCode'); // حقل إدخال الرمز السري
    const secretCodeError = document.getElementById('secretCodeError'); // رسالة خطأ الرمز السري
    const createNewGameBtn = document.getElementById('createNewGameBtn'); // زر "إنشاء اللعبة" (داخل شاشة الإنشاء)
    const backToJoinBtn = document.getElementById('backToJoinBtn'); // زر "رجوع" (داخل شاشة الإنشاء)
    const userInfoElement = document.getElementById('userInfo'); // معلومات المستخدم (في شاشة اللعبة)
    const usernameDisplay = document.getElementById('usernameDisplay'); // اسم المستخدم (في شاشة اللعبة)
    const userAvatar = document.getElementById('userAvatar'); // صورة المستخدم الرمزية (في شاشة اللعبة)
    const gameQuestionDisplay = document.querySelector('#gameScreen .game-title'); // عنوان اللعبة (سؤال اللعبة)
    const gameCodeDisplay = document.querySelector('#gameCode span'); // رمز اللعبة (في شاشة اللعبة)
    const waitingMessage = document.getElementById('waitingMessage'); // رسالة "في انتظار اللاعبين"
    const playerCountDisplay = document.querySelector('.player-count'); // عدد اللاعبين
    const predictionForm = document.getElementById('predictionForm'); // نموذج إرسال التوقع
    const predictionInput = document.getElementById('prediction'); // حقل إدخال التوقع
    const submitPredictionBtn = document.getElementById('submitPredictionBtn'); // زر "أرسل التوقع"
    const pastePredictionBtn = document.getElementById('pastePredictionBtn'); // زر "لصق"
    const clearPredictionBtn = document.getElementById('clearPredictionBtn'); // زر "مسح"
    const statusMessage = document.getElementById('statusMessage'); // رسالة تأكيد الإرسال
    const predictionCount = document.getElementById('predictionCount'); // عدد التوقعات المرسلة
    const predictionsList = document.getElementById('predictionsList'); // قائمة التوقعات
    const predictionsContainer = document.getElementById('predictionsContainer'); // العنصر اللي بتظهر فيه التوقعات

    // متغيرات لتخزين حالة اللعبة
    let currentGameId = null; // رمز اللعبة الحالية
    let currentPredictorId = null; // معرّف المستخدم الحالي
    let hasSubmitted = false; // هل أرسل المستخدم توقع؟

    // الرمز السري الصحيح (ثابت)
    const CORRECT_SECRET_CODE = '021';

    // دالة لعرض الإشعارات (Toastify)
    function showToast(message, isSuccess = false) {
        const backgroundColor = isSuccess
            ? "linear-gradient(to right, #2ecc71, #27ae60)" // أخضر (للنجاح)
            : "linear-gradient(to right, #e74c3c, #c0392b)"; // أحمر (للخطأ)

        Toastify({
            text: message,
            duration: 3000, // 3 ثواني
            newWindow: true,
            close: true,
            gravity: "top", // يظهر فوق
            position: "center", // في المنتصف
            stopOnFocus: true, // يوقف العد التنازلي لما المستخدم يركز على الإشعار
            style: {
                background: backgroundColor,
                borderRadius: "10px",
            },
            onClick: function () { } // ما يسوي شي لما المستخدم يضغط على الإشعار
        }).showToast();
    }


    // مستمعات الأحداث (Event Listeners)

    // 1. إنشاء لعبة جديدة
    createGameBtn.addEventListener('click', () => {
        joinScreen.style.display = 'none'; // إخفاء شاشة الانضمام
        createGameScreen.style.display = 'block'; // إظهار شاشة إنشاء لعبة
        // مسح أي رسائل خطأ سابقة
        secretCodeError.style.display = 'none';
        secretCodeInput.classList.remove('shake');
    });

    backToJoinBtn.addEventListener('click', () => {
        createGameScreen.style.display = 'none'; // إخفاء شاشة إنشاء لعبة
        joinScreen.style.display = 'block'; // إظهار شاشة الانضمام
    });

    createNewGameBtn.addEventListener('click', async () => {
        const question = gameQuestionInput.value.trim(); // سؤال اللعبة (بدون مسافات فارغة في البداية والنهاية)
        const secretCode = secretCodeInput.value.trim(); // الرمز السري

        if (!question) {
            showToast('الرجاء إدخال سؤال للعبة.');
            return;
        }

        // التحقق من الرمز السري
        if (secretCode !== CORRECT_SECRET_CODE) {
            showToast('رمز سري خاطئ');
            secretCodeError.style.display = 'block'; // إظهار رسالة الخطأ
            secretCodeInput.classList.add('shake'); // إضافة مؤثر الاهتزاز

            // إزالة مؤثر الاهتزاز بعد 500 مللي ثانية
            setTimeout(() => {
                secretCodeInput.classList.remove('shake');
            }, 500);

            return;
        }

        try {
            // إرسال طلب لإنشاء لعبة جديدة (API)
            const response = await fetch('/api/games', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question }), // إرسال السؤال
            });

            const data = await response.json(); // استقبال بيانات اللعبة الجديدة (فيها رمز اللعبة)
            gameIdInput.value = data.gameId; // تعيين رمز اللعبة في حقل الإدخال (في شاشة الانضمام)

            createGameScreen.style.display = 'none'; // إخفاء شاشة إنشاء لعبة
            joinScreen.style.display = 'block'; // إظهار شاشة الانضمام

            // رسالة نجاح
            showToast(`تم إنشاء اللعبة! رمز اللعبة الخاص بك هو: ${data.gameId}`, true);

            // مسح الرمز السري (للأمان)
            secretCodeInput.value = '';

        } catch (error) {
            console.error('Error creating game:', error);
            showToast('فشل إنشاء اللعبة. الرجاء المحاولة مرة أخرى.');
        }
    });

    // 2. الانضمام إلى لعبة
    joinGameBtn.addEventListener('click', async () => {
        const gameId = gameIdInput.value.trim(); // رمز اللعبة
        const username = usernameInput.value.trim(); // اسم المستخدم

        if (!gameId || !username) {
            showToast('الرجاء إدخال رمز اللعبة واسمك');
            return;
        }

        try {
            // إرسال طلب للانضمام إلى لعبة (API)
            const response = await fetch(`/api/games/${gameId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }), // إرسال اسم المستخدم
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'فشل الانضمام إلى اللعبة');
            }

            const data = await response.json(); // استقبال بيانات اللعبة

            currentGameId = data.game.id; // تخزين رمز اللعبة
            currentPredictorId = data.predictorId; // تخزين معرّف المستخدم

            joinScreen.style.display = 'none'; // إخفاء شاشة الانضمام
            gameScreen.style.display = 'block'; // إظهار شاشة اللعبة

            userInfoElement.style.display = 'flex'; // إظهار معلومات المستخدم
            usernameDisplay.textContent = username; // عرض اسم المستخدم
            userAvatar.textContent = username.charAt(0).toUpperCase(); // عرض الحرف الأول من اسم المستخدم

            gameQuestionDisplay.textContent = data.game.question; // عرض سؤال اللعبة
            gameCodeDisplay.textContent = data.game.id; // عرض رمز اللعبة

            predictionForm.style.display = 'block'; // إظهار نموذج إرسال التوقع
            waitingMessage.style.display = 'block'; // إظهار رسالة "في انتظار اللاعبين"
            statusMessage.style.display = 'none'; // إخفاء رسالة التأكيد
            predictionsList.style.display = 'none'; // إخفاء قائمة التوقعات

            socket.emit('join_game', currentGameId); // إرسال حدث "join_game" للسيرفر (عبر Socket.IO)

        } catch (error) {
            console.error('Error joining game:', error);
            showToast(error.message || 'فشل الانضمام إلى اللعبة. الرجاء المحاولة مرة أخرى.');
        }
    });

    // لصق التوقع
    pastePredictionBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText(); // قراءة النص من الحافظة
            predictionInput.value = text; // تعيين النص في حقل إدخال التوقع
        } catch (err) {
            console.error('Failed to read clipboard:', err);
            showToast('فشل اللصق. الرجاء التأكد من نسخ نص إلى الحافظة.');
        }
    });

    // مسح التوقع
    clearPredictionBtn.addEventListener('click', () => {
        predictionInput.value = ''; // مسح حقل إدخال التوقع
    });

    // 3. إرسال التوقع
    submitPredictionBtn.addEventListener('click', async () => {
        const prediction = predictionInput.value.trim(); // التوقع (بدون مسافات فارغة في البداية والنهاية)

        if (!prediction) {
            showToast("الرجاء لصق توقعك قبل الإرسال.");
            return;
        }

        if (hasSubmitted) {
            showToast('لقد أرسلت توقعًا بالفعل');
            return;
        }

        try {
            // إرسال طلب لإرسال التوقع (API)
            const response = await fetch(`/api/games/${currentGameId}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ predictorId: currentPredictorId, prediction }), // إرسال معرّف المستخدم والتوقع
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'فشل إرسال التوقع');
            }

            const data = await response.json(); // استقبال بيانات (ما نحتاجها هنا)

            predictionForm.style.display = 'none'; // إخفاء نموذج إرسال التوقع
            statusMessage.style.display = 'block'; // إظهار رسالة التأكيد
            hasSubmitted = true; // تعيين أن المستخدم أرسل توقع

        } catch (error) {
            console.error('Error submitting prediction:', error);
            showToast(error.message || 'فشل إرسال التوقع. الرجاء المحاولة مرة أخرى.');
        }
    });

    // أحداث Socket.IO

    socket.on('predictor_update', (data) => { // لما لاعب جديد ينضم أو يخرج
        if (playerCountDisplay) {
            playerCountDisplay.textContent = `اللاعبون: ${data.count}/${data.total}`; // تحديث عدد اللاعبين
            // إذا اكتمل عدد اللاعبين، إخفاء رسالة الانتظار
            if (data.count === data.total) {
                waitingMessage.style.display = 'none';
            }
        }
    });

    // تحديث عدد التوقعات
    socket.on('prediction_update', (data) => {
        if (predictionCount) {
            predictionCount.style.display = 'block';
            predictionCount.textContent = `التوقعات: ${data.count}/${data.total}`;
        }
    });

    // عرض كل التوقعات
    socket.on('all_predictions_revealed', (data) => {
        statusMessage.style.display = 'none'; // إخفاء رسالة التأكيد
        predictionCount.style.display = 'none'; // إخفاء عدد التوقعات
        predictionsContainer.innerHTML = ''; // مسح أي توقعات سابقة

        data.predictions.forEach((item) => {
            const { predictor, prediction } = item;
            const isCurrentUser = predictor.id === currentPredictorId; // هل هذا التوقع من المستخدم الحالي؟

            const predictionCard = document.createElement('div'); // إنشاء عنصر للتوقع
            predictionCard.className = 'prediction-card';

            const submittedAt = new Date(prediction.submittedAt); // وقت إرسال التوقع
            const timeString = submittedAt.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }); // تنسيق الوقت

            const formattedPrediction = prediction.content.replace(/\n/g, '<br>'); // استبدال فواصل الأسطر بـ <br>

            predictionCard.innerHTML = `
        <div class="prediction-header">
          <div class="predictor-info">
            <div class="predictor-avatar" style="background-color: ${predictor.avatarColor}">
              ${predictor.username.charAt(0).toUpperCase()}
            </div>
            <div class="predictor-name">
              ${predictor.username} ${isCurrentUser ? '(أنت)' : ''}
            </div>
          </div>
          <div class="timestamp">${timeString}</div>
        </div>
        <div class="prediction-content">${formattedPrediction}</div>
      `;

            predictionsContainer.appendChild(predictionCard); // إضافة التوقع إلى قائمة التوقعات
        });

        predictionsList.style.display = 'block'; // إظهار قائمة التوقعات
    });
});