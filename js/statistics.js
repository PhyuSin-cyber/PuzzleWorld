// Statistics Manager - Make it globally available
window.StatisticsManager = {
    STORAGE_KEY: 'puzzleworld_stats',
    
    // Default statistics structure
    defaultStats: {
        easy: {
            gamesPlayed: 0,
            bestTime: null,
            worstTime: 0,
            totalMoves: 0,
            totalTime: 0,
            bestMoves: null,
            games: [] // Recent games history
        },
        medium: {
            gamesPlayed: 0,
            bestTime: null,
            worstTime: 0,
            totalMoves: 0,
            totalTime: 0,
            bestMoves: null,
            games: []
        },
        hard: {
            gamesPlayed: 0,
            bestTime: null,
            worstTime: 0,
            totalMoves: 0,
            totalTime: 0,
            bestMoves: null,
            games: []
        }
    },

    // Current selected difficulty
    currentDifficulty: 'easy',
    
    // Modal state
    pendingAction: null,
    pendingDifficulty: null,

    // Initialize
    init() {
        console.log('StatisticsManager initializing...');
        if (!localStorage.getItem(this.STORAGE_KEY)) {
            console.log('No stats found, creating default...');
            this.saveStats(this.defaultStats);
        }
        this.loadStatsForDifficulty(this.currentDifficulty);
    },

    // Get all stats
    getStats() {
        const stats = localStorage.getItem(this.STORAGE_KEY);
        if (stats) {
            const parsed = JSON.parse(stats);
            // Ensure bestTime and bestMoves are properly handled
            if (parsed.easy && parsed.easy.bestTime === undefined) parsed.easy.bestTime = null;
            if (parsed.medium && parsed.medium.bestTime === undefined) parsed.medium.bestTime = null;
            if (parsed.hard && parsed.hard.bestTime === undefined) parsed.hard.bestTime = null;
            if (parsed.easy && parsed.easy.bestMoves === undefined) parsed.easy.bestMoves = null;
            if (parsed.medium && parsed.medium.bestMoves === undefined) parsed.medium.bestMoves = null;
            if (parsed.hard && parsed.hard.bestMoves === undefined) parsed.hard.bestMoves = null;

            if (parsed.easy && parsed.easy.completed) delete parsed.easy.completed;
            if (parsed.medium && parsed.medium.completed) delete parsed.medium.completed;
            if (parsed.hard && parsed.hard.completed) delete parsed.hard.completed;
            return parsed;
        }
        return JSON.parse(JSON.stringify(this.defaultStats));
    },

    // Save stats
    saveStats(stats) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));
        console.log('Stats saved:', stats);
    },

    // Add game result
    addGameResult(difficulty, timeInSeconds, moves, completed = true) {
        console.log(`Adding game result: ${difficulty}, time: ${timeInSeconds}, moves: ${moves}, completed: ${completed}`);
        
        const stats = this.getStats();
        const difficultyStats = stats[difficulty];
        
        if (!difficultyStats) {
            console.error('Invalid difficulty:', difficulty);
            return;
        }
        
        // Create game record
        const gameRecord = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            timestamp: Date.now(),
            difficulty: difficulty,
            time: timeInSeconds,
            timeFormatted: this.formatTime(timeInSeconds),
            moves: moves
        };

        console.log('Game record created:', gameRecord);

        // Add to games array (keep last 20 games)
        difficultyStats.games.unshift(gameRecord);
        if (difficultyStats.games.length > 20) {
            difficultyStats.games.pop();
        }

        // Always increment games played
        difficultyStats.gamesPlayed++;

        // Update statistics
        if (completed) {
            difficultyStats.totalMoves += moves;
            difficultyStats.totalTime += timeInSeconds;
            
            // Update best time
            if (difficultyStats.bestTime === null || timeInSeconds < difficultyStats.bestTime) {
                difficultyStats.bestTime = timeInSeconds;
                console.log('New best time!');
            }
            
            // Update worst time
            if (timeInSeconds > difficultyStats.worstTime) {
                difficultyStats.worstTime = timeInSeconds;
            }
            
            // Update best moves
            if (difficultyStats.bestMoves === null || moves < difficultyStats.bestMoves) {
                difficultyStats.bestMoves = moves;
                console.log('New best moves!');
            }
        }

        this.saveStats(stats);
        
        // Update the display
        if (window.location.pathname.includes('statistics.html')) {
            this.loadStatsForDifficulty(this.currentDifficulty);
        }
        
        return gameRecord;
    },

    // Clear statistics for current difficulty only
    clearCurrentDifficulty() {
        const stats = this.getStats();
        stats[this.currentDifficulty] = JSON.parse(JSON.stringify(this.defaultStats[this.currentDifficulty]));
        this.saveStats(stats);
        this.loadStatsForDifficulty(this.currentDifficulty);
        this.showNotification(`${this.capitalizeFirst(this.currentDifficulty)} statistics cleared!`, 'success');
    },

    // Clear all statistics
    clearAll() {
        this.saveStats(JSON.parse(JSON.stringify(this.defaultStats)));
        this.loadStatsForDifficulty(this.currentDifficulty);
        this.showNotification('All statistics cleared!', 'success');
    },

    // Format time (seconds to MM:SS)
    formatTime(seconds) {
        if (seconds === null || seconds === 0 || seconds === Infinity) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    // Load statistics for specific difficulty
    loadStatsForDifficulty(difficulty) {
        console.log('Loading stats for difficulty:', difficulty);
        const stats = this.getStats();
        const diffStats = stats[difficulty];
        
        // Check if elements exist
        const totalGamesEl = document.getElementById('totalGames');
        const bestTimeEl = document.getElementById('bestTime');
        const avgMovesEl = document.getElementById('avgMoves');
        
        if (totalGamesEl) {
            totalGamesEl.textContent = diffStats.gamesPlayed || 0;
        }
        
        if (bestTimeEl) {
            bestTimeEl.textContent = this.formatTime(diffStats.bestTime);
        }
        
        if (avgMovesEl) {
            // Calculate average moves based on games played
            const avgMoves = diffStats.gamesPlayed > 0 
                ? Math.round(diffStats.totalMoves / diffStats.gamesPlayed) 
                : 0;
            avgMovesEl.textContent = avgMoves;
        }

        // Update recent games table
        if (document.getElementById('gamesTableBody')) {
            this.updateGamesTable(diffStats.games);
        }
        
        // Update tab active state
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.textContent.toLowerCase().includes(difficulty)) {
                btn.classList.add('active');
            }
        });
        
        // Update clear button text
        const clearBtn = document.getElementById('clearCurrentBtn');
        if (clearBtn) {
            clearBtn.textContent = `🗑️ Clear ${this.capitalizeFirst(difficulty)} Stats`;
        }
    },

    // Update games table
    updateGamesTable(games) {
        const tbody = document.getElementById('gamesTableBody');
        
        if (!tbody) return;
        
        if (!games || games.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="no-data">No games played yet</td></tr>';
            return;
        }

        tbody.innerHTML = games.map(game => `
            <tr>
                <td>${game.date}</td>
                <td>${this.capitalizeFirst(game.difficulty)} (${this.getGridSize(game.difficulty)})</td>
                <td>${game.timeFormatted}</td>
                <td>${game.moves}</td>
            </tr>
        `).join('');
    },

    // Get grid size for difficulty
    getGridSize(difficulty) {
        const sizes = {
            easy: '4x4',
            medium: '6x6',
            hard: '8x8'
        };
        return sizes[difficulty] || '4x4';
    },

    // Capitalize first letter
    capitalizeFirst(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    },

    // Show notification
    showNotification(message, type = 'info') {
        
        const existing = document.querySelector('.stat-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `stat-notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 10px;
            color: white;
            font-weight: bold;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            ${type === 'success' ? 'background: #4CAF50;' : ''}
            ${type === 'error' ? 'background: #f44336;' : ''}
            ${type === 'info' ? 'background: #d4a373;' : ''}
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;

        // Add animation style if not exists
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// Modal functions
let modalResolve = null;

function showModal(title, message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modal.style.display = 'flex';
        
        modalResolve = resolve;
    });
}

function closeModal() {
    const modal = document.getElementById('confirmModal');
    modal.style.display = 'none';
    if (modalResolve) {
        modalResolve(false);
        modalResolve = null;
    }
}

function confirmAction() {
    const modal = document.getElementById('confirmModal');
    modal.style.display = 'none';
    if (modalResolve) {
        modalResolve(true);
        modalResolve = null;
    }
}

// Switch difficulty tab
function switchDifficulty(difficulty) {
    window.StatisticsManager.currentDifficulty = difficulty;
    window.StatisticsManager.loadStatsForDifficulty(difficulty);
}

// Clear current difficulty statistics
async function clearCurrentDifficultyStats() {
    const difficulty = window.StatisticsManager.currentDifficulty;
    const confirmed = await showModal(
        'Clear Current Statistics',
        `Are you sure you want to clear all statistics for ${window.StatisticsManager.capitalizeFirst(difficulty)}? This cannot be undone.`
    );
    
    if (confirmed) {
        window.StatisticsManager.clearCurrentDifficulty();
    }
}

// Clear all statistics
async function clearAllStats() {
    const confirmed = await showModal(
        'Clear All Statistics',
        'Are you sure you want to clear ALL statistics for ALL difficulties? This cannot be undone.'
    );
    
    if (confirmed) {
        window.StatisticsManager.clearAll();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('statistics.html')) {
        console.log('On statistics page, initializing...');
        window.StatisticsManager.init();
    }
});

// Make functions globally available
window.switchDifficulty = switchDifficulty;
window.clearCurrentDifficultyStats = clearCurrentDifficultyStats;
window.clearAllStats = clearAllStats;
window.closeModal = closeModal;
window.confirmAction = confirmAction;