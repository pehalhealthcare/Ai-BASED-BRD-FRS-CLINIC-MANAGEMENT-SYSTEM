import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Maximize, Minimize, Volume2, VolumeX, 
  ArrowRight, Calendar, CheckCircle2, Sparkles, Shield,
  Gauge
} from 'lucide-react';
import { responsiveAssets } from '../../constants/landingAssets';
import aicmsProductVideo from '../../assets/aicmsVideo.mp4';

export default function HeroSection({ 
  onSetupClinic, 
  onWatchVideo, 
  onBookDemo,
  videoSrc = aicmsProductVideo
}) {
  // Playback & Controls States
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isMuted, setIsMuted] = useState(true); // Default muted guarantees browser autoplay approval
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(84); // Video is ~1:24
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const heroRef = useRef(null);
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const userPausedRef = useRef(false);

  // Auto-hide controls timer during active video playback
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying && !isPaused) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [isPlaying, isPaused]);

  // Format time (mm:ss)
  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. PLAY / START INLINE PLAYBACK
  const handlePlay = useCallback(async (withSound = false) => {
    const video = videoRef.current;
    if (!video) return;

    userPausedRef.current = false;
    setAutoplayBlocked(false);

    if (withSound) {
      video.muted = false;
      setIsMuted(false);
    }

    try {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        await playPromise;
        setIsPlaying(true);
        setIsPaused(false);
        setHasStarted(true);
        resetControlsTimer();
      }
    } catch (err) {
      console.warn('Playback error or blocked audio policy:', err);
      // Fallback to muted playback if audio caused block
      try {
        video.muted = true;
        setIsMuted(true);
        await video.play();
        setIsPlaying(true);
        setIsPaused(false);
        setHasStarted(true);
        resetControlsTimer();
      } catch (e2) {
        setAutoplayBlocked(true);
        setIsPlaying(false);
        setIsPaused(true);
      }
    }
  }, [resetControlsTimer]);

  // 2. TOGGLE PLAY / PAUSE INLINE (Keeps exact position in hero layout)
  const handleTogglePlayPause = (e) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      userPausedRef.current = false;
      handlePlay(false);
    } else {
      video.pause();
      userPausedRef.current = true;
      setIsPaused(true);
      setIsPlaying(false);
      setShowControls(true);
    }
  };

  // 3. TOGGLE MUTE / UNMUTE
  const handleToggleMute = (e) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && video.volume === 0) {
      video.volume = 0.8;
      setVolume(0.8);
    }
    resetControlsTimer();
  };

  // 4. VOLUME SLIDER
  const handleVolumeChange = (e) => {
    e?.stopPropagation();
    const val = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;

    video.volume = val;
    setVolume(val);
    if (val === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
    resetControlsTimer();
  };

  // 5. PLAYBACK SPEED CYCLER (1x -> 1.25x -> 1.5x -> 2x -> 1x)
  const handleCycleSpeed = (e) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    video.playbackRate = nextSpeed;
    setPlaybackRate(nextSpeed);
    resetControlsTimer();
  };

  // 6. SEEK BAR
  const handleSeek = (e) => {
    const seekTo = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.currentTime = seekTo;
      setCurrentTime(seekTo);
    }
    resetControlsTimer();
  };

  // 7. EXPLICIT FULLSCREEN (Only when user explicitly clicks Fullscreen)
  const handleToggleFullscreen = (e) => {
    e?.stopPropagation();
    const target = videoContainerRef.current;
    if (!target) return;

    if (!document.fullscreenElement) {
      if (target.requestFullscreen) {
        target.requestFullscreen().catch(() => {});
      } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // 8. UPDATE PROGRESS & BUFFER
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    if (video.buffered && video.buffered.length > 0 && video.duration > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      setBufferedPercent((bufferedEnd / video.duration) * 100);
    }
  };

  // 9. LISTEN FOR FULLSCREEN CHANGES
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // 10. VIEWPORT-BASED AUTOPLAY (Muted & PlaysInline, Pause on Leave)
  useEffect(() => {
    const container = videoContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const video = videoRef.current;
        if (!video) return;

        if (entry.isIntersecting) {
          // Only autoplay if user hasn't explicitly clicked pause
          if (!userPausedRef.current) {
            video.muted = true;
            setIsMuted(true);
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.then(() => {
                setIsPlaying(true);
                setIsPaused(false);
                setHasStarted(true);
              }).catch(() => {
                setAutoplayBlocked(true);
              });
            }
          }
        } else {
          // Pause when scrolling out of viewport to conserve CPU and bandwidth
          if (!video.paused) {
            video.pause();
            setIsPlaying(false);
            setIsPaused(true);
          }
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // 11. EXTERNAL PLAY TRIGGER (e.g. from nav or hero "Watch Video" buttons)
  useEffect(() => {
    const handleTriggerPlay = () => {
      userPausedRef.current = false;
      handlePlay(true);
    };

    window.addEventListener('aicms:play-hero-video', handleTriggerPlay);
    return () => window.removeEventListener('aicms:play-hero-video', handleTriggerPlay);
  }, [handlePlay]);

  // Support direct opening via URL hash (e.g. #video or #walkthrough)
  useEffect(() => {
    if (window.location.hash === '#video' || window.location.hash === '#walkthrough') {
      userPausedRef.current = false;
      handlePlay(false);
    }
  }, [handlePlay]);

  return (
    <section 
      id="hero" 
      ref={heroRef}
      className="w-full relative overflow-hidden bg-gradient-to-b from-[#EBF3FC] via-[#F4F8FD] to-white flex flex-col justify-between pt-[76px] sm:pt-[86px] md:pt-[96px] lg:pt-[100px] pb-8 sm:pb-12 border-b border-slate-100 min-h-[580px] sm:min-h-[640px] lg:min-h-[680px]"
    >
      {/* Ambient Healthcare Background Canvas */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-bottom bg-no-repeat opacity-40 pointer-events-none select-none"
        style={{ backgroundImage: `url(${responsiveAssets.hero.medicalBackground})` }}
        aria-hidden="true"
      />

      {/* Decorative Lighting Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-300/25 rounded-full blur-3xl pointer-events-none select-none" />
      <div className="absolute top-1/3 right-0 w-[32rem] h-[32rem] bg-sky-200/30 rounded-full blur-3xl pointer-events-none select-none" />

      {/* ── UNIFIED HERO WORKSPACE: HEADLINE + PREMIUM INLINE VIDEO ── */}
      <div className="relative z-10 w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 py-2 sm:py-4 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center flex-1">
          
          {/* ── LEFT COLUMN: HEADLINE, CTAS & FEATURE PILLS ── */}
          <div className="order-1 lg:order-none lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left justify-center z-10 py-1 sm:py-2">
            
            {/* Category Pill Badge */}
            <div 
              id="hero-eyebrow-badge"
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-blue-50/90 border border-blue-200/90 shadow-xs mb-3.5 sm:mb-4 select-none hover:bg-blue-100/70 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-[#0070F3] animate-pulse" />
              <span className="text-[11px] sm:text-xs font-black text-[#0070F3] uppercase tracking-wider">
                AI-POWERED CLINIC MANAGEMENT SYSTEM
              </span>
            </div>

            {/* Main Headline */}
            <h1 
              id="hero-main-heading"
              className="text-[2rem] min-[375px]:text-[2.25rem] sm:text-4xl md:text-5xl lg:text-[3.25rem] xl:text-[3.65rem] font-black text-slate-900 tracking-tight leading-[1.1] sm:leading-[1.12]"
            >
              Intelligent Healthcare,{' '}
              <span className="text-[#0070F3] inline-block">
                Simplified.
              </span>
            </h1>

            {/* Subtitle */}
            <p 
              id="hero-subheading"
              className="text-sm sm:text-base md:text-lg text-slate-600 mt-3 sm:mt-4 leading-relaxed max-w-xl font-normal"
            >
              From patient check-in to AI prescriptions, billing, and lab records — one seamless platform designed for modern clinics and growing healthcare practices.
            </p>

            {/* Key Value Proposition Feature Pills */}
            <div 
              id="hero-features-checklist"
              className="flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-2.5 mt-4 sm:mt-5 mb-5 sm:mb-6 select-none"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200/80 shadow-xs text-xs font-semibold text-slate-700">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                <span>OPD & Token Queue</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200/80 shadow-xs text-xs font-semibold text-slate-700">
                <Sparkles size={14} className="text-blue-500 shrink-0" />
                <span>AI Rx & Analytics</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 border border-slate-200/80 shadow-xs text-xs font-semibold text-slate-700">
                <Shield size={14} className="text-indigo-500 shrink-0" />
                <span>ABHA & HIPAA Ready</span>
              </div>
            </div>

            {/* Primary Call-to-Actions */}
            <div 
              id="hero-cta-button-group"
              className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto"
            >
              {/* Setup Your Clinic (Primary Blue Button) */}
              <button
                type="button"
                id="hero-setup-clinic-btn"
                onClick={onSetupClinic}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 md:px-9 py-3.5 sm:py-4 rounded-full bg-[#0070F3] hover:bg-[#005ECE] text-white font-bold text-sm sm:text-[15px] shadow-[0_4px_20px_rgba(0,112,243,0.35)] hover:shadow-[0_6px_28px_rgba(0,112,243,0.5)] hover:-translate-y-0.5 transition-all active:scale-[0.98] min-h-[48px] sm:min-h-[52px] cursor-pointer group"
              >
                <span>Setup Your Clinic</span>
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </button>

              {/* Book a Demo */}
              <button
                type="button"
                id="hero-book-demo-btn"
                onClick={onBookDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 md:px-8 py-3.5 sm:py-4 rounded-full bg-white hover:bg-blue-50/60 text-[#0070F3] hover:text-[#005ECE] font-bold text-sm sm:text-[15px] border-2 border-[#0070F3] shadow-xs hover:shadow-[0_4px_16px_rgba(0,112,243,0.15)] hover:-translate-y-0.5 transition-all active:scale-[0.98] min-h-[48px] sm:min-h-[52px] cursor-pointer"
              >
                <Calendar size={17} className="text-[#0070F3]" />
                <span>Book a Demo</span>
              </button>
            </div>

          </div>

          {/* ── RIGHT COLUMN: PREMIUM INLINE VIDEO CONTAINER (VIDEO 1 EXPERIENCE) ── */}
          <div className="order-2 lg:order-none lg:col-span-7 relative flex items-center justify-center w-full my-2 sm:my-4 lg:my-0">
            <div className="relative w-full max-w-[580px] sm:max-w-[640px] md:max-w-[760px] lg:max-w-[780px]">
              
              {/* Ambient Blue Glowing Aura Behind Video Container */}
              <div 
                className="absolute -inset-2.5 sm:-inset-4 bg-gradient-to-tr from-blue-600/25 via-sky-400/20 to-indigo-600/20 rounded-[32px] sm:rounded-[40px] blur-2xl pointer-events-none -z-10" 
                aria-hidden="true"
              />

              {/* Handwritten "Watch 2 Min Video" Slogan & Curved Arrow (visible when paused or before playback) */}
              {(!isPlaying || isPaused) && (
                <div 
                  className="absolute -top-10 sm:-top-12 left-4 sm:left-8 z-30 pointer-events-none select-none flex items-center gap-1.5 transform -rotate-6 transition-all duration-300"
                  style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
                >
                  <span className="text-[#0070F3] font-bold text-lg sm:text-2xl leading-none drop-shadow-xs">
                    Watch 2 Min Video
                  </span>
                  {/* Curved Arrow SVG */}
                  <svg
                    viewBox="0 0 50 35"
                    className="w-7 h-7 sm:w-9 sm:h-9 text-[#0070F3] mt-2 ml-1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M 5 5 Q 30 8 32 25" />
                    <path d="M 24 20 L 32 26 L 38 18" />
                  </svg>
                </div>
              )}

              {/* 16:9 Aspect Ratio Glassmorphism Video Card */}
              <div
                ref={videoContainerRef}
                onMouseMove={resetControlsTimer}
                onTouchStart={resetControlsTimer}
                className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-slate-950 shadow-[0_20px_50px_rgba(0,112,243,0.22)] border-2 border-white/90 ring-1 ring-blue-500/15 flex items-center justify-center group select-none transition-all duration-300"
              >
                {/* HTML5 Video Element: Guaranteed Inline Playback */}
                <video
                  ref={videoRef}
                  src={videoSrc}
                  preload="metadata"
                  playsInline
                  webkit-playsinline="true"
                  muted={isMuted}
                  loop
                  className="w-full h-full object-cover sm:object-contain bg-slate-950 cursor-pointer"
                  onClick={handleTogglePlayPause}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={() => {
                    if (videoRef.current && videoRef.current.duration) {
                      setDuration(videoRef.current.duration);
                    }
                  }}
                  onPlay={() => {
                    setIsPlaying(true);
                    setIsPaused(false);
                    setHasStarted(true);
                  }}
                  onPause={() => {
                    setIsPaused(true);
                    setIsPlaying(false);
                  }}
                  onEnded={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      videoRef.current.play().catch(() => {});
                    }
                  }}
                />

                {/* ── CENTER PLAY BUTTON OVERLAY (When paused, idle, or before starting) ── */}
                {(!isPlaying || isPaused) && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/25 backdrop-blur-[2px] transition-all duration-300">
                    <button
                      type="button"
                      onClick={() => handlePlay(false)}
                      aria-label="Play AICMS video"
                      className="relative group/btn flex items-center justify-center p-0 rounded-full focus:outline-hidden focus:ring-4 focus:ring-blue-300 transition-transform active:scale-95 cursor-pointer"
                    >
                      {/* Pulse rings */}
                      <span className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping opacity-60 pointer-events-none" />
                      <span className="absolute -inset-3 sm:-inset-4 rounded-full bg-gradient-to-tr from-blue-600/40 to-sky-400/30 blur-md pointer-events-none" />
                      
                      {/* Play Button Disc */}
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0070F3] hover:bg-[#005ECE] text-white flex items-center justify-center shadow-[0_10px_35px_rgba(0,112,243,0.55)] group-hover/btn:scale-105 transition-all duration-300">
                        <Play size={28} className="fill-white text-white ml-1.5 sm:scale-110" />
                      </div>
                    </button>
                  </div>
                )}

                {/* ── FLOATING "CLICK TO UNMUTE" BADGE (When autoplaying muted) ── */}
                {isPlaying && !isPaused && isMuted && (
                  <button
                    type="button"
                    onClick={handleToggleMute}
                    aria-label="Unmute video audio"
                    className="absolute top-4 right-4 z-30 px-3.5 py-1.5 rounded-full bg-slate-900/85 hover:bg-slate-900 text-white text-xs font-semibold backdrop-blur-md border border-white/20 shadow-lg flex items-center gap-1.5 transition active:scale-95 cursor-pointer hover:border-blue-400 group/unmute"
                  >
                    <VolumeX size={15} className="text-blue-400 group-hover/unmute:scale-110 transition-transform" />
                    <span>Click for Sound</span>
                  </button>
                )}

                {/* ── TOP HEADER BAR: TITLE BADGE (Fades with controls) ── */}
                <div 
                  className={`absolute top-0 inset-x-0 p-3 sm:p-5 bg-gradient-to-b from-black/80 via-black/35 to-transparent flex items-center justify-between z-20 transition-opacity duration-200 ${
                    showControls || isPaused ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#0070F3] flex items-center justify-center text-white shadow-xs">
                      <Play size={12} className="fill-white ml-0.5" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold tracking-tight text-xs sm:text-sm drop-shadow-xs">
                        AI-CMS Platform Walkthrough
                      </h3>
                    </div>
                  </div>
                </div>

                {/* ── BOTTOM CONTROLS BAR: PROGRESS, PLAY/PAUSE, TIME, VOLUME, SPEED, FULLSCREEN ── */}
                <div 
                  className={`absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 flex flex-col gap-1.5 transition-opacity duration-200 ${
                    showControls || isPaused ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Interactive Progress Scrubber */}
                  <div className="relative w-full h-2 flex items-center cursor-pointer group/bar">
                    {/* Background track */}
                    <div className="absolute inset-x-0 h-1 rounded-full bg-white/20 overflow-hidden">
                      {/* Buffered bar */}
                      <div 
                        className="h-full bg-white/25 transition-all duration-300"
                        style={{ width: `${bufferedPercent}%` }}
                      />
                    </div>

                    {/* Played progress fill */}
                    <div 
                      className="absolute left-0 h-1 rounded-full bg-[#0070F3] transition-all"
                      style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                    />

                    {/* Native range input for accessible dragging */}
                    <input
                      type="range"
                      min="0"
                      max={duration || 100}
                      step="0.1"
                      value={currentTime}
                      onChange={handleSeek}
                      aria-label="Seek video playback position"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </div>

                  {/* Controls Row */}
                  <div className="flex items-center justify-between text-white text-xs pt-1">
                    
                    {/* Left: Play/Pause Toggle & Time Display */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleTogglePlayPause}
                        aria-label={isPaused ? "Play" : "Pause"}
                        className="p-1.5 rounded-lg hover:bg-white/15 text-white transition active:scale-95 cursor-pointer flex items-center justify-center"
                      >
                        {isPaused ? (
                          <Play size={16} className="fill-white ml-0.5" />
                        ) : (
                          <Pause size={16} className="fill-white" />
                        )}
                      </button>

                      {/* Current Time / Duration */}
                      <span className="text-slate-300 font-mono text-[11px] sm:text-xs select-none">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    {/* Right: Volume Slider, Speed Cycler & Fullscreen */}
                    <div className="flex items-center gap-2">
                      
                      {/* Volume / Mute with mini slider */}
                      <div className="flex items-center gap-1 group/vol">
                        <button
                          type="button"
                          onClick={handleToggleMute}
                          aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                          className="p-1.5 rounded-lg hover:bg-white/15 text-white transition active:scale-95 cursor-pointer"
                          title={isMuted ? "Unmute" : "Mute"}
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX size={16} className="text-rose-400" />
                          ) : (
                            <Volume2 size={16} className="text-white" />
                          )}
                        </button>
                        
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          aria-label="Volume level"
                          className="w-12 sm:w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-[#0070F3] hidden sm:block opacity-70 hover:opacity-100 transition-opacity"
                        />
                      </div>

                      {/* Playback Speed Cycler Badge */}
                      <button
                        type="button"
                        onClick={handleCycleSpeed}
                        aria-label={`Playback speed: ${playbackRate}x`}
                        className="px-2 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white font-mono text-[10px] sm:text-[11px] font-bold transition active:scale-95 cursor-pointer"
                        title="Change Playback Speed"
                      >
                        {playbackRate}x
                      </button>

                      {/* Fullscreen Button */}
                      <button
                        type="button"
                        onClick={handleToggleFullscreen}
                        aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                        className="p-1.5 rounded-lg hover:bg-white/15 text-white transition active:scale-95 cursor-pointer"
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                      >
                        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                      </button>

                    </div>

                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}