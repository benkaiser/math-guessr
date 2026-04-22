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

    // Urgency animation
    const container = document.querySelector('.timer-ring');
    if (container) {
      if (fraction <= 0.2) {
        container.classList.add('timer-urgent');
      } else {
        container.classList.remove('timer-urgent');
      }
    }

    text.textContent = Math.ceil(timeRemaining);
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

  // --- Result display ---
  function renderQuestionResult(scoreData, expression) {
    const ring = Scoring.getBullseyeRing(scoreData.percentError);

    // Bullseye
    renderBullseye(scoreData.percentError);

    // Feedback text
    const feedback = document.getElementById('result-feedback');
    feedback.textContent = ring.label;
    feedback.style.color = ring.color;
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

    // Breakdown
    const breakdown = document.getElementById('result-breakdown');
    breakdown.innerHTML = `
      <div class="result-breakdown-row">
        <span class="label">Accuracy Score</span>
        <span>${scoreData.accuracy} / ${Scoring.MAX_POINTS}</span>
      </div>
      <div class="result-breakdown-row">
        <span class="label">Speed Multiplier</span>
        <span>×${scoreData.speedMultiplier.toFixed(2)}</span>
      </div>
      <div class="result-breakdown-row">
        <span class="label" style="font-weight:700">Total</span>
        <span style="font-weight:700; color:var(--accent)">${scoreData.total} pts</span>
      </div>
    `;
  }

  // --- Summary display ---
  function renderSummary(results, questions, isDaily, dayNumber) {
    const totalScore = results.reduce((sum, r) => sum + r.total, 0);
    const maxPossible = results.length * Scoring.MAX_POINTS;
    const grade = Scoring.getGrade(totalScore, maxPossible);

    // Header
    const gradeEl = document.getElementById('summary-grade');
    gradeEl.textContent = grade.grade;
    gradeEl.style.color = grade.grade === 'S' ? '#fbbf24' :
                          grade.grade === 'A' ? '#4ade80' :
                          grade.grade === 'B' ? '#3b82f6' :
                          grade.grade === 'F' ? '#ef4444' : 'var(--text)';
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
      shareBtn.textContent = '📋 Copy Results';
      shareBtn.classList.remove('copied');
      shareBtn.onclick = () => {
        const shareText = Scoring.generateShareText(dayNumber, results, totalScore, maxPossible);
        navigator.clipboard.writeText(shareText).then(() => {
          shareBtn.textContent = '✓ Copied!';
          shareBtn.classList.add('copied');
          setTimeout(() => {
            shareBtn.textContent = '📋 Copy Results';
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
    renderBullseye,
    renderFreeEntry,
    renderMultipleChoice,
    renderSlider,
    renderQuestionResult,
    renderSummary,
  };
})();
