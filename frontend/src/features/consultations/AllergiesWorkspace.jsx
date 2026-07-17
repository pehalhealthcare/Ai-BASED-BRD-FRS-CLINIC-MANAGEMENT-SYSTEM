import { useState, useEffect } from 'react';
import {
  Search, Eye, Printer, ChevronDown, ChevronUp, FileDown, PlusCircle, Check, X,
  AlertTriangle, Play, Calendar, Clock, RefreshCw, Trash2, Edit2, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Initial Mock Patient Allergy Registry entries matching active patient medical states
const INITIAL_ALLERGY_REGISTRY = [
  {
    _id: "al-001",
    allergenName: "Penicillin",
    specificItem: "Amoxicillin",
    category: "Medication Allergy",
    type: "Drug",
    severity: "Severe",
    reaction: "Rash, Itching, Swelling, Difficulty breathing",
    onset: "Within 30 minutes",
    identifiedDate: "12 Jan 2024",
    identifiedBy: "Dr. Shyam Verma",
    clinic: "Ram's Dental Clinic",
    branch: "Indirapuram Branch",
    currentStatus: "Active",
    clinicalNotes: "Patient had severe reaction after 1st dose.",
    timeline: [
      { event: "Patient Reported", date: "12 Jan 2024", done: true },
      { event: "Doctor Confirmed", date: "12 Jan 2024", done: true },
      { event: "Still Active", date: "Present", done: true }
    ]
  },
  {
    _id: "al-002",
    allergenName: "House Dust",
    specificItem: "Dust Mites",
    category: "Environmental Allergy",
    type: "Inhalant",
    severity: "Moderate",
    reaction: "Sneezing, Nasal congestion, Watery eyes",
    onset: "Hours",
    identifiedDate: "05 Mar 2023",
    identifiedBy: "Dr. Shyam Verma",
    clinic: "Ram's Dental Clinic",
    branch: "Indirapuram Branch",
    currentStatus: "Active",
    clinicalNotes: "Symptoms worse in winter and early morning.",
    timeline: [
      { event: "Patient Reported", date: "05 Mar 2023", done: true },
      { event: "Still Active", date: "Present", done: true }
    ]
  }
];

export default function AllergiesWorkspace({
  patient, currentUser, navigate, currentMedicines, setMedicines, setIsDirty
}) {
  const [allergies, setAllergies] = useState(INITIAL_ALLERGY_REGISTRY);
  const [expandedId, setExpandedId] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [selectedAllergy, setSelectedAllergy] = useState(null);

  // Filters
  const [activeSegment, setActiveSegment] = useState('Active Allergies');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Form fields
  const [newAllergenName, setNewAllergenName] = useState('');
  const [newCategory, setNewCategory] = useState('Medication Allergy');
  const [newSeverity, setNewSeverity] = useState('Moderate');
  const [newReaction, setNewReaction] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const handleToggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleOpenDetails = (al) => {
    setSelectedAllergy(al);
    setShowDetailsDrawer(true);
  };

  const handleCreateAllergy = (e) => {
    e.preventDefault();
    if (!newAllergenName) return;

    const newAl = {
      _id: `al-new-${Date.now()}`,
      allergenName: newAllergenName,
      specificItem: newAllergenName,
      category: newCategory,
      type: newCategory.split(' ')[0],
      severity: newSeverity,
      reaction: newReaction || "Mild hives / irritation",
      onset: "Immediately",
      identifiedDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      identifiedBy: currentUser?.fullName || "Dr. Shyam Verma",
      clinic: "Ram's Dental Clinic",
      branch: "Indirapuram Branch",
      currentStatus: "Active",
      clinicalNotes: newNotes || "No extra notes.",
      timeline: [
        { event: "Patient Reported", date: new Date().toLocaleDateString('en-IN'), done: true },
        { event: "Doctor Confirmed", date: new Date().toLocaleDateString('en-IN'), done: true },
        { event: "Still Active", date: "Present", done: true }
      ]
    };

    setAllergies([newAl, ...allergies]);
    toast.success(`${newAllergenName} allergy recorded successfully!`);
    setShowAddModal(false);
    setNewAllergenName('');
    setNewReaction('');
    setNewNotes('');
  };

  const filteredAllergies = allergies.filter(al => {
    // Segment tab filter
    let matchesSegment = true;
    if (activeSegment === 'Active Allergies') matchesSegment = al.currentStatus === 'Active';
    if (activeSegment === 'Past / Inactive Allergies') matchesSegment = al.currentStatus === 'Inactive';

    // Search query filter
    const matchesQuery = !searchQuery || 
      al.allergenName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      al.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      al.reaction.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSegment && matchesQuery;
  });

  return (
    <div className="space-y-6">

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 border border-slate-200 rounded-3xl p-6">
        <div>
          <h2 className="text-base font-black text-slate-800">
            Allergies
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage patient medication, food, environmental and other allergies throughout their lifetime.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 shadow-sm"
        >
          <PlusCircle size={14} /> Add Allergy
        </button>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: 'Active Allergies', count: allergies.filter(a => a.currentStatus === 'Active').length, color: 'bg-red-50 text-red-700 border-red-200' },
          { label: 'Medication Allergies', count: allergies.filter(a => a.category === 'Medication Allergy').length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Food Allergies', count: allergies.filter(a => a.category === 'Food Allergy').length, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Environmental Allergies', count: allergies.filter(a => a.category === 'Environmental Allergy').length, color: 'bg-orange-50 text-orange-700 border-orange-200' },
          { label: 'Past (Inactive)', count: allergies.filter(a => a.currentStatus === 'Inactive').length, color: 'bg-slate-50 text-slate-700 border-slate-200' },
          { label: 'Total Allergies', count: allergies.length, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' }
        ].map((c, i) => (
          <div key={i} className={`p-3 border rounded-2xl ${c.color} text-center space-y-1`}>
            <span className="text-[9px] uppercase font-bold block opacity-75 leading-tight">{c.label}</span>
            <strong className="text-base font-black block">{c.count}</strong>
          </div>
        ))}
      </div>

      {/* Segment Segmented Tabs & Filters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col gap-4">
        <div className="flex border-b border-slate-150 gap-2 overflow-x-auto">
          {['Active Allergies', 'Past / Inactive Allergies', 'All Allergies'].map((seg) => (
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
              <option>All Severities</option>
              <option>Mild</option>
              <option>Moderate</option>
              <option>Severe</option>
              <option>Life Threatening</option>
            </select>
            <select className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white">
              <option>All Categories</option>
              <option>Medication Allergy</option>
              <option>Food Allergy</option>
              <option>Environmental Allergy</option>
            </select>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search allergy, allergen, category..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
          </div>
        </div>
      </div>

      {/* Allergies List Table */}
      <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="p-4">Allergen</th>
              <th className="p-4">Category</th>
              <th className="p-4">Type</th>
              <th className="p-4">Severity</th>
              <th className="p-4">Reaction</th>
              <th className="p-4">Onset</th>
              <th className="p-4">Identified On</th>
              <th className="p-4">Identified By</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAllergies.length > 0 ? filteredAllergies.map((al) => {
              const isExpanded = expandedId === al._id;
              
              // Severity classes mapping
              let severityBadge = "bg-yellow-50 text-yellow-700 border-yellow-200 border";
              if (al.severity === 'Severe') severityBadge = "bg-red-50 text-red-700 border-red-200 border";
              if (al.severity === 'Moderate') severityBadge = "bg-orange-50 text-orange-700 border-orange-200 border";
              if (al.severity === 'Life Threatening') severityBadge = "bg-rose-950 text-white border border-rose-900";

              return (
                <>
                  <tr key={al._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition">
                    <td className="p-4 font-bold text-slate-800" onClick={() => handleToggleExpand(al._id)}>
                      <div className="flex items-center gap-2 cursor-pointer">
                        <span className="text-base">🚫</span>
                        <div>
                          <strong className="block">{al.allergenName}</strong>
                          {al.specificItem && <span className="text-[10px] text-slate-400 italic block">({al.specificItem})</span>}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded font-black text-[9px] bg-indigo-50 text-indigo-707 border border-indigo-200">
                        {al.category}
                      </span>
                    </td>
                    <td className="p-4">{al.type}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded font-black text-[9px] ${severityBadge}`}>
                        {al.severity}
                      </span>
                    </td>
                    <td className="p-4 max-w-[150px] truncate">{al.reaction}</td>
                    <td className="p-4">{al.onset}</td>
                    <td className="p-4">{al.identifiedDate}</td>
                    <td className="p-4">
                      <strong className="text-slate-700 block">{al.identifiedBy}</strong>
                      <span className="text-[10px] text-slate-400 block">{al.clinic}</span>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded font-black text-[9px] bg-emerald-50 text-emerald-707 border border-emerald-200">
                        {al.currentStatus}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetails(al)}
                          className="px-2.5 py-1.5 border border-indigo-200 text-indigo-650 hover:bg-indigo-50 rounded-xl text-[10px] font-black transition"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleToggleExpand(al._id)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Panel */}
                  {isExpanded && (
                    <tr className="bg-slate-50/50">
                      <td colSpan="10" className="p-5 border-b border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                          <div>
                            <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] border-b pb-1.5 mb-2">Clinical Notes & Descriptions</h4>
                            <p className="text-slate-650 leading-relaxed bg-white p-3 border border-slate-200 rounded-2xl">
                              {al.clinicalNotes}
                            </p>
                          </div>

                          <div>
                            <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] border-b pb-1.5 mb-2">Allergy History Timeline</h4>
                            <div className="space-y-2">
                              {al.timeline?.map((step, idx) => (
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
                <td colSpan="10" className="p-8 text-center text-slate-400 italic">
                  No allergies found matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Allergy Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateAllergy} className="bg-white border border-slate-200 shadow-2xl rounded-3xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <strong className="text-sm font-black text-slate-800">Add New Allergy</strong>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-rose-600 transition">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 col-span-2">
                <span className="text-slate-400 font-semibold block">Allergen Name *</span>
                <input
                  type="text"
                  required
                  value={newAllergenName}
                  onChange={(e) => setNewAllergenName(e.target.value)}
                  placeholder="e.g. Penicillin, House Dust, Peanuts"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">Category</span>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold text-slate-700"
                >
                  <option>Medication Allergy</option>
                  <option>Food Allergy</option>
                  <option>Environmental Allergy</option>
                  <option>Chemical Allergy</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">Severity</span>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold text-slate-700"
                >
                  <option>Mild</option>
                  <option>Moderate</option>
                  <option>Severe</option>
                  <option>Life Threatening</option>
                </select>
              </div>

              <div className="space-y-1 col-span-2">
                <span className="text-slate-400 font-semibold block">Reaction Symptoms</span>
                <input
                  type="text"
                  value={newReaction}
                  onChange={(e) => setNewReaction(e.target.value)}
                  placeholder="e.g. Hives, Skin rashes, Swelling"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <span className="text-slate-400 font-semibold block">Clinical Notes</span>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Enter custom notes..."
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
                Save Allergy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Side Details Drawer */}
      {showDetailsDrawer && selectedAllergy && (
        <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white border-l border-slate-200 shadow-2xl z-50 p-6 flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div className="space-y-5 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-rose-600 block">Allergy Profile</span>
                <strong className="text-sm font-black text-slate-800">{selectedAllergy.allergenName}</strong>
              </div>
              <button onClick={() => setShowDetailsDrawer(false)} className="text-slate-400 hover:text-rose-600 transition">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 border border-slate-150 rounded-2xl space-y-2">
                <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] mb-1">Details Overview</h4>
                <div><span className="text-slate-400">Category:</span> <strong className="text-slate-700 float-right">{selectedAllergy.category}</strong></div>
                <div><span className="text-slate-400">Severity:</span> <strong className="text-slate-700 float-right">{selectedAllergy.severity}</strong></div>
                <div><span className="text-slate-400">Reaction Onset:</span> <strong className="text-slate-700 float-right">{selectedAllergy.onset}</strong></div>
                <div><span className="text-slate-400">Identified Date:</span> <strong className="text-slate-700 float-right">{selectedAllergy.identifiedDate}</strong></div>
                <div><span className="text-slate-400">Diagnosed By:</span> <strong className="text-slate-700 float-right">{selectedAllergy.identifiedBy}</strong></div>
              </div>

              <div>
                <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] mb-1">Reaction Symptoms</h4>
                <p className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-slate-650 leading-relaxed">
                  {selectedAllergy.reaction}
                </p>
              </div>

              <div>
                <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] mb-1">Clinical Notes</h4>
                <p className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-slate-650 leading-relaxed italic">
                  {selectedAllergy.clinicalNotes}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => {
                toast.success('Allergy history printed successfully.');
                setShowDetailsDrawer(false);
              }}
              className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold text-center transition"
            >
              Print Details
            </button>
            <button
              onClick={() => setShowDetailsDrawer(false)}
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
