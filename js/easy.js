(function() {
  let rows = 3;
  let cols = 3;
  let pieceSize, knob, totalPieceSize, boardWidth, boardHeight;
  
  // Multiple image options - randomly select one
  const imageOptions = [
    'assets/easy/abstract-1.jpg',
    'assets/easy/abstract-2.jpg',
    'assets/easy/abstract-3.jpg',
    'assets/easy/abstract-4.jpg',
    'assets/easy/abstract-5.jpg'
  ];

  let currentImageURL = imageOptions[Math.floor(Math.random() * imageOptions.length)];
  let img = new Image();
  let shapes = [];
  let pieces = [];
  let boardEl, trayEl, msgEl, timerEl, moveCountEl, pauseBtn, pauseOverlay, pausedTimeEl, pausedMovesEl, hintBtn;
  
  // Game state
  let dragActive = false;
  let currentDragPiece = null;
  let moveCount = 0;
  let timerSeconds = 0;
  let timerInterval = null;
  let isPaused = false;
  let gameStarted = false;
  let gameCompleted = false;
  
  // Hint state
  let hintsRemaining = 3;
  let hintTimeout = null;
  let currentHintPiece = null;
  let currentHintWrapper = null;
  let currentHintHighlight = null;
  
  let pieceOriginalWrapper = new Map();

  // ================= RESPONSIVE SIZES =================
  function calculateResponsiveSizes() {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isLandscape = screenWidth > screenHeight;
    
    if (screenWidth >= 1200) {
      pieceSize = 85; knob = 6;
    } else if (screenWidth >= 992) {
      pieceSize = 82; knob = 6;
    } else if (screenWidth >= 768 && isLandscape) {
      pieceSize = 80; knob = 6;
    } else if (screenWidth >= 768) {
      pieceSize = 85; knob = 6;
    } else if (screenWidth >= 480 && isLandscape) {
      pieceSize = 72; knob = 5;
    } else if (screenWidth >= 375) {
      pieceSize = 85; knob = 6;
    } else if (screenWidth >= 320) {
      pieceSize = 78; knob = 6;
    } else if (screenWidth >= 280) {
      pieceSize = 70; knob = 5;
    } else {
      pieceSize = 62; knob = 5;
    }
    
    totalPieceSize = pieceSize + knob * 2;
    boardWidth = cols * pieceSize + 17;
    boardHeight = rows * pieceSize + 17;
  }
  
  calculateResponsiveSizes();
  
  // Handle window resize
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      const oldPieceSize = pieceSize;
      calculateResponsiveSizes();
      
      if (Math.abs(oldPieceSize - pieceSize) > 5 && pieces.length > 0) {
        regeneratePiecesWithNewImage();
      } else if (boardEl) {
        boardEl.style.width = boardWidth + 'px';
        boardEl.style.height = boardHeight + 'px';
      }
    }, 250);
  });

  // ================= SOUND EFFECTS =================
  function playDragSound() {
    if (window.GameSettings && window.GameSettings.playDragSound) {
      window.GameSettings.playDragSound();
    } else if (window.GameSettings && window.GameSettings.playSound) {
      window.GameSettings.playSound('drag');
    }
  }
  
  function playSnapSound() {
    if (window.GameSettings && window.GameSettings.playSnapSound) {
      window.GameSettings.playSnapSound();
    } else if (window.GameSettings && window.GameSettings.playSound) {
      window.GameSettings.playSound('snap');
    }
  }
  
  function playWinnerSound() {
    if (window.GameSettings && window.GameSettings.playWinnerSound) {
      window.GameSettings.playWinnerSound();
    } else if (window.GameSettings && window.GameSettings.playSound) {
      window.GameSettings.playSound('complete');
    }
  }
  
  function startBackgroundMusic() {
    if (window.GameSettings && window.GameSettings.startMusic) {
      window.GameSettings.startMusic();
      console.log('Background music started from Easy page');
    }
  }

  // ================= SETTINGS INTEGRATION =================
  function applyCurrentSettings() {
    console.log('Applying settings to Easy page');
    
    let showTimer = true;
    let showMoves = true;
    
    if (window.GameSettings && window.GameSettings.getAll) {
      const settings = window.GameSettings.getAll();
      showTimer = settings.showTimer;
      showMoves = settings.showMoves;
      console.log('Settings from GameSettings:', { showTimer, showMoves });
    } else {
      try {
        const saved = localStorage.getItem('puzzleworld_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          showTimer = parsed.showTimer !== undefined ? parsed.showTimer : true;
          showMoves = parsed.showMoves !== undefined ? parsed.showMoves : true;
        }
      } catch(e) {
        console.error('Failed to load settings:', e);
      }
    }
    
    if (timerEl) {
      const timerBox = timerEl.closest('.stat-box');
      if (timerBox) timerBox.style.display = showTimer ? 'flex' : 'none';
    }
    
    if (moveCountEl) {
      const movesBox = moveCountEl.closest('.stat-box');
      if (movesBox) movesBox.style.display = showMoves ? 'flex' : 'none';
    }
  }

  window.addEventListener('settingsChanged', function(e) {
    if (e.detail) {
      const settings = e.detail;
      
      if (timerEl) {
        const timerBox = timerEl.closest('.stat-box');
        if (timerBox) timerBox.style.display = settings.showTimer ? 'flex' : 'none';
      }
      
      if (moveCountEl) {
        const movesBox = moveCountEl.closest('.stat-box');
        if (movesBox) movesBox.style.display = settings.showMoves ? 'flex' : 'none';
      }
      
      // Apply theme
      if (settings.theme === 'dark') {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('original-theme');
      } else {
        document.body.classList.add('original-theme');
        document.body.classList.remove('dark-theme');
      }
    }
  });

  // Apply initial theme
  (function applyThemeFromSettings() {
    let theme = 'original';
    try {
      const saved = localStorage.getItem('puzzleworld_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        theme = parsed.theme || 'original';
      }
    } catch(e) {
      theme = 'original';
    }
    
    if (theme === 'dark') {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('original-theme');
    } else {
      document.body.classList.add('original-theme');
      document.body.classList.remove('dark-theme');
    }
  })();

  // ================= HINT FEATURE =================
  function updateHintButton() {
    if (hintBtn) {
      hintBtn.textContent = `💡 Hint (${hintsRemaining})`;
      if (hintsRemaining <= 0) {
        hintBtn.disabled = true;
        hintBtn.style.opacity = '0.5';
        hintBtn.style.cursor = 'not-allowed';
      } else {
        hintBtn.disabled = false;
        hintBtn.style.opacity = '1';
        hintBtn.style.cursor = 'pointer';
      }
    }
  }

  function clearHint() {
    if (hintTimeout) {
      clearTimeout(hintTimeout);
      hintTimeout = null;
    }
    
    if (currentHintWrapper) {
      currentHintWrapper.classList.remove('hint-highlight-piece');
      currentHintWrapper = null;
    }
    
    if (currentHintHighlight && currentHintHighlight.parentNode) {
      currentHintHighlight.remove();
      currentHintHighlight = null;
    }
    
    currentHintPiece = null;
  }

  function showHint() {
    if (isPaused) {
      msgEl.textContent = '⚠️ Cannot use hint while paused!';
      setTimeout(() => {
        if (!gameCompleted) {
          const placed = pieces.filter(p => p.placed).length;
          msgEl.textContent = `🧩 ${placed}/${pieces.length} pieces placed`;
        }
      }, 2000);
      return;
    }
    
    if (gameCompleted) {
      msgEl.textContent = '🎉 Puzzle already completed! Great job! 🎉';
      return;
    }
    
    if (hintsRemaining <= 0) {
      msgEl.textContent = '⚠️ No hints remaining! Play carefully!';
      setTimeout(() => {
        if (!gameCompleted) {
          const placed = pieces.filter(p => p.placed).length;
          msgEl.textContent = `🧩 ${placed}/${pieces.length} pieces placed`;
        }
      }, 2000);
      return;
    }
    
    clearHint();
    
    const unplacedPieces = pieces.filter(p => !p.placed);
    
    if (unplacedPieces.length === 0) {
      msgEl.textContent = '✨ Puzzle already complete! ✨';
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * unplacedPieces.length);
    const hintPiece = unplacedPieces[randomIndex];
    currentHintPiece = hintPiece;
    
    const wrapper = pieceOriginalWrapper.get(hintPiece);
    
    if (wrapper && wrapper.parentNode === trayEl) {
      currentHintWrapper = wrapper;
      wrapper.classList.add('hint-highlight-piece');
      
      const boardBorder = 8;
      const correctX = hintPiece.correctX;
      const correctY = hintPiece.correctY;
      
      const boardHighlight = document.createElement('div');
      boardHighlight.className = 'hint-highlight-board';
      boardHighlight.style.position = 'absolute';
      boardHighlight.style.left = (correctX + boardBorder) + 'px';
      boardHighlight.style.top = (correctY + boardBorder) + 'px';
      boardHighlight.style.width = pieceSize + 'px';
      boardHighlight.style.height = pieceSize + 'px';
      boardHighlight.style.borderRadius = '12px';
      boardHighlight.style.pointerEvents = 'none';
      boardHighlight.style.zIndex = '100';
      boardEl.appendChild(boardHighlight);
      currentHintHighlight = boardHighlight;
      
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      
      hintsRemaining--;
      updateHintButton();
      
      msgEl.textContent = `💡 Try placing this piece in the highlighted spot! (${hintsRemaining} hints left)`;
      
      hintTimeout = setTimeout(() => {
        clearHint();
        if (!gameCompleted) {
          const placed = pieces.filter(p => p.placed).length;
          msgEl.textContent = `🧩 ${placed}/${pieces.length} pieces placed`;
        }
      }, 4000);
    }
  }

  // ================= GAME STYLES =================
  function addBoardGrid() {
    if (document.getElementById('puzzle-grid-style')) return;
    
    const style = document.createElement('style');
    style.id = 'puzzle-grid-style';
    style.textContent = `
      #board {
        position: relative;
        background: #fffcf0;
        border: 8px solid #faedcd !important;
        border-radius: 20px !important;
        overflow: hidden;
      }
      #board::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        background-image: 
          linear-gradient(to right, rgba(210, 180, 140, 0.4) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(210, 180, 140, 0.4) 1px, transparent 1px);
        background-size: ${pieceSize}px ${pieceSize}px;
        z-index: 10;
        border-radius: 12px;
      }
      #board canvas {
        position: absolute;
        cursor: default;
        z-index: 5;
      }
      .pieceWrapper {
        display: inline-block;
        position: relative;
        flex-shrink: 0;
        background: #ffe3c0;
        border-radius: 14px;
        box-shadow: 0 4px 8px rgba(120, 80, 40, 0.15);
        transition: transform 0.2s;
        cursor: grab;
        -webkit-tap-highlight-color: transparent;
        user-select: none;
        -webkit-user-select: none;
        touch-action: pan-x pan-y;
      }
      .pieceWrapper canvas {
        position: absolute;
        cursor: grab;
        filter: drop-shadow(2px 3px 5px rgba(0,0,0,0.1));
        touch-action: none;
        left: 0;
        top: 0;
        pointer-events: auto;
      }
      .pieceWrapper canvas:active {
        cursor: grabbing;
        z-index: 10000;
      }
      .hint-highlight-piece {
        animation: hintPulse 0.8s ease-in-out infinite;
        box-shadow: 0 0 0 3px #ffd700, 0 0 0 6px rgba(255, 215, 0, 0.3);
        border-radius: 14px;
        z-index: 1000 !important;
      }
      .hint-highlight-board {
        animation: hintPulse 0.8s ease-in-out infinite;
        border: 3px solid #ffd700 !important;
        background: rgba(255, 215, 0, 0.15);
        box-sizing: border-box;
        pointer-events: none;
        z-index: 20;
        border-radius: 12px;
      }
      @keyframes hintPulse {
        0% { opacity: 0.7; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.02); }
        100% { opacity: 0.7; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  // ================= TIMER FUNCTIONS =================
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!isPaused && gameStarted && !gameCompleted) {
        timerSeconds++;
        updateTimerDisplay();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function resetTimer() {
    timerSeconds = 0;
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    if (timerEl) {
      const minutes = Math.floor(timerSeconds / 60);
      const seconds = timerSeconds % 60;
      timerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  function incrementMoveCount() {
    if (!isPaused && gameStarted && !gameCompleted) {
      moveCount++;
      if (moveCountEl) moveCountEl.textContent = moveCount;
    }
  }

  function resetMoveCount() {
    moveCount = 0;
    if (moveCountEl) moveCountEl.textContent = moveCount;
  }

  // ================= PAUSE FUNCTIONS =================
  function pauseGame() {
    if (!gameStarted || gameCompleted) return;
    isPaused = true;
    if (pauseBtn) pauseBtn.textContent = '▶️ Resume';
    if (pauseOverlay) {
      pauseOverlay.style.display = 'flex';
      if (pausedTimeEl) pausedTimeEl.textContent = timerEl ? timerEl.textContent : '00:00';
      if (pausedMovesEl) pausedMovesEl.textContent = moveCount;
    }
    clearHint();
  }

  function resumeGame() {
    isPaused = false;
    if (pauseBtn) pauseBtn.textContent = '⏸️ Pause';
    if (pauseOverlay) pauseOverlay.style.display = 'none';
  }

  // ================= WIN CONDITIONS =================
  function checkWinCondition() {
    return pieces.every(p => p.placed);
  }

  function saveGameResult() {
    if (checkWinCondition() && window.StatisticsManager) {
      window.StatisticsManager.addGameResult('easy', timerSeconds, moveCount, true);
    }
  }

  window.goToMedium = function() {
    window.location.href = 'medium.html';
  };

  function showCompletionMessage() {
    const existingPopup = document.querySelector('.completion-popup');
    if (existingPopup) existingPopup.remove();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'completion-popup';
    messageDiv.innerHTML = `
        <div class="completion-content">
            <h2>🎉 Puzzle Complete!</h2>
            <div class="completion-stats">
                <p><span class="stat-icon">⏱️</span> <span class="stat-value">${timerEl ? timerEl.textContent : '00:00'}</span></p>
                <p><span class="stat-icon">🔄</span> <span class="stat-value">${moveCount}</span></p>
            </div>
            <p class="saved-message">✓ Statistics saved</p>
            <div class="popup-buttons">
                <button onclick="this.closest('.completion-popup').remove()" class="popup-btn ok-btn">OK</button>
                <button onclick="goToMedium()" class="popup-btn next-btn">▶️ Next</button>
            </div>
        </div>
    `;
    
    if (!document.getElementById('popup-styles')) {
      const style = document.createElement('style');
      style.id = 'popup-styles';
      style.textContent = `
        .completion-popup {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 50000;
            backdrop-filter: blur(5px);
        }
        .completion-content {
            background: rgba(60, 35, 15, 0.98);
            padding: 25px 30px;
            border-radius: 20px;
            text-align: center;
            border: 3px solid #d4a373;
            box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            animation: popIn 0.3s ease;
            max-width: 320px;
        }
        .completion-content h2 {
            color: #f5d7a1;
            font-size: 24px;
            margin-bottom: 15px;
        }
        .completion-stats {
            margin: 15px 0;
            background: rgba(0, 0, 0, 0.3);
            padding: 12px;
            border-radius: 12px;
        }
        .completion-stats p {
            color: white;
            font-size: 16px;
            margin: 8px 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }
        .stat-icon {
            font-size: 20px;
        }
        .stat-value {
            font-size: 18px;
            font-weight: 700;
            color: #f5d7a1;
            min-width: 65px;
        }
        .saved-message {
            color: #4CAF50;
            font-size: 13px;
            margin: 12px 0 15px;
        }
        .popup-buttons {
            display: flex;
            gap: 12px;
            justify-content: center;
            margin-top: 10px;
        }
        .popup-btn {
            padding: 8px 20px;
            border: none;
            border-radius: 40px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 90px;
        }
        .ok-btn {
            background: #d4a373;
            color: white;
        }
        .ok-btn:hover {
            background: #c38e5f;
            transform: scale(1.05);
        }
        .next-btn {
            background: #4CAF50;
            color: white;
        }
        .next-btn:hover {
            background: #45a049;
            transform: scale(1.05);
        }
        @keyframes popIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(messageDiv);
  }

  function checkWin() {
    if (checkWinCondition() && !gameCompleted) {
      gameCompleted = true;
      stopTimer();
      if (msgEl) msgEl.textContent = '✨ PERFECT! Easy puzzle complete! ✨';
      if (pauseBtn) pauseBtn.disabled = true;
      if (hintBtn) hintBtn.disabled = true;
      
      saveGameResult();
      playWinnerSound();
      clearHint();
      showCompletionMessage();
    } else {
      const placed = pieces.filter(p => p.placed).length;
      if (msgEl && !gameCompleted) msgEl.textContent = `🧩 ${placed}/${pieces.length} pieces placed`;
    }
  }

  // ================= PIECE MANAGEMENT =================
  function removePlacedPieceWrapper(piece) {
    const wrapper = pieceOriginalWrapper.get(piece);
    if (wrapper && wrapper.parentNode === trayEl) {
      wrapper.remove();
      pieceOriginalWrapper.delete(piece);
    }
  }

  function getBoardRect() {
    return boardEl.getBoundingClientRect();
  }

  function generateShapes() {
    shapes = [];
    for (let r = 0; r < rows; r++) {
      shapes[r] = [];
      for (let c = 0; c < cols; c++) {
        let topVal = (r === 0) ? 0 : -shapes[r-1][c].bottom;
        let leftVal = (c === 0) ? 0 : -shapes[r][c-1].right;
        let rightVal = (c === cols-1) ? 0 : (Math.random() > 0.5 ? 1 : -1);
        let bottomVal = (r === rows-1) ? 0 : (Math.random() > 0.5 ? 1 : -1);
        shapes[r][c] = {
          top: topVal,
          left: leftVal,
          right: rightVal,
          bottom: bottomVal
        };
      }
    }
  }

  function drawPiece(r, c) {
    const canvas = document.createElement('canvas');
    canvas.width = totalPieceSize;
    canvas.height = totalPieceSize;
    const ctx = canvas.getContext('2d');

    const s = shapes[r][c];

    ctx.clearRect(0, 0, totalPieceSize, totalPieceSize);
    ctx.save();
    
    ctx.translate(knob, knob);
    ctx.beginPath();
    ctx.moveTo(0, 0);

    if (s.top === 0) {
      ctx.lineTo(pieceSize, 0);
    } else {
      const dir = s.top > 0 ? 1 : -1;
      const bezierOffset = Math.min(5, Math.max(3, Math.floor(knob * 0.6)));
      ctx.lineTo(pieceSize / 3, 0);
      ctx.bezierCurveTo(
        pieceSize / 3 + bezierOffset, -dir * knob * 1.2,
        2 * pieceSize / 3 - bezierOffset, -dir * knob * 1.2,
        2 * pieceSize / 3, 0
      );
      ctx.lineTo(pieceSize, 0);
    }

    if (s.right === 0) {
      ctx.lineTo(pieceSize, pieceSize);
    } else {
      const dir = s.right > 0 ? 1 : -1;
      const bezierOffset = Math.min(5, Math.max(3, Math.floor(knob * 0.6)));
      ctx.lineTo(pieceSize, pieceSize / 3);
      ctx.bezierCurveTo(
        pieceSize + dir * knob * 1.2, pieceSize / 3 + bezierOffset,
        pieceSize + dir * knob * 1.2, 2 * pieceSize / 3 - bezierOffset,
        pieceSize, 2 * pieceSize / 3
      );
      ctx.lineTo(pieceSize, pieceSize);
    }

    if (s.bottom === 0) {
      ctx.lineTo(0, pieceSize);
    } else {
      const dir = s.bottom > 0 ? 1 : -1;
      const bezierOffset = Math.min(5, Math.max(3, Math.floor(knob * 0.6)));
      ctx.lineTo(2 * pieceSize / 3, pieceSize);
      ctx.bezierCurveTo(
        2 * pieceSize / 3 - bezierOffset, pieceSize + dir * knob * 1.2,
        pieceSize / 3 + bezierOffset, pieceSize + dir * knob * 1.2,
        pieceSize / 3, pieceSize
      );
      ctx.lineTo(0, pieceSize);
    }

    if (s.left === 0) {
      ctx.lineTo(0, 0);
    } else {
      const dir = s.left > 0 ? 1 : -1;
      const bezierOffset = Math.min(5, Math.max(3, Math.floor(knob * 0.6)));
      ctx.lineTo(0, 2 * pieceSize / 3);
      ctx.bezierCurveTo(
        -dir * knob * 1.2, 2 * pieceSize / 3 - bezierOffset,
        -dir * knob * 1.2, pieceSize / 3 + bezierOffset,
        0, pieceSize / 3
      );
      ctx.lineTo(0, 0);
    }

    ctx.closePath();
    ctx.clip();

    if (img.complete && img.naturalWidth && img.naturalWidth > 0) {
      const imgW = img.naturalWidth;
      const imgH = img.naturalHeight;
      
      const cellSrcX = c * (imgW / cols);
      const cellSrcY = r * (imgH / rows);
      const cellSrcW = imgW / cols;
      const cellSrcH = imgH / rows;
      
      const expandXRatio = knob / pieceSize;
      const expandYRatio = knob / pieceSize;
      
      const srcX = Math.max(0, cellSrcX - cellSrcW * expandXRatio);
      const srcY = Math.max(0, cellSrcY - cellSrcH * expandYRatio);
      const srcWidth = Math.min(imgW - srcX, cellSrcW * (1 + 2 * expandXRatio));
      const srcHeight = Math.min(imgH - srcY, cellSrcH * (1 + 2 * expandYRatio));
      
      ctx.drawImage(
        img,
        srcX, srcY, srcWidth, srcHeight,
        -knob, -knob, totalPieceSize, totalPieceSize
      );
    } else {
      ctx.fillStyle = '#ffcfb0';
      ctx.fillRect(-knob, -knob, totalPieceSize, totalPieceSize);
      ctx.fillStyle = '#d4a373';
      ctx.font = `bold ${Math.floor(pieceSize * 0.3)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧩', pieceSize/2, pieceSize/2);
    }

    ctx.restore();

    ctx.strokeStyle = 'rgba(80, 50, 30, 0.25)';
    ctx.lineWidth = Math.max(1, Math.min(2, Math.floor(knob / 3)));
    ctx.stroke();

    canvas.correctX = c * pieceSize - knob;
    canvas.correctY = r * pieceSize - knob;
    canvas.placed = false;
    canvas.row = r;
    canvas.col = c;

    canvas.style.position = 'absolute';
    canvas.style.width = totalPieceSize + 'px';
    canvas.style.height = totalPieceSize + 'px';
    canvas.style.left = '0px';
    canvas.style.top = '0px';

    return canvas;
  }

  // ================= DRAG & DROP =================
  function setupDrag(piece) {
    piece.removeEventListener('mousedown', onDragStart);
    piece.removeEventListener('touchstart', onDragStart);
    
    piece.addEventListener('mousedown', onDragStart);
    piece.addEventListener('touchstart', onDragStart, { passive: false });
  }

  function onDragStart(e) {
    if (isPaused || gameCompleted) return;
    
    e.preventDefault();
    
    let piece = e.target;
    
    if (piece.classList && piece.classList.contains('pieceWrapper')) {
      piece = piece.querySelector('canvas');
      if (!piece) return;
    }
    
    if (piece.placed) return;

    clearHint();

    if (!gameStarted) {
      gameStarted = true;
      startTimer();
    }

    playDragSound();

    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const boardRect = getBoardRect();
    const pieceRect = piece.getBoundingClientRect();

    const offsetX = clientX - pieceRect.left;
    const offsetY = clientY - pieceRect.top;

    const originalWrapper = piece.parentNode;
    const isInTray = originalWrapper && originalWrapper.classList && originalWrapper.classList.contains('pieceWrapper') && originalWrapper.parentNode === trayEl;

    if (isInTray) {
      const wrapperRect = originalWrapper.getBoundingClientRect();
      const leftRelative = wrapperRect.left - boardRect.left;
      const topRelative = wrapperRect.top - boardRect.top;

      if (piece.parentNode) {
        piece.parentNode.removeChild(piece);
      }
      boardEl.appendChild(piece);
      piece.style.position = 'absolute';
      piece.style.left = leftRelative + 'px';
      piece.style.top = topRelative + 'px';

      const newRect = piece.getBoundingClientRect();
      piece.dragData = {
        active: true,
        offsetX: clientX - newRect.left,
        offsetY: clientY - newRect.top,
        originalWrapper: originalWrapper
      };
    } else if (piece.parentNode === boardEl) {
      piece.dragData = {
        active: true,
        offsetX: offsetX,
        offsetY: offsetY,
        originalWrapper: null
      };
    } else {
      return;
    }

    piece.style.zIndex = '10000';
    currentDragPiece = piece;
    dragActive = true;

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
    document.addEventListener('touchcancel', onDragEnd);
  }

  function onDragMove(e) {
    if (!dragActive || !currentDragPiece || isPaused || gameCompleted) {
      cleanupDragListeners();
      return;
    }
    
    e.preventDefault();

    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const piece = currentDragPiece;
    const data = piece.dragData;
    if (!data) return;

    const boardRect = getBoardRect();

    let newLeft = clientX - boardRect.left - data.offsetX;
    let newTop = clientY - boardRect.top - data.offsetY;

    const maxLeft = boardRect.width - piece.offsetWidth;
    const maxTop = boardRect.height - piece.offsetHeight;
    
    newLeft = Math.max(-50, Math.min(maxLeft + 50, newLeft));
    newTop = Math.max(-50, Math.min(maxTop + 50, newTop));

    piece.style.left = newLeft + 'px';
    piece.style.top = newTop + 'px';
  }

  function onDragEnd(e) {
    if (!dragActive || !currentDragPiece || gameCompleted) {
      cleanupDragListeners();
      return;
    }

    const piece = currentDragPiece;

    const left = parseFloat(piece.style.left) || 0;
    const top = parseFloat(piece.style.top) || 0;
    const correctX = piece.correctX;
    const correctY = piece.correctY;

    const dx = left - correctX;
    const dy = top - correctY;

    incrementMoveCount();

    const snapDistance = 15;

    if (Math.abs(dx) < snapDistance && Math.abs(dy) < snapDistance) {
      piece.style.left = correctX + 'px';
      piece.style.top = correctY + 'px';
      piece.placed = true;
      piece.style.zIndex = '';
      removePlacedPieceWrapper(piece);
      playSnapSound();
    } else {
      piece.placed = false;
      piece.style.zIndex = '';

      const originalWrapper = pieceOriginalWrapper.get(piece);
      if (originalWrapper && originalWrapper.parentNode === trayEl) {
        if (piece.parentNode) {
          piece.parentNode.removeChild(piece);
        }
        originalWrapper.appendChild(piece);
        piece.style.left = '0px';
        piece.style.top = '0px';
      } else {
        const wrapper = document.createElement('div');
        wrapper.className = 'pieceWrapper';
        wrapper.style.width = totalPieceSize + 'px';
        wrapper.style.height = totalPieceSize + 'px';
        wrapper.appendChild(piece);
        trayEl.appendChild(wrapper);
        piece.style.left = '0px';
        piece.style.top = '0px';
        pieceOriginalWrapper.set(piece, wrapper);
      }
    }

    piece.dragData = null;
    currentDragPiece = null;
    dragActive = false;
    cleanupDragListeners();
    checkWin();
  }

  function cleanupDragListeners() {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend', onDragEnd);
    document.removeEventListener('touchcancel', onDragEnd);
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // ================= IMAGE LOADING =================
  function loadRandomImage() {
    currentImageURL = imageOptions[Math.floor(Math.random() * imageOptions.length)];
    img = new Image();
    
    img.onload = function() {
      if (boardEl && (!boardEl.children.length || boardEl.children.length === 0)) {
        initGame();
      } else if (boardEl && boardEl.children.length > 0) {
        regeneratePiecesWithNewImage();
      }
    };
    
    img.onerror = function() {
      console.warn('Failed to load image:', currentImageURL);
      const remainingOptions = imageOptions.filter(url => url !== currentImageURL);
      if (remainingOptions.length > 0) {
        currentImageURL = remainingOptions[Math.floor(Math.random() * remainingOptions.length)];
        img.src = currentImageURL;
      } else {
        // Fallback canvas
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffb7c5';
        ctx.fillRect(0, 0, 300, 300);
        ctx.fillStyle = '#ff8a9f';
        ctx.font = '40px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            ctx.fillText('🧩', i*100+50, j*100+50);
          }
        }
        img.src = canvas.toDataURL();
      }
    };
    
    img.src = currentImageURL;
  }

  function regeneratePiecesWithNewImage() {
    calculateResponsiveSizes();
    
    gameStarted = false;
    gameCompleted = false;
    isPaused = false;
    
    if (pauseBtn) {
      pauseBtn.disabled = false;
      pauseBtn.textContent = '⏸️ Pause';
    }
    
    if (hintBtn) {
      hintBtn.disabled = false;
      hintBtn.style.opacity = '1';
    }
    
    stopTimer();
    resetTimer();
    resetMoveCount();
    clearHint();
    
    hintsRemaining = 3;
    updateHintButton();
    generateShapes();
    
    if (boardEl) {
      boardEl.innerHTML = '';
      boardEl.style.width = boardWidth + 'px';
      boardEl.style.height = boardHeight + 'px';
    }
    if (trayEl) trayEl.innerHTML = '';
    pieces = [];
    pieceOriginalWrapper.clear();
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const piece = drawPiece(r, c);
        setupDrag(piece);
        pieces.push(piece);
      }
    }
    
    const wrappers = [];
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      const wrapper = document.createElement('div');
      wrapper.className = 'pieceWrapper';
      wrapper.style.width = totalPieceSize + 'px';
      wrapper.style.height = totalPieceSize + 'px';
      wrapper.appendChild(piece);
      wrappers.push(wrapper);
      pieceOriginalWrapper.set(piece, wrapper);
    }
    
    const shuffledWrappers = shuffleArray([...wrappers]);
    shuffledWrappers.forEach(wrapper => {
      if (trayEl) trayEl.appendChild(wrapper);
    });
    
    const style = document.getElementById('puzzle-grid-style');
    if (style) {
      const gridSize = pieceSize;
      const newStyle = style.textContent.replace(/background-size: \d+px \d+px;/, `background-size: ${gridSize}px ${gridSize}px;`);
      style.textContent = newStyle;
    }
    
    if (msgEl) msgEl.textContent = '🧩 New puzzle loaded! Place the pieces to complete the puzzle';
    
    setTimeout(applyCurrentSettings, 100);
  }

  function initGame() {
    calculateResponsiveSizes();
    
    if (boardEl) {
      boardEl.innerHTML = '';
      boardEl.style.width = boardWidth + 'px';
      boardEl.style.height = boardHeight + 'px';
    }
    if (trayEl) trayEl.innerHTML = '';
    pieces = [];
    pieceOriginalWrapper.clear();
    clearHint();
    
    hintsRemaining = 3;
    updateHintButton();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const piece = drawPiece(r, c);
        setupDrag(piece);
        pieces.push(piece);
      }
    }

    const wrappers = [];
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i];
      const wrapper = document.createElement('div');
      wrapper.className = 'pieceWrapper';
      wrapper.style.width = totalPieceSize + 'px';
      wrapper.style.height = totalPieceSize + 'px';
      wrapper.appendChild(piece);
      wrappers.push(wrapper);
      pieceOriginalWrapper.set(piece, wrapper);
    }

    const shuffledWrappers = shuffleArray([...wrappers]);
    
    shuffledWrappers.forEach(wrapper => {
      if (trayEl) trayEl.appendChild(wrapper);
    });

    const style = document.getElementById('puzzle-grid-style');
    if (style) {
      const gridSize = pieceSize;
      const newStyle = style.textContent.replace(/background-size: \d+px \d+px;/, `background-size: ${gridSize}px ${gridSize}px;`);
      style.textContent = newStyle;
    }

    gameStarted = false;
    isPaused = false;
    gameCompleted = false;
    if (pauseBtn) {
      pauseBtn.textContent = '⏸️ Pause';
      pauseBtn.disabled = false;
    }
    if (hintBtn) {
      hintBtn.disabled = false;
      hintBtn.style.opacity = '1';
    }
    if (pauseOverlay) pauseOverlay.style.display = 'none';
    stopTimer();
    resetTimer();
    resetMoveCount();
    
    if (msgEl) msgEl.textContent = '🧩 Place the pieces to complete the puzzle';
    
    setTimeout(applyCurrentSettings, 100);
  }

  function resetGame() {
    loadRandomImage();
  }

  // ================= EXPOSE GLOBAL FUNCTIONS =================
  window.resetGame = resetGame;
  window.pauseGame = pauseGame;
  window.resumeGame = resumeGame;
  window.showHint = showHint;

  // ================= INITIALIZATION =================
  addBoardGrid();

  boardEl = document.getElementById('board');
  trayEl = document.getElementById('tray');
  msgEl = document.getElementById('message');
  timerEl = document.getElementById('timer');
  moveCountEl = document.getElementById('moveCount');
  pauseBtn = document.getElementById('pauseBtn');
  pauseOverlay = document.getElementById('pauseOverlay');
  pausedTimeEl = document.getElementById('pausedTime');
  pausedMovesEl = document.getElementById('pausedMoves');
  hintBtn = document.getElementById('hintBtn');

  if (hintBtn) {
    hintBtn.addEventListener('click', function(e) {
      e.preventDefault();
      showHint();
    });
  }

  if (boardEl) {
    boardEl.style.border = '8px solid #faedcd';
    boardEl.style.borderRadius = '20px';
  }

  // Load StatisticsManager if not present
  if (!window.StatisticsManager) {
    const script = document.createElement('script');
    script.src = 'js/statistics.js';
    document.head.appendChild(script);
  }

  // Start everything
  setTimeout(function() {
    startBackgroundMusic();
    applyCurrentSettings();
  }, 500);

  generateShapes();
  loadRandomImage();
})();