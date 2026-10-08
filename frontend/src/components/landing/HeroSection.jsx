import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Maximize, Minimize, Volume2, VolumeX, 
  ArrowRight, Calendar, Zap, Shield, Headphones, CheckCircle2, 
  Sparkles, X 
} from 'lucide-react';
import { responsiveAssets } from '../../constants/landingAssets';
import aicmsProductVideo from '../../assets/aicmsVideo.mp4';

export default function HeroSection({ 
  onSetupClinic, 
  onWatchVideo, 
  onBookDemo,
  videoSrc = aicmsProductVideo
}) {
  // Playback & Visibility States
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(120);
  const [showControls, setShowControls] = useState(true);

  const heroRef = useRef(null);
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  // showMiniPlayer is a pure visual positioning state (Never controls playback)
  const showMiniPlayer = isVideoPlaying && !isHeroVisible;

  // Bottom ribbon items for the original Hero state
  const bottomRibbonItems = [
    {
      icon: <Shield size={22} className="text-[#0070F3]" />,
      title: 'Trusted by 1,000+ Clinics',
      desc: 'Across India',
    },
    {
      icon: <Zap size={22} className="text-[#0070F3]" />,
      title: 'Cloud Based & Secure',
      desc: 'Your data is always safe',
    },
    {
      icon: <CheckCircle2 size={22} className="text-[#0070F3]" />,
      title: 'Secure & Reliable',
      desc: 'Enterprise-grade security',
    },
    {
      icon: <Sparkles size={22} className="text-[#0070F3]" />,
      title: 'Better Care for All',
      desc: 'Technology for a healthier tomorrow',
    },
  ];

  // Auto-hide controls timer during active video playback
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isVideoPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [isVideoPlaying]);

  // IntersectionObserver: ONLY updates isHeroVisible (NEVER touches video playback or time)
  useEffect(() => {
    const heroEl = heroRef.current;
    if (!heroEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHeroVisible(entry.isIntersecting);
      },
      {
        threshold: 0.15,
      }
    );

    observer.observe(heroEl);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Guaranteed video start when isVideoPlaying becomes true and video mounts
  useEffect(() => {
    if (!isVideoPlaying) return;

    const video = videoRef.current;
    if (!video) return;

    const startVideo = async () => {
      try {
        video.currentTime = 0;
        await video.play();
      } catch (error) {
        console.error('AICMS Hero video playback error:', error);
      }
    };

    startVideo();
  }, [isVideoPlaying]);

  // Track browser fullscreen changes & Escape key
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isVideoPlaying) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          handlePause();
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isVideoPlaying]);

  // Format time (mm:ss)
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. PLAY: Start Inline Hero Video
  const handleHeroPlay = () => {
    setIsVideoPlaying(true);
    resetControlsTimer();
  };

  // 2. PAUSE: Immediately Restores Original Hero & Resets to 00:00 (No "Click to Resume")
  const handlePause = (e) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
    setIsVideoPlaying(false);
    setCurrentTime(0);
    setShowControls(true);
  };

  // 3. CLOSE: Same behavior as Pause (Restores Original Hero)
  const handleClose = (e) => {
    handlePause(e);
  };

  // 4. VIDEO ENDED: Restores Original Hero
  const handleVideoEnded = () => {
    handlePause();
  };

  // 5. TOGGLE MUTE
  const handleToggleMute = (e) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // 6. EXPLICIT FULLSCREEN BUTTON ONLY
  const handleToggleFullscreen = (e) => {
    e?.stopPropagation();
    const target = videoContainerRef.current || videoRef.current;
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

  // Seek time
  const handleSeek = (e) => {
    const seekTo = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = seekTo;
      setCurrentTime(seekTo);
    }
  };

  return (
    <>
      {/* ── MAIN HERO SECTION (Observes visibility for Mini Player) ── */}
      <section 
        id="hero" 
        ref={heroRef}
        className="w-full relative overflow-hidden bg-gradient-to-b from-[#EBF3FC] via-[#F4F8FD] to-white flex flex-col justify-between pt-[88px] sm:pt-[96px] lg:pt-[104px] pb-6 border-b border-slate-100 min-h-[580px] sm:min-h-[640px] lg:min-h-[700px]"
      >
        {/* ── STATE 1: ORIGINAL HERO UI (When isVideoPlaying === false) ── */}
        {!isVideoPlaying ? (
          <>
            {/* Ambient Healthcare Background Canvas (Non-interactive) */}
            <div 
              className="absolute inset-0 z-0 bg-cover bg-bottom bg-no-repeat opacity-40 pointer-events-none select-none"
              style={{ backgroundImage: `url(${responsiveAssets.hero.medicalBackground})` }}
              aria-hidden="true"
            />

            {/* Decorative Lighting Glows (Non-interactive) */}
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-300/25 rounded-full blur-3xl pointer-events-none select-none" />
            <div className="absolute top-1/3 right-0 w-[32rem] h-[32rem] bg-sky-200/30 rounded-full blur-3xl pointer-events-none select-none" />

            {/* Main Hero Content Wrapper */}
            <div className="relative z-10 w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-8 items-center">
                
                {/* ── LEFT COLUMN: MARKETING COPY (5 cols) ── */}
                <div className="lg:col-span-5 flex flex-col items-start text-left z-10">
                  
                  {/* 1. Badge */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-blue-200/90 text-[#0070F3] text-xs sm:text-sm font-bold mb-4 sm:mb-5 shadow-xs">
                    <Shield size={14} className="text-[#0070F3] shrink-0 fill-[#0070F3]/20" />
                    <span>All-in-One Clinic Management</span>
                  </div>

                  {/* 2. Main Heading */}
                  <h1 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[50px] font-black text-[#071B3A] tracking-tight leading-[1.12] mb-4 sm:mb-5">
                    Run Your Clinic <br className="hidden sm:inline" />
                    Smarter with{' '}
                    <span className="text-[#0070F3] drop-shadow-xs">
                      AI-CMS
                    </span>
                  </h1>

                  {/* 3. Subtitle / Description */}
                  <p className="text-sm sm:text-base lg:text-[15.5px] text-[#556987] leading-relaxed mb-6 max-w-xl font-normal">
                    A complete clinic management platform with AI-powered workflows,
                    seamless patient experience and intelligent automation — so you can
                    focus on what truly matters:{' '}
                    <strong className="font-bold text-[#071B3A]">Better Care.</strong>
                  </p>

                  {/* 4. Three Feature Highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full mb-7 sm:mb-8">
                    {/* Highlight 1 */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#0070F3] text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Zap size={14} className="fill-white" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs sm:text-[13px] font-bold text-[#071B3A] leading-tight">Quick Setup</span>
                        <span className="text-[11px] text-[#64748B]">Go live in minutes</span>
                      </div>
                    </div>

                    {/* Highlight 2 */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#0070F3] text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Shield size={14} className="fill-white" />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs sm:text-[13px] font-bold text-[#071B3A] leading-tight">Secure & Reliable</span>
                        <span className="text-[11px] text-[#64748B]">Your data stays safe</span>
                      </div>
                    </div>

                    {/* Highlight 3 */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#0070F3] text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Headphones size={14} />
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-xs sm:text-[13px] font-bold text-[#071B3A] leading-tight">Dedicated Support</span>
                        <span className="text-[11px] text-[#64748B]">Assistance whenever needed</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. CTA Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full">
                    {/* Setup Your Clinic */}
                    <button
                      type="button"
                      id="hero-setup-clinic-btn"
                      onClick={onSetupClinic}
                      className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#0070F3] hover:bg-[#005ECE] text-white font-bold text-sm sm:text-[15px] shadow-[0_8px_24px_rgba(0,112,243,0.35)] hover:shadow-[0_12px_28px_rgba(0,112,243,0.45)] hover:-translate-y-0.5 active:scale-[0.98] transition-all min-h-[48px] cursor-pointer"
                    >
                      <span>Setup Your Clinic</span>
                      <ArrowRight size={17} />
                    </button>

                    {/* Book a Demo */}
                    <button
                      type="button"
                      id="hero-book-demo-btn"
                      onClick={onBookDemo}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white hover:bg-blue-50/60 text-[#0070F3] hover:text-[#005ECE] font-bold text-sm sm:text-[15px] border-2 border-[#0070F3] shadow-xs hover:shadow-[0_4px_16px_rgba(0,112,243,0.15)] hover:-translate-y-0.5 transition-all active:scale-[0.98] min-h-[48px] cursor-pointer"
                    >
                      <Calendar size={17} className="text-[#0070F3]" />
                      <span>Book a Demo</span>
                    </button>
                  </div>

                </div>

                {/* ── RIGHT COLUMN: HERO POSTER ARTWORK (7 cols) ── */}
                <div className="lg:col-span-7 relative flex items-center justify-center min-h-[380px] sm:min-h-[460px] lg:min-h-[520px]">
                  <div className="relative w-full max-w-[760px] flex items-center justify-center">

                    {/* 1. Doctor Portrait (pointer-events-none) */}
                    <img
                      src={responsiveAssets.hero.doctorHero || responsiveAssets.hero.doctor}
                      alt="Doctor using AI Clinic Management System"
                      className="w-[85%] max-w-[500px] h-auto object-contain select-none pointer-events-none drop-shadow-xl z-1"
                    />

                    {/* 2. Tablet / Laptop & Mobile Platform Mockup (pointer-events-none) */}
                    <img
                      src={responsiveAssets.hero.devices}
                      alt="AICMS Dashboard and Mobile Experience"
                      className="absolute -bottom-2 sm:-bottom-4 left-1/2 -translate-x-1/2 w-[98%] max-w-[680px] h-auto object-contain select-none pointer-events-none drop-shadow-2xl z-3"
                    />

                    {/* 3. Handwritten Script Slogan: "Empowering Doctors Enriching Lives" */}
                    <div 
                      className="absolute top-2 sm:top-6 -right-2 sm:right-0 z-4 pointer-events-none select-none text-right flex flex-col items-end transform rotate-[-4deg]"
                      style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
                    >
                      <span className="text-[#0070F3] font-bold text-xl sm:text-2xl lg:text-3xl leading-[1.05] drop-shadow-xs">
                        Empowering
                      </span>
                      <span className="text-[#0070F3] font-bold text-xl sm:text-2xl lg:text-3xl leading-[1.05] drop-shadow-xs">
                        Doctors
                      </span>
                      <span className="text-[#0070F3] font-bold text-xl sm:text-2xl lg:text-3xl leading-[1.05] drop-shadow-xs">
                        Enriching Lives
                      </span>
                    </div>

                    {/* 4. Handwritten Annotation: "Watch 2 Min Video" */}
                    <div 
                      className="absolute top-12 sm:top-16 left-[22%] sm:left-[26%] z-5 pointer-events-none select-none flex flex-col items-center transform -rotate-12"
                      style={{ fontFamily: "'Caveat', cursive, sans-serif" }}
                    >
                      <span className="text-[#0070F3] font-bold text-lg sm:text-2xl leading-tight drop-shadow-xs">
                        Watch 2
                      </span>
                      <span className="text-[#0070F3] font-bold text-lg sm:text-2xl leading-tight drop-shadow-xs">
                        Min Video
                      </span>
                      {/* Curved Hand-drawn Arrow SVG */}
                      <svg
                        viewBox="0 0 50 40"
                        className="w-8 h-8 sm:w-10 sm:h-10 text-[#0070F3] mt-0.5 ml-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M 5 5 Q 35 15 35 32" />
                        <path d="M 28 26 L 35 33 L 42 26" />
                      </svg>
                    </div>

                    {/* 5. TRUE VISUAL CENTER PLAY BUTTON */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                      <button
                        type="button"
                        id="hero-central-play-btn"
                        onClick={handleHeroPlay}
                        aria-label="Play AICMS overview video"
                        className="relative group flex items-center justify-center p-0 rounded-full focus:outline-hidden focus:ring-4 focus:ring-blue-300 transition-transform active:scale-95 cursor-pointer select-auto"
                      >
                        {/* Ambient Blue Pulse Glow Rings */}
                        <span className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping opacity-60 pointer-events-none" />
                        <span className="absolute -inset-3 rounded-full bg-gradient-to-tr from-blue-600/30 to-sky-400/20 blur-md pointer-events-none" />

                        {/* Main Blue Circular Button */}
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-22 md:h-22 rounded-full bg-[#0070F3] group-hover:bg-[#005ECE] text-white flex items-center justify-center shadow-[0_10px_30px_rgba(0,112,243,0.45)] group-hover:scale-105 transition-all duration-300">
                          <Play size={28} className="fill-white text-white ml-1 sm:scale-110" />
                        </div>
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            </div>

            {/* ── BOTTOM TRUST RIBBON BAR ── */}
            <div className="w-full bg-white/95 backdrop-blur-md border-t border-blue-100/70 shadow-[0_-4px_24px_rgba(0,112,243,0.03)] relative z-10 mt-6 sm:mt-8">
              <div className="max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-4.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 lg:divide-x divide-slate-100/80">
                  {bottomRibbonItems.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 sm:gap-3.5 pt-3 sm:pt-0 ${
                        idx > 0 ? 'lg:pl-6 xl:pl-8' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50/80 border border-[#BAE6FD]/80 flex items-center justify-center shrink-0 text-[#0070F3]">
                        {item.icon}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs sm:text-[13.5px] font-bold text-[#071B3A] leading-tight">
                          {item.title}
                        </span>
                        <span className="text-[11px] sm:text-xs text-[#64748B] font-medium leading-tight">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty spacer keeping the hero container height stable while video is playing */
          <div className="relative z-10 w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-10 py-2 sm:py-4 flex-1" />
        )}
      </section>

      {/* ── SINGLE SHARED VIDEO PLAYER HOST (NEVER UNMOUNTS DURING SCROLL) ── */}
      {isVideoPlaying && (
        <div
          ref={videoContainerRef}
          onMouseMove={resetControlsTimer}
          onTouchStart={resetControlsTimer}
          className={
            showMiniPlayer
              ? 'fixed bottom-[86px] sm:bottom-[96px] right-4 sm:right-6 z-[80] w-[calc(100vw-32px)] max-w-[360px] aspect-video rounded-2xl shadow-2xl border-2 border-white/25 bg-slate-950 overflow-hidden group select-none transition-all duration-300 ease-out'
              : 'absolute top-[88px] sm:top-[96px] lg:top-[104px] inset-x-4 sm:inset-x-6 lg:inset-x-10 max-w-[1440px] mx-auto z-10 aspect-video max-h-[560px] rounded-3xl overflow-hidden bg-slate-950 shadow-2xl border border-slate-800 flex items-center justify-center group select-none transition-all duration-300 ease-out'
          }
        >
          {/* EXACTLY ONE PERSISTENT HTML5 VIDEO DOM ELEMENT */}
          <video
            ref={videoRef}
            src={videoSrc}
            preload="metadata"
            playsInline
            className="w-full h-full object-cover sm:object-contain bg-black cursor-pointer"
            onClick={handlePause}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
              }
            }}
            onLoadedMetadata={() => {
              if (videoRef.current && videoRef.current.duration) {
                setDuration(videoRef.current.duration);
              }
            }}
            onEnded={handleVideoEnded}
          />

          {/* ── TOP CONTROLS BAR: TITLE & CLOSE BUTTON (X) ── */}
          <div 
            className={`absolute top-0 inset-x-0 ${
              showMiniPlayer ? 'p-2.5 sm:p-3' : 'p-4 sm:p-6'
            } bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between z-20 transition-opacity duration-200 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`rounded-md bg-[#0070F3] flex items-center justify-center text-white ${showMiniPlayer ? 'w-5 h-5' : 'w-7 h-7'}`}>
                <Play size={showMiniPlayer ? 10 : 13} className="fill-white ml-0.5" />
              </div>
              <div className="truncate max-w-[180px] sm:max-w-[240px]">
                <h3 className={`text-white font-bold tracking-tight truncate ${showMiniPlayer ? 'text-xs' : 'text-xs sm:text-sm'}`}>
                  {showMiniPlayer ? 'AI-CMS Demo' : 'AI-CMS Platform Walkthrough'}
                </h3>
                {!showMiniPlayer && (
                  <p className="text-[11px] text-slate-400">Intelligent clinic automation in action</p>
                )}
              </div>
            </div>

            {/* Close Button: Restores original Hero UI & resets video to 00:00 */}
            <button
              type="button"
              onClick={handleClose}
              className={`rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition active:scale-95 cursor-pointer ${
                showMiniPlayer ? 'p-1' : 'inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold'
              }`}
              aria-label="Close video and restore hero"
            >
              <X size={showMiniPlayer ? 14 : 15} />
              {!showMiniPlayer && <span>Close</span>}
            </button>
          </div>

          {/* ── BOTTOM CONTROLS BAR (Pause -> Restores Hero, Scrubber, Time, Mute, Fullscreen) ── */}
          <div 
            className={`absolute bottom-0 inset-x-0 ${
              showMiniPlayer ? 'p-2.5' : 'p-3 sm:p-5'
            } bg-gradient-to-t from-black/90 via-black/50 to-transparent z-20 flex flex-col ${
              showMiniPlayer ? 'gap-1' : 'gap-2'
            } transition-opacity duration-200 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Progress Scrub Bar */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              aria-label="Seek video playback time"
              className={`w-full bg-white/25 hover:bg-white/40 rounded-lg appearance-none cursor-pointer accent-[#0070F3] transition-all ${
                showMiniPlayer ? 'h-1' : 'h-1.5'
              }`}
            />

            {/* Controls Row */}
            <div className={`flex items-center justify-between text-white ${showMiniPlayer ? 'text-[11px] pt-0.5' : 'text-xs sm:text-sm pt-1'}`}>
              
              {/* Left: Pause Button & Time */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePause}
                  aria-label="Pause video and return to Hero"
                  className={`rounded-md hover:bg-white/15 text-white transition active:scale-95 cursor-pointer font-semibold ${
                    showMiniPlayer ? 'p-1' : 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-xs'
                  }`}
                >
                  <Pause size={showMiniPlayer ? 14 : 15} />
                  {!showMiniPlayer && <span>Pause</span>}
                </button>

                <span className="text-slate-300 font-mono select-none text-[11px] sm:text-xs">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right: Mute & Explicit Fullscreen Button */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleToggleMute}
                  aria-label={isMuted ? "Unmute audio" : "Mute audio"}
                  className="p-1.5 rounded-md hover:bg-white/15 text-white transition active:scale-95 cursor-pointer"
                >
                  {isMuted ? <VolumeX size={showMiniPlayer ? 14 : 17} /> : <Volume2 size={showMiniPlayer ? 14 : 17} />}
                </button>

                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                  className="p-1.5 rounded-md hover:bg-white/15 text-white transition active:scale-95 cursor-pointer"
                >
                  {isFullscreen ? <Minimize size={showMiniPlayer ? 14 : 17} /> : <Maximize size={showMiniPlayer ? 14 : 17} />}
                </button>
              </div>

            </div>
          </div>

        </div>
      )}
    </>
  );
}
