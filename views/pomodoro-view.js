// Pomodoro Timer View
import { APP_CONFIG } from '../js/config.js';

/**
 * PomodoroView class manages the Pomodoro timer interface
 */
class PomodoroView {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.timerInterval = null;
        this.audio = null;
        this.initAudio();
    }

    /**
     * Initialize audio notification
     */
    initAudio() {
        // Create a simple beep sound using Web Audio API
        this.audio = {
            play: () => {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            }
        };
    }

    /**
     * Initialize the view
     */
    async init(container) {
        try {
            // Load HTML template
            const response = await fetch('views/pomodoro-view.html');
            const html = await response.text();
            container.innerHTML = html;

            // Load state from localStorage
            this.loadState();

            // Setup event listeners
            this.setupEventListeners();

            // Render initial state
            this.render();

            // If timer was running, resume it
            const pomodoroState = this.stateManager.getState('pomodoro');
            if (pomodoroState.isRunning && !pomodoroState.isPaused) {
                this.startTimer();
            }
        } catch (error) {
            console.error('Failed to initialize Pomodoro view:', error);
            container.innerHTML = `
                <div class="error-view">
                    <h2>Failed to load Pomodoro Timer</h2>
                    <p>Please try refreshing the page.</p>
                </div>
            `;
        }
    }

    /**
     * Load state from localStorage
     */
    loadState() {
        const saved = localStorage.getItem('pomodoroState');
        if (saved) {
            try {
                const savedState = JSON.parse(saved);
                const pomodoroState = this.stateManager.getState('pomodoro');
                
                // Check if it's the same day
                const today = new Date().toDateString();
                const savedDate = savedState.date;
                
                if (savedDate === today) {
                    // Restore state for today
                    this.stateManager.setState('pomodoro', {
                        ...pomodoroState,
                        sessionCount: savedState.sessionCount || 0,
                        completedToday: savedState.completedToday || [],
                        mode: savedState.mode || 'focus',
                        timeRemaining: savedState.timeRemaining || APP_CONFIG.pomodoro.focusDuration
                    });
                } else {
                    // New day, reset
                    this.resetDay();
                }
            } catch (error) {
                console.error('Failed to load pomodoro state:', error);
            }
        }
    }

    /**
     * Save state to localStorage
     */
    saveState() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        const stateToSave = {
            sessionCount: pomodoroState.sessionCount,
            completedToday: pomodoroState.completedToday,
            mode: pomodoroState.mode,
            timeRemaining: pomodoroState.timeRemaining,
            date: new Date().toDateString()
        };
        localStorage.setItem('pomodoroState', JSON.stringify(stateToSave));
    }

    /**
     * Reset for a new day
     */
    resetDay() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        this.stateManager.setState('pomodoro', {
            ...pomodoroState,
            sessionCount: 0,
            completedToday: [],
            mode: 'focus',
            timeRemaining: APP_CONFIG.pomodoro.focusDuration,
            isRunning: false,
            isPaused: false
        });
        this.saveState();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const startPauseBtn = document.getElementById('start-pause-btn');
        const resetBtn = document.getElementById('reset-btn');

        if (startPauseBtn) {
            startPauseBtn.addEventListener('click', () => this.toggleTimer());
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetTimer());
        }
    }

    /**
     * Toggle timer (start/pause)
     */
    toggleTimer() {
        const pomodoroState = this.stateManager.getState('pomodoro');

        if (!pomodoroState.isRunning) {
            // Start timer
            this.startTimer();
        } else if (pomodoroState.isPaused) {
            // Resume timer
            this.resumeTimer();
        } else {
            // Pause timer
            this.pauseTimer();
        }
    }

    /**
     * Start the timer
     */
    startTimer() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        
        this.stateManager.setState('pomodoro', {
            ...pomodoroState,
            isRunning: true,
            isPaused: false
        });

        this.timerInterval = setInterval(() => {
            this.tick();
        }, 1000);

        this.render();
        this.saveState();
    }

    /**
     * Pause the timer
     */
    pauseTimer() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        
        this.stateManager.setState('pomodoro', {
            ...pomodoroState,
            isPaused: true
        });

        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        this.render();
        this.saveState();
    }

    /**
     * Resume the timer
     */
    resumeTimer() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        
        this.stateManager.setState('pomodoro', {
            ...pomodoroState,
            isPaused: false
        });

        this.timerInterval = setInterval(() => {
            this.tick();
        }, 1000);

        this.render();
        this.saveState();
    }

    /**
     * Reset the timer
     */
    resetTimer() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        
        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Reset to initial state
        this.stateManager.setState('pomodoro', {
            ...pomodoroState,
            isRunning: false,
            isPaused: false,
            mode: 'focus',
            timeRemaining: APP_CONFIG.pomodoro.focusDuration
        });

        this.render();
        this.saveState();
    }

    /**
     * Timer tick (called every second)
     */
    tick() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        
        if (pomodoroState.timeRemaining > 0) {
            // Decrement time
            this.stateManager.setState('pomodoro', {
                ...pomodoroState,
                timeRemaining: pomodoroState.timeRemaining - 1
            });
            this.render();
            this.saveState();
        } else {
            // Timer completed
            this.onTimerComplete();
        }
    }

    /**
     * Handle timer completion
     */
    onTimerComplete() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        
        // Stop timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Play notification sound
        this.audio.play();

        // Show notification
        this.showNotification(`${pomodoroState.mode === 'focus' ? 'Focus session' : 'Break'} complete!`);

        // Transition to next mode
        if (pomodoroState.mode === 'focus') {
            // Focus session completed
            const newSessionCount = pomodoroState.sessionCount + 1;
            
            // Add to completed sessions
            const completedSession = {
                timestamp: new Date().toISOString(),
                duration: APP_CONFIG.pomodoro.focusDuration / 60
            };
            
            const newCompletedToday = [...pomodoroState.completedToday, completedSession];

            // Determine next break type
            let nextMode, nextDuration;
            if (newSessionCount % APP_CONFIG.pomodoro.sessionsBeforeLongBreak === 0) {
                // Long break after 4 sessions
                nextMode = 'longBreak';
                nextDuration = APP_CONFIG.pomodoro.longBreakDuration;
            } else {
                // Short break
                nextMode = 'shortBreak';
                nextDuration = APP_CONFIG.pomodoro.shortBreakDuration;
            }

            this.stateManager.setState('pomodoro', {
                ...pomodoroState,
                mode: nextMode,
                timeRemaining: nextDuration,
                sessionCount: newSessionCount,
                completedToday: newCompletedToday,
                isRunning: true,
                isPaused: false
            });

            // Auto-start break
            this.startTimer();
        } else {
            // Break completed, return to focus mode
            this.stateManager.setState('pomodoro', {
                ...pomodoroState,
                mode: 'focus',
                timeRemaining: APP_CONFIG.pomodoro.focusDuration,
                isRunning: false,
                isPaused: false
            });
        }

        this.render();
        this.saveState();
    }

    /**
     * Show notification
     */
    showNotification(message) {
        // Try to use browser notifications
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Pomodoro Timer', {
                body: message,
                icon: '/favicon.ico'
            });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('Pomodoro Timer', {
                        body: message,
                        icon: '/favicon.ico'
                    });
                }
            });
        }

        // Also show in-app notification
        alert(message);
    }

    /**
     * Format time as MM:SS
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Get mode display text
     */
    getModeText(mode) {
        switch (mode) {
            case 'focus':
                return 'Focus';
            case 'shortBreak':
                return 'Short Break';
            case 'longBreak':
                return 'Long Break';
            default:
                return 'Focus';
        }
    }

    /**
     * Render the view
     */
    render() {
        const pomodoroState = this.stateManager.getState('pomodoro');

        // Update timer display
        const timerTime = document.getElementById('timer-time');
        if (timerTime) {
            timerTime.textContent = this.formatTime(pomodoroState.timeRemaining);
        }

        // Update mode display
        const timerMode = document.getElementById('timer-mode');
        if (timerMode) {
            timerMode.textContent = this.getModeText(pomodoroState.mode);
        }

        // Update session counter
        const timerSession = document.getElementById('timer-session');
        if (timerSession) {
            timerSession.textContent = `Session ${pomodoroState.sessionCount}/${APP_CONFIG.pomodoro.sessionsBeforeLongBreak}`;
        }

        // Update start/pause button
        const startPauseText = document.getElementById('start-pause-text');
        if (startPauseText) {
            if (!pomodoroState.isRunning) {
                startPauseText.textContent = 'Start';
            } else if (pomodoroState.isPaused) {
                startPauseText.textContent = 'Resume';
            } else {
                startPauseText.textContent = 'Pause';
            }
        }

        // Update progress circle
        this.updateProgressCircle();

        // Update session history
        this.renderSessionHistory();
    }

    /**
     * Update progress circle
     */
    updateProgressCircle() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        const progressBar = document.querySelector('.timer-progress-bar');
        
        if (progressBar) {
            let totalDuration;
            switch (pomodoroState.mode) {
                case 'focus':
                    totalDuration = APP_CONFIG.pomodoro.focusDuration;
                    break;
                case 'shortBreak':
                    totalDuration = APP_CONFIG.pomodoro.shortBreakDuration;
                    break;
                case 'longBreak':
                    totalDuration = APP_CONFIG.pomodoro.longBreakDuration;
                    break;
                default:
                    totalDuration = APP_CONFIG.pomodoro.focusDuration;
            }

            const progress = (totalDuration - pomodoroState.timeRemaining) / totalDuration;
            const circumference = 2 * Math.PI * 90; // radius is 90
            const offset = circumference * (1 - progress);
            
            progressBar.style.strokeDasharray = `${circumference} ${circumference}`;
            progressBar.style.strokeDashoffset = offset;
        }
    }

    /**
     * Render session history
     */
    renderSessionHistory() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        const historyList = document.getElementById('session-history-list');
        
        if (historyList) {
            if (pomodoroState.completedToday.length === 0) {
                historyList.innerHTML = '<p class="empty-state">No completed sessions yet. Start your first Pomodoro!</p>';
            } else {
                const sessionsHtml = pomodoroState.completedToday.map((session, index) => {
                    const time = new Date(session.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    return `
                        <div class="session-item">
                            <span class="session-number">#${index + 1}</span>
                            <span class="session-time">${time}</span>
                            <span class="session-duration">${session.duration} min</span>
                        </div>
                    `;
                }).join('');
                
                historyList.innerHTML = sessionsHtml;
            }
        }
    }

    /**
     * Cleanup when view is destroyed
     */
    destroy() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.saveState();
    }
}

export default PomodoroView;
