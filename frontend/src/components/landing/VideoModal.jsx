import React, { useEffect } from 'react';
import { X, Play, Sparkles, CheckCircle2, Shield, Activity, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VideoModal({ isOpen, onClose, onSetupClinic }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                <Play size={16} className="fill-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-base sm:text-lg">AI-CMS Platform Walkthrough</h3>
                <p className="text-xs text-slate-400">Discover intelligent clinic automation in under 2 minutes</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Video Preview Container */}
          <div className="relative aspect-video w-full bg-slate-950 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/30 via-slate-900 to-indigo-900/20 pointer-events-none" />
            
            {/* Interactive Preview Representation */}
            <div className="p-8 sm:p-12 text-center max-w-xl z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold mb-4">
                <Sparkles size={14} className="text-blue-400" />
                Next-Gen Healthcare Management
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
                See AI-CMS in Real Action
              </h2>
              <p className="text-sm sm:text-base text-slate-300 mb-6 leading-relaxed">
                Watch how multi-role workflows, live queue tokens, automated digital prescriptions, and AI copilot streamline patient consultations.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left mb-6 text-xs text-slate-300">
                <div className="flex items-center gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                  <CheckCircle2 size={16} className="text-blue-400 shrink-0" />
                  <span>OPD & Live Tokens</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                  <Activity size={16} className="text-blue-400 shrink-0" />
                  <span>Lab & Pharmacy Sync</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
                  <Shield size={16} className="text-indigo-400 shrink-0" />
                  <span>HIPAA-Ready EMR</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => {
                    onClose();
                    if (onSetupClinic) onSetupClinic();
                  }}
                  className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 transition active:scale-95"
                >
                  Setup Your Clinic Now
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
