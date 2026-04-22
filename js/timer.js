// timer.js — Per-question countdown timer with circular visual

const Timer = (() => {
  let totalTime = 30;
  let timeRemaining = 30;
  let intervalId = null;
  let startTimestamp = null;
  let onTick = null;
  let onExpire = null;
  let running = false;

  /**
   * Start the timer.
   * @param {number} duration - Total seconds
   * @param {Function} tickCallback - Called every 100ms with (timeRemaining, totalTime, fraction)
   * @param {Function} expireCallback - Called when timer hits 0
   */
  function start(duration, tickCallback, expireCallback) {
    stop(); // Clear any existing timer

    totalTime = duration;
    timeRemaining = duration;
    onTick = tickCallback;
    onExpire = expireCallback;
    running = true;
    startTimestamp = performance.now();

    // Fire initial tick
    if (onTick) onTick(timeRemaining, totalTime, 1.0);

    intervalId = setInterval(() => {
      const elapsed = (performance.now() - startTimestamp) / 1000;
      timeRemaining = Math.max(0, totalTime - elapsed);

      const fraction = timeRemaining / totalTime;

      if (onTick) onTick(timeRemaining, totalTime, fraction);

      if (timeRemaining <= 0) {
        stop();
        running = false;
        if (onExpire) onExpire();
      }
    }, 100);
  }

  /**
   * Stop the timer without triggering expire.
   * Returns the remaining time.
   */
  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    running = false;
    return timeRemaining;
  }

  /**
   * Get current remaining time.
   */
  function getRemaining() {
    if (running && startTimestamp) {
      const elapsed = (performance.now() - startTimestamp) / 1000;
      return Math.max(0, totalTime - elapsed);
    }
    return timeRemaining;
  }

  function getTotal() {
    return totalTime;
  }

  function isRunning() {
    return running;
  }

  return {
    start,
    stop,
    getRemaining,
    getTotal,
    isRunning,
  };
})();
