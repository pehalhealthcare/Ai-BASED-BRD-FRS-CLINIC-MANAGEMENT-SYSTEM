import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';

export default function FloatingWhatsApp() {
  const [isHovered, setIsHovered] = useState(false);

  const rawPhone = import.meta.env.VITE_WHATSAPP_NUMBER || import.meta.env.VITE_COMPANY_PHONE || '918130916134';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const defaultText = encodeURIComponent('Hello PEHAL Healthcare Team, I would like to inquire about PEHAL AI-CMS.');
  const whatsappUrl = `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${defaultText}&type=phone_number&app_absent=0`;

  return (
    <div 
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex items-center group select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tooltip on Desktop */}
      <div 
        className={`hidden md:flex items-center mr-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-emerald-100 shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-300 transform ${
          isHovered ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-3 pointer-events-none'
        }`}
      >
        <div className="flex flex-col text-right">
          <span className="text-xs font-bold text-slate-800 leading-tight">Chat with PEHAL</span>
          <span className="text-[10.5px] text-emerald-600 font-semibold leading-tight">Online • Typical reply in 5m</span>
        </div>
      </div>

      {/* Floating Action Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="flex items-center gap-2.5 bg-gradient-to-r from-[#25D366] to-[#1ebe5d] hover:from-[#20bd5a] hover:to-[#17a54e] text-white p-3.5 sm:px-4 sm:py-3.5 rounded-full shadow-[0_8px_25px_rgba(37,211,102,0.45)] hover:shadow-[0_12px_32px_rgba(37,211,102,0.55)] transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer"
      >
        <div className="relative flex items-center justify-center">
          <MessageCircle className="w-6 h-6 fill-white text-[#25D366]" />
          {/* Animated online pulse badge */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-200 border-2 border-[#25D366]"></span>
          </span>
        </div>
        
        {/* Label for Tablet/Desktop */}
        <span className="hidden sm:inline-block font-bold text-xs sm:text-sm tracking-wide pr-1">
          Chat with Us
        </span>
      </a>
    </div>
  );
}
