// ui.js — DOM rendering, bullseye visualization, screen management

const UI = (() => {
  // --- Screen management ---
  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
  }

  // --- Timer ring ---
  function updateTimerRing(fraction, timeRemaining) {
    const circle = document.getElementById('timer-ring-fill');
    const text = document.getElementById('timer-text');
    if (!circle || !text) return;

    const circumference = 2 * Math.PI * 34;
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = circumference * (1 - fraction);

    // Color based on time
    circle.classList.remove('warning', 'danger');
    if (fraction <= 0.2) {
      circle.classList.add('danger');
    } else if (fraction <= 0.4) {
      circle.classList.add('warning');
    }

    // Urgency animation on timer ring
    const container = document.querySelector('.timer-ring');
    if (container) {
      if (fraction <= 0.2) {
        container.classList.add('timer-urgent');
      } else {
        container.classList.remove('timer-urgent');
      }
    }

    // Background urgency on body
    document.body.classList.remove('urgency-medium', 'urgency-high', 'urgency-critical');
    if (fraction <= 0.15) {
      document.body.classList.add('urgency-critical');
    } else if (fraction <= 0.3) {
      document.body.classList.add('urgency-high');
    } else if (fraction <= 0.5) {
      document.body.classList.add('urgency-medium');
    }

    text.textContent = Math.ceil(timeRemaining);
  }

  // Clear urgency classes from body
  function clearUrgency() {
    document.body.classList.remove('urgency-medium', 'urgency-high', 'urgency-critical');
    const container = document.querySelector('.timer-ring');
    if (container) {
      container.classList.remove('timer-urgent');
    }
  }

  // --- Bullseye SVG ---
  function renderBullseye(percentError) {
    const rings = [
      { pct: 1, color: '#ef4444', label: '1%' },
      { pct: 5, color: '#f97316', label: '5%' },
      { pct: 10, color: '#eab308', label: '10%' },
      { pct: 25, color: '#22c55e', label: '25%' },
      { pct: 50, color: '#3b82f6', label: '50%' },
    ];

    const cx = 110, cy = 110;
    const maxRadius = 100;
    const minRadius = 10;

    let svgContent = '';

    // Draw rings from outside in
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = minRadius + (maxRadius - minRadius) * ((i + 1) / rings.length);
      svgContent += `<circle cx="${cx}" cy="${cy}" r="${r}" class="bullseye-ring" stroke="${rings[i].color}" />`;
      svgContent += `<circle cx="${cx}" cy="${cy}" r="${r}" class="bullseye-ring-fill" fill="${rings[i].color}" />`;
    }

    // Center dot
    svgContent += `<circle cx="${cx}" cy="${cy}" r="${minRadius}" fill="#ef4444" opacity="0.3" />`;

    // Ring labels
    for (let i = 0; i < rings.length; i++) {
      const r = minRadius + (maxRadius - minRadius) * ((i + 1) / rings.length);
      svgContent += `<text x="${cx}" y="${cy - r + 12}" class="bullseye-label">${rings[i].label}</text>`;
    }

    // Player's dot position
    let dotRadius;
    if (percentError <= 1) {
      dotRadius = minRadius * (percentError / 1);
    } else if (percentError <= 50) {
      // Map error to ring radius
      const ringIndex = rings.findIndex(r => percentError <= r.pct);
      if (ringIndex === 0) {
        dotRadius = minRadius + (maxRadius - minRadius) * (1 / rings.length) * (percentError / rings[0].pct);
      } else {
        const prevPct = rings[ringIndex - 1].pct;
        const prevR = minRadius + (maxRadius - minRadius) * (ringIndex / rings.length);
        const nextR = minRadius + (maxRadius - minRadius) * ((ringIndex + 1) / rings.length);
        const frac = (percentError - prevPct) / (rings[ringIndex].pct - prevPct);
        dotRadius = prevR + (nextR - prevR) * frac;
      }
    } else {
      dotRadius = maxRadius + 5;
    }

    // Place dot at a random-ish angle for visual interest
    const angle = (percentError * 137.5) % 360; // Golden angle for variety
    const dotX = cx + dotRadius * Math.cos(angle * Math.PI / 180);
    const dotY = cy + dotRadius * Math.sin(angle * Math.PI / 180);

    svgContent += `<circle cx="${dotX}" cy="${dotY}" r="6" fill="#fff" stroke="#000" stroke-width="1.5" class="bullseye-dot" />`;
    svgContent += `<circle cx="${dotX}" cy="${dotY}" r="3" fill="#000" class="bullseye-dot" />`;

    const container = document.getElementById('bullseye');
    if (container) {
      container.innerHTML = `<svg class="bullseye-svg" viewBox="0 0 220 220">${svgContent}</svg>`;
    }
  }

  // --- Answer input rendering ---
  function renderFreeEntry() {
    const area = document.getElementById('answer-area');
    area.innerHTML = `
      <input type="number" class="answer-input" id="answer-input"
             placeholder="Your estimate..." inputmode="decimal" autocomplete="off">
      <button class="submit-btn" id="submit-btn">Submit</button>
    `;
    const input = document.getElementById('answer-input');
    setTimeout(() => input.focus(), 100);
    return {
      getAnswer: () => {
        const val = input.value.trim();
        return val === '' ? null : parseFloat(val);
      },
      el: area,
    };
  }

  function renderMultipleChoice(choices) {
    const area = document.getElementById('answer-area');
    const btns = choices.map((c, i) =>
      `<button class="choice-btn" data-value="${c.value}">${c.label}</button>`
    ).join('');
    area.innerHTML = `<div class="choices-grid">${btns}</div>`;
    return {
      buttons: area.querySelectorAll('.choice-btn'),
      el: area,
    };
  }

  function renderSlider(range) {
    const area = document.getElementById('answer-area');
    area.innerHTML = `
      <div class="slider-container">
        <div class="slider-value" id="slider-value">${Questions.formatNumber(range.defaultValue)}</div>
        <input type="range" class="slider-input" id="slider-input"
               min="${range.min}" max="${range.max}" step="${range.step}" value="${range.defaultValue}">
        <div class="slider-labels">
          <span>${Questions.formatNumber(range.min)}</span>
          <span>${Questions.formatNumber(range.max)}</span>
        </div>
      </div>
      <button class="submit-btn" id="submit-btn">Submit</button>
    `;
    const slider = document.getElementById('slider-input');
    const display = document.getElementById('slider-value');
    slider.addEventListener('input', () => {
      display.textContent = Questions.formatNumber(parseFloat(slider.value));
    });
    return {
      getAnswer: () => parseFloat(slider.value),
      el: area,
    };
  }

  // --- Animated score breakdown ---
  function renderAnimatedScore(scoreData) {
    const breakdown = document.getElementById('result-breakdown');
    const ring = Scoring.getBullseyeRing(scoreData.percentError);

    breakdown.innerHTML = `
      <div class="score-anim-container">
        <div class="score-anim-row" id="anim-accuracy">
          <span class="label">Accuracy</span>
          <span class="value" id="anim-accuracy-val">0 / ${Scoring.MAX_POINTS}</span>
        </div>
        <div class="score-anim-row" id="anim-speed">
          <span class="label">Speed Bonus</span>
          <span class="value" id="anim-speed-val">×${scoreData.speedMultiplier.toFixed(2)}</span>
        </div>
        <div class="score-anim-divider" id="anim-divider"></div>
        <div class="score-anim-total" id="anim-total">
          <span class="label">Total</span>
          <span class="value" id="anim-total-val">0 pts</span>
        </div>
      </div>
    `;

    // Animate sequence
    const STEP_DELAY = 400;
    let step = 0;

    // Step 1: Show accuracy, count up
    setTimeout(() => {
      const row = document.getElementById('anim-accuracy');
      if (row) row.classList.add('visible');
      animateCount('anim-accuracy-val', 0, scoreData.accuracy, 600,
        (v) => `${v} / ${Scoring.MAX_POINTS}`);

      // Play result sound based on accuracy
      if (scoreData.percentError <= 1) {
        Sound.resultPerfect();
      } else if (scoreData.percentError <= 10) {
        Sound.resultGood();
      } else if (scoreData.percentError <= 25) {
        Sound.resultOk();
      } else {
        Sound.resultBad();
      }
    }, STEP_DELAY);

    // Step 2: Show speed multiplier with animation
    setTimeout(() => {
      const row = document.getElementById('anim-speed');
      if (row) row.classList.add('visible');
      Sound.multiplierApply();

      const val = document.getElementById('anim-speed-val');
      if (val) val.classList.add('multiplier-animate');
    }, STEP_DELAY + 800);

    // Step 3: Divider
    setTimeout(() => {
      const div = document.getElementById('anim-divider');
      if (div) div.classList.add('visible');
    }, STEP_DELAY + 1200);

    // Step 4: Total — count up from accuracy to final
    setTimeout(() => {
      const row = document.getElementById('anim-total');
      if (row) row.classList.add('visible');
      animateCount('anim-total-val', scoreData.accuracy, scoreData.total, 500,
        (v) => `${v} pts`);
    }, STEP_DELAY + 1400);
  }

  // Animate a number counting up
  function animateCount(elementId, from, to, duration, formatter) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const startTime = performance.now();
    const diff = to - from;
    let lastSoundTick = 0;

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + diff * eased);

      el.textContent = formatter(current);

      // Tick sound every ~80ms
      if (now - lastSoundTick > 80 && progress < 1) {
        Sound.scoreCount();
        lastSoundTick = now;
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  // --- Result display ---
  function renderQuestionResult(scoreData, expression) {
    const ring = Scoring.getBullseyeRing(scoreData.percentError);

    // Bullseye
    renderBullseye(scoreData.percentError);

    // Feedback text
    const feedback = document.getElementById('result-feedback');
    feedback.textContent = ring.label;
    feedback.style.color = ring.color;
    feedback.classList.remove('score-reveal');
    // Force reflow to restart animation
    void feedback.offsetWidth;
    feedback.classList.add('score-reveal');

    // Numbers
    const numbers = document.getElementById('result-numbers');
    numbers.innerHTML = `
      <div class="result-stat">
        <div class="stat-value">${Questions.formatNumber(scoreData.answer)}</div>
        <div class="stat-label">Correct Answer</div>
      </div>
      <div class="result-stat">
        <div class="stat-value">${scoreData.guess !== null ? Questions.formatNumber(scoreData.guess) : '—'}</div>
        <div class="stat-label">Your Guess</div>
      </div>
      <div class="result-stat">
        <div class="stat-value" style="color: ${ring.color}">${scoreData.percentError}%</div>
        <div class="stat-label">Error</div>
      </div>
    `;

    // Animated breakdown (replaces static)
    renderAnimatedScore(scoreData);
  }

  // --- Summary display ---
  function renderSummary(results, questions, isDaily, dayNumber) {
    const totalScore = results.reduce((sum, r) => sum + r.total, 0);
    const maxPossible = results.length * Scoring.MAX_POINTS;
    const grade = Scoring.getGrade(totalScore, maxPossible);

    // Play grade reveal sound
    Sound.gradeReveal();

    // Header
    const gradeEl = document.getElementById('summary-grade');
    gradeEl.textContent = grade.grade;
    gradeEl.style.color = grade.grade === 'S' ? '#fbbf24' :
                          grade.grade === 'A' ? '#4ade80' :
                          grade.grade === 'B' ? '#3b82f6' :
                          grade.grade === 'F' ? '#ef4444' : 'var(--text)';
    gradeEl.classList.remove('score-reveal');
    void gradeEl.offsetWidth;
    gradeEl.classList.add('score-reveal');

    document.getElementById('summary-grade-label').textContent = `${grade.emoji} ${grade.label}`;
    document.getElementById('summary-total-score').textContent =
      `${totalScore.toLocaleString()} / ${maxPossible.toLocaleString()} points`;

    // Question list
    const list = document.getElementById('summary-questions');
    list.innerHTML = results.map((r, i) => {
      const ring = Scoring.getBullseyeRing(r.percentError);
      return `
        <div class="summary-question">
          <div class="summary-q-indicator" style="background: ${ring.color}"></div>
          <div class="summary-q-text">
            <div class="summary-q-expression">${questions[i].expression}</div>
            <div class="summary-q-answers">You: ${r.guess !== null ? Questions.formatNumber(r.guess) : '—'} · Answer: ${Questions.formatNumber(r.answer)}</div>
          </div>
          <div class="summary-q-score">${r.total}</div>
        </div>
      `;
    }).join('');

    // Show/hide share button
    const shareBtn = document.getElementById('share-btn');
    if (isDaily) {
      shareBtn.style.display = '';
      shareBtn.innerHTML = `${Icons.clipboard} Copy Results`;
      shareBtn.classList.remove('copied');
      shareBtn.onclick = () => {
        const shareText = Scoring.generateShareText(dayNumber, results, totalScore, maxPossible);
        navigator.clipboard.writeText(shareText).then(() => {
          shareBtn.innerHTML = `${Icons.check} Copied!`;
          shareBtn.classList.add('copied');
          setTimeout(() => {
            shareBtn.innerHTML = `${Icons.clipboard} Copy Results`;
            shareBtn.classList.remove('copied');
          }, 2000);
        });
      };
    } else {
      shareBtn.style.display = 'none';
    }

    return { totalScore, grade };
  }

  return {
    showScreen,
    updateTimerRing,
    clearUrgency,
    renderBullseye,
    renderFreeEntry,
    renderMultipleChoice,
    renderSlider,
    renderQuestionResult,
    renderSummary,
  };
})();
