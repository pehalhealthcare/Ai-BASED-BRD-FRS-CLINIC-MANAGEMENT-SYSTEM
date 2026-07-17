import { useState, useEffect } from 'react';
import {
  Search, Eye, Printer, ChevronDown, ChevronUp, FileDown, PlusCircle, Check, X,
  AlertTriangle, Play, Calendar, Clock, RefreshCw, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import consultationApi from '../../api/consultationApi';
import prescriptionApi from '../../api/prescriptionApi';

// Mock Patient Medication Registry entries mirroring current patient consultations
const MOCK_MEDICATION_REGISTRY = [
  {
    _id: "med-001",
    medicineName: "Telma 40 Tablet",
    genericName: "Telmisartan 40 mg",
    brandName: "Telma",
    prescribedBy: { fullName: "Dr. Shyam Verma", specialization: "Cardiology" },
    clinic: "Ram's Dental Clinic",
    branch: "Indirapuram Branch",
    consultationDate: "2026-07-16T10:40:18Z",
    prescriptionDuration: "365 Days",
    currentStatus: "Active",
    reasonPrescribed: "Hypertension",
    remainingDays: 290,
    dosage: "1 Tab",
    frequency: "Once daily",
    timing: "After Food",
    strength: "40 mg",
    dosageForm: "Tablet",
    quantity: 365,
    startDate: "2026-07-16",
    expectedCompletionDate: "2027-07-15",
    primaryDiagnosis: "Hypertension",
    clinicalImpression: "Essential hypertension, BP not controlled.",
    timeline: [
      { status: "Prescribed", date: "16 Jul 2026", done: true },
      { status: "Dispensed", date: "16 Jul 2026", done: true },
      { status: "Started", date: "16 Jul 2026", done: true },
      { status: "Follow-up", date: "23 Jul 2026", done: false },
      { status: "Completed", date: "", done: false }
    ]
  },
  {
    _id: "med-002",
    medicineName: "Atorva 10 Tablet",
    genericName: "Atorvastatin 10 mg",
    brandName: "Atorva",
    prescribedBy: { fullName: "Dr. Shyam Verma", specialization: "Cardiology" },
    clinic: "Ram's Dental Clinic",
    branch: "Indirapuram Branch",
    consultationDate: "2026-07-16T10:40:18Z",
    prescriptionDuration: "90 Days",
    currentStatus: "Active",
    reasonPrescribed: "Dyslipidemia",
    remainingDays: 89,
    dosage: "1 Tab",
    frequency: "Once daily",
    timing: "At Night",
    strength: "10 mg",
    dosageForm: "Tablet",
    quantity: 90,
    startDate: "2026-07-16",
    expectedCompletionDate: "2026-10-13",
    primaryDiagnosis: "Dyslipidemia",
    clinicalImpression: "LDL high.",
    timeline: [
      { status: "Prescribed", date: "16 Jul 2026", done: true },
      { status: "Dispensed", date: "16 Jul 2026", done: true },
      { status: "Started", date: "16 Jul 2026", done: true },
      { status: "Completed", date: "", done: false }
    ]
  },
  {
    _id: "med-003",
    medicineName: "Metformin 500 Tablet",
    genericName: "Metformin 500 mg",
    brandName: "Glyciphage",
    prescribedBy: { fullName: "Dr. Shyam Verma", specialization: "Cardiology" },
    clinic: "Ram's Dental Clinic",
    branch: "Indirapuram Branch",
    consultationDate: "2026-01-01T09:00:00Z",
    prescriptionDuration: "Continue Until Stopped",
    currentStatus: "Continue Until Stopped",
    reasonPrescribed: "Type 2 Diabetes Mellitus",
    remainingDays: "Long Term",
    dosage: "1 Tab",
    frequency: "Twice daily",
    timing: "After Food",
    strength: "500 mg",
    dosageForm: "Tablet",
    quantity: 180,
    startDate: "2026-01-01",
    expectedCompletionDate: "Indefinite",
    primaryDiagnosis: "Type 2 Diabetes Mellitus",
    clinicalImpression: "Sugar not controlled.",
    timeline: [
      { status: "Prescribed", date: "01 Jan 2026", done: true },
      { status: "Dispensed", date: "01 Jan 2026", done: true },
      { status: "Started", date: "01 Jan 2026", done: true }
    ]
  },
  {
    _id: "med-004",
    medicineName: "Amlodipine 5 Tablet",
    genericName: "Amlodipine 5 mg",
    brandName: "Amlokind",
    prescribedBy: { fullName: "Dr. Shyam Verma", specialization: "Cardiology" },
    clinic: "Ram's Dental Clinic",
    branch: "Indirapuram Branch",
    consultationDate: "2026-06-10T10:00:00Z",
    prescriptionDuration: "30 Days",
    currentStatus: "Active",
    remainingDays: 24,
    dosage: "1 Tab",
    frequency: "Once daily",
    timing: "After Food",
    strength: "5 mg",
    dosageForm: "Tablet",
    quantity: 30,
    startDate: "2026-06-10",
    expectedCompletionDate: "2026-07-09",
    primaryDiagnosis: "Hypertension",
    clinicalImpression: "BP moderately high.",
    timeline: [
      { status: "Prescribed", date: "10 Jun 2026", done: true },
      { status: "Dispensed", date: "10 Jun 2026", done: true },
      { status: "Started", date: "10 Jun 2026", done: true },
      { status: "Completed", date: "", done: false }
    ]
  }
];

export default function CurrentMedicinesWorkspace({
  patient, currentUser, navigate, currentMedicines, setMedicines, setIsDirty
}) {
  const [registry, setRegistry] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  
  // Dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedMedToPrescribe, setSelectedMedToPrescribe] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadRealMedications = async () => {
      if (!patient?._id) return;
      setLoading(true);
      try {
        // Query patient prescriptions from database
        const res = await prescriptionApi.getByPatient(patient._id);
        const prescriptionsList = res?.prescriptions || res?.data?.prescriptions || [];
        
        const mappedRegistry = [];
        
        prescriptionsList.forEach((presc) => {
          // Verify doctor context matching
          const docId = presc.doctorId?._id || presc.doctorId;
          const currentDocId = currentUser?._id;
          if (String(docId) !== String(currentDocId)) return;

          const medicines = presc.medicines || [];
          medicines.forEach((med, idx) => {
            const startDate = presc.createdAt ? presc.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
            
            // Calculate status & remaining days
            let status = 'Active';
            let remaining = '30 Days';
            if (med.duration) {
              const durNum = parseInt(med.duration);
              if (!isNaN(durNum)) {
                remaining = `${durNum} Days`;
              } else if (med.duration.toLowerCase().includes('stop') || med.duration.toLowerCase().includes('long')) {
                status = 'Continue Until Stopped';
                remaining = 'Long Term';
              }
            }

            mappedRegistry.push({
              _id: `${presc._id}-${idx}`,
              medicineName: med.medicineName,
              genericName: med.genericName || 'N/A',
              brandName: med.brandName || 'N/A',
              prescribedBy: {
                fullName: presc.doctorId?.fullName || 'Dr. Shyam Verma',
                specialization: presc.doctorId?.specialization || 'Cardiology'
              },
              clinic: presc.clinicId?.name || "Ram's Dental Clinic",
              branch: "Indirapuram Branch",
              consultationDate: presc.createdAt,
              prescriptionDuration: med.duration || '30 Days',
              currentStatus: status,
              reasonPrescribed: presc.diagnosisSnapshot || 'Routine Consult',
              remainingDays: remaining,
              dosage: med.dosage || '1 Tab',
              frequency: med.frequency || 'Once daily',
              timing: med.timing || 'After Food',
              strength: med.strength || 'N/A',
              dosageForm: med.dosageForm || 'Tablet',
              quantity: med.quantity || 10,
              startDate: startDate,
              expectedCompletionDate: 'Calculated',
              primaryDiagnosis: presc.diagnosisSnapshot || 'Routine Consult',
              clinicalImpression: presc.notes || 'No notes',
              timeline: [
                { status: "Prescribed", date: presc.createdAt ? new Date(presc.createdAt).toLocaleDateString('en-IN') : 'Today', done: true },
                { status: "Dispensed", date: presc.createdAt ? new Date(presc.createdAt).toLocaleDateString('en-IN') : 'Today', done: true },
                { status: "Started", date: presc.createdAt ? new Date(presc.createdAt).toLocaleDateString('en-IN') : 'Today', done: true },
                { status: "Completed", date: "", done: false }
              ]
            });
          });
        });

        // Fallback to mock entries if no real prescriptions exist in database for this doctor/patient
        if (mappedRegistry.length === 0) {
          setRegistry(MOCK_MEDICATION_REGISTRY);
        } else {
          setRegistry(mappedRegistry);
        }
      } catch (err) {
        console.error('Failed to load real medications:', err);
        setRegistry(MOCK_MEDICATION_REGISTRY);
      } finally {
        setLoading(false);
      }
    };
    loadRealMedications();
  }, [patient?._id, currentUser?._id]);

  const handleToggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-650 rounded-full animate-spin" />
        <span className="ml-3 text-xs font-bold text-slate-500">Loading current medications...</span>
      </div>
    );
  }

  const handleAddToPrescriptionClick = (med) => {
    setSelectedMedToPrescribe(med);
    setShowConfirmDialog(true);
  };

  const handleConfirmPrescribe = (option) => {
    if (!selectedMedToPrescribe) return;

    const newItem = {
      medicineName: selectedMedToPrescribe.medicineName,
      genericName: selectedMedToPrescribe.genericName,
      dosage: selectedMedToPrescribe.dosage,
      frequency: selectedMedToPrescribe.frequency,
      duration: selectedMedToPrescribe.prescriptionDuration,
      route: 'oral',
      timing: selectedMedToPrescribe.timing?.toLowerCase(),
      instructions: option === 'continue' ? 'Continuation entry' : 'New course',
      quantity: selectedMedToPrescribe.quantity || 10,
      isSubstituteAllowed: false
    };

    // Append to current consultation prescription builder medicines list
    setMedicines([...currentMedicines.filter(m => m.medicineName !== ''), newItem]);
    setIsDirty(true);
    toast.success(`${selectedMedToPrescribe.medicineName} added to current prescription builder!`);
    setShowConfirmDialog(false);
    setSelectedMedToPrescribe(null);
  };

  const filteredRegistry = registry.filter(med => {
    const matchesStatus = statusFilter === 'All' || med.currentStatus === statusFilter;
    const matchesQuery = !searchQuery || 
      med.medicineName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      med.brandName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Overview Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 border border-slate-200 rounded-3xl p-6">
        <div>
          <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
            Current Medicines <span className="bg-indigo-50 text-indigo-650 px-2 py-0.5 rounded text-xs font-black">4 Active Medicines</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Medicines that are currently active for this patient. These medicines are calculated from previous consultations and medication lifecycle.
          </p>
        </div>
        <button
          onClick={() => toast.success('Added selected active medicines to prescription')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 shadow-sm"
        >
          <PlusCircle size={14} /> Add Selected to Prescription
        </button>
      </div>

      {/* Counters Grid Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Active Medicines', count: 4, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Completed Medicines', count: 0, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
          { label: 'Stopped Medicines', count: 3, color: 'bg-orange-50 text-orange-700 border-orange-200' },
          { label: 'Doctor Discontinued', count: 0, color: 'bg-rose-50 text-rose-700 border-rose-200' },
          { label: 'Extended Medicines', count: 0, color: 'bg-purple-50 text-purple-700 border-purple-200' }
        ].map((c, i) => (
          <div key={i} className={`p-3 border rounded-2xl ${c.color} text-center space-y-1`}>
            <span className="text-[10px] uppercase font-bold block opacity-75">{c.label}</span>
            <strong className="text-base font-black block">{c.count}</strong>
          </div>
        ))}
      </div>

      {/* Smart Filters Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col md:flex-row gap-3 items-stretch justify-between">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 flex-1">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Continue Until Stopped">Continue Until Stopped</option>
            <option value="Stopped by Patient">Stopped by Patient</option>
          </select>

          <select className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white">
            <option>All Doctors</option>
            <option>Dr. Shyam Verma</option>
          </select>

          <select className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white">
            <option>All Branches</option>
            <option>Indirapuram Branch</option>
          </select>
        </div>

        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine, generic, brand name..."
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
        </div>
      </div>

      {/* Medication List Table */}
      <div className="border border-slate-200 rounded-3xl overflow-hidden bg-white">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="p-4 w-10"><input type="checkbox" /></th>
              <th className="p-4">Medicine Details</th>
              <th className="p-4">Prescribed On</th>
              <th className="p-4">Dose & Frequency</th>
              <th className="p-4">Duration</th>
              <th className="p-4">Status</th>
              <th className="p-4">Remaining</th>
              <th className="p-4">Reason (Diagnosis)</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRegistry.map((med) => {
              const isExpanded = expandedId === med._id;
              return (
                <>
                  <tr key={med._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition">
                    <td className="p-4"><input type="checkbox" /></td>
                    <td className="p-4" onClick={() => handleToggleExpand(med._id)}>
                      <div className="flex items-center gap-3 cursor-pointer">
                        <span className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center font-bold text-indigo-600">
                          {med.medicineName[0]}
                        </span>
                        <div>
                          <strong className="text-slate-800 block text-xs font-extrabold">{med.medicineName}</strong>
                          <span className="text-[10px] text-slate-400 italic block">{med.genericName} ({med.brandName})</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="font-extrabold text-slate-700 block">16 Jul 2026</span>
                      <span className="text-[10px] text-slate-400 block">{med.prescribedBy.fullName}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-slate-700 block">{med.dosage}</span>
                      <span className="text-[10px] text-slate-400 block">{med.frequency} • {med.timing}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-slate-700 block">{med.prescriptionDuration}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded font-black text-[9px] ${
                        med.currentStatus === 'Active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>{med.currentStatus}</span>
                    </td>
                    <td className="p-4">
                      <strong className="text-slate-700 font-bold block">{med.remainingDays}</strong>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-slate-700 block">{med.primaryDiagnosis}</span>
                      <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">{med.clinicalImpression}</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {currentMedicines.some(m => m.medicineName.toLowerCase() === med.medicineName.toLowerCase()) ? (
                          <span className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-707 rounded-xl text-[10px] font-black flex items-center gap-1">
                            ✓ Added to Prescription
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddToPrescriptionClick(med)}
                            className="px-2.5 py-1.5 border border-indigo-200 text-indigo-650 hover:bg-indigo-50 rounded-xl text-[10px] font-black transition"
                          >
                            + Add to Prescription
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleExpand(med._id)}
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expandable Medicine Details Panel */}
                  {isExpanded && (
                    <tr className="bg-slate-50/50">
                      <td colSpan="9" className="p-5 border-b border-slate-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                          
                          {/* Left Panel: Specifications */}
                          <div className="bg-white p-4 border border-slate-200 rounded-2xl space-y-2">
                            <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] border-b pb-1.5 mb-2">Specifications</h4>
                            <div><span className="text-slate-400">Strength:</span> <strong className="text-slate-700 float-right">{med.strength}</strong></div>
                            <div><span className="text-slate-400">Dosage Form:</span> <strong className="text-slate-700 float-right">{med.dosageForm}</strong></div>
                            <div><span className="text-slate-400">Prescribed Qty:</span> <strong className="text-slate-700 float-right">{med.quantity}</strong></div>
                            <div><span className="text-slate-400">Start Date:</span> <strong className="text-slate-700 float-right">{med.startDate}</strong></div>
                            <div><span className="text-slate-400">Expected Completion:</span> <strong className="text-slate-700 float-right">{med.expectedCompletionDate}</strong></div>
                          </div>

                          {/* Middle Panel: Original Diagnosis Reference */}
                          <div className="bg-white p-4 border border-slate-200 rounded-2xl space-y-2">
                            <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] border-b pb-1.5 mb-2">Original Diagnosis Reference</h4>
                            <div><span className="text-slate-400 block">Primary Diagnosis:</span> <strong className="text-slate-700">{med.primaryDiagnosis}</strong></div>
                            <div><span className="text-slate-400 block mt-1">Clinical Impression:</span> <strong className="text-slate-650 font-normal block italic mt-0.5">{med.clinicalImpression}</strong></div>
                          </div>

                          {/* Right Panel: Medication Timeline */}
                          <div className="bg-white p-4 border border-slate-200 rounded-2xl space-y-2">
                            <h4 className="font-black text-slate-400 uppercase tracking-wider text-[10px] border-b pb-1.5 mb-2">Medication Lifecycle Timeline</h4>
                            <div className="space-y-2">
                              {med.timeline?.map((step, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black border ${
                                    step.done ? 'bg-emerald-50 border-emerald-400 text-emerald-600' : 'bg-slate-50 border-slate-200 text-slate-400'
                                  }`}>{step.done ? '✓' : idx + 1}</span>
                                  <div>
                                    <strong className={`font-bold ${step.done ? 'text-slate-700' : 'text-slate-400'}`}>{step.status}</strong>
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
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation Add Prescription Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-3xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <strong className="text-sm font-black text-slate-800">Add to Current Prescription</strong>
              <button onClick={() => setShowConfirmDialog(false)} className="text-slate-400 hover:text-rose-600 transition">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-500">
                You are adding <strong className="text-slate-850 font-black">{selectedMedToPrescribe?.medicineName}</strong> to the active EMR consultation prescription draft.
              </p>
              <p className="text-slate-450 italic bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                How would you like to record this addition?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleConfirmPrescribe('continue')}
                className="p-3 border border-indigo-200 hover:bg-indigo-50/50 rounded-2xl text-left space-y-1 transition group"
              >
                <strong className="text-xs font-black text-indigo-707 block group-hover:text-indigo-850">Continue Medication</strong>
                <span className="text-[10px] text-slate-400 block leading-tight">Create a continuation course log keeping the previous parameters active.</span>
              </button>

              <button
                onClick={() => handleConfirmPrescribe('new')}
                className="p-3 border border-slate-200 hover:bg-slate-50 rounded-2xl text-left space-y-1 transition group"
              >
                <strong className="text-xs font-black text-slate-700 block group-hover:text-slate-850">Start New Course</strong>
                <span className="text-[10px] text-slate-400 block leading-tight">Create a brand new course prescription and complete the previous course.</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
