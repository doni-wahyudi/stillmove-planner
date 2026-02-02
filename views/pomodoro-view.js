// Pomodoro Timer View - Enhanced with customizable durations, break suggestions, and mini timer
import { APP_CONFIG } from '../js/config.js';
import dataService from '../js/data-service.js';
import kanbanService from '../js/kanban-service.js';
import { formatDate } from '../js/utils.js';

// Break suggestions for different break types
const BREAK_SUGGESTIONS = {
    shortBreak: [
        "👀 Look away from the screen - focus on something 20 feet away for 20 seconds",
        "🧘 Take 5 deep breaths - inhale for 4 counts, hold for 4, exhale for 4",
        "💧 Drink a glass of water - stay hydrated!",
        "🚶 Stand up and stretch your legs",
        "🙆 Roll your shoulders and stretch your neck",
        "✋ Stretch your wrists and fingers",
        "🪟 Open a window for fresh air",
        "😊 Smile and relax your facial muscles"
    ],
    longBreak: [
        "🚶‍♂️ Take a short walk - get your blood flowing",
        "🍎 Have a healthy snack - fuel your brain",
        "☕ Make yourself a cup of tea or coffee",
        "🧘‍♀️ Do a quick 5-minute meditation",
        "📱 Check your messages and take a mental break",
        "🌿 Step outside for some fresh air and sunlight",
        "🎵 Listen to your favorite song",
        "💬 Have a quick chat with someone"
    ]
};

class PomodoroView {
    constructor(stateManager) {
        this.stateManager = stateManager;
        this.timerInterval = null;
        this.audio = null;
        this.currentSessionId = null;
        this.goals = [];
        this.timeBlocks = [];
        this.customSettings = this.loadCustomSettings();
        this.timerStartTime = null; // Track when timer started
        this.timerStartRemaining = null; // Track remaining time when started
        this.visibilityHandler = null; // Store visibility handler for cleanup
        this.pipWindow = null; // Picture-in-Picture window reference
        this.initAudio();
    }

    initAudio() {
        this.audio = {
            play: () => {
                try {
                    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                    const audioContext = new AudioContextClass();
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
                } catch (e) {
                    console.warn('Audio not available:', e);
                }
            }
        };
    }

    // Get duration based on custom settings or defaults
    getFocusDuration() {
        return (this.customSettings.focusDuration || 25) * 60;
    }
    getShortBreakDuration() {
        return (this.customSettings.shortBreakDuration || 5) * 60;
    }
    getLongBreakDuration() {
        return (this.customSettings.longBreakDuration || 15) * 60;
    }
    getSessionsBeforeLongBreak() {
        return this.customSettings.sessionsBeforeLongBreak || 4;
    }

    loadCustomSettings() {
        try {
            const saved = localStorage.getItem('pomodoroSettings');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    }

    saveCustomSettings() {
        localStorage.setItem('pomodoroSettings', JSON.stringify(this.customSettings));
    }

    async init(container) {
        try {
            const response = await fetch('views/pomodoro-view.html');
            const html = await response.text();
            container.innerHTML = html;
            this.loadState();
            this.setupEventListeners();
            this.setupKeyboardShortcuts();
            this.setupMiniTimer();
            this.setupFloatingPlayer();
            this.setupVisibilityHandler();
            await this.loadLinkedItems();
            await this.loadStatistics();
            await this.loadWeeklyProgress();
            await this.loadRecentHistory();
            await this.loadLinkedGoalsProgress();
            this.populateSettingsForm();
            this.render();
            const pomodoroState = this.stateManager.getState('pomodoro');
            if (pomodoroState.isRunning && !pomodoroState.isPaused) {
                this.startTimer();
            }
        } catch (error) {
            console.error('Failed to initialize Pomodoro view:', error);
            container.innerHTML = `<div class="error-view"><h2>Failed to load Pomodoro Timer</h2><p>Please try refreshing the page.</p></div>`;
        }
    }

    setupFloatingPlayer() {
        const floatPlayer = document.getElementById('pomodoro-float');
        if (!floatPlayer) return;

        // Control buttons
        document.getElementById('pomodoro-float-toggle')?.addEventListener('click', () => this.toggleTimer());
        document.getElementById('pomodoro-float-reset')?.addEventListener('click', () => this.resetTimer());
        document.getElementById('pomodoro-float-skip')?.addEventListener('click', () => this.skipPhase());
        
        // Minimize/expand
        document.getElementById('pomodoro-float-minimize')?.addEventListener('click', () => this.minimizeFloatingPlayer());
        document.getElementById('pomodoro-float-expand')?.addEventListener('click', () => this.expandFloatingPlayer());
        
        // Close button
        document.getElementById('pomodoro-float-close')?.addEventListener('click', () => this.hideFloatingPlayer());
        
        // Make draggable
        this.setupDraggable(floatPlayer);
        
        // Load saved position
        this.loadFloatingPlayerPosition();
    }

    setupDraggable(element) {
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        const header = element.querySelector('.pomodoro-float-header');
        if (!header) return;
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.pomodoro-float-btn')) return;
            isDragging = true;
            element.classList.add('dragging');
            startX = e.clientX;
            startY = e.clientY;
            const rect = element.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const newX = Math.max(0, Math.min(window.innerWidth - element.offsetWidth, initialX + dx));
            const newY = Math.max(0, Math.min(window.innerHeight - element.offsetHeight, initialY + dy));
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.classList.remove('dragging');
                this.saveFloatingPlayerPosition();
            }
        });
        
        // Touch support
        header.addEventListener('touchstart', (e) => {
            if (e.target.closest('.pomodoro-float-btn')) return;
            isDragging = true;
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            const rect = element.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touch = e.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            const newX = Math.max(0, Math.min(window.innerWidth - element.offsetWidth, initialX + dx));
            const newY = Math.max(0, Math.min(window.innerHeight - element.offsetHeight, initialY + dy));
            element.style.left = `${newX}px`;
            element.style.top = `${newY}px`;
            element.style.right = 'auto';
            element.style.bottom = 'auto';
        });
        
        document.addEventListener('touchend', () => {
            if (isDragging) {
                isDragging = false;
                this.saveFloatingPlayerPosition();
            }
        });
    }

    saveFloatingPlayerPosition() {
        const floatPlayer = document.getElementById('pomodoro-float');
        if (!floatPlayer) return;
        const rect = floatPlayer.getBoundingClientRect();
        localStorage.setItem('pomodoroFloatPosition', JSON.stringify({
            left: rect.left,
            top: rect.top
        }));
    }

    loadFloatingPlayerPosition() {
        const floatPlayer = document.getElementById('pomodoro-float');
        if (!floatPlayer) return;
        try {
            const saved = localStorage.getItem('pomodoroFloatPosition');
            if (saved) {
                const pos = JSON.parse(saved);
                floatPlayer.style.left = `${pos.left}px`;
                floatPlayer.style.top = `${pos.top}px`;
                floatPlayer.style.right = 'auto';
                floatPlayer.style.bottom = 'auto';
            }
        } catch (e) {
            // Use default position
        }
    }

    showFloatingPlayer() {
        const floatPlayer = document.getElementById('pomodoro-float');
        if (floatPlayer) {
            floatPlayer.style.display = 'block';
            this.updateFloatingPlayer();
        }
    }

    hideFloatingPlayer() {
        const floatPlayer = document.getElementById('pomodoro-float');
        if (floatPlayer) {
            floatPlayer.style.display = 'none';
        }
    }

    minimizeFloatingPlayer() {
        const floatPlayer = document.getElementById('pomodoro-float');
        const body = floatPlayer?.querySelector('.pomodoro-float-body');
        const minimized = floatPlayer?.querySelector('.pomodoro-float-minimized');
        if (floatPlayer && body && minimized) {
            floatPlayer.classList.add('minimized');
            body.style.display = 'none';
            minimized.style.display = 'flex';
        }
    }

    expandFloatingPlayer() {
        const floatPlayer = document.getElementById('pomodoro-float');
        const body = floatPlayer?.querySelector('.pomodoro-float-body');
        const minimized = floatPlayer?.querySelector('.pomodoro-float-minimized');
        if (floatPlayer && body && minimized) {
            floatPlayer.classList.remove('minimized');
            body.style.display = 'block';
            minimized.style.display = 'none';
        }
    }

    updateFloatingPlayer() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        
        const floatMode = document.getElementById('pomodoro-float-mode');
        const floatTime = document.getElementById('pomodoro-float-time');
        const floatSession = document.getElementById('pomodoro-float-session');
        const floatToggle = document.getElementById('pomodoro-float-toggle');
        const floatMiniTime = document.getElementById('pomodoro-float-mini-time');
        
        if (floatMode) {
            floatMode.textContent = this.getModeText(pomodoroState.mode);
            floatMode.className = `pomodoro-float-mode ${pomodoroState.mode}`;
        }
        if (floatTime) {
            floatTime.textContent = this.formatTime(pomodoroState.timeRemaining);
        }
        if (floatSession) {
            floatSession.textContent = `Session ${pomodoroState.sessionCount}/${this.getSessionsBeforeLongBreak()}`;
        }
        if (floatToggle) {
            if (!pomodoroState.isRunning) {
                floatToggle.textContent = '▶';
                floatToggle.classList.remove('running');
            } else if (pomodoroState.isPaused) {
                floatToggle.textContent = '▶';
                floatToggle.classList.remove('running');
            } else {
                floatToggle.textContent = '⏸';
                floatToggle.classList.add('running');
            }
        }
        if (floatMiniTime) {
            floatMiniTime.textContent = this.formatTime(pomodoroState.timeRemaining);
        }
        
        // Update PiP window if open
        this.updatePictureInPicture();
    }

    // Picture-in-Picture functionality
    async openPictureInPicture() {
        // Check if Document PiP is supported
        if (!('documentPictureInPicture' in window)) {
            if (window.Toast) {
                window.Toast.error('Picture-in-Picture is not supported in this browser');
            }
            return;
        }

        try {
            // Open PiP window
            const pipWindow = await window.documentPictureInPicture.requestWindow({
                width: 320,
                height: 240
            });
            
            this.pipWindow = pipWindow;
            
            // Create the PiP content
            const pipDocument = pipWindow.document;
            
            // Add styles
            const style = pipDocument.createElement('style');
            style.textContent = `
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                body {
                    font-family: 'Quicksand', 'Segoe UI', sans-serif;
                    background: linear-gradient(135deg, #faf7f2 0%, #f5ede1 100%);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    padding: 1rem;
                    user-select: none;
                }
                .pip-container {
                    text-align: center;
                    width: 100%;
                }
                .pip-mode {
                    font-size: 0.9rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    color: #a67c52;
                    margin-bottom: 0.5rem;
                }
                .pip-mode.shortBreak { color: #10B981; }
                .pip-mode.longBreak { color: #3B82F6; }
                .pip-time {
                    font-size: 4rem;
                    font-weight: 700;
                    color: #1f2937;
                    line-height: 1;
                    margin-bottom: 0.5rem;
                }
                .pip-session {
                    font-size: 0.85rem;
                    color: #6b7280;
                    margin-bottom: 1rem;
                }
                .pip-controls {
                    display: flex;
                    justify-content: center;
                    gap: 0.75rem;
                }
                .pip-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    border: none;
                    cursor: pointer;
                    font-size: 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .pip-btn:hover {
                    transform: scale(1.1);
                }
                .pip-btn.primary {
                    background: linear-gradient(135deg, #a67c52 0%, #d4a574 100%);
                    color: white;
                }
                .pip-btn.primary:hover {
                    box-shadow: 0 4px 12px rgba(166, 124, 82, 0.4);
                }
                .pip-btn.secondary {
                    background: white;
                    color: #374151;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                .pip-task {
                    font-size: 0.75rem;
                    color: #9ca3af;
                    margin-top: 0.75rem;
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
            `;
            pipDocument.head.appendChild(style);
            
            // Create content
            const pomodoroState = this.stateManager.getState('pomodoro');
            pipDocument.body.innerHTML = `
                <div class="pip-container">
                    <div class="pip-mode ${pomodoroState.mode}" id="pip-mode">${this.getModeText(pomodoroState.mode)}</div>
                    <div class="pip-time" id="pip-time">${this.formatTime(pomodoroState.timeRemaining)}</div>
                    <div class="pip-session" id="pip-session">Session ${pomodoroState.sessionCount}/${this.getSessionsBeforeLongBreak()}</div>
                    <div class="pip-controls">
                        <button class="pip-btn primary" id="pip-toggle" title="Play/Pause">▶</button>
                        <button class="pip-btn secondary" id="pip-reset" title="Reset">↺</button>
                        <button class="pip-btn secondary" id="pip-skip" title="Skip">⏭</button>
                    </div>
                    ${pomodoroState.currentTask ? `<div class="pip-task">📝 ${pomodoroState.currentTask}</div>` : ''}
                </div>
            `;
            
            // Add event listeners
            pipDocument.getElementById('pip-toggle')?.addEventListener('click', () => this.toggleTimer());
            pipDocument.getElementById('pip-reset')?.addEventListener('click', () => this.resetTimer());
            pipDocument.getElementById('pip-skip')?.addEventListener('click', () => this.skipPhase());
            
            // Update initial state
            this.updatePictureInPicture();
            
            // Handle PiP window close
            pipWindow.addEventListener('pagehide', () => {
                this.pipWindow = null;
            });
            
            if (window.Toast) {
                window.Toast.success('Picture-in-Picture opened!');
            }
        } catch (error) {
            console.error('Failed to open Picture-in-Picture:', error);
            if (window.Toast) {
                window.Toast.error('Failed to open Picture-in-Picture');
            }
        }
    }

    updatePictureInPicture() {
        if (!this.pipWindow) return;
        
        const pomodoroState = this.stateManager.getState('pomodoro');
        const pipDocument = this.pipWindow.document;
        
        const pipMode = pipDocument.getElementById('pip-mode');
        const pipTime = pipDocument.getElementById('pip-time');
        const pipSession = pipDocument.getElementById('pip-session');
        const pipToggle = pipDocument.getElementById('pip-toggle');
        
        if (pipMode) {
            pipMode.textContent = this.getModeText(pomodoroState.mode);
            pipMode.className = `pip-mode ${pomodoroState.mode}`;
        }
        if (pipTime) {
            pipTime.textContent = this.formatTime(pomodoroState.timeRemaining);
        }
        if (pipSession) {
            pipSession.textContent = `Session ${pomodoroState.sessionCount}/${this.getSessionsBeforeLongBreak()}`;
        }
        if (pipToggle) {
            if (!pomodoroState.isRunning || pomodoroState.isPaused) {
                pipToggle.textContent = '▶';
            } else {
                pipToggle.textContent = '⏸';
            }
        }
    }

    closePictureInPicture() {
        if (this.pipWindow) {
            this.pipWindow.close();
            this.pipWindow = null;
        }
    }

    setupVisibilityHandler() {
        // Handle tab visibility changes to sync timer
        this.visibilityHandler = () => {
            if (document.visibilityState === 'visible') {
                this.syncTimerOnVisibility();
            }
        };
        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    syncTimerOnVisibility() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        
        // Only sync if timer is running and not paused
        if (!pomodoroState.isRunning || pomodoroState.isPaused || !this.timerStartTime) {
            return;
        }
        
        // Calculate how much time has actually elapsed
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - this.timerStartTime) / 1000);
        const newTimeRemaining = Math.max(0, this.timerStartRemaining - elapsedSeconds);
        
        // Update state with corrected time
        this.stateManager.setState('pomodoro', {
            ...pomodoroState,
            timeRemaining: newTimeRemaining
        });
        
        // Check if timer should have completed while tab was hidden
        if (newTimeRemaining <= 0) {
            this.onTimerComplete();
        } else {
            this.render();
            this.saveState();
        }
    }

    setupMiniTimer() {
        const miniTimerToggle = document.getElementById('mini-timer-toggle');
        miniTimerToggle?.addEventListener('click', () => this.toggleTimer());
        
        const miniTimer = document.getElementById('mini-timer');
        miniTimer?.addEventListener('click', (e) => {
            if (e.target.id !== 'mini-timer-toggle') {
                window.location.hash = '#pomodoro';
            }
        });
    }

    updateMiniTimer() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        const miniTimer = document.getElementById('mini-timer');
        const miniTimerTime = document.getElementById('mini-timer-time');
        const miniTimerMode = document.getElementById('mini-timer-mode');
        const miniTimerToggle = document.getElementById('mini-timer-toggle');
        
        if (!miniTimer) return;
        
        if (pomodoroState.isRunning) {
            miniTimer.style.display = 'flex';
            miniTimerTime.textContent = this.formatTime(pomodoroState.timeRemaining);
            miniTimerMode.textContent = this.getModeText(pomodoroState.mode);
            miniTimerMode.className = `mini-timer-mode ${pomodoroState.mode}`;
            miniTimerToggle.textContent = pomodoroState.isPaused ? '▶' : '⏸';
            miniTimerToggle.setAttribute('aria-label', pomodoroState.isPaused ? 'Resume timer' : 'Pause timer');
        } else {
            miniTimer.style.display = 'none';
        }
    }

    populateSettingsForm() {
        const focusInput = document.getElementById('focus-duration');
        const shortBreakInput = document.getElementById('short-break-duration');
        const longBreakInput = document.getElementById('long-break-duration');
        const sessionsInput = document.getElementById('sessions-before-long');
        
        if (focusInput) focusInput.value = this.customSettings.focusDuration || 25;
        if (shortBreakInput) shortBreakInput.value = this.customSettings.shortBreakDuration || 5;
        if (longBreakInput) longBreakInput.value = this.customSettings.longBreakDuration || 15;
        if (sessionsInput) sessionsInput.value = this.customSettings.sessionsBeforeLongBreak || 4;
    }

    async loadLinkedItems() {
        try {
            const currentYear = new Date().getFullYear();
            const today = formatDate(new Date());
            this.goals = await dataService.getAnnualGoals(currentYear) || [];
            this.timeBlocks = await dataService.getTimeBlocks(today) || [];
        } catch (error) {
            console.warn('Failed to load linked items:', error);
            this.goals = [];
            this.timeBlocks = [];
        }
    }

    async loadStatistics() {
        try {
            const today = new Date();
            const todayStr = formatDate(today);
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const weekStartStr = formatDate(startOfWeek);
            
            const todaySessions = await dataService.getPomodoroSessions(todayStr);
            const completedToday = todaySessions?.filter(s => s.session_type === 'focus' && s.was_completed) || [];
            
            const weekSessions = await dataService.getPomodoroSessionsRange(weekStartStr, todayStr);
            const completedThisWeek = weekSessions?.filter(s => s.session_type === 'focus' && s.was_completed) || [];
            
            const totalMinutes = completedThisWeek.reduce((sum, s) => sum + (s.duration_minutes || 25), 0);
            const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
            const streak = await this.calculateStreak();
            
            const statToday = document.getElementById('stat-today');
            const statWeek = document.getElementById('stat-week');
            const statHours = document.getElementById('stat-total-hours');
            const statStreak = document.getElementById('stat-streak');
            
            if (statToday) statToday.textContent = completedToday.length;
            if (statWeek) statWeek.textContent = completedThisWeek.length;
            if (statHours) statHours.textContent = `${totalHours}h`;
            if (statStreak) statStreak.textContent = streak;
            
            const pomodoroState = this.stateManager.getState('pomodoro');
            this.stateManager.setState('pomodoro', {
                ...pomodoroState,
                completedToday: completedToday.map(s => ({
                    id: s.id,
                    timestamp: s.completed_at || s.started_at,
                    duration: s.duration_minutes,
                    task: s.task_description
                }))
            });
        } catch (error) {
            console.warn('Failed to load statistics:', error);
        }
    }

    async calculateStreak() {
        try {
            let streak = 0;
            let checkDate = new Date();
            for (let i = 0; i < 365; i++) {
                const dateStr = formatDate(checkDate);
                const sessions = await dataService.getPomodoroSessions(dateStr);
                const completed = sessions?.filter(s => s.session_type === 'focus' && s.was_completed) || [];
                if (completed.length > 0) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else if (i === 0) {
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
            return streak;
        } catch (error) {
            return 0;
        }
    }

    async loadWeeklyProgress() {
        try {
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            
            // Get sessions for each day of the week
            const weekData = [];
            for (let i = 0; i < 7; i++) {
                const date = new Date(startOfWeek);
                date.setDate(startOfWeek.getDate() + i);
                const dateStr = formatDate(date);
                const sessions = await dataService.getPomodoroSessions(dateStr);
                const completed = sessions?.filter(s => s.session_type === 'focus' && s.was_completed) || [];
                weekData.push({
                    day: i,
                    date: dateStr,
                    count: completed.length,
                    isToday: dateStr === formatDate(today)
                });
            }
            
            this.renderWeeklyChart(weekData);
        } catch (error) {
            console.warn('Failed to load weekly progress:', error);
        }
    }

    renderWeeklyChart(weekData) {
        const maxCount = Math.max(...weekData.map(d => d.count), 1);
        
        weekData.forEach(data => {
            const wrapper = document.querySelector(`.chart-bar-wrapper[data-day="${data.day}"]`);
            if (!wrapper) return;
            
            const bar = wrapper.querySelector('.chart-bar');
            const value = wrapper.querySelector('.chart-value');
            
            if (bar) {
                const height = (data.count / maxCount) * 100;
                bar.style.height = `${Math.max(height, 5)}%`;
                bar.classList.toggle('has-sessions', data.count > 0);
                bar.classList.toggle('is-today', data.isToday);
            }
            if (value) {
                value.textContent = data.count;
            }
            wrapper.classList.toggle('is-today', data.isToday);
        });
    }

    async loadRecentHistory() {
        try {
            const today = new Date();
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(today.getDate() - 6);
            
            const sessions = await dataService.getPomodoroSessionsRange(
                formatDate(sevenDaysAgo),
                formatDate(today)
            );
            
            const completedSessions = sessions?.filter(s => s.session_type === 'focus' && s.was_completed) || [];
            this.renderRecentHistory(completedSessions);
        } catch (error) {
            console.warn('Failed to load recent history:', error);
        }
    }

    renderRecentHistory(sessions) {
        const container = document.getElementById('recent-history-list');
        if (!container) return;
        
        if (!sessions || sessions.length === 0) {
            container.innerHTML = '<p class="empty-state">No sessions in the last 7 days</p>';
            return;
        }
        
        // Group sessions by date
        const grouped = {};
        sessions.forEach(session => {
            const date = session.date || formatDate(new Date(session.started_at));
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(session);
        });
        
        // Sort dates descending
        const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
        
        let html = '';
        sortedDates.slice(0, 5).forEach(date => {
            const daySessions = grouped[date];
            const dateObj = new Date(date + 'T00:00:00');
            const isToday = formatDate(new Date()) === date;
            const dayLabel = isToday ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            const totalMinutes = daySessions.reduce((sum, s) => sum + (s.duration_minutes || 25), 0);
            
            html += `
                <div class="recent-day-group">
                    <div class="recent-day-header">
                        <span class="recent-day-label">${dayLabel}</span>
                        <span class="recent-day-stats">${daySessions.length} sessions · ${totalMinutes} min</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    async loadLinkedGoalsProgress() {
        try {
            const currentYear = new Date().getFullYear();
            const goals = await dataService.getAnnualGoals(currentYear) || [];
            
            // Get sessions linked to goals
            const today = new Date();
            const startOfYear = new Date(currentYear, 0, 1);
            const sessions = await dataService.getPomodoroSessionsRange(
                formatDate(startOfYear),
                formatDate(today)
            );
            
            // Count sessions per goal
            const goalSessions = {};
            sessions?.forEach(s => {
                if (s.linked_goal_id && s.was_completed) {
                    goalSessions[s.linked_goal_id] = (goalSessions[s.linked_goal_id] || 0) + 1;
                }
            });
            
            // Filter goals that have sessions
            const goalsWithSessions = goals.filter(g => goalSessions[g.id] > 0);
            this.renderLinkedGoals(goalsWithSessions, goalSessions);
        } catch (error) {
            console.warn('Failed to load linked goals:', error);
        }
    }

    renderLinkedGoals(goals, sessionCounts) {
        const container = document.getElementById('linked-goals-list');
        if (!container) return;
        
        if (!goals || goals.length === 0) {
            container.innerHTML = '<p class="empty-state">Link sessions to goals to track progress</p>';
            return;
        }
        
        const html = goals.slice(0, 5).map(goal => {
            const count = sessionCounts[goal.id] || 0;
            const totalMinutes = count * 25; // Assume 25 min per session
            const hours = Math.floor(totalMinutes / 60);
            const mins = totalMinutes % 60;
            const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            
            return `
                <div class="linked-goal-item">
                    <span class="goal-title">${goal.title}</span>
                    <span class="goal-sessions">${count} sessions · ${timeStr}</span>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }

    loadState() {
        const saved = localStorage.getItem('pomodoroState');
        if (saved) {
            try {
                const savedState = JSON.parse(saved);
                const pomodoroState = this.stateManager.getState('pomodoro');
                const today = new Date().toDateString();
                if (savedState.date === today) {
                    this.stateManager.setState('pomodoro', {
                        ...pomodoroState,
                        sessionCount: savedState.sessionCount || 0,
                        completedToday: savedState.completedToday || [],
                        mode: savedState.mode || 'focus',
                        timeRemaining: savedState.timeRemaining || this.getFocusDuration(),
                        currentTask: savedState.currentTask || '',
                        linkedCardId: savedState.linkedCardId || null
                    });
                } else {
                    this.resetDay();
                }
            } catch (error) {
                console.error('Failed to load pomodoro state:', error);
            }
        }
    }

    saveState() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        localStorage.setItem('pomodoroState', JSON.stringify({
            sessionCount: pomodoroState.sessionCount,
            completedToday: pomodoroState.completedToday,
            mode: pomodoroState.mode,
            timeRemaining: pomodoroState.timeRemaining,
            currentTask: pomodoroState.currentTask,
            linkedCardId: pomodoroState.linkedCardId || null,
            date: new Date().toDateString()
        }));
    }

    resetDay() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        this.stateManager.setState('pomodoro', {
            ...pomodoroState,
            sessionCount: 0,
            completedToday: [],
            mode: 'focus',
            timeRemaining: this.getFocusDuration(),
            isRunning: false,
            isPaused: false,
            currentTask: '',
            linkedCardId: null
        });
        this.saveState();
    }


    setupEventListeners() {
        document.getElementById('start-pause-btn')?.addEventListener('click', () => this.toggleTimer());
        document.getElementById('reset-btn')?.addEventListener('click', () => this.resetTimer());
        document.getElementById('skip-btn')?.addEventListener('click', () => this.skipPhase());
        document.getElementById('pip-btn')?.addEventListener('click', () => this.openPictureInPicture());
        
        // Settings toggle
        document.getElementById('settings-btn')?.addEventListener('click', () => this.toggleSettings());
        document.getElementById('save-settings-btn')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('reset-settings-btn')?.addEventListener('click', () => this.resetSettings());
        
        // Task selection
        const taskSource = document.getElementById('task-source');
        const customTask = document.getElementById('current-task');
        const linkedItem = document.getElementById('linked-item');
        
        taskSource?.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                customTask.style.display = 'block';
                linkedItem.style.display = 'none';
            } else {
                customTask.style.display = 'none';
                linkedItem.style.display = 'block';
                this.populateLinkedItems(e.target.value);
            }
        });
        
        customTask?.addEventListener('change', (e) => {
            const pomodoroState = this.stateManager.getState('pomodoro');
            this.stateManager.setState('pomodoro', {
                ...pomodoroState,
                currentTask: e.target.value,
                linkedGoalId: null,
                linkedTimeBlockId: null
            });
            this.saveState();
        });
        
        linkedItem?.addEventListener('change', (e) => {
            const [type, id] = e.target.value.split(':');
            const pomodoroState = this.stateManager.getState('pomodoro');
            const selectedOption = linkedItem.options[linkedItem.selectedIndex];
            this.stateManager.setState('pomodoro', {
                ...pomodoroState,
                currentTask: selectedOption.text,
                linkedGoalId: type === 'goal' ? id : null,
                linkedTimeBlockId: type === 'timeblock' ? id : null
            });
            this.saveState();
        });
    }

    toggleSettings() {
        const settingsPanel = document.getElementById('pomodoro-settings');
        if (settingsPanel) {
            const isVisible = settingsPanel.style.display !== 'none';
            settingsPanel.style.display = isVisible ? 'none' : 'block';
        }
    }

    saveSettings() {
        const focusDuration = parseInt(document.getElementById('focus-duration')?.value) || 25;
        const shortBreakDuration = parseInt(document.getElementById('short-break-duration')?.value) || 5;
        const longBreakDuration = parseInt(document.getElementById('long-break-duration')?.value) || 15;
        const sessionsBeforeLongBreak = parseInt(document.getElementById('sessions-before-long')?.value) || 4;
        
        this.customSettings = {
            focusDuration: Math.min(60, Math.max(1, focusDuration)),
            shortBreakDuration: Math.min(30, Math.max(1, shortBreakDuration)),
            longBreakDuration: Math.min(60, Math.max(1, longBreakDuration)),
            sessionsBeforeLongBreak: Math.min(10, Math.max(2, sessionsBeforeLongBreak))
        };
        
        this.saveCustomSettings();
        this.toggleSettings();
        
        // Reset timer with new duration if not running
        const pomodoroState = this.stateManager.getState('pomodoro');
        if (!pomodoroState.isRunning) {
            this.stateManager.setState('pomodoro', {
                ...pomodoroState,
                timeRemaining: this.getFocusDuration()
            });
            this.render();
        }
        
        if (window.Toast) window.Toast.success('Settings saved!');
    }

    resetSettings() {
        this.customSettings = {};
        this.saveCustomSettings();
        this.populateSettingsForm();
        
        const pomodoroState = this.stateManager.getState('pomodoro');
        if (!pomodoroState.isRunning) {
            this.stateManager.setState('pomodoro', {
                ...pomodoroState,
                timeRemaining: this.getFocusDuration()
            });
            this.render();
        }
        
        if (window.Toast) window.Toast.info('Settings reset to defaults');
    }

    populateLinkedItems(type) {
        const linkedItem = document.getElementById('linked-item');
        if (!linkedItem) return;
        linkedItem.innerHTML = '<option value="">Select...</option>';
        if (type === 'goal') {
            this.goals.forEach(goal => {
                const option = document.createElement('option');
                option.value = `goal:${goal.id}`;
                option.textContent = goal.title;
                linkedItem.appendChild(option);
            });
        } else if (type === 'timeblock') {
            this.timeBlocks.forEach(block => {
                const option = document.createElement('option');
                option.value = `timeblock:${block.id}`;
                option.textContent = `${block.start_time?.slice(0, 5)} - ${block.activity}`;
                linkedItem.appendChild(option);
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            switch (e.key.toLowerCase()) {
                case ' ':
                    e.preventDefault();
                    this.toggleTimer();
                    break;
                case 'r':
                    if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); this.resetTimer(); }
                    break;
                case 's':
                    if (!e.ctrlKey && !e.metaKey) { e.preventDefault(); this.skipPhase(); }
                    break;
            }
        });
    }

    showBreakSuggestion(mode) {
        const suggestionsEl = document.getElementById('break-suggestions');
        const textEl = document.getElementById('break-suggestion-text');
        
        if (!suggestionsEl || !textEl) return;
        
        if (mode === 'shortBreak' || mode === 'longBreak') {
            const suggestions = BREAK_SUGGESTIONS[mode];
            const randomSuggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
            textEl.textContent = randomSuggestion;
            suggestionsEl.style.display = 'block';
            suggestionsEl.className = `break-suggestions ${mode}`;
        } else {
            suggestionsEl.style.display = 'none';
        }
    }

    /**
     * Start a Pomodoro session for a Kanban card
     * Requirement 5.1: Click Pomodoro button on card starts session with card title as task description
     * @param {Object} options - Session options
     * @param {string} options.taskDescription - Task description (card title)
     * @param {string} options.linkedCardId - ID of the linked Kanban card
     */
    startSessionForCard(options) {
        const { taskDescription, linkedCardId } = options;
        const pomodoroState = this.stateManager.getState('pomodoro');
        
        // Reset timer if currently running
        if (pomodoroState.isRunning) {
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            // Delete incomplete session if exists
            if (this.currentSessionId) {
                dataService.deletePomodoroSession(this.currentSessionId).catch(console.warn);
                this.currentSessionId = null;
            }
        }
        
        // Set up new session with card info
        this.stateManager.setState('pomodoro', {
            ...pomodoroState,
            mode: 'focus',
            timeRemaining: this.getFocusDuration(),
            currentTask: taskDescription || '',
            linkedCardId: linkedCardId || null,
            linkedGoalId: null,
            linkedTimeBlockId: null,
            isRunning: false,
            isPaused: false
        });
        
        // Start the timer
        this.startTimer();
        this.saveState();
        
        // Show floating player if not on pomodoro view
        if (!window.location.hash.includes('pomodoro')) {
            this.showFloatingPlayer();
        }
    }

    toggleTimer() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        if (!pomodoroState.isRunning) {
            this.startTimer();
        } else if (pomodoroState.isPaused) {
            this.resumeTimer();
        } else {
            this.pauseTimer();
        }
    }

    async startTimer() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        if (pomodoroState.mode === 'focus' && !this.currentSessionId) {
            try {
                const session = await dataService.createPomodoroSession({
                    date: formatDate(new Date()),
                    started_at: new Date().toISOString(),
                    duration_minutes: this.getFocusDuration() / 60,
                    session_type: 'focus',
                    was_completed: false,
                    task_description: pomodoroState.currentTask || null,
                    linked_goal_id: pomodoroState.linkedGoalId || null,
                    linked_time_block_id: pomodoroState.linkedTimeBlockId || null
                });
                this.currentSessionId = session?.id;
            } catch (error) {
                console.warn('Failed to create session in database:', error);
            }
        }
        
        // Track start time for background tab handling
        this.timerStartTime = Date.now();
        this.timerStartRemaining = pomodoroState.timeRemaining;
        
        this.stateManager.setState('pomodoro', { ...pomodoroState, isRunning: true, isPaused: false });
        this.timerInterval = setInterval(() => this.tick(), 1000);
        this.showBreakSuggestion(pomodoroState.mode);
        this.render();
        this.saveState();
    }

    pauseTimer() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        this.stateManager.setState('pomodoro', { ...pomodoroState, isPaused: true });
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
        this.timerStartTime = null;
        this.timerStartRemaining = null;
        this.render();
        this.saveState();
    }

    resumeTimer() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        
        // Track start time for background tab handling
        this.timerStartTime = Date.now();
        this.timerStartRemaining = pomodoroState.timeRemaining;
        
        this.stateManager.setState('pomodoro', { ...pomodoroState, isPaused: false });
        this.timerInterval = setInterval(() => this.tick(), 1000);
        this.render();
        this.saveState();
    }

    resetTimer() {
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
        this.timerStartTime = null;
        this.timerStartRemaining = null;
        if (this.currentSessionId) {
            dataService.deletePomodoroSession(this.currentSessionId).catch(console.warn);
            this.currentSessionId = null;
        }
        const pomodoroState = this.stateManager.getState('pomodoro');
        this.stateManager.setState('pomodoro', {
            ...pomodoroState,
            isRunning: false,
            isPaused: false,
            mode: 'focus',
            timeRemaining: this.getFocusDuration()
        });
        this.showBreakSuggestion('focus');
        this.render();
        this.saveState();
    }

    skipPhase() {
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
        const pomodoroState = this.stateManager.getState('pomodoro');
        if (pomodoroState.mode === 'focus' && this.currentSessionId) {
            dataService.deletePomodoroSession(this.currentSessionId).catch(console.warn);
            this.currentSessionId = null;
        }
        if (pomodoroState.mode === 'focus') {
            const nextMode = pomodoroState.sessionCount % this.getSessionsBeforeLongBreak() === 
                (this.getSessionsBeforeLongBreak() - 1) ? 'longBreak' : 'shortBreak';
            const nextDuration = nextMode === 'longBreak' ? this.getLongBreakDuration() : this.getShortBreakDuration();
            this.stateManager.setState('pomodoro', {
                ...pomodoroState, mode: nextMode, timeRemaining: nextDuration, isRunning: false, isPaused: false
            });
            this.showBreakSuggestion(nextMode);
        } else {
            this.stateManager.setState('pomodoro', {
                ...pomodoroState, mode: 'focus', timeRemaining: this.getFocusDuration(), isRunning: false, isPaused: false
            });
            this.showBreakSuggestion('focus');
        }
        this.render();
        this.saveState();
        if (window.Toast) window.Toast.info('Skipped to next phase');
    }

    tick() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        
        // Calculate actual elapsed time (handles background tab throttling)
        let newTimeRemaining;
        if (this.timerStartTime && this.timerStartRemaining !== null) {
            const elapsedSeconds = Math.floor((Date.now() - this.timerStartTime) / 1000);
            newTimeRemaining = Math.max(0, this.timerStartRemaining - elapsedSeconds);
        } else {
            // Fallback to simple decrement
            newTimeRemaining = Math.max(0, pomodoroState.timeRemaining - 1);
        }
        
        if (newTimeRemaining > 0) {
            this.stateManager.setState('pomodoro', { ...pomodoroState, timeRemaining: newTimeRemaining });
            this.render();
            this.saveState();
        } else {
            this.onTimerComplete();
        }
    }


    async onTimerComplete() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
        this.audio.play();
        this.showNotification(`${pomodoroState.mode === 'focus' ? 'Focus session' : 'Break'} complete!`);

        if (pomodoroState.mode === 'focus') {
            const newSessionCount = pomodoroState.sessionCount + 1;
            if (this.currentSessionId) {
                try {
                    await dataService.updatePomodoroSession(this.currentSessionId, {
                        completed_at: new Date().toISOString(),
                        was_completed: true
                    });
                } catch (error) { console.warn('Failed to update session:', error); }
                this.currentSessionId = null;
            }
            
            // Requirement 5.3: Increment pomodoro_count on linked card when session completes
            if (pomodoroState.linkedCardId) {
                try {
                    await kanbanService.incrementPomodoroCount(pomodoroState.linkedCardId);
                } catch (error) {
                    console.warn('Failed to increment card pomodoro count:', error);
                }
            }
            
            const completedSession = {
                timestamp: new Date().toISOString(),
                duration: this.getFocusDuration() / 60,
                task: pomodoroState.currentTask,
                linkedCardId: pomodoroState.linkedCardId
            };
            const newCompletedToday = [...pomodoroState.completedToday, completedSession];
            let nextMode, nextDuration;
            if (newSessionCount % this.getSessionsBeforeLongBreak() === 0) {
                nextMode = 'longBreak';
                nextDuration = this.getLongBreakDuration();
            } else {
                nextMode = 'shortBreak';
                nextDuration = this.getShortBreakDuration();
            }
            this.stateManager.setState('pomodoro', {
                ...pomodoroState, mode: nextMode, timeRemaining: nextDuration,
                sessionCount: newSessionCount, completedToday: newCompletedToday, isRunning: true, isPaused: false,
                linkedCardId: null // Clear linked card after session completes
            });
            this.showBreakSuggestion(nextMode);
            await this.loadStatistics();
            this.startTimer();
        } else {
            this.stateManager.setState('pomodoro', {
                ...pomodoroState, mode: 'focus', timeRemaining: this.getFocusDuration(), isRunning: false, isPaused: false
            });
            this.showBreakSuggestion('focus');
        }
        this.render();
        this.saveState();
    }

    showNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Pomodoro Timer', { body: message, icon: './icons/icon-192x192.png' });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification('Pomodoro Timer', { body: message, icon: './icons/icon-192x192.png' });
                }
            });
        }
        if (window.Toast) window.Toast.success(message);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    getModeText(mode) {
        switch (mode) {
            case 'focus': return 'Focus';
            case 'shortBreak': return 'Short Break';
            case 'longBreak': return 'Long Break';
            default: return 'Focus';
        }
    }

    render() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        
        const timerTime = document.getElementById('timer-time');
        if (timerTime) timerTime.textContent = this.formatTime(pomodoroState.timeRemaining);

        const timerMode = document.getElementById('timer-mode');
        if (timerMode) {
            timerMode.textContent = this.getModeText(pomodoroState.mode);
            timerMode.className = `timer-mode ${pomodoroState.mode}`;
        }

        const timerSession = document.getElementById('timer-session');
        if (timerSession) {
            timerSession.textContent = `Session ${pomodoroState.sessionCount}/${this.getSessionsBeforeLongBreak()}`;
        }

        const startPauseText = document.getElementById('start-pause-text');
        if (startPauseText) {
            if (!pomodoroState.isRunning) startPauseText.textContent = 'Start';
            else if (pomodoroState.isPaused) startPauseText.textContent = 'Resume';
            else startPauseText.textContent = 'Pause';
        }

        const currentTask = document.getElementById('current-task');
        if (currentTask && pomodoroState.currentTask) currentTask.value = pomodoroState.currentTask;

        this.updateProgressCircle();
        this.updateMiniTimer();
        this.updateFloatingPlayer();
        this.renderSessionHistory();
    }

    updateProgressCircle() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        const progressBar = document.querySelector('.timer-progress-bar');
        const timerCircle = document.getElementById('timer-circle');
        
        if (progressBar) {
            let totalDuration;
            switch (pomodoroState.mode) {
                case 'focus': totalDuration = this.getFocusDuration(); break;
                case 'shortBreak': totalDuration = this.getShortBreakDuration(); break;
                case 'longBreak': totalDuration = this.getLongBreakDuration(); break;
                default: totalDuration = this.getFocusDuration();
            }
            const progress = (totalDuration - pomodoroState.timeRemaining) / totalDuration;
            const circumference = 2 * Math.PI * 90;
            const offset = circumference * (1 - progress);
            progressBar.style.strokeDasharray = `${circumference} ${circumference}`;
            progressBar.style.strokeDashoffset = offset;
        }
        if (timerCircle) timerCircle.className = `timer-circle ${pomodoroState.mode}`;
    }

    renderSessionHistory() {
        const pomodoroState = this.stateManager.getState('pomodoro');
        const historyList = document.getElementById('session-history-list');
        if (historyList) {
            if (!pomodoroState.completedToday || pomodoroState.completedToday.length === 0) {
                historyList.innerHTML = '<p class="empty-state">No completed sessions yet. Start your first Pomodoro!</p>';
            } else {
                historyList.innerHTML = pomodoroState.completedToday.map((session, index) => {
                    const time = new Date(session.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    const taskText = session.task ? `<span class="session-task">${session.task}</span>` : '';
                    return `<div class="session-item"><span class="session-number">#${index + 1}</span><span class="session-time">${time}</span><span class="session-duration">${session.duration} min</span>${taskText}</div>`;
                }).join('');
            }
        }
    }

    destroy() {
        if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; }
        if (this.visibilityHandler) {
            document.removeEventListener('visibilitychange', this.visibilityHandler);
            this.visibilityHandler = null;
        }
        // Don't close PiP on view destroy - let it persist
        this.saveState();
    }
}

export default PomodoroView;

// Make available globally for cross-view integration (e.g., Kanban Pomodoro button)
if (typeof window !== 'undefined') {
    window.PomodoroView = PomodoroView;
}
