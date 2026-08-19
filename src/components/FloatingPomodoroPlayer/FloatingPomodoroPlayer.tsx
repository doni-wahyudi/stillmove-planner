import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePomodoro, TimerMode } from '@/contexts/PomodoroContext';
import './FloatingPomodoroPlayer.css';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function modeLabel(mode: TimerMode): string {
  if (mode === 'shortBreak') return 'Short Break';
  if (mode === 'longBreak') return 'Long Break';
  return 'Focus';
}

export function FloatingPomodoroPlayer() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    mode,
    timeRemaining,
    isRunning,
    isPaused,
    sessionCount,
    currentTask,
    isFloatingOpen,
    isFloatingMinimized,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    skipPhase,
    setIsFloatingOpen,
    setIsFloatingMinimized,
  } = usePomodoro();

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('pomodoroFloatPosition');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { x: window.innerWidth - 320, y: window.innerHeight - 200 };
  });

  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hide on Pomodoro studio page
  const isOnPomodoroPage = location.pathname === '/pomodoro';

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.touches.length === 0) return;
    isDraggingRef.current = true;
    const touch = e.touches[0];
    dragOffsetRef.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const nextX = Math.max(10, Math.min(window.innerWidth - (isFloatingMinimized ? 160 : 270), e.clientX - dragOffsetRef.current.x));
      const nextY = Math.max(10, Math.min(window.innerHeight - 120, e.clientY - dragOffsetRef.current.y));
      const newPos = { x: nextX, y: nextY };
      setPosition(newPos);
      localStorage.setItem('pomodoroFloatPosition', JSON.stringify(newPos));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length === 0) return;
      const touch = e.touches[0];
      const nextX = Math.max(10, Math.min(window.innerWidth - (isFloatingMinimized ? 160 : 270), touch.clientX - dragOffsetRef.current.x));
      const nextY = Math.max(10, Math.min(window.innerHeight - 120, touch.clientY - dragOffsetRef.current.y));
      const newPos = { x: nextX, y: nextY };
      setPosition(newPos);
      localStorage.setItem('pomodoroFloatPosition', JSON.stringify(newPos));
    };

    const handleEnd = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [isFloatingMinimized]);

  if (isOnPomodoroPage || !isFloatingOpen || (!isRunning && !isPaused && timeRemaining === 25 * 60)) {
    return null;
  }

  return (
    <div
      className={`floating-pomodoro-player ${isFloatingMinimized ? 'minimized' : 'expanded'} mode-${mode}`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {isFloatingMinimized ? (
        /* Minimized Pill View */
        <div className="floating-mini-pill">
          <span className="mini-mode-icon">
            {mode === 'focus' ? '🎯' : mode === 'shortBreak' ? '☕' : '🌴'}
          </span>
          <span className="mini-time-text">{formatTime(timeRemaining)}</span>
          <button
            className="mini-play-btn"
            onClick={() => {
              if (isRunning && !isPaused) pauseTimer();
              else if (isPaused) resumeTimer();
              else startTimer();
            }}
            title={isRunning && !isPaused ? 'Pause' : 'Start'}
          >
            {isRunning && !isPaused ? '⏸' : '▶'}
          </button>
          <button
            className="mini-expand-btn"
            onClick={() => setIsFloatingMinimized(false)}
            title="Expand player"
          >
            ↗
          </button>
        </div>
      ) : (
        /* Expanded Player View */
        <div className="floating-expanded-card">
          <div className="floating-header">
            <div className="floating-header-title">
              <span className={`floating-mode-badge ${mode}`}>{modeLabel(mode)}</span>
              <span className="floating-session-num">#{sessionCount + 1}</span>
            </div>
            <div className="floating-header-actions">
              <button
                className="float-header-btn"
                onClick={() => setIsFloatingMinimized(true)}
                title="Minimize player"
              >
                _
              </button>
              <button
                className="float-header-btn"
                onClick={() => navigate('/pomodoro')}
                title="Open full page"
              >
                ↗
              </button>
              <button
                className="float-header-btn float-close-btn"
                onClick={() => setIsFloatingOpen(false)}
                title="Close floating player"
              >
                ×
              </button>
            </div>
          </div>

          <div className="floating-body">
            <div className="floating-time-display">{formatTime(timeRemaining)}</div>

            {currentTask && (
              <div className="floating-task-preview" title={currentTask}>
                📌 {currentTask}
              </div>
            )}

            <div className="floating-controls">
              <button
                className="floating-primary-btn"
                onClick={() => {
                  if (isRunning && !isPaused) pauseTimer();
                  else if (isPaused) resumeTimer();
                  else startTimer();
                }}
              >
                {isRunning && !isPaused ? '⏸ Pause' : isPaused ? '▶ Resume' : '▶ Start'}
              </button>

              <button className="floating-secondary-btn" onClick={skipPhase} title="Skip to next phase">
                ⏭ Skip
              </button>

              <button className="floating-secondary-btn" onClick={resetTimer} title="Reset timer">
                ↺ Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default FloatingPomodoroPlayer;
