import { useState, useEffect } from 'react';
import {
  Search, Eye, Printer, ChevronDown, ChevronUp, FileDown, PlusCircle, Check, X,
  AlertTriangle, Play, Calendar, Clock, RefreshCw, Trash2, Edit2, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Mock Patient Chronic Disease Registry entries mirroring active patient medical states
const MOCK_CHRONIC_REGISTRY = [
  {
    _id: "ch-001",
    conditionName: "Hypertension",
    genericName: "High Blood Pressure",
    diagnosedDate: "2024-01-10",
    yearsSinceDiagnosis: "1y 6m",
    diagnosedBy: "Dr. Shyam Verma",
    clinic: "Ram's Dental Clinic",
    branch: "Indirapuram Branch",
    currentStatus: "Active",
    controlLevel: "Well Controlled",
    lastReviewed: "2026-07-15",
    treatmentSummary: "BP well controlled with medication.",
    currentMedicines: ["Telmisartan 40 mg", "Amlodipine 5 mg"],
    nextReviewDate: "2026-08-15",
    severity: "Moderate",
    stage: "Stage 1",
    riskIndicator: "Moderate Risk",
    timeline: [
      { event: "Diagnosed", date: "10 Jan 2024", done: true },
      { event: "Treatment Started", date: "10 Jan 2024", done: true },
      { event: "BP Controlled", date: "15 Jul 2026", done: true },
      { event: "Still Active", date: "Present", done: true }
    ]
  },
  {
    _id: "ch-002",
    conditionName: "Type 2 Diabetes Mellitus",
    genericName: "Diabetes",
    diagnosedDate: "2023-03-05",
    yearsSinceDiagnosis: "2y 4m",
    diagnosedBy: "Dr. Shyam Verma",
    clinic: "Ram's Dental Clinic",
    branch: "Indirapuram Branch",
    currentStatus: "Active",
    controlLevel: "Moderately Controlled",
    lastReviewed: "2026-07-08",
    treatmentSummary: "Sugars improving. Monitoring regularly.",
    currentMedicines: ["Metformin 500 mg"],
    nextReviewDate: "2026-08-08",
    severity: "Moderate",
    stage: "Unspecified",
    riskIndicator: "Moderate Risk",
    timeline: [
      { event: "Diagnosed", date: "05 Mar 2023", done: true },
      { event: "Treatment Started", date: "05 Mar 2023", done: true },
      { event: "Stable", date: "08 Jul 2026", done: true }
    ]
  },
  {
    _id: "ch-003",
    conditionName: "Asthma",
    genericName: "Bronchial Asthma",
    diagnosedDate: "2022-05-12",
    yearsSinceDiagnosis: "2y 0m",
    diagnosedBy: "Dr. Shyam Verma",
    clinic: "Ram's Dental Clinic",
    branch: "Indirapuram Branch",
    currentStatus: "Resolved",
    controlLevel: "Resolved",
    lastReviewed: "2024-05-12",
    treatmentSummary: "Symptoms resolved and no medication required.",
    currentMedicines: [],
    nextReviewDate: "None",
    severity: "Mild",
    stage: "Intermittent",
    riskIndicator: "Low Risk",
    timeline: [
      { event: "Diagnosed", date: "12 May 2022", done: true },
      { event: "Treatment Started", date: "12 May 2022", done: true },
      { event: "Resolved", date: "12 May 2024", done: true }
    ]
  },
  {
    _id: "ch-004",
    conditionName: "Tibia Fracture (Left)",
    genericName: "Lower Leg Fracture",
    diagnosedDate: "2021-08-20",
    yearsSinceDiagnosis: "3m",
    diagnosedBy: "Dr. Shyam Verma",
    clinic: "Ram's Dental Clinic",
    branch: "Indirapuram Branch",
    currentStatus: "Ended",
    controlLevel: "Resolved",
    lastReviewed: "2021-11-20",
    treatmentSummary: "Fracture healed completely.",
    currentMedicines: [],
    nextReviewDate: "None",
    severity: "Severe",
    stage: "Post-op",
    riskIndicator: "Low Risk",
    timeline: [
      { event: "Diagnosed", date: "20 Aug 2021", done: true },
      { event: "Ended", date: "20 Nov 2021", done: true }
    ]
  }
];

export default function ChronicConditionsWorkspace({
  patient, currentUser, navigate, currentMedicines, setMedicines, setIsDirty
}) {
  const [conditions, setConditions] = useState(MOCK_CHRONIC_REGISTRY);
  const [expandedId, setExpandedId] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState(null);

  // Filters
  const [activeSegment, setActiveSegment] = useState('Ongoing');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Form fields
  const [newConditionName, setNewConditionName] = useState('');
  const [newIcd10, setNewIcd10] = useState('');
  const [newSeverity, setNewSeverity] = useState('Mild');
  const [newControlStatus, setNewControlStatus] = useState('Stable');
  const [newNotes, setNewNotes] = useState('');

  const handleToggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenDetails = (cond) => {
    setSelectedCondition(cond);
    setShowDetailsPanel(true);
  };

  const handleCreateCondition = (e) => {
    e.preventDefault();
    if (!newConditionName) return;

    const newCond = {
      _id: `ch-new-${Date.now()}`,
      conditionName: newConditionName,
      genericName: newConditionName,
      diagnosedDate: new Date().toISOString().slice(0, 10),
      yearsSinceDiagnosis: "0m",
      diagnosedBy: currentUser?.fullName || "Dr. Shyam Verma",
      clinic: "Ram's Dental Clinic",
      branch: "Indirapuram Branch",
      currentStatus: "Active",
      controlLevel: newControlStatus,
      lastReviewed: new Date().toISOString().slice(0, 10),
      treatmentSummary: newNotes || "Condition diagnosed and recorded.",
      currentMedicines: [],
      nextReviewDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().slice(0, 10),
      severity: newSeverity,
      stage: "Unspecified",
      riskIndicator: "Low Risk",
      timeline: [
        { event: "Diagnosed", date: new Date().toLocaleDateString('en-IN'), done: true },
        { event: "Treatment Started", date: new Date().toLocaleDateString('en-IN'), done: true }
      ]
    };

    setConditions([newCond, ...conditions]);
    toast.success(`${newConditionName} added to chronic conditions registry!`);
    setShowAddModal(false);
    setNewConditionName('');
    setNewIcd10('');
    setNewNotes('');
  };

  const filteredConditions = conditions.filter(c => {
    // Segment tab filter
    let matchesSegment = true;
    if (activeSegment === 'Ongoing') matchesSegment = c.currentStatus === 'Active' && c.controlLevel !== 'Resolved';
    if (activeSegment === 'Controlled') matchesSegment = c.controlLevel === 'Well Controlled';
    if (activeSegment === 'Resolved') matchesSegment = c.currentStatus === 'Resolved';
    if (activeSegment === 'Ended') matchesSegment = c.currentStatus === 'Ended';

    // Search query filter
    const matchesQuery = !searchQuery || 
      c.conditionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.genericName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSegment && matchesQuery;
  });

  return (
    <div className="space-y-6">

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 border border-slate-200 rounded-3xl p-6">
        <div>
          <h2 className="text-base font-black text-slate-800">
            Chronic Conditions
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track the patient's chronic diseases, ongoing management, treatment progress, and resolved conditions.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 shadow-sm"
        >
          <PlusCircle size={14} /> Add Chronic Condition
        </button>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Ongoing Conditions', count: 2, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Managed Conditions', count: 0, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Resolved Conditions', count: 1, color: 'bg-purple-50 text-purple-700 border-purple-200' },
          { label: 'Ended Conditions', count: 1, color: 'bg-rose-50 text-rose-700 border-rose-200' },
          { label: 'Total Conditions', count: 4, color: 'bg-slate-50 text-slate-700 border-slate-200' }
        ].map((c, i) => (
          <div key={i} className={`p-3 border rounded-2xl ${c.color} text-center space-y-1`}>
            <span className="text-[10px] uppercase font-bold block opacity-75">{c.label}</span>
            <strong className="text-base font-black block">{c.count}</strong>
          </div>
        ))}
      </div>

      {/* Segment Segmented Tabs & Filters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col gap-4">
        <div className="flex border-b border-slate-150 gap-2 overflow-x-auto">
          {['Ongoing', 'Controlled', 'Resolved', 'Ended', 'All Conditions'].map((seg) => (
            <button
              key={seg}
              onClick={() => setActiveSegment(seg)}
              className={`pb-2 px-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                activeSegment === seg ? 'border-indigo-600 text-indigo-707' : 'border-transparent text-slate-400'
              }`}
            >
              {seg}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-stretch justify-between">
          <div className="grid grid-cols-2 gap-2 flex-1 max-w-md">
            <select className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white">
              <option>All Severity Levels</option>
              <option>Mild</option>
              <option>Moderate</option>
              <option>Severe</option>
            </select>
            <select className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white">
              <option>All Review Dates</option>
              <option>Upcoming 30 days</option>
              <option>Overdue</option>
            </select>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by condition name, ICD-10..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
          </div>
        </div>
      </div>

      {/* Conditions Checklist Grid */}
      <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="p-4">Condition</th>
              <th className="p-4">Since</th>
              <th className="p-4">Diagnosed By</th>
              <th className="p-4">Last Reviewed</th>
              <th className="p-4">Status</th>
              <th className="p-4">Control Level</th>
              <th className="p-4">Notes</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredConditions.length > 0 ? filteredConditions.map((c) => {
              const isExpanded = expandedId === c._id;
              return (
                <>
                  <tr key={c._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition">
                    <td className="p-4 font-bold text-slate-800" onClick={() => handleToggleExpand(c._id)}>
                      <div className="flex items-center gap-2 cursor-pointer">
                        <span className="text-base">❤️</span>
                        <div>
                          <strong className="block">{c.conditionName}</strong>
                          <span className="text-[10px] text-slate-400 italic block">{c.genericName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{c.diagnosedDate} <span className="text-[10px] text-slate-400 block">{c.yearsSinceDiagnosis}</span></td>
                    <td className="p-4">
                      <strong className="text-slate-700 block">{c.diagnosedBy}</strong>
                      <span className="text-[10px] text-slate-400 block">{c.clinic}</span>
                    </td>
                    <td className="p-4">{c.lastReviewed}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded font-black text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.currentStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded font-black text-[9px] ${
                        c.controlLevel.includes('Well') ? 'bg-blue-50 text-blue-700 border-blue-200 border' : 'bg-orange-50 text-orange-700 border-orange-200 border'
                      }`}>
                        {c.controlLevel}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 max-w-[200px] truncate">{c.treatmentSummary}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetails(c)}
                          className="px-2.5 py-1.5 border border-indigo-200 text-indigo-650 hover:bg-indigo-50 rounded-xl text-[10px] font-black transition"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleToggleExpand(c._id)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Timeline Panel */}
                  {isExpanded && (
                    <tr className="bg-slate-50/50">
                      <td colSpan="8" className="p-5 border-b border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                          <div>
                            <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] border-b pb-1.5 mb-2">Medication Linkage</h4>
                            <div className="space-y-1">
                              {c.currentMedicines.length > 0 ? c.currentMedicines.map((med, i) => (
                                <div key={i} className="flex justify-between items-center bg-white p-2.5 border border-slate-200 rounded-xl">
                                  <strong>{med}</strong>
                                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">Linked Active</span>
                                </div>
                              )) : <p className="text-slate-400 italic">No linked medicines found.</p>}
                            </div>
                          </div>

                          <div>
                            <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] border-b pb-1.5 mb-2">History & Progression</h4>
                            <div className="space-y-2">
                              {c.timeline?.map((step, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                  <span className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center text-[9px] font-black text-indigo-600">✓</span>
                                  <div>
                                    <strong className="text-slate-700">{step.event}</strong>
                                    {step.date && <span className="text-[10px] text-slate-400 block">{step.date}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            }) : (
              <tr>
                <td colSpan="8" className="p-8 text-center text-slate-400 italic">
                  No chronic conditions found matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Chronic Condition Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateCondition} className="bg-white border border-slate-200 shadow-2xl rounded-3xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <strong className="text-sm font-black text-slate-800">Add Chronic Condition to Registry</strong>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-rose-600 transition">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 col-span-2">
                <span className="text-slate-400 font-semibold block">Condition Name *</span>
                <input
                  type="text"
                  required
                  value={newConditionName}
                  onChange={(e) => setNewConditionName(e.target.value)}
                  placeholder="e.g. Hypertension, Type 2 Diabetes"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">ICD-10 Code</span>
                <input
                  type="text"
                  value={newIcd10}
                  onChange={(e) => setNewIcd10(e.target.value)}
                  placeholder="e.g. I10"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">Severity</span>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
                >
                  <option>Mild</option>
                  <option>Moderate</option>
                  <option>Severe</option>
                </select>
              </div>

              <div className="space-y-1 col-span-2">
                <span className="text-slate-400 font-semibold block">Notes & Management Summary</span>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Describe treatment goals and parameters..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl h-20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Create Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Side Details Panel */}
      {showDetailsPanel && selectedCondition && (
        <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white border-l border-slate-200 shadow-2xl z-50 p-6 flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div className="space-y-5 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 block">Condition Profile</span>
                <strong className="text-sm font-black text-slate-800">{selectedCondition.conditionName}</strong>
              </div>
              <button onClick={() => setShowDetailsPanel(false)} className="text-slate-400 hover:text-rose-600 transition">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 border border-slate-150 rounded-2xl space-y-2">
                <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] mb-1">Details Overview</h4>
                <div><span className="text-slate-400">Diagnosis Date:</span> <strong className="text-slate-700 float-right">{selectedCondition.diagnosedDate}</strong></div>
                <div><span className="text-slate-400">Diagnosed By:</span> <strong className="text-slate-700 float-right">{selectedCondition.diagnosedBy}</strong></div>
                <div><span className="text-slate-400">Severity:</span> <strong className="text-slate-700 float-right">{selectedCondition.severity}</strong></div>
                <div><span className="text-slate-400">Control Level:</span> <strong className="text-slate-700 float-right">{selectedCondition.controlLevel}</strong></div>
                <div><span className="text-slate-400">Risk Profile:</span> <strong className="text-rose-600 float-right font-black">{selectedCondition.riskIndicator}</strong></div>
              </div>

              <div>
                <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] mb-1">Current Treatment Plan</h4>
                <p className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-slate-650 leading-relaxed">
                  {selectedCondition.treatmentSummary}
                </p>
              </div>

              <div>
                <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] mb-1">Active Medication Linkage</h4>
                <div className="space-y-1.5">
                  {selectedCondition.currentMedicines.map((med, i) => (
                    <div key={i} className="flex justify-between items-center bg-white p-2.5 border border-slate-200 rounded-xl">
                      <strong>{med}</strong>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Active</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => {
                toast.success('Review scheduled successfully.');
                setShowDetailsPanel(false);
              }}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold text-center transition"
            >
              Schedule Review
            </button>
            <button
              onClick={() => setShowDetailsPanel(false)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
