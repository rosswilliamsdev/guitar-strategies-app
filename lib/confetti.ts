import confetti from 'canvas-confetti';

// Individual item completion - small burst from the checkbox
export const fireItemConfetti = (element?: HTMLElement) => {
  const rect = element?.getBoundingClientRect();
  
  confetti({
    particleCount: 30,
    spread: 60,
    origin: rect ? {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight
    } : { x: 0.5, y: 0.8 },
    colors: ['#14b8b3', '#73EEDC', '#99f6ef', '#5eebe4', '#2dd4cc'],
    scalar: 0.8,
    gravity: 1.2,
    decay: 0.94,
  });
};

// Full checklist completion - big celebration
export const fireChecklistCompleteConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  
  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const frame = () => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return;
    }

    const particleCount = 50 * (timeLeft / duration);
    
    // First burst from left
    confetti({
      particleCount,
      startVelocity: 30,
      spread: 100,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ['#14b8b3', '#73EEDC', '#99f6ef', '#5eebe4', '#2dd4cc', '#ccfbf7'],
    });
    
    // Second burst from right
    confetti({
      particleCount,
      startVelocity: 30,
      spread: 100,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ['#14b8b3', '#73EEDC', '#99f6ef', '#5eebe4', '#2dd4cc', '#ccfbf7'],
    });

    requestAnimationFrame(frame);
  };

  frame();
};

// Celebration burst for achievement badge reveal
export const fireAchievementConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#ffd700', '#ffed4e', '#fbbf24', '#f59e0b', '#d97706'],
    shapes: ['star'],
    scalar: 1.2,
  });
};