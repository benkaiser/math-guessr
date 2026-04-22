// scoring.js — Accuracy + speed scoring for Math Guessr

const Scoring = (() => {
  const MAX_POINTS = 1000;
  const GRACE_PERIOD = 1; // seconds — no speed penalty
  const MIN_SPEED_MULTIPLIER = 0.5;

  // Grade thresholds (percentage of max possible score)
  const GRADES = [
    { grade: 'S', min: 0.95, label: 'Perfect', emoji: '🎯' },
    { grade: 'A', min: 0.85, label: 'Excellent', emoji: '🌟' },
    { grade: 'B', min: 0.70, label: 'Great', emoji: '⭐' },
    { grade: 'C', min: 0.50, label: 'Good', emoji: '👍' },
    { grade: 'D', min: 0.30, label: 'Okay', emoji: '🤔' },
    { grade: 'F', min: 0.00, label: 'Keep Practicing', emoji: '💪' },
  ];

  /**
   * Calculate accuracy score (0-1000) using quadratic decay.
   * 0% error = 1000, 50%+ error ≈ 0
   */
  function calculateAccuracy(guess, answer) {
    if (answer === 0) {
      // Edge case: exact match or nothing
      return guess === 0 ? MAX_POINTS : 0;
    }
    const percentError = Math.abs(guess - answer) / Math.abs(answer);
    const raw = Math.pow(Math.max(0, 1 - percentError), 2);
    return Math.round(raw * MAX_POINTS);
  }

  /**
   * Calculate speed multiplier (0.5 - 1.0).
   * First `GRACE_PERIOD` seconds: 1.0 (no penalty).
   * After that: linear decay from 1.0 to 0.5 at time=0.
   */
  function calculateSpeedMultiplier(timeRemaining, totalTime) {
    const elapsed = totalTime - timeRemaining;

    // During grace period, full multiplier
    if (elapsed <= GRACE_PERIOD) return 1.0;

    // After grace period: linear decay
    const effectiveRemaining = timeRemaining;
    const effectiveTotal = totalTime - GRACE_PERIOD;

    const fraction = Math.max(0, effectiveRemaining / effectiveTotal);
    return MIN_SPEED_MULTIPLIER + (1.0 - MIN_SPEED_MULTIPLIER) * fraction;
  }

  /**
   * Calculate total score for a question.
   */
  function calculateScore(guess, answer, timeRemaining, totalTime) {
    const accuracy = calculateAccuracy(guess, answer);
    const speedMultiplier = calculateSpeedMultiplier(timeRemaining, totalTime);
    const total = Math.round(accuracy * speedMultiplier);
    const percentError = answer !== 0
      ? Math.abs(guess - answer) / Math.abs(answer) * 100
      : (guess === 0 ? 0 : 100);

    return {
      accuracy,
      speedMultiplier: Math.round(speedMultiplier * 100) / 100,
      total,
      percentError: Math.round(percentError * 10) / 10,
      guess,
      answer,
    };
  }

  /**
   * Get letter grade for a round score.
   */
  function getGrade(totalScore, maxPossible) {
    const pct = maxPossible > 0 ? totalScore / maxPossible : 0;
    for (const g of GRADES) {
      if (pct >= g.min) return g;
    }
    return GRADES[GRADES.length - 1];
  }

  /**
   * Get bullseye ring for a given percent error.
   * Returns which ring the guess landed in.
   */
  function getBullseyeRing(percentError) {
    if (percentError <= 1) return { ring: 0, label: 'Bullseye!', color: '#ef4444' };
    if (percentError <= 5) return { ring: 1, label: 'Within 5%', color: '#f97316' };
    if (percentError <= 10) return { ring: 2, label: 'Within 10%', color: '#eab308' };
    if (percentError <= 25) return { ring: 3, label: 'Within 25%', color: '#22c55e' };
    if (percentError <= 50) return { ring: 4, label: 'Within 50%', color: '#3b82f6' };
    return { ring: 5, label: 'Off target', color: '#6b7280' };
  }

  /**
   * Generate shareable text for daily challenge.
   */
  function generateShareText(dayNumber, scores, totalScore, maxPossible) {
    const grade = getGrade(totalScore, maxPossible);
    const stars = scores.map(s => {
      if (s.percentError <= 1) return '🎯';
      if (s.percentError <= 5) return '🟢';
      if (s.percentError <= 10) return '🟡';
      if (s.percentError <= 25) return '🟠';
      if (s.percentError <= 50) return '🔴';
      return '⬛';
    }).join('');

    return [
      `Math Guessr Daily #${dayNumber}`,
      `${stars}`,
      `Score: ${totalScore.toLocaleString()} / ${maxPossible.toLocaleString()} (${grade.grade})`,
      ``,
      `https://benkaiser.github.io/math-guessr`,
    ].join('\n');
  }

  return {
    calculateAccuracy,
    calculateSpeedMultiplier,
    calculateScore,
    getGrade,
    getBullseyeRing,
    generateShareText,
    MAX_POINTS,
    GRADES,
  };
})();
