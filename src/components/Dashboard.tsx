import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLiveTranscription } from '../hooks/useLiveTranscription';
import {
  LogOut,
  Mic,
  MicOff,
  Copy,
  Check,
  Trash2,
  FileText,
  Activity,
  User,
  AlertCircle,
  FileCode,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const {
    isRecording,
    segments,
    interimTranscript,
    connectionStatus,
    error,
    duration,
    totalWords,
    startRecording,
    stopRecording,
    clearTranscript,
    setError,
  } = useLiveTranscription();

  const [copiedText, setCopiedText] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of transcription area when new segments or interim transcript updates
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [segments, interimTranscript]);

  const handleLogout = async () => {
    try {
      if (isRecording) {
        stopRecording();
      }
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleCopyText = () => {
    if (segments.length === 0 && !interimTranscript) return;
    const plainText = segments.map((s) => s.text).join(' ') + (interimTranscript ? ' ' + interimTranscript : '');
    navigator.clipboard.writeText(plainText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleCopyScript = () => {
    if (segments.length === 0) return;
    const scriptText = segments
      .map((s) => `[${s.timestamp}] ${s.text}`)
      .join('\n') + (interimTranscript ? `\n[Interim] ${interimTranscript}` : '');
    
    navigator.clipboard.writeText(scriptText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
    const ss = (seconds % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // Words per minute calculation
  const wpm = duration > 5 ? Math.round((totalWords / duration) * 60) : 0;

  return (
    <div className="dashboard-layout">
      
      {/* Header */}
      <header className="header-container">
        <div className="logo-section">
          <div className="logo-badge">
            <Mic size={18} className={isRecording ? 'animate-pulse' : ''} />
          </div>
          <div>
            <h1 className="logo-text">
              Vioce Live
            </h1>
            <p className="logo-subtext">Real-time Speech-to-Text Terminal</p>
          </div>
        </div>

        <div className="user-section">
          <div className="user-profile-badge">
            <User size={13} className="user-badge-icon" />
            <span className="user-badge-text">{currentUser?.email}</span>
            <span className="user-badge-indicator"></span>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-secondary btn-signout"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-grid">
        
        {/* Left Column - Controls & Stats */}
        <section className="sidebar-controls">
          
          {/* Controls Card */}
          <div className="panel-card">
            <h2 className="card-heading">
              Streaming Controller
            </h2>

            {/* Connection Indicator */}
            <div className="status-block">
              <span className="status-label">Socket Status:</span>
              <div className="status-value">
                <span className={`status-beacon beacon-${connectionStatus}`}></span>
                <span className={`status-text text-${connectionStatus}`}>
                  {connectionStatus}
                </span>
              </div>
            </div>

            {/* Duration clock */}
            <div className="duration-display">
              {isRecording && (
                <div className="duration-live-badge">
                  <span className="live-ping-dot"></span>
                  <span className="live-text">Live</span>
                </div>
              )}
              <span className="duration-label">Elapsed Duration</span>
              <span className="duration-digits">
                {formatTime(duration)}
              </span>
            </div>

            {/* Micro / Stream triggers */}
            <div className="control-triggers">
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="btn btn-danger btn-control-stop"
                >
                  <MicOff size={15} />
                  <span>Stop Session</span>
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  className="btn btn-primary btn-control-start"
                >
                  <Mic size={15} />
                  <span>Start Recording</span>
                </button>
              )}
            </div>
          </div>

          {/* Statistics Card */}
          <div className="panel-card stats-card">
            <h2 className="card-heading">
              Metrics Console
            </h2>
            
            <div className="stats-grid">
              <div className="stat-box">
                <span className="stat-label">Total Words</span>
                <span className="stat-value">{totalWords}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Utterances</span>
                <span className="stat-value">{segments.length}</span>
              </div>
              <div className="stat-box span-2">
                <div className="stat-header-row">
                  <span className="stat-label">Est. Pace (WPM)</span>
                  <span className="stat-units">words/minute</span>
                </div>
                <div className="stat-value text-emerald">{wpm}</div>
              </div>
            </div>

            <div className="metric-indicator">
              <Activity size={12} className="metric-icon-pulse animate-pulse" />
              <span>Deepgram Nova-2 model activated.</span>
            </div>
          </div>
        </section>

        {/* Right Column - Transcription Terminal */}
        <section className="terminal-container">
          
          {/* Toolbar */}
          <div className="terminal-header">
            <div className="terminal-title-section">
              <span className="terminal-dot"></span>
              <span className="terminal-title">
                Transcription Log
              </span>
            </div>
            
            <div className="terminal-actions">
              {/* Copy plain text */}
              <button
                onClick={handleCopyText}
                disabled={segments.length === 0 && !interimTranscript}
                className="btn-action"
                title="Copy plain text"
              >
                {copiedText ? <Check size={12} className="text-emerald-icon" /> : <Copy size={12} />}
                <span className="btn-action-text">{copiedText ? 'Copied' : 'Copy Text'}</span>
              </button>

              {/* Copy formatted script */}
              <button
                onClick={handleCopyScript}
                disabled={segments.length === 0}
                className="btn-action"
                title="Copy script with timestamps"
              >
                {copiedScript ? <Check size={12} className="text-emerald-icon" /> : <FileCode size={12} />}
                <span className="btn-action-text">{copiedScript ? 'Copied Script' : 'Copy Script'}</span>
              </button>

              <div className="divider-vertical"></div>

              {/* Clear */}
              <button
                onClick={clearTranscript}
                disabled={segments.length === 0 && !interimTranscript}
                className="btn-action btn-action-danger"
                title="Clear logs"
              >
                <Trash2 size={12} />
                <span className="btn-action-text">Clear</span>
              </button>
            </div>
          </div>

          {/* Error Banner inside Terminal */}
          {error && (
            <div className="error-banner animate-fade-in">
              <AlertCircle size={16} className="error-icon" />
              <div className="error-message">{error}</div>
              <button
                onClick={() => setError(null)}
                className="btn-error-dismiss"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Log Window */}
          <div ref={scrollContainerRef} className="terminal-body">
            {segments.length === 0 && !interimTranscript ? (
              /* Empty state */
              <div className="terminal-empty">
                <div className="terminal-empty-icon">
                  <Mic size={20} />
                </div>
                <div className="terminal-empty-text-wrap">
                  <p className="terminal-empty-title">
                    Awaiting Audio Feed
                  </p>
                  <p className="terminal-empty-desc">
                    Click the "Start Recording" controller to establish a live connection to Deepgram and stream microphone packets.
                  </p>
                </div>
              </div>
            ) : (
              /* Active logs */
              <div className="terminal-logs">
                {segments.map((segment) => (
                  <div key={segment.id} className="log-line animate-fade-in">
                    <span className="log-timestamp">
                      {segment.timestamp}
                    </span>
                    <p className="log-text">
                      {segment.text}
                    </p>
                  </div>
                ))}

                {/* Real-time typing interim state */}
                {interimTranscript && (
                  <div className="log-line-interim">
                    <span className="log-interim-tag">
                      Stream
                    </span>
                    <p className="log-interim-text">
                      {interimTranscript}
                      <span className="log-interim-cursor"></span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status footer */}
          <div className="terminal-footer">
            <span className="footer-left">
              <FileText size={10} />
              <span>Unicode UTF-8</span>
            </span>
            <span className="footer-right">
              <span>Secure Connection</span>
              <span className="footer-dot"></span>
            </span>
          </div>

        </section>

      </main>
    </div>
  );
};

export default Dashboard;
