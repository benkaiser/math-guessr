// app.js — Main app controller for Math Guessr

const App = (() => {
  // --- State ---
  let state = {
    mode: 'practice', // 'practice' or 'daily'
    difficulty: 'easy',
    answerMode: 'free', // 'free', 'choice', 'slider'
    questionsPerRound: 5,
    questions: [],
    currentIndex: 0,
    results: [],
    totalScore: 0,
    dailyDayNumber: null,
    scratchOpen: false,
  };

  // --- LocalStorage helpers ---
  const STORAGE_KEYS = {
    dailyScores: 'mathguessr_daily_scores',
    practiceHighScores: 'mathguessr_practice_high_scores',
    settings: 'mathguessr_settings',
  };

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings));
      if (saved) {
        if (saved.difficulty) state.difficulty = saved.difficulty;
        if (saved.answerMode) state.answerMode = saved.answerMode;
        if (saved.questionsPerRound) state.questionsPerRound = saved.questionsPerRound;
        if (saved.soundEnabled !== undefined) {
          if (!saved.soundEnabled) Sound.toggle();
        }
      }
    } catch (e) {}
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({
      difficulty: state.difficulty,
      answerMode: state.answerMode,
      questionsPerRound: state.questionsPerRound,
      soundEnabled: Sound.isEnabled(),
    }));
  }

  function getDailyScores() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.dailyScores)) || {};
    } catch (e) { return {}; }
  }

  function saveDailyScore(dateStr, score) {
    const scores = getDailyScores();
    scores[dateStr] = { score, completed: true };
    localStorage.setItem(STORAGE_KEYS.dailyScores, JSON.stringify(scores));
  }

  function getPracticeHighScores() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.practiceHighScores)) || {};
    } catch (e) { return {}; }
  }

  function savePracticeHighScore(difficulty, score) {
    const scores = getPracticeHighScores();
    if (!scores[difficulty] || score > scores[difficulty]) {
      scores[difficulty] = score;
      localStorage.setItem(STORAGE_KEYS.practiceHighScores, JSON.stringify(scores));
    }
  }

  // --- Daily challenge helpers ---
  function getTodayChallenge() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    if (typeof DAILY_CHALLENGES === 'undefined') return null;
    const challenge = DAILY_CHALLENGES.find(c => c.date === dateStr);
    return challenge || null;
  }

  function isTodayCompleted() {
    const challenge = getTodayChallenge();
    if (!challenge) return false;
    const scores = getDailyScores();
    return !!(scores[challenge.date] && scores[challenge.date].completed);
  }

  // --- Screen: Home ---
  function showHome() {
    UI.showScreen('screen-home');
    updateDailyBadge();
  }

  function updateDailyBadge() {
    const badge = document.getElementById('daily-badge');
    const subtitle = document.getElementById('daily-subtitle');
    const challenge = getTodayChallenge();

    if (!challenge) {
      subtitle.textContent = 'No challenge available today';
      badge.textContent = '';
      return;
    }

    if (isTodayCompleted()) {
      badge.innerHTML = '<span class="daily-badge">Completed ✓</span>';
      const scores = getDailyScores();
      const todayScore = scores[challenge.date];
      subtitle.textContent = `Score: ${todayScore.score.toLocaleString()} / ${(5 * Scoring.MAX_POINTS).toLocaleString()}`;
    } else {
      badge.textContent = '';
      subtitle.textContent = `Day #${challenge.day} — 5 questions, same for everyone`;
    }
  }

  // --- Screen: Settings ---
  function showSettings() {
    UI.showScreen('screen-settings');

    // Populate difficulty grid
    const grid = document.getElementById('difficulty-grid');
    const difficulties = Questions.getDifficulties();
    grid.innerHTML = difficulties.map(d => `
      <button class="difficulty-card ${d.key === state.difficulty ? 'selected' : ''}" data-diff="${d.key}">
        <div class="diff-label" style="color: ${d.color}">${d.label}</div>
        <div class="diff-desc">${d.description}</div>
        <div class="diff-timer">⏱ ${d.timer}s per question</div>
      </button>
    `).join('');

    // Restore selection states
    document.querySelectorAll('.mode-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.mode === state.answerMode);
    });
    document.querySelectorAll('.count-btn').forEach(c => {
      c.classList.toggle('selected', parseInt(c.dataset.count) === state.questionsPerRound);
    });
  }

  // --- Screen: Game ---
  function startGame() {
    // Ensure audio context is unlocked on user interaction
    Sound.ensureContext();

    state.currentIndex = 0;
    state.results = [];
    state.totalScore = 0;
    state.scratchOpen = false;

    if (state.mode === 'daily') {
      const challenge = getTodayChallenge();
      if (!challenge) {
        alert('No daily challenge available for today.');
        showHome();
        return;
      }
      state.questions = challenge.questions.map(q => ({
        ...q,
        timer: Questions.getConfig(q.difficulty).timer,
      }));
      state.dailyDayNumber = challenge.day;
      state.answerMode = 'free'; // Daily is always free entry
    } else {
      state.questions = Questions.generateSet(state.difficulty, state.questionsPerRound);
    }

    showQuestion();
  }

  function showQuestion() {
    UI.showScreen('screen-game');
    UI.clearUrgency();

    const q = state.questions[state.currentIndex];

    // Top bar
    document.getElementById('game-progress').textContent =
      `${state.currentIndex + 1} / ${state.questions.length}`;
    document.getElementById('game-score').textContent =
      `${state.totalScore.toLocaleString()} pts`;

    // Question
    document.getElementById('question-expression').textContent = `${q.expression} = ?`;

    // Hint for extreme division
    const hint = document.getElementById('question-hint');
    if (q.difficulty === 'extreme' && q.expression.includes('÷')) {
      hint.textContent = 'Round to 1 decimal place';
      hint.style.display = '';
    } else {
      hint.textContent = '';
      hint.style.display = 'none';
    }

    // Scratch pad
    const scratchArea = document.getElementById('scratch-area');
    const scratchTextarea = document.getElementById('scratch-textarea');
    scratchArea.classList.toggle('open', state.scratchOpen);
    scratchTextarea.value = '';

    // Answer input
    setupAnswerInput(q);

    // Start audio ticking
    Sound.startTicking(q.timer);

    // Timer
    Timer.start(q.timer,
      (remaining, total, fraction) => {
        UI.updateTimerRing(fraction, remaining);
      },
      () => {
        // Time's up — play sound and auto-submit
        Sound.stopTicking();
        Sound.timeUp();
        submitAnswer(null);
      }
    );
  }

  function setupAnswerInput(question) {
    if (state.answerMode === 'choice') {
      const choices = Questions.generateChoices(question.answer);
      const { buttons } = UI.renderMultipleChoice(choices);
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          Sound.submit();
          submitAnswer(parseFloat(btn.dataset.value));
        });
      });
    } else if (state.answerMode === 'slider') {
      const range = Questions.generateSliderRange(question.answer);
      const { getAnswer } = UI.renderSlider(range);
      document.getElementById('submit-btn').addEventListener('click', () => {
        Sound.submit();
        submitAnswer(getAnswer());
      });
    } else {
      // Free entry (default)
      const { getAnswer } = UI.renderFreeEntry();
      const submitBtn = document.getElementById('submit-btn');
      submitBtn.addEventListener('click', () => {
        const val = getAnswer();
        if (val === null) return; // Empty input
        Sound.submit();
        submitAnswer(val);
      });
      // Enter key to submit
      document.getElementById('answer-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const val = getAnswer();
          if (val === null) return;
          Sound.submit();
          submitAnswer(val);
        }
      });
    }
  }

  function submitAnswer(guess) {
    Sound.stopTicking();
    UI.clearUrgency();
    const timeRemaining = Timer.stop();
    const q = state.questions[state.currentIndex];

    const scoreData = Scoring.calculateScore(
      guess !== null ? guess : 0,
      q.answer,
      timeRemaining,
      q.timer
    );

    // If they didn't answer (timeout), override
    if (guess === null) {
      scoreData.guess = null;
      scoreData.total = 0;
      scoreData.accuracy = 0;
      scoreData.percentError = 100;
    }

    state.results.push(scoreData);
    state.totalScore += scoreData.total;

    showResult(scoreData, q);
  }

  // --- Screen: Result ---
  function showResult(scoreData, question) {
    UI.showScreen('screen-result');
    UI.renderQuestionResult(scoreData, question.expression);

    const nextBtn = document.getElementById('btn-next');
    const isLast = state.currentIndex >= state.questions.length - 1;
    nextBtn.textContent = isLast ? 'See Results →' : 'Next Question →';
  }

  function nextQuestion() {
    state.currentIndex++;
    if (state.currentIndex >= state.questions.length) {
      showSummary();
    } else {
      showQuestion();
    }
  }

  // --- Screen: Summary ---
  function showSummary() {
    UI.showScreen('screen-summary');
    const { totalScore, grade } = UI.renderSummary(
      state.results,
      state.questions,
      state.mode === 'daily',
      state.dailyDayNumber
    );

    // Save scores
    if (state.mode === 'daily') {
      const challenge = getTodayChallenge();
      if (challenge) {
        saveDailyScore(challenge.date, totalScore);
      }
    } else {
      savePracticeHighScore(state.difficulty, totalScore);
    }
  }

  // --- Sound toggle ---
  function updateSoundButton() {
    const btn = document.getElementById('sound-toggle');
    if (btn) {
      btn.textContent = Sound.isEnabled() ? '🔊' : '🔇';
      btn.title = Sound.isEnabled() ? 'Mute sounds' : 'Unmute sounds';
    }
  }

  // --- Event binding ---
  function bindEvents() {
    // Home
    document.getElementById('btn-practice').addEventListener('click', () => {
      Sound.ensureContext();
      state.mode = 'practice';
      showSettings();
    });

    document.getElementById('btn-daily').addEventListener('click', () => {
      state.mode = 'daily';
      startGame();
    });

    // Settings
    document.getElementById('btn-back-settings').addEventListener('click', showHome);

    document.getElementById('difficulty-grid').addEventListener('click', (e) => {
      const card = e.target.closest('.difficulty-card');
      if (!card) return;
      state.difficulty = card.dataset.diff;
      document.querySelectorAll('.difficulty-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      saveSettings();
    });

    document.getElementById('mode-grid').addEventListener('click', (e) => {
      const card = e.target.closest('.mode-card');
      if (!card) return;
      state.answerMode = card.dataset.mode;
      document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      saveSettings();
    });

    document.getElementById('count-selector').addEventListener('click', (e) => {
      const btn = e.target.closest('.count-btn');
      if (!btn) return;
      state.questionsPerRound = parseInt(btn.dataset.count);
      document.querySelectorAll('.count-btn').forEach(c => c.classList.remove('selected'));
      btn.classList.add('selected');
      saveSettings();
    });

    document.getElementById('btn-start-practice').addEventListener('click', () => {
      saveSettings();
      startGame();
    });

    // Game
    document.getElementById('scratch-toggle').addEventListener('click', () => {
      state.scratchOpen = !state.scratchOpen;
      document.getElementById('scratch-area').classList.toggle('open', state.scratchOpen);
    });

    // Result
    document.getElementById('btn-next').addEventListener('click', nextQuestion);

    // Summary
    document.getElementById('btn-play-again').addEventListener('click', () => {
      startGame();
    });

    document.getElementById('btn-go-home').addEventListener('click', showHome);

    // Sound toggle
    document.getElementById('sound-toggle').addEventListener('click', () => {
      Sound.toggle();
      updateSoundButton();
      saveSettings();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Enter on result screen → next question
      if (e.key === 'Enter' && document.getElementById('screen-result').classList.contains('active')) {
        nextQuestion();
      }
    });
  }

  // --- Init ---
  function init() {
    loadSettings();
    bindEvents();
    updateSoundButton();
    showHome();
  }

  // Auto-init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { showHome, showSettings, startGame };
})();
