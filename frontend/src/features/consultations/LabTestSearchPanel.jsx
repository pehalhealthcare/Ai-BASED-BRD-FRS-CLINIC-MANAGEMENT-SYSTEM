import React, { useState, useEffect } from 'react';
import { Search, X, Sparkles, AlertCircle, ArrowLeft, Trash2, Check } from 'lucide-react';
import { labApi } from '../../lib/api';

export default function LabTestSearchPanel({
  isOpen,
  onClose,
  patient,
  consultation,
  onAddLabs
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [inHouseTests, setInHouseTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTests, setSelectedTests] = useState([]);
  const [hoveredOrSelectedTest, setHoveredOrSelectedTest] = useState(null);

  // Categories list
  const categories = ['All Categories', 'Hematology', 'Biochemistry', 'Microbiology', 'Immunology', 'Radiology'];

  // Load real in-house lab tests from organization
  useEffect(() => {
    if (!isOpen) return;
    const fetchInHouseTests = async () => {
      setLoading(true);
      try {
        const res = await labApi.listTests({ limit: 100 });
        if (res?.labTests) {
          setInHouseTests(res.labTests);
        } else if (res?.tests) {
          setInHouseTests(res.tests);
        }
      } catch (err) {
        console.error('Failed to fetch in-house tests:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInHouseTests();
  }, [isOpen]);

  if (!isOpen) return null;

  // Partner labs recommendations (real-world labs matching query)
  const allPartnerLabs = [
    {
      _id: 'partner-1',
      name: 'CBC with Peripheral Smear',
      partner: 'Thyrocare',
      tat: '24 hrs',
      price: 550,
      specimenType: 'Blood',
      category: 'Hematology',
      preparation: 'No fasting required',
      method: 'Microscopic Examination',
      description: 'Microscopic examination of blood smear to identify morphological abnormalities in red blood cells, white blood cells, and platelets.',
      hasHomeVisit: true,
      distance: '1.2 km'
    },
    {
      _id: 'partner-2',
      name: 'CBC (Automation)',
      partner: 'Dr. Lal PathLabs',
      tat: '24 hrs',
      price: 450,
      specimenType: 'Blood',
      category: 'Hematology',
      preparation: 'No fasting required',
      method: 'Automated 5-part Differential',
      description: 'Automated complete blood count with detailed 5-part white blood cell differential analysis.',
      hasHomeVisit: true,
      distance: '2.5 km'
    },
    {
      _id: 'partner-3',
      name: 'CBC with Reticulocyte Count',
      partner: 'Redcliffe Labs',
      tat: '24 hrs',
      price: 600,
      specimenType: 'Blood',
      category: 'Hematology',
      preparation: 'No fasting required',
      method: 'Flow Cytometry',
      description: 'Complete blood count combined with reticulocyte count to evaluate bone marrow activity and red blood cell production.',
      hasHomeVisit: true,
      distance: '3.1 km'
    },
    {
      _id: 'partner-4',
      name: 'Lipid Profile (Standard)',
      partner: 'Thyrocare',
      tat: '24 hrs',
      price: 650,
      specimenType: 'Blood',
      category: 'Biochemistry',
      preparation: 'Fasting required (10-12 hours)',
      method: 'Enzymatic Colorimetric',
      description: 'Measures total cholesterol, HDL, LDL, and triglycerides to evaluate cardiovascular risk.',
      hasHomeVisit: true,
      distance: '1.2 km'
    },
    {
      _id: 'partner-5',
      name: 'HbA1c (Glycated Haemoglobin)',
      partner: 'Dr. Lal PathLabs',
      tat: '24 hrs',
      price: 390,
      specimenType: 'Blood',
      category: 'Biochemistry',
      preparation: 'No fasting required',
      method: 'HPLC',
      description: 'Provides an average of blood sugar levels over the past 3 months to monitor diabetes.',
      hasHomeVisit: true,
      distance: '2.5 km'
    }
  ];

  // Filtering Logic
  const filteredInHouse = inHouseTests.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (t.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || 
                            t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredPartner = allPartnerLabs.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || 
                            t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Offer Test
  const handleOfferTest = (test, isPartner = false) => {
    const isAlreadySelected = selectedTests.some(t => t._id === test._id);
    if (isAlreadySelected) return;

    const newTest = {
      _id: test._id,
      testName: test.name,
      priority: 'routine',
      sampleRequired: test.specimenType || test.sampleRequired || 'Blood',
      price: test.price || 250,
      tat: test.tat || '2-4 hrs',
      isPartner,
      partnerName: isPartner ? test.partner : 'In-house',
      description: test.description || 'Routine screening lab test.'
    };

    setSelectedTests([...selectedTests, newTest]);
    setHoveredOrSelectedTest(newTest);
  };

  const handleRemoveTest = (id) => {
    setSelectedTests(selectedTests.filter(t => t._id !== id));
    if (hoveredOrSelectedTest?._id === id) {
      setHoveredOrSelectedTest(null);
    }
  };

  const handleConfirm = () => {
    onAddLabs(selectedTests.map(t => ({
      testName: t.testName,
      priority: t.priority,
      sampleRequired: t.sampleRequired,
      reason: `Offered by ${t.partnerName}. TAT: ${t.tat}. Price: ₹${t.price}`
    })));
    onClose();
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedCategory('All Categories');
  };

  // Vitals shorthand
  const v = consultation?.vitals || patient?.vitals || {};

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#0B0F19] text-slate-100 font-sans overflow-hidden">
      
      {/* ─── Header Navigation ─── */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#111827] border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded bg-violet-500/20 text-violet-400 text-[10px] font-bold">5</span>
              Lab Tests Workspace
            </h1>
            <p className="text-xs text-slate-400">Search and recommend clinical lab tests for the patient.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-850 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-xl shadow-lg shadow-violet-600/10 transition"
          >
            Add {selectedTests.length} {selectedTests.length === 1 ? 'Test' : 'Tests'} to Consultation
          </button>
        </div>
      </div>

      {/* ─── Main Grid Layout ─── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_360px] overflow-hidden">
        
        {/* ─── Left Sidebar: Patient context ─── */}
        <div className="bg-[#111827] border-r border-slate-850 p-5 overflow-y-auto space-y-6 shrink-0">
          
          {/* Patient Card */}
          <div>
            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-2">Patient Summary</p>
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-extrabold text-white">{patient?.fullName || 'Raj Sharma'}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{[patient?.age ? `${patient.age} y/o` : '32 y/o', patient?.gender || 'Male'].join(' / ')}</p>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-800/50 text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Patient ID:</span>
                  <p className="text-slate-300 font-mono mt-0.5">{patient?.patientId || 'PAT-20200623-0001'}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Phone:</span>
                  <p className="text-slate-300 mt-0.5">{patient?.phone || '9838620052'}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Known Conditions:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(patient?.chronicConditions || ['Diabetes Mellitus', 'Hypertension', 'Kidney Disease']).map((cond, idx) => (
                      <span key={idx} className="bg-slate-800 text-slate-300 text-[10px] font-semibold px-2 py-0.5 rounded">
                        {cond}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">Allergies:</span>
                  <p className="text-red-400 mt-0.5">{patient?.allergies?.join(', ') || 'Penicillin (Rash), Pollen'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Vitals */}
          <div className="pt-5 border-t border-slate-800/50">
            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-3">Vitals (Latest)</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-500 font-medium">Temp.</p>
                <p className="text-slate-200 font-bold mt-0.5">{v.temperature || '100.2'} °F</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">BP</p>
                <p className="text-slate-200 font-bold mt-0.5">{v.bloodPressure || '120/80'} mmHg</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Pulse</p>
                <p className="text-slate-200 font-bold mt-0.5">{v.pulse || '72'} bpm</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium">SpO₂</p>
                <p className="text-slate-200 font-bold mt-0.5">{v.oxygenSaturation || '98'} %</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-3">Recorded On: 26 Jun 2026, 09:15 AM</p>
          </div>

          {/* Checklist progress */}
          <div className="pt-5 border-t border-slate-800/50">
            <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wider mb-3">Consultation Progress</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between text-emerald-400">
                <span>Chief Complaint</span>
                <span className="flex items-center gap-1 font-semibold">Completed <span>✓</span></span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>Symptoms</span>
                <span className="flex items-center gap-1 font-semibold">Completed <span>✓</span></span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>Vitals</span>
                <span className="flex items-center gap-1 font-semibold">Completed <span>✓</span></span>
              </div>
              <div className="flex items-center justify-between text-emerald-400">
                <span>Diagnosis</span>
                <span className="flex items-center gap-1 font-semibold">Completed <span>✓</span></span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Prescription</span>
                <span className="text-violet-400 font-semibold">In Progress</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Lab Tests</span>
                <span className="text-violet-400 font-semibold">In Progress</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Center Panel: Search bar & lists ─── */}
        <div className="bg-[#0B0F19] overflow-y-auto p-6 space-y-6">
          
          {/* Search controls */}
          <div className="flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-800 bg-[#111827] text-xs text-white outline-none focus:border-violet-500 placeholder:text-slate-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lab tests (e.g. CBC, lipid)..."
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <select
              className="w-full md:w-44 py-2.5 px-3 rounded-xl border border-slate-800 bg-[#111827] text-xs text-white outline-none focus:border-violet-500 cursor-pointer transition-all"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <button
              onClick={handleReset}
              className="w-full md:w-auto px-4 py-2.5 text-xs text-slate-400 hover:text-white border border-slate-800 rounded-xl hover:bg-slate-800/20 transition-all"
            >
              Reset
            </button>
          </div>

          {searchQuery && (
            <p className="text-xs text-slate-400 font-medium">
              Showing results for <span className="text-white">"{searchQuery}"</span>
            </p>
          )}

          {/* AI Recommended Segment */}
          {(!searchQuery || searchQuery.toLowerCase().includes('cbc')) && (
            <div className="bg-[#111827] border border-violet-500/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-violet-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Recommended by AI
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white">CBC (Complete Blood Count)</h4>
                    <span className="text-[9px] font-bold bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded border border-violet-500/20">Recommended</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Helps in detecting infection, anemia, and overall blood health. Based on symptoms of fever & mild cough.
                  </p>
                </div>
                <button
                  onClick={() => handleOfferTest({
                    _id: 'in-house-cbc',
                    name: 'CBC (Complete Blood Count)',
                    specimenType: 'Blood',
                    price: 250,
                    tat: '2-4 hrs',
                    description: 'Analyzes RBC, WBC, Hemoglobin, Platelets and differential indices.'
                  })}
                  className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 rounded-lg shrink-0 transition"
                >
                  + Offer Test
                </button>
              </div>
            </div>
          )}

          {/* Offered at Organization */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 font-extrabold text-[9px] flex items-center justify-center">2</span>
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Lab Tests Offered at Your Organization</h3>
            </div>
            
            <div className="bg-[#111827] border border-slate-800/60 rounded-2xl overflow-hidden">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-855 bg-slate-900/40 text-slate-400 text-[10px] font-bold">
                    <th className="p-4">Test Name</th>
                    <th className="p-4">Sample</th>
                    <th className="p-4">TAT</th>
                    <th className="p-4">Price (₹)</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500 italic">Loading clinic tests...</td>
                    </tr>
                  ) : filteredInHouse.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500 italic">No in-house tests found matching query.</td>
                    </tr>
                  ) : (
                    filteredInHouse.map(t => (
                      <tr 
                        key={t._id} 
                        className="hover:bg-slate-900/20 cursor-pointer"
                        onMouseEnter={() => setHoveredOrSelectedTest({
                          _id: t._id,
                          testName: t.name,
                          sampleRequired: t.specimenType || 'Blood',
                          price: t.price || 250,
                          tat: '2-4 hrs',
                          partnerName: 'In-house',
                          description: t.description || 'Analyzes complete component count including red blood cells, white blood cells, and platelets.'
                        })}
                      >
                        <td className="p-4">
                          <div className="font-semibold text-white">{t.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{t.code}</div>
                        </td>
                        <td className="p-4 text-slate-300">{t.specimenType || 'Blood'}</td>
                        <td className="p-4 text-slate-300">2-4 hrs</td>
                        <td className="p-4 text-slate-200 font-semibold">{t.price ? `₹${t.price.toFixed(2)}` : '₹250.00'}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">Routine</span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleOfferTest(t)}
                            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-slate-200 rounded-lg transition"
                          >
                            + Offer
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Not Offered at Organization (Partner Labs) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-orange-500/20 text-orange-400 font-extrabold text-[9px] flex items-center justify-center">3</span>
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Lab Tests Not Offered at Your Organization</h3>
            </div>
            <div className="text-[10px] text-slate-500 italic mt-0.5">Referred to partner labs and home visit collections nearest to patient</div>

            <div className="bg-[#111827] border border-slate-800/60 rounded-2xl overflow-hidden">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-900/40 text-slate-400 text-[10px] font-bold">
                    <th className="p-4">Test Name</th>
                    <th className="p-4">Partner Lab / Distance</th>
                    <th className="p-4">TAT</th>
                    <th className="p-4">Price (₹)</th>
                    <th className="p-4">Priority</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {filteredPartner.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-500 italic">No partner labs tests matching query.</td>
                    </tr>
                  ) : (
                    filteredPartner.map(t => (
                      <tr 
                        key={t._id} 
                        className="hover:bg-slate-900/20 cursor-pointer"
                        onMouseEnter={() => setHoveredOrSelectedTest({
                          _id: t._id,
                          testName: t.name,
                          sampleRequired: t.specimenType || 'Blood',
                          price: t.price,
                          tat: t.tat,
                          partnerName: t.partner,
                          description: t.description,
                          hasHomeVisit: t.hasHomeVisit,
                          distance: t.distance
                        })}
                      >
                        <td className="p-4">
                          <div className="font-semibold text-white">{t.name}</div>
                          {t.hasHomeVisit && (
                            <span className="inline-block mt-1 text-[9px] font-bold bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20">Home Visit Available</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="text-slate-200 font-semibold">{t.partner}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">📍 {t.distance} away</div>
                        </td>
                        <td className="p-4 text-slate-300">{t.tat}</td>
                        <td className="p-4 text-slate-200 font-semibold">₹{t.price.toFixed(2)}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">Routine</span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleOfferTest(t, true)}
                            className="px-3.5 py-1.5 bg-violet-600/20 hover:bg-violet-600/35 text-[11px] font-bold text-violet-400 rounded-lg transition"
                          >
                            + Offer
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* ─── Right Sidebar: Selected list & test details ─── */}
        <div className="bg-[#111827] border-l border-slate-850 flex flex-col overflow-hidden shrink-0">
          
          {/* Selected Tests Header */}
          <div className="p-5 border-b border-slate-850 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Selected Lab Tests</h3>
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold">
                {selectedTests.length}
              </span>
            </div>
            <div className="mt-4 space-y-2 max-h-[160px] overflow-y-auto">
              {selectedTests.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No tests selected yet.</p>
              ) : (
                selectedTests.map(t => (
                  <div key={t._id} className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-xl p-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{t.testName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {t.sampleRequired} • {t.tat} • ₹{t.price.toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveTest(t._id)}
                      className="p-1 text-slate-400 hover:text-red-400 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-800/50">
              <span className="text-xs text-slate-400 font-semibold">Total Amount</span>
              <span className="text-sm font-extrabold text-white">
                ₹{selectedTests.reduce((acc, t) => acc + t.price, 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Test Details / AI Insight Panel */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            
            {/* Details Card */}
            {hoveredOrSelectedTest ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider">Test Details</h4>
                  <h3 className="text-sm font-bold text-white mt-1">{hoveredOrSelectedTest.testName || hoveredOrSelectedTest.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {hoveredOrSelectedTest.description || 'Complete screening tests for detailed blood diagnostic measurements.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs pt-3 border-t border-slate-800/50">
                  <div>
                    <span className="text-slate-500 font-medium">Sample Type</span>
                    <p className="text-slate-300 font-semibold mt-0.5">{hoveredOrSelectedTest.sampleRequired || 'Blood'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Turnaround Time</span>
                    <p className="text-slate-300 font-semibold mt-0.5">{hoveredOrSelectedTest.tat || '2-4 hours'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Preparation</span>
                    <p className="text-slate-300 font-semibold mt-0.5">{hoveredOrSelectedTest.preparation || 'No fasting required'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Category</span>
                    <p className="text-slate-300 font-semibold mt-0.5">{hoveredOrSelectedTest.category || 'Hematology'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Method</span>
                    <p className="text-slate-300 font-semibold mt-0.5">{hoveredOrSelectedTest.method || 'Automated Analyzer'}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Price</span>
                    <p className="text-emerald-400 font-bold mt-0.5">₹{hoveredOrSelectedTest.price ? hoveredOrSelectedTest.price.toFixed(2) : '250.00'}</p>
                  </div>
                </div>

                {/* AI Rationale */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-violet-400 font-bold">
                    <Sparkles className="w-3.5 h-3.5" /> AI Recommendation Rationale
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Patient has fever and cough for 3 days. CBC is recommended to rule out bacterial infection, check haemoglobin, and view total leucocyte count.
                  </p>
                </div>

                {/* Also Consider */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Also Consider</p>
                  <ul className="text-xs text-slate-400 space-y-1 pl-1">
                    <li>• CRP (C-Reactive Protein)</li>
                    <li>• ESR (Erythrocyte Sedimentation Rate)</li>
                    <li>• COVID-19 RT-PCR</li>
                  </ul>
                </div>

                {/* Patient Instructions */}
                <div className="pt-3 border-t border-slate-800/50 space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Patient Instructions</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    No special preparation required. Stay hydrated.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center h-48 border border-dashed border-slate-800 rounded-2xl p-5">
                <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Hover or select a test to view full details and clinical rationale</p>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* ─── Footer Action Bar ─── */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#111827] border-t border-slate-800/80 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800/70 rounded-xl transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedTests([])}
            className="px-4 py-2 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition"
          >
            Clear All
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/10 flex items-center gap-1.5 transition"
          >
            <Check className="w-4 h-4" />
            Add {selectedTests.length} {selectedTests.length === 1 ? 'Test' : 'Tests'} to Consultation
          </button>
        </div>
      </div>

    </div>
  );
}
