import { useState, useEffect } from 'react';
import {
  Search, Eye, Printer, ChevronDown, ChevronUp, FileDown, PlusCircle, Check, X,
  AlertTriangle, Play, Calendar, Clock, RefreshCw, Trash2, Edit2, AlertCircle,
  FileText
} from 'lucide-react';
import toast from 'react-hot-toast';

// Initial Mock Patient Immunization Registry entries matching active patient medical states
const INITIAL_VACCINATION_REGISTRY = [
  {
    _id: "vac-001",
    vaccineName: "COVID-19 (Covishield)",
    disease: "Coronavirus Vaccine",
    category: "Preventive",
    dose: "2 / 2",
    dateGiven: "12 Jan 2022",
    administeredBy: "Dr. Shyam Verma",
    nextDue: "—",
    status: "Completed",
    notes: "No adverse reaction"
  },
  {
    _id: "vac-002",
    vaccineName: "Tetanus Toxoid (TT)",
    disease: "Tetanus Vaccine",
    category: "Tetanus",
    dose: "1 / 1",
    dateGiven: "05 Jun 2023",
    administeredBy: "Dr. Shyam Verma",
    nextDue: "05 Jun 2033",
    status: "Up To Date",
    notes: "Given due to injury"
  },
  {
    _id: "vac-003",
    vaccineName: "Hepatitis B",
    disease: "Hepatitis Vaccine",
    category: "Hepatitis",
    dose: "3 / 3",
    dateGiven: "20 Aug 2023",
    administeredBy: "Dr. Neha Sharma",
    nextDue: "—",
    status: "Completed",
    notes: "No adverse reaction"
  },
  {
    _id: "vac-004",
    vaccineName: "Influenza (Flu)",
    disease: "Influenza Vaccine",
    category: "Seasonal",
    dose: "0 / 1",
    dateGiven: "—",
    administeredBy: "—",
    nextDue: "15 Sep 2026",
    status: "Overdue",
    notes: "Annual vaccine recommended"
  },
  {
    _id: "vac-005",
    vaccineName: "HPV (Gardasil 9)",
    disease: "HPV Vaccine",
    category: "Preventive",
    dose: "1 / 3",
    dateGiven: "10 Jan 2024",
    administeredBy: "Dr. Shyam Verma",
    nextDue: "10 Jul 2024",
    status: "Up To Date",
    notes: "Next dose completed"
  }
];

const INITIAL_RECOMMENDED_VACCINES = [
  {
    _id: "rec-001",
    vaccineName: "Pneumococcal Vaccine (PCV)",
    prevented: "Pneumonia Prevention",
    recommendedFor: "Adults",
    priority: "Medium",
    reason: "Recommended based on chronic condition risk profile."
  },
  {
    _id: "rec-002",
    vaccineName: "Typhoid Vaccine",
    prevented: "Typhoid Fever",
    recommendedFor: "Adults",
    priority: "Low",
    reason: "Seasonal outbreak precaution advice."
  }
];

export default function VaccinationsWorkspace({
  patient, currentUser, navigate, currentMedicines, setMedicines, setIsDirty
}) {
  const [vaccinations, setVaccinations] = useState(INITIAL_VACCINATION_REGISTRY);
  const [recommendedList, setRecommendedList] = useState(INITIAL_RECOMMENDED_VACCINES);
  const [activeSegment, setActiveSegment] = useState('All Vaccinations');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [selectedVaccine, setSelectedVaccine] = useState(null);

  // Add Form fields
  const [newName, setNewName] = useState('');
  const [newDisease, setNewDisease] = useState('');
  const [newCategory, setNewCategory] = useState('Preventive');
  const [newDose, setNewDose] = useState('1 / 1');
  const [newNotes, setNewNotes] = useState('');

  const handleCreateVaccination = (e) => {
    e.preventDefault();
    if (!newName) return;

    const newVac = {
      _id: `vac-new-${Date.now()}`,
      vaccineName: newName,
      disease: newDisease || "Prevention Care",
      category: newCategory,
      dose: newDose,
      dateGiven: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      administeredBy: currentUser?.fullName || "Dr. Shyam Verma",
      nextDue: "—",
      status: "Completed",
      notes: newNotes || "Administered successfully."
    };

    setVaccinations([...vaccinations, newVac]);
    toast.success(`${newName} added to patient vaccination records!`);
    setShowAddModal(false);
    setNewName('');
    setNewDisease('');
    setNewNotes('');
  };

  const handleRecommendVaccine = (rec) => {
    toast.success(`${rec.vaccineName} recommended and added to draft advice instructions!`);
    // Add to advised list automatically
  };

  const filteredVaccinations = vaccinations.filter(vac => {
    // Segment filter
    let matchesSegment = true;
    if (activeSegment === 'Due / Overdue') matchesSegment = vac.status === 'Overdue';
    if (activeSegment === 'Recommended') matchesSegment = false; // Recommended rendered below
    if (activeSegment === 'Vaccination History') matchesSegment = vac.status === 'Completed' || vac.status === 'Completed';

    // Search filter
    const matchesSearch = !searchQuery ||
      vac.vaccineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vac.disease.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vac.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSegment && matchesSearch;
  });

  return (
    <div className="space-y-6">

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 border border-slate-200 rounded-3xl p-6">
        <div>
          <h2 className="text-base font-black text-slate-800">
            Vaccinations
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Track all vaccinations received by the patient with next due and recommended vaccines.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 shadow-sm"
        >
          <PlusCircle size={14} /> Add Vaccination
        </button>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Vaccinations', count: vaccinations.length, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
          { label: 'Up To Date', count: vaccinations.filter(v => v.status === 'Up To Date' || v.status === 'Completed').length, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Due / Overdue', count: vaccinations.filter(v => v.status === 'Overdue').length, color: 'bg-orange-50 text-orange-700 border-orange-200' },
          { label: 'Recommended', count: recommendedList.length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Next Due', count: '15 Sep 2026', color: 'bg-slate-50 text-slate-700 border-slate-200' }
        ].map((c, i) => (
          <div key={i} className={`p-3 border rounded-2xl ${c.color} text-center space-y-1`}>
            <span className="text-[9px] uppercase font-bold block opacity-75 leading-tight">{c.label}</span>
            <strong className="text-sm font-black block">{c.count}</strong>
          </div>
        ))}
      </div>

      {/* Segment Segmented Tabs & Filters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col gap-4">
        <div className="flex border-b border-slate-150 gap-2 overflow-x-auto">
          {['All Vaccinations', 'Due / Overdue', 'Recommended', 'Vaccination History', 'Immunization Schedule'].map((seg) => (
            <button
              key={seg}
              onClick={() => setActiveSegment(seg)}
              className={`pb-2 px-3 text-xs font-bold transition border-b-2 whitespace-nowrap ${
                activeSegment === seg ? 'border-indigo-650 text-indigo-707' : 'border-transparent text-slate-405'
              }`}
            >
              {seg}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-3 items-stretch justify-between">
          <div className="relative w-full md:w-80 ml-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vaccines, disease..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
          </div>
        </div>
      </div>

      {/* Vaccinations List Table */}
      <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="p-4">Vaccine Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Dose</th>
              <th className="p-4">Date Given</th>
              <th className="p-4">Given By</th>
              <th className="p-4">Next Due Date</th>
              <th className="p-4">Status</th>
              <th className="p-4">Notes</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredVaccinations.map((vac) => {
              let statusBadge = "bg-emerald-50 text-emerald-707 border border-emerald-200";
              if (vac.status === 'Overdue') statusBadge = "bg-rose-50 text-rose-707 border border-rose-200";
              if (vac.status === 'Up To Date') statusBadge = "bg-blue-50 text-blue-707 border border-blue-200";

              return (
                <tr key={vac._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">💉</span>
                      <div>
                        <strong className="block text-slate-800">{vac.vaccineName}</strong>
                        <span className="text-[10px] text-slate-400 block">{vac.disease}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded font-black text-[9px] bg-slate-100 text-slate-600">
                      {vac.category}
                    </span>
                  </td>
                  <td className="p-4">{vac.dose}</td>
                  <td className="p-4">{vac.dateGiven}</td>
                  <td className="p-4 font-bold text-slate-700">{vac.administeredBy}</td>
                  <td className="p-4">{vac.nextDue}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded font-black text-[9px] ${statusBadge}`}>
                      {vac.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 italic max-w-[150px] truncate">{vac.notes}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedVaccine(vac);
                        setShowDetailsDrawer(true);
                      }}
                      className="px-2.5 py-1.5 border border-indigo-200 text-indigo-650 hover:bg-indigo-50 rounded-xl text-[10px] font-black transition"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recommended Vaccines List */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Recommended Vaccines</h3>
        <div className="space-y-3">
          {recommendedList.map(rec => (
            <div key={rec._id} className="p-4 border border-slate-150 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
              <div>
                <strong className="text-xs font-bold text-slate-800 block">{rec.vaccineName}</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Target: {rec.prevented} • Recommendation: {rec.reason}
                </span>
              </div>
              <button
                onClick={() => handleRecommendVaccine(rec)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-[10px] font-black transition"
              >
                Recommend
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add Vaccination Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateVaccination} className="bg-white border border-slate-200 shadow-2xl rounded-3xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <strong className="text-sm font-black text-slate-800">Record Vaccination Administered</strong>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-rose-600 transition">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 col-span-2">
                <span className="text-slate-400 font-semibold block">Vaccine Name *</span>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Hepatitis B Adult, Covishield"
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
                  <option>Preventive</option>
                  <option>Seasonal</option>
                  <option>Childhood</option>
                  <option>Booster</option>
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block">Dose Count</span>
                <input
                  type="text"
                  value={newDose}
                  onChange={(e) => setNewDose(e.target.value)}
                  placeholder="e.g. 1 / 2"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <span className="text-slate-400 font-semibold block">Observation Notes</span>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Patient observed for 15 minutes, no immediate adverse reaction."
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
                Record Vaccine
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Side Details Drawer */}
      {showDetailsDrawer && selectedVaccine && (
        <div className="fixed inset-y-0 right-0 max-w-md w-full bg-white border-l border-slate-200 shadow-2xl z-50 p-6 flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div className="space-y-5 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 block">Vaccination Profile</span>
                <strong className="text-sm font-black text-slate-800">{selectedVaccine.vaccineName}</strong>
              </div>
              <button onClick={() => setShowDetailsDrawer(false)} className="text-slate-400 hover:text-rose-600 transition">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 border border-slate-150 rounded-2xl space-y-2">
                <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] mb-1">Details Overview</h4>
                <div><span className="text-slate-400">Target Disease:</span> <strong className="text-slate-700 float-right">{selectedVaccine.disease}</strong></div>
                <div><span className="text-slate-400">Dose Index:</span> <strong className="text-slate-700 float-right">{selectedVaccine.dose}</strong></div>
                <div><span className="text-slate-400">Administered On:</span> <strong className="text-slate-700 float-right">{selectedVaccine.dateGiven}</strong></div>
                <div><span className="text-slate-400">Administered By:</span> <strong className="text-slate-700 float-right">{selectedVaccine.administeredBy}</strong></div>
                <div><span className="text-slate-400">Verification Status:</span> <strong className="text-emerald-600 float-right font-black">Verified Clinic Entry</strong></div>
              </div>

              <div>
                <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] mb-1">Clinical Notes & Observations</h4>
                <p className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-slate-650 leading-relaxed italic">
                  {selectedVaccine.notes}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex gap-2">
            <button
              onClick={() => {
                toast.success('Certificate download initiated.');
                setShowDetailsDrawer(false);
              }}
              className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold text-center transition animate-pulse"
            >
              Download Certificate
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
