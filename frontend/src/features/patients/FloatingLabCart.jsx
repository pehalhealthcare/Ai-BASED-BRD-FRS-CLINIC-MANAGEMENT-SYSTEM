import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, X, Trash2, ArrowRight, FlaskConical,
  CheckCircle2, Sparkles, ChevronRight, Droplet, Clock
} from 'lucide-react';

/**
 * FloatingLabCart & Drawer Component
 * 
 * Provides an accessible, responsive floating lab cart pill and slide-over
 * review drawer that stays persistent while patient browses, searches,
 * and filters laboratory tests.
 */
export default function FloatingLabCart({
  cartItems = [],
  onRemoveItem,
  onClearCart,
  onProceedToCheckout,
  currencySymbol = '₹'
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  const totalCount = cartItems.length;
  const subtotal = cartItems.reduce((acc, item) => {
    const price = Number(item.localPrice || item.price || 0);
    return acc + (isNaN(price) ? 0 : price);
  }, 0);

  // If no items in cart and drawer is not open, do not show floating pill
  if (totalCount === 0 && !isDrawerOpen) {
    return null;
  }

  return (
    <>
      {/* ============================================================ */}
      {/* ── FLOATING LAB CART PILL (Fixed Bottom-Right / Mobile Bar) ── */}
      {/* ============================================================ */}
      {totalCount > 0 && !isDrawerOpen && (
        <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-24 z-30 animate-fade-in-up max-w-[calc(100vw-2rem)]">
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label={`Open laboratory cart containing ${totalCount} ${totalCount === 1 ? 'test' : 'tests'}`}
            className="group relative flex items-center justify-between gap-4 sm:gap-6 px-4 sm:px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/40 text-white rounded-2xl shadow-2xl shadow-indigo-950/60 hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer ring-4 ring-indigo-500/10 focus:outline-none focus:ring-4 focus:ring-indigo-400"
          >
            {/* Pulsing background aura */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-2xl blur-xs opacity-30 group-hover:opacity-60 transition duration-300 -z-10" />

            {/* Left: Icon & Count / Subtotal */}
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-indigo-500/30 border border-emerald-400/40 text-emerald-300 shadow-inner">
                <FlaskConical className="h-5 w-5 animate-pulse" />
                <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-black text-slate-950 shadow-md">
                  {totalCount}
                </span>
              </div>
              <div className="text-left">
                <div className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5">
                  <span>{totalCount} {totalCount === 1 ? 'Test Selected' : 'Tests Selected'}</span>
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-emerald-400">
                  {currencySymbol}{subtotal.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Right: View Cart Action Pill */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 group-hover:bg-indigo-500 group-hover:text-white transition-all text-xs font-extrabold shrink-0">
              <span>View Cart</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* ── CART DRAWER / SLIDE-OVER PANEL ── */}
      {/* ============================================================ */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl border-l border-slate-200 animate-slide-in-right">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Your Lab Cart</h3>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black text-indigo-800">
                      {totalCount} {totalCount === 1 ? 'Test' : 'Tests'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Review selected diagnostic investigations</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close laboratory cart drawer"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Cart Items List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3 [scrollbar-width:thin]">
              {cartItems.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                    <FlaskConical className="h-7 w-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">Your laboratory cart is empty</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    Browse the diagnostic catalogue and add required tests to your cart.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition"
                  >
                    Browse Lab Tests
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <span>Selected Investigations</span>
                    {onClearCart && cartItems.length > 1 && (
                      <button
                        type="button"
                        onClick={onClearCart}
                        className="text-rose-500 hover:text-rose-700 text-[11px] lowercase tracking-normal font-bold"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {cartItems.map((item, index) => {
                    const priceVal = Number(item.localPrice || item.price || 0);
                    const itemName = item.testName || item.fullName || item.name || 'Laboratory Test';
                    const sampleType = item.sample || item.specimenType || 'Blood';
                    const reportingTime = item.reportingTime || item.turnaroundTime || '24 Hours';
                    const category = item.category || 'General';

                    return (
                      <div
                        key={item.id || item._id || index}
                        className="group relative flex flex-col justify-between p-4 rounded-2xl border border-slate-200/90 bg-white hover:border-indigo-300 hover:shadow-xs transition-all space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase tracking-wider border border-indigo-100/60">
                              {category}
                            </span>
                            <h4 className="text-xs font-extrabold text-slate-900 tracking-tight">
                              {itemName}
                            </h4>
                          </div>

                          {onRemoveItem && (
                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.id || item._id || item)}
                              aria-label={`Remove ${itemName} from laboratory cart`}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                            <span className="flex items-center gap-1">
                              <Droplet className="h-3 w-3 text-rose-500" />
                              {sampleType}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {reportingTime}
                            </span>
                          </div>

                          <div className="font-mono font-extrabold text-xs text-slate-900">
                            {currencySymbol}{priceVal.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Drawer Footer (Subtotal & Actions) */}
            {totalCount > 0 && (
              <div className="p-5 border-t border-slate-200 bg-slate-50/90 shrink-0 space-y-3.5">
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-600 font-medium">
                    <span>Total Investigations:</span>
                    <span className="font-bold text-slate-900">{totalCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-900 text-sm font-extrabold pt-1 border-t border-slate-200">
                    <span>Subtotal:</span>
                    <span className="text-base text-indigo-700 font-mono">
                      {currencySymbol}{subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 text-right">
                    * Collection mode &amp; scheduled slots selected at checkout
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    aria-label="Continue browsing laboratory catalogue"
                    className="w-full py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs transition cursor-pointer text-center"
                  >
                    Continue Browsing
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawerOpen(false);
                      if (onProceedToCheckout) {
                        onProceedToCheckout();
                      }
                    }}
                    aria-label="Review and continue to laboratory checkout"
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold text-xs shadow-md shadow-indigo-200 transition cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <span>Proceed to Book</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
