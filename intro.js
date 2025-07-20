document.addEventListener('DOMContentLoaded', () => {
  const introScreen = document.getElementById('intro-screen');
  const gameContainer = document.querySelector('.game-container');
  
  // Create falling tetris blocks for intro
  const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff8000'];
  
  for (let i = 0; i < 20; i++) {
    createFallingBlock();
  }
  
  function createFallingBlock() {
    const block = document.createElement('div');
    block.style.position = 'absolute';
    block.style.width = '20px';
    block.style.height = '20px';
    block.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    block.style.left = Math.random() * window.innerWidth + 'px';
    block.style.top = '-20px';
    block.style.boxShadow = `0 0 10px ${block.style.backgroundColor}`;
    introScreen.appendChild(block);
    
    const duration = 2 + Math.random() * 3;
    const delay = Math.random() * 2;
    
    block.style.animation = `fall ${duration}s linear ${delay}s`;
    
    block.addEventListener('animationend', () => {
      block.remove();
      createFallingBlock();
    });
  }
  
  // Add falling animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fall {
      from {
        transform: translateY(-20px) rotate(0deg);
      }
      to {
        transform: translateY(${window.innerHeight + 20}px) rotate(360deg);
      }
    }
  `;
  document.head.appendChild(style);
  
  // After intro animation, show game
  setTimeout(() => {
    introScreen.style.animation = 'fadeOut 1s forwards';
    gameContainer.style.display = 'block';
    setTimeout(() => {
      introScreen.remove();
    }, 1000);
  }, 5000);
});