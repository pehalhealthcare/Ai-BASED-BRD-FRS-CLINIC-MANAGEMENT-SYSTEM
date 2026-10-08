import React, { useState } from 'react';
import { 
  Pill, FlaskConical, Boxes, IndianRupee, 
  ArrowRight, Check, AlertTriangle, Clock, 
  CheckCircle2, FileText, BarChart3, ChevronRight 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EcosystemSection({ onSetupClinic }) {
  const [activeTab, setActiveTab] = useState('pharmacy');

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
      preview: {
        title: 'Pharmacy Management',
        stats: [
          { label: 'Total Medicines', value: '1,248', sub: 'Active SKUs' },
          { label: 'Low Stock', value: '32', sub: 'Needs Reorder', color: 'text-amber-600 bg-amber-50' },
          { label: 'Expiring Soon', value: '12', sub: 'Within 60 days', color: 'text-rose-600 bg-rose-50' },
          { label: 'Out of Stock', value: '8', sub: 'Critical Alert', color: 'text-rose-600 bg-rose-50' },
        ],
        table: [
          { name: 'Paracetamol 500mg', batch: 'B001', exp: '12/2026', total: '500', avail: '320', status: 'In Stock', badge: 'text-emerald-700 bg-emerald-50' },
          { name: 'Amoxicillin 250mg', batch: 'B002', exp: '03/2026', total: '200', avail: '24', status: 'Low Stock', badge: 'text-amber-700 bg-amber-50' },
          { name: 'Vitamin D3 60K', batch: 'B003', exp: '08/2026', total: '300', avail: '210', status: 'In Stock', badge: 'text-emerald-700 bg-emerald-50' },
        ]
      }
    },
    {
      id: 'laboratory',
      label: 'Laboratory',
      icon: <FlaskConical size={16} />,
      title: 'Laboratory Management',
      desc: 'End-to-end pathology workflow from sample collection to QR-verified digital reports.',
      cta: 'Explore Laboratory',
      points: [
        'Custom test catalog & panels (CBC, LFT, Lipid)',
        'Sample collection & barcoded tracking',
        'Pathologist signature & result verification',
        'Instant WhatsApp & SMS report delivery',
        'Public QR code report authentication',
      ],
      preview: {
        title: 'Laboratory Management',
        stats: [
          { label: 'Orders Today', value: '142', sub: 'Active Queue' },
          { label: 'Samples Collected', value: '118', sub: 'Accessioned', color: 'text-blue-600 bg-blue-50' },
          { label: 'Pending Review', value: '14', sub: 'With Pathologist', color: 'text-amber-600 bg-amber-50' },
          { label: 'Reports Released', value: '104', sub: 'QR Verified', color: 'text-emerald-600 bg-emerald-50' },
        ],
        table: [
          { name: 'Complete Blood Count (CBC)', batch: 'LAB-901', exp: 'Auto-Analyzer', total: '45 mins', avail: 'Ready', status: 'Verified', badge: 'text-emerald-700 bg-emerald-50' },
          { name: 'Lipid Profile (Serum)', batch: 'LAB-902', exp: 'Biochemistry', total: '2 hours', avail: 'Testing', status: 'In Progress', badge: 'text-blue-700 bg-blue-50' },
          { name: 'HbA1c Glycated Hemoglobin', batch: 'LAB-903', exp: 'HPLC System', total: '30 mins', avail: 'Ready', status: 'Verified', badge: 'text-emerald-700 bg-emerald-50' },
        ]
      }
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: <Boxes size={16} />,
      title: 'Clinical Consumables & Inventory',
      desc: 'Control syringes, bandages, surgical gloves, equipment and central vendor orders.',
      cta: 'Explore Inventory',
      points: [
        'Central clinical consumables catalog',
        'Automated reorder point notifications',
        'Vendor purchase orders & invoice matching',
        'Inter-branch consumable stock transfers',
        'Real-time department-wise consumption reports',
      ],
      preview: {
        title: 'Inventory & Supplies',
        stats: [
          { label: 'Active Items', value: '460', sub: 'Consumables' },
          { label: 'Purchase Orders', value: '18', sub: 'This Month', color: 'text-blue-600 bg-blue-50' },
          { label: 'Reorder Alerts', value: '9', sub: 'Urgent', color: 'text-amber-600 bg-amber-50' },
          { label: 'Stock Value', value: '₹3,40,000', sub: 'Audited', color: 'text-emerald-600 bg-emerald-50' },
        ],
        table: [
          { name: 'Disposable Syringes 5ml', batch: 'INV-401', exp: 'Surgical Dept', total: '1,200', avail: '840', status: 'In Stock', badge: 'text-emerald-700 bg-emerald-50' },
          { name: 'Nitrile Examination Gloves (M)', batch: 'INV-402', exp: 'OPD / Dental', total: '500', avail: '45', status: 'Low Stock', badge: 'text-amber-700 bg-amber-50' },
          { name: 'Sterile Cotton Gauze Rolls', batch: 'INV-403', exp: 'Dressing Room', total: '300', avail: '190', status: 'In Stock', badge: 'text-emerald-700 bg-emerald-50' },
        ]
      }
    },
    {
      id: 'billing',
      label: 'Billing & Accounts',
      icon: <IndianRupee size={16} />,
      title: 'Billing & Accounts',
      desc: 'Seamless invoicing, instant UPI payments, insurance claims and daily reconciliation.',
      cta: 'Explore Billing',
      points: [
        'GST-ready OPD, Pharmacy and Lab invoices',
        'Multiple payment modes: UPI, Cards, Cash, Credit',
        'Automated payment links on WhatsApp',
        'Daily cash drawer & shift closing reconciliations',
        'Departmental revenue & doctor fee settlements',
      ],
      preview: {
        title: 'Billing & Accounts',
        stats: [
          { label: 'Daily Collection', value: '₹94,650', sub: 'Today' },
          { label: 'UPI / Digital', value: '₹68,200', sub: '72% Share', color: 'text-blue-600 bg-blue-50' },
          { label: 'Cash Collected', value: '₹26,450', sub: 'In Drawer', color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Pending Dues', value: '₹4,100', sub: 'Follow Up', color: 'text-amber-600 bg-amber-50' },
        ],
        table: [
          { name: 'INV-2026-8801 • Ramesh K.', batch: 'Dr. Sharma Consult + Lab', exp: 'UPI QR', total: '₹1,450', avail: 'Settled', status: 'Paid', badge: 'text-emerald-700 bg-emerald-50' },
          { name: 'INV-2026-8802 • Priya V.', batch: 'Dental Root Canal Session', exp: 'Card Swipe', total: '₹3,500', avail: 'Settled', status: 'Paid', badge: 'text-emerald-700 bg-emerald-50' },
          { name: 'INV-2026-8803 • Amit S.', batch: 'Pharmacy Dispense • 4 Meds', exp: 'Cash', total: '₹890', avail: 'Settled', status: 'Paid', badge: 'text-emerald-700 bg-emerald-50' },
        ]
      }
    },
  ];

  const currentMod = modules.find((m) => m.id === activeTab) || modules[0];

  return (
    <section id="ecosystem" className="py-16 sm:py-20 lg:py-24 bg-[#F8FAFC]/70 relative border-t border-slate-100">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10">
        
        {/* Section Heading */}
        <div className="text-left mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            Complete <span className="text-blue-600">Clinic Ecosystem</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-500 mt-2 font-normal max-w-2xl">
            Everything connected. No more disconnected systems.
          </p>
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
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 shadow-xs'
                }`}
              >
                {mod.icon}
                <span>{mod.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Module Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentMod.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 lg:p-10 shadow-sm"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
              
              {/* Left Column: Info & Checklist */}
              <div className="lg:col-span-5 flex flex-col items-start text-left">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
                  {currentMod.icon}
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-2">
                  {currentMod.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-normal">
                  {currentMod.desc}
                </p>

                {/* Checklist */}
                <div className="space-y-2.5 w-full mb-8">
                  {currentMod.points.map((pt, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm font-semibold text-slate-800">
                      <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={11} strokeWidth={3} />
                      </div>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>

                {/* Action button */}
                <button
                  onClick={() => onSetupClinic && onSetupClinic()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs sm:text-sm transition shadow-xs"
                >
                  <span>{currentMod.cta}</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              {/* Right Column: Live Table Mockup */}
              <div className="lg:col-span-7">
                <div className="bg-[#F8FAFC] border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                  
                  {/* Top Bar with Live Tag */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                      {currentMod.preview.title}
                    </span>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                      Synced
                    </span>
                  </div>

                  {/* 4 Mini Stat Blocks */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    {currentMod.preview.stats.map((s, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white border border-slate-150 shadow-xs flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-500 truncate">{s.label}</span>
                        <span className="text-sm sm:text-base font-black text-slate-900 mt-1">{s.value}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 ${s.color || 'text-slate-600 bg-slate-50'}`}>
                          {s.sub}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Live Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold">
                        <tr>
                          <th className="py-2.5 px-3">Item / Service</th>
                          <th className="py-2.5 px-3">Batch / Ref</th>
                          <th className="py-2.5 px-3">Detail</th>
                          <th className="py-2.5 px-3">Stock / Vol</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {currentMod.preview.table.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{row.name}</td>
                            <td className="py-2.5 px-3 text-slate-500">{row.batch}</td>
                            <td className="py-2.5 px-3 text-slate-600">{row.exp}</td>
                            <td className="py-2.5 px-3 font-extrabold text-slate-900">{row.total}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${row.badge}`}>
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>

            </div>
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  );
}
