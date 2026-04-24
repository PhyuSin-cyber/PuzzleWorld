(function() {
    'use strict';
    
    // ---------- DEFAULT SETTINGS ----------
    const DEFAULT_SETTINGS = {
        showTimer: true,
        showMoves: true,
        soundEnabled: true,
        volume: 70,
        theme: 'original',
        musicEnabled: true,
        musicVolume: 40
    };
    
    // Current settings
    let currentSettings = { ...DEFAULT_SETTINGS };
    
    // Audio Context for Sound Effects
    let audioCtx = null;
    let audioInitialized = false;
    
    // User interaction flag
    let userInteracted = false;
    
    // ---------- STORAGE HELPERS ----------
    function loadFromStorage() {
        const saved = localStorage.getItem('puzzleworld_settings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                currentSettings = { ...DEFAULT_SETTINGS, ...parsed };
                console.log('Settings loaded:', currentSettings);
            } catch(e) {
                console.error('Failed to parse settings:', e);
                currentSettings = { ...DEFAULT_SETTINGS };
            }
        } else {
            currentSettings = { ...DEFAULT_SETTINGS };
            localStorage.setItem('puzzleworld_settings', JSON.stringify(currentSettings));
        }
        applyThemeToBody();
    }
    
    function persistToStorage() {
        localStorage.setItem('puzzleworld_settings', JSON.stringify(currentSettings));
        console.log('Settings saved to localStorage');
        
        // Dispatch event for other pages
        window.dispatchEvent(new CustomEvent('settingsChanged', { 
            detail: { ...currentSettings } 
        }));
    }
    
    // ---------- THEME MANAGEMENT ----------
    function applyThemeToBody() {
        if (currentSettings.theme === 'dark') {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('original-theme');
        } else {
            document.body.classList.add('original-theme');
            document.body.classList.remove('dark-theme');
        }
    }
    
    // ---------- AUDIO CONTEXT (Sound Effects) ----------
    function initAudioContext() {
        if (audioCtx) return audioCtx;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            audioInitialized = true;
            console.log('Audio context initialized');
            return audioCtx;
        } catch(e) {
            console.warn('Web Audio API not supported:', e);
            return null;
        }
    }
    
    function ensureAudio() {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().then(() => console.log('Audio resumed'));
        }
    }
    
    function playBeep(frequency = 523.25, duration = 0.1, volumeScale = 0.25) {
        if (!currentSettings.soundEnabled) return;
        
        const ctx = initAudioContext();
        if (!ctx) return;
        
        const play = () => {
            const volume = (currentSettings.volume / 100) * volumeScale;
            if (volume <= 0) return;
            
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            gainNode.gain.value = volume;
            
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
            oscillator.stop(ctx.currentTime + duration);
        };
        
        if (ctx.state === 'suspended') {
            ctx.resume().then(play).catch(e => console.log('Audio resume error:', e));
        } else {
            play();
        }
    }
    
    function playDragSound() {
        console.log('playDragSound called, soundEnabled:', currentSettings.soundEnabled);
        if (!currentSettings.soundEnabled) return;
        playBeep(660, 0.05, 0.15);
    }
    
    function playSnapSound() {
        console.log('playSnapSound called, soundEnabled:', currentSettings.soundEnabled);
        if (!currentSettings.soundEnabled) return;
        playBeep(587.33, 0.08, 0.3);
    }
    
    function playWinnerSound() {
        console.log('playWinnerSound called, soundEnabled:', currentSettings.soundEnabled);
        if (!currentSettings.soundEnabled) return;
        playBeep(523.25, 0.12, 0.3);
        setTimeout(() => playBeep(659.25, 0.12, 0.32), 130);
        setTimeout(() => playBeep(783.99, 0.3, 0.35), 260);
        setTimeout(() => playBeep(523.25, 0.2, 0.3), 620);
    }
    
    // ---------- GLOBAL MUSIC MANAGER ----------
    function getGlobalMusicPlayer() {
        if (!window._puzzleMusic) {
            window._puzzleMusic = new Audio();
            window._puzzleMusic.loop = true;
            window._puzzleMusic.preload = 'auto';
            window._puzzleMusic.src = 'assets/music/lofi-background.mp3';
            window._puzzleMusic.volume = 0.4;
            
            // Restore saved volume
            window._puzzleMusic.volume = Math.min(1, Math.max(0, (currentSettings.musicVolume || 40) / 100));
            
            window._puzzleMusic.addEventListener('canplaythrough', () => {
                console.log('Global music loaded and ready');
                if (currentSettings.musicEnabled && userInteracted) {
                    window._puzzleMusic.play().catch(e => console.log('Auto-play prevented:', e));
                }
            });
            
            window._puzzleMusic.addEventListener('error', (e) => {
                console.error('Music file error - please check if assets/music/lofi-background.mp3 exists');
            });
            
            window._puzzleMusic.addEventListener('play', () => {
                console.log('Music started playing');
            });
            
            window._puzzleMusic.addEventListener('pause', () => {
                console.log('Music paused');
            });
        }
        return window._puzzleMusic;
    }
    
    function updateMusicVolume(volume) {
        const music = getGlobalMusicPlayer();
        music.volume = Math.min(1, Math.max(0, volume / 100));
        console.log('Music volume set to:', volume + '%');
    }
    
    function startGlobalMusic() {
        console.log('startGlobalMusic called, musicEnabled:', currentSettings.musicEnabled, 'userInteracted:', userInteracted);
        if (!currentSettings.musicEnabled) {
            stopGlobalMusic();
            return;
        }
        
        const music = getGlobalMusicPlayer();
        
        if (!music.paused) {
            console.log('Music already playing');
            return;
        }
        
        // Reset to beginning if at end
        if (music.currentTime > 0 && music.currentTime >= music.duration - 1) {
            music.currentTime = 0;
        }
        
        music.play().then(() => {
            console.log('Global music started successfully');
        }).catch((e) => {
            console.log('Music play failed:', e);
        });
    }
    
    function stopGlobalMusic() {
        const music = getGlobalMusicPlayer();
        if (!music.paused) {
            music.pause();
            console.log('Global music stopped');
        }
    }
    
    // ---------- UI UPDATE ----------
    function updateUIFromSettings() {
        const timerToggle = document.getElementById('timerToggle');
        const movesToggle = document.getElementById('movesToggle');
        const soundToggle = document.getElementById('soundToggle');
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeValue = document.getElementById('volumeValue');
        const musicToggle = document.getElementById('musicToggle');
        const musicVolumeSlider = document.getElementById('musicVolumeSlider');
        const musicVolumeValue = document.getElementById('musicVolumeValue');
        const themeOriginal = document.getElementById('themeOriginal');
        const themeDark = document.getElementById('themeDark');
        
        if (timerToggle) timerToggle.checked = currentSettings.showTimer;
        if (movesToggle) movesToggle.checked = currentSettings.showMoves;
        if (soundToggle) soundToggle.checked = currentSettings.soundEnabled;
        if (volumeSlider) {
            volumeSlider.value = currentSettings.volume;
            if (volumeValue) volumeValue.textContent = currentSettings.volume + '%';
        }
        if (musicToggle) musicToggle.checked = currentSettings.musicEnabled;
        if (musicVolumeSlider) {
            musicVolumeSlider.value = currentSettings.musicVolume;
            if (musicVolumeValue) musicVolumeValue.textContent = currentSettings.musicVolume + '%';
        }
        
        if (themeOriginal && themeDark) {
            if (currentSettings.theme === 'dark') {
                themeDark.classList.add('active');
                themeOriginal.classList.remove('active');
            } else {
                themeOriginal.classList.add('active');
                themeDark.classList.remove('active');
            }
        }
        
        // Update global music
        updateMusicVolume(currentSettings.musicVolume);
        if (currentSettings.musicEnabled && userInteracted) {
            startGlobalMusic();
        }
    }
    
    function showSaveMessage(message = 'Settings saved successfully!') {
        const msgDiv = document.getElementById('saveMessage');
        if (msgDiv) {
            msgDiv.textContent = message;
            msgDiv.style.display = 'block';
            setTimeout(() => {
                msgDiv.style.display = 'none';
            }, 2000);
        }
    }
    
    // ---------- SAVE & RESET ----------
    function saveSettings() {
        persistToStorage();
        applyThemeToBody();
        updateMusicVolume(currentSettings.musicVolume);
        
        if (currentSettings.musicEnabled) {
            startGlobalMusic();
        } else {
            stopGlobalMusic();
        }
        
        showSaveMessage('✓ Settings saved!');
    }
    
    function resetToDefault() {
        currentSettings = { ...DEFAULT_SETTINGS };
        updateUIFromSettings();
        applyThemeToBody();
        updateMusicVolume(currentSettings.musicVolume);
        
        if (currentSettings.musicEnabled) {
            startGlobalMusic();
        } else {
            stopGlobalMusic();
        }
        
        playBeep(440, 0.1, 0.2);
        showSaveMessage('⟳ Reset to defaults (click Save to keep)');
    }
    
    // ---------- EVENT BINDINGS ----------
    function bindEvents() {
        const timerToggle = document.getElementById('timerToggle');
        const movesToggle = document.getElementById('movesToggle');
        const soundToggle = document.getElementById('soundToggle');
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeValue = document.getElementById('volumeValue');
        const musicToggle = document.getElementById('musicToggle');
        const musicVolumeSlider = document.getElementById('musicVolumeSlider');
        const musicVolumeValue = document.getElementById('musicVolumeValue');
        const themeOriginal = document.getElementById('themeOriginal');
        const themeDark = document.getElementById('themeDark');
        const saveBtn = document.getElementById('saveBtn');
        const resetBtn = document.getElementById('resetBtn');
        
        if (timerToggle) {
            timerToggle.addEventListener('change', (e) => {
                currentSettings.showTimer = e.target.checked;
            });
        }
        
        if (movesToggle) {
            movesToggle.addEventListener('change', (e) => {
                currentSettings.showMoves = e.target.checked;
            });
        }
        
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                currentSettings.soundEnabled = e.target.checked;
                if (e.target.checked) playBeep(523.25, 0.07, 0.2);
            });
        }
        
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                currentSettings.volume = val;
                if (volumeValue) volumeValue.textContent = val + '%';
                if (currentSettings.soundEnabled) playBeep(523.25, 0.05, 0.2);
            });
        }
        
        if (musicToggle) {
            musicToggle.addEventListener('change', (e) => {
                currentSettings.musicEnabled = e.target.checked;
                if (currentSettings.musicEnabled) {
                    startGlobalMusic();
                } else {
                    stopGlobalMusic();
                }
            });
        }
        
        if (musicVolumeSlider) {
            musicVolumeSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                currentSettings.musicVolume = val;
                if (musicVolumeValue) musicVolumeValue.textContent = val + '%';
                updateMusicVolume(val);
            });
        }
        
        if (themeOriginal) {
            themeOriginal.addEventListener('click', () => {
                currentSettings.theme = 'original';
                updateUIFromSettings();
                applyThemeToBody();
                playBeep(440, 0.06, 0.15);
            });
        }
        
        if (themeDark) {
            themeDark.addEventListener('click', () => {
                currentSettings.theme = 'dark';
                updateUIFromSettings();
                applyThemeToBody();
                playBeep(440, 0.06, 0.15);
            });
        }
        
        if (saveBtn) {
            saveBtn.addEventListener('click', saveSettings);
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', resetToDefault);
        }
    }
    
    // ---------- USER INTERACTION HANDLER ----------
    function setupUserInteraction() {
        const handleUserInteraction = () => {
            if (!userInteracted) {
                userInteracted = true;
                console.log('User interaction detected - enabling audio');
                
                // Resume audio context
                if (audioCtx && audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }
                
                // Start music if enabled
                if (currentSettings.musicEnabled) {
                    startGlobalMusic();
                }
            }
        };
        
        document.addEventListener('click', handleUserInteraction);
        document.addEventListener('touchstart', handleUserInteraction);
        document.addEventListener('keydown', handleUserInteraction);
    }
    
    // ---------- GLOBAL API FOR OTHER PAGES ----------
    function setupGlobalAPI() {
        window.GameSettings = {
            get: (key) => currentSettings[key],
            getAll: () => ({ ...currentSettings }),
            saveSettings: saveSettings,
            ensureAudio: ensureAudio,
            playSound: (type) => {
                if (type === 'snap') playSnapSound();
                else if (type === 'complete') playWinnerSound();
                else if (type === 'drag') playDragSound();
            },
            playDragSound: playDragSound,
            playSnapSound: playSnapSound,
            playWinnerSound: playWinnerSound,
            applyTheme: applyThemeToBody,
            startMusic: () => {
                if (currentSettings.musicEnabled) {
                    startGlobalMusic();
                }
            },
            stopMusic: stopGlobalMusic,
            isMusicPlaying: () => {
                const music = getGlobalMusicPlayer();
                return !music.paused;
            },
            setMusicVolume: (vol) => {
                currentSettings.musicVolume = vol;
                updateMusicVolume(vol);
            }
        };
    }
    
    // ---------- INITIALIZATION ----------
    function init() {
        loadFromStorage();
        updateUIFromSettings();
        bindEvents();
        initAudioContext();
        setupUserInteraction();
        setupGlobalAPI();
        
        console.log('Settings page initialized with persistent music');
        
        // Try to start music automatically (may be blocked by browser)
        setTimeout(() => {
            if (currentSettings.musicEnabled) {
                startGlobalMusic();
            }
        }, 1000);
        
        // Dispatch initial settings event
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('settingsChanged', { 
                detail: { ...currentSettings } 
            }));
        }, 100);
    }
    
    // Start everything when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();