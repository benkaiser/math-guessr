// questions.js — Question generation engine for Math Guessr

const Questions = (() => {
  // Difficulty configurations
  const DIFFICULTIES = {
    easy: {
      label: 'Easy',
      description: 'Addition, subtraction, simple multiplication',
      timer: 30,
      color: '#22c55e',
      generators: [
        generateEasyAddition,
        generateEasySubtraction,
        generateEasyMultiplication,
      ],
    },
    medium: {
      label: 'Medium',
      description: 'Larger numbers, two-digit multiplication',
      timer: 25,
      color: '#fbbf24',
      generators: [
        generateMediumAddition,
        generateMediumSubtraction,
        generateMediumMultiplication,
      ],
    },
    hard: {
      label: 'Hard',
      description: 'Multi-step, three-digit multiplication',
      timer: 20,
      color: '#f97316',
      generators: [
        generateHardMultiplication,
        generateHardMultiStep,
        generateHardLargeAddSub,
      ],
    },
    extreme: {
      label: 'Extreme',
      description: 'Chained operations, division, large numbers',
      timer: 15,
      color: '#ef4444',
      generators: [
        generateExtremeLargeMultiply,
        generateExtremeChained,
        generateExtremeDivision,
      ],
    },
  };

  // --- Utility functions ---

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function formatNumber(n) {
    if (Number.isInteger(n)) return n.toLocaleString();
    return n.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  // --- EASY generators (integers, 1-100 range) ---

  function generateEasyAddition() {
    const a = randInt(10, 99);
    const b = randInt(10, 99);
    return { expression: `${a} + ${b}`, answer: a + b };
  }

  function generateEasySubtraction() {
    let a = randInt(20, 99);
    let b = randInt(10, a - 1);
    return { expression: `${a} − ${b}`, answer: a - b };
  }

  function generateEasyMultiplication() {
    const a = randInt(2, 12);
    const b = randInt(2, 12);
    return { expression: `${a} × ${b}`, answer: a * b };
  }

  // --- MEDIUM generators (integers, 10-999 range) ---

  function generateMediumAddition() {
    const a = randInt(100, 999);
    const b = randInt(100, 999);
    return { expression: `${a} + ${b}`, answer: a + b };
  }

  function generateMediumSubtraction() {
    let a = randInt(200, 999);
    let b = randInt(100, a - 50);
    return { expression: `${a} − ${b}`, answer: a - b };
  }

  function generateMediumMultiplication() {
    const a = randInt(11, 99);
    const b = randInt(11, 49);
    return { expression: `${a} × ${b}`, answer: a * b };
  }

  // --- HARD generators (integers, 100-9999 range) ---

  function generateHardMultiplication() {
    const a = randInt(100, 999);
    const b = randInt(11, 99);
    return { expression: `${a} × ${b}`, answer: a * b };
  }

  function generateHardMultiStep() {
    const a = randInt(50, 500);
    const b = randInt(10, 50);
    const c = randInt(100, 999);
    const op = pick(['+', '−']);
    const product = a * b;
    const answer = op === '+' ? product + c : product - c;
    return {
      expression: `${a} × ${b} ${op} ${c}`,
      answer: answer,
    };
  }

  function generateHardLargeAddSub() {
    const a = randInt(1000, 9999);
    const b = randInt(1000, 9999);
    const c = randInt(100, 999);
    return {
      expression: `${a} + ${b} − ${c}`,
      answer: a + b - c,
    };
  }

  // --- EXTREME generators (may include decimals) ---

  function generateExtremeLargeMultiply() {
    const a = randInt(100, 9999);
    const b = randInt(100, 999);
    return { expression: `${a} × ${b}`, answer: a * b };
  }

  function generateExtremeChained() {
    const a = randInt(100, 999);
    const b = randInt(10, 99);
    const c = randInt(10, 99);
    const answer = a * b + c * a;
    return {
      expression: `${a} × ${b} + ${c} × ${a}`,
      answer: answer,
    };
  }

  function generateExtremeDivision() {
    // Generate division that may produce a decimal (rounded to 1dp)
    const divisor = randInt(7, 99);
    const rawAnswer = randInt(100, 9999);
    const dividend = divisor * rawAnswer + randInt(0, divisor - 1);
    const answer = Math.round((dividend / divisor) * 10) / 10;
    return {
      expression: `${dividend.toLocaleString()} ÷ ${divisor}`,
      answer: answer,
    };
  }

  // --- Public API ---

  function generate(difficulty) {
    const config = DIFFICULTIES[difficulty];
    if (!config) throw new Error(`Unknown difficulty: ${difficulty}`);
    const generator = pick(config.generators);
    const question = generator();
    return {
      ...question,
      difficulty,
      timer: config.timer,
    };
  }

  function generateSet(difficulty, count) {
    const questions = [];
    for (let i = 0; i < count; i++) {
      questions.push(generate(difficulty));
    }
    return questions;
  }

  // Generate multiple choice options for a question
  function generateChoices(answer) {
    const absAnswer = Math.abs(answer);
    const choices = [answer];
    const usedSet = new Set([answer]);

    // Generate 3 plausible distractors
    while (choices.length < 4) {
      let distractor;
      const strategy = pick(['percent', 'digit', 'offset']);

      if (strategy === 'percent') {
        // Off by some percentage
        const pct = pick([0.05, 0.1, 0.15, 0.2, 0.25, 0.3]);
        const direction = pick([-1, 1]);
        distractor = Math.round(answer * (1 + direction * pct));
      } else if (strategy === 'digit') {
        // Swap or change a digit
        const str = Math.abs(answer).toString();
        if (str.length > 1) {
          const pos = randInt(0, str.length - 1);
          const newDigit = randInt(1, 9).toString();
          distractor = parseInt(str.substring(0, pos) + newDigit + str.substring(pos + 1));
          if (answer < 0) distractor = -distractor;
        } else {
          distractor = answer + pick([-2, -1, 1, 2, 3]);
        }
      } else {
        // Simple offset
        const magnitude = Math.max(1, Math.floor(absAnswer * 0.1));
        distractor = answer + pick([-1, 1]) * randInt(1, magnitude);
      }

      // Ensure distractor is valid, unique, and positive (or same sign as answer)
      if (distractor !== 0 && !usedSet.has(distractor) && distractor > 0) {
        choices.push(distractor);
        usedSet.add(distractor);
      }
    }

    // Shuffle
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    return choices.map(c => ({
      value: c,
      label: formatNumber(c),
    }));
  }

  // Generate slider range for a question
  function generateSliderRange(answer) {
    const absAnswer = Math.abs(answer);
    const spread = Math.max(10, Math.floor(absAnswer * 0.5));
    const min = Math.max(0, answer - spread);
    const max = answer + spread;
    // Step size based on magnitude
    let step = 1;
    if (absAnswer > 10000) step = 100;
    else if (absAnswer > 1000) step = 10;
    else if (absAnswer > 100) step = 5;

    return { min, max, step, defaultValue: Math.round((min + max) / 2) };
  }

  function getConfig(difficulty) {
    return DIFFICULTIES[difficulty];
  }

  function getDifficulties() {
    return Object.entries(DIFFICULTIES).map(([key, val]) => ({
      key,
      ...val,
    }));
  }

  return {
    generate,
    generateSet,
    generateChoices,
    generateSliderRange,
    getConfig,
    getDifficulties,
    formatNumber,
  };
})();
