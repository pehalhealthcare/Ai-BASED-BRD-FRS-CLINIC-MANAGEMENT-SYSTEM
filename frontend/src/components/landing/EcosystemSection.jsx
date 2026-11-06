import React, { useState, useEffect } from 'react';
import { 
  Pill, FlaskConical, Boxes, IndianRupee, 
  ArrowRight, Check, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

import { 
  INITIAL_ECOSYSTEM_DATA, 
  ECOSYSTEM_STORAGE_KEY 
} from './ecosystem/ecosystemData';
import PharmacyModule from './ecosystem/PharmacyModule';
import LaboratoryModule from './ecosystem/LaboratoryModule';
import InventoryModule from './ecosystem/InventoryModule';
import BillingModule from './ecosystem/BillingModule';

export default function EcosystemSection({ onSetupClinic }) {
  const [activeTab, setActiveTab] = useState('pharmacy');

  // Load state from localStorage or fallback to initial screenshot data
  const [ecosystemState, setEcosystemState] = useState(() => {
    try {
      const saved = localStorage.getItem(ECOSYSTEM_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse ecosystem demo state from localStorage:', e);
    }
    return INITIAL_ECOSYSTEM_DATA;
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ECOSYSTEM_STORAGE_KEY, JSON.stringify(ecosystemState));
    } catch (e) {
      console.error('Failed to save ecosystem demo state to localStorage:', e);
    }
  }, [ecosystemState]);

  // Reset to initial demo state
  const handleResetDemo = () => {
    try {
      localStorage.removeItem(ECOSYSTEM_STORAGE_KEY);
      setEcosystemState(INITIAL_ECOSYSTEM_DATA);
      toast.success('Clinic Ecosystem demo restored to original state!');
    } catch (e) {
      console.error(e);
    }
  };

  // Updaters for each module
  const updatePharmacyData = (newPharmacy) => {
    setEcosystemState((prev) => ({
      ...prev,
      pharmacy: newPharmacy,
    }));
  };

  const updateLaboratoryData = (newLab) => {
    setEcosystemState((prev) => ({
      ...prev,
      laboratory: newLab,
    }));
  };

  const updateInventoryData = (newInv) => {
    setEcosystemState((prev) => ({
      ...prev,
      inventory: newInv,
    }));
  };

  const updateBillingData = (newBilling) => {
    setEcosystemState((prev) => ({
      ...prev,
      billing: newBilling,
    }));
  };

  const modules = [
    {
      id: 'pharmacy',
      label: 'Pharmacy',
      icon: <Pill size={16} />,
      title: 'Pharmacy Management',
      desc: 'Manage medicine stock, batches, dispensing and inventory across your clinics.',
      cta: 'Explore Pharmacy',
      points: [
        'Medicine inventory & stock batches',
        'Dispense medicines with billing',
        'Low stock alerts',
        'Clinic-wise stock distribution',
        'Expiry tracking and reports',
      ],
      component: (
        <PharmacyModule 
          data={ecosystemState.pharmacy || INITIAL_ECOSYSTEM_DATA.pharmacy} 
          onUpdateData={updatePharmacyData} 
        />
      ),
    },
    {
      id: 'laboratory',
      label: 'Laboratory',
      icon: <FlaskConical size={16} />,
      title: 'Laboratory Management',
      desc: 'Manage lab tests, sample collection, processing and diagnostic reports.',
      cta: 'Explore Laboratory',
      points: [
        'Test catalogue & pricing',
        'Sample collection & tracking',
        'Report generation & delivery',
        'Abnormal result alerts',
        'Patient-wise test history',
      ],
      component: (
        <LaboratoryModule 
          data={ecosystemState.laboratory || INITIAL_ECOSYSTEM_DATA.laboratory} 
          onUpdateData={updateLaboratoryData} 
        />
      ),
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: <Boxes size={16} />,
      title: 'Inventory Management',
      desc: 'Track medical supplies, equipment, stock movements and clinic-wise inventory.',
      cta: 'Explore Inventory',
      points: [
        'Supplies & equipment management',
        'Stock in / out and transfers',
        'Low stock and reorder alerts',
        'Clinic-wise stock distribution',
        'Stock movement history',
      ],
      component: (
        <InventoryModule 
          data={ecosystemState.inventory || INITIAL_ECOSYSTEM_DATA.inventory} 
          onUpdateData={updateInventoryData} 
        />
      ),
    },
    {
      id: 'billing',
      label: 'Billing & Accounts',
      icon: <IndianRupee size={16} />,
      title: 'Billing & Accounts',
      desc: 'Manage patient invoices, payments, outstanding balances and clinic revenue.',
      cta: 'Explore Billing',
      points: [
        'Create invoices and receipts',
        'Track payments and outstanding',
        'Revenue reports and analytics',
        'Service-wise billing breakdown',
        'Download and print invoices',
      ],
      component: (
        <BillingModule 
          data={ecosystemState.billing || INITIAL_ECOSYSTEM_DATA.billing} 
          onUpdateData={updateBillingData} 
        />
      ),
    },
  ];

  const currentMod = modules.find((m) => m.id === activeTab) || modules[0];

  const handleExploreClick = () => {
    if (onSetupClinic) {
      onSetupClinic();
    } else {
      window.location.href = '/register-clinic';
    }
  };

  return (
    <section id="ecosystem" className="py-16 sm:py-20 lg:py-24 bg-[#F8FAFC]/70 relative border-t border-slate-100">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Section Heading & Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10 text-left">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Complete <span className="text-blue-600">Clinic Ecosystem</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mt-2 font-normal max-w-2xl">
              Everything connected. No more disconnected systems.
            </p>
          </div>

          {/* Quick Demo Reset Helper */}
          <button
            onClick={handleResetDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-xs font-semibold shadow-2xs transition shrink-0 w-fit cursor-pointer"
            title="Reset interactive demo to baseline values"
          >
            <RotateCcw size={13} />
            <span>Reset Demo Data</span>
          </button>
        </div>

        {/* Module Tabs Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-8 no-scrollbar">
          {modules.map((mod) => {
            const isActive = mod.id === activeTab;
            return (
              <button
                key={mod.id}
                onClick={() => setActiveTab(mod.id)}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/90 shadow-2xs'
                }`}
              >
                {mod.icon}
                <span>{mod.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Module Card Container */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 lg:p-8 shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentMod.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start"
            >
              
              {/* Left Column: Info & Checklist (~40%) */}
              <div className="lg:col-span-5 flex flex-col items-start text-left pt-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
                  {currentMod.icon}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
                  {currentMod.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-normal">
                  {currentMod.desc}
                </p>

                {/* Checklist (5 items with blue circled checks) */}
                <div className="space-y-3 w-full mb-8">
                  {currentMod.points.map((pt, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-slate-800">
                      <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={11} strokeWidth={3} />
                      </div>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>

                {/* Explore Module Action Button */}
                <button
                  onClick={handleExploreClick}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs sm:text-sm transition shadow-xs cursor-pointer"
                >
                  <span>{currentMod.cta}</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              {/* Right Column: Live Table & Dashboard Mockup (~60%) */}
              <div className="lg:col-span-7 w-full">
                <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs">
                  {currentMod.component}
                </div>
              </div>

            </motion.div>
          </AnimatePresence>
        </div>

      </div>
    </section>
  );
}
