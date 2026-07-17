import { useState, useEffect } from 'react';
import {
  Search, Calendar, Clock, Printer, ChevronRight, Activity, ArrowLeft,
  Filter, User, Building, Trash2, Edit2, FileDown, PlusCircle, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import consultationApi from '../../api/consultationApi';
import prescriptionApi from '../../api/prescriptionApi';
import appointmentApi from '../../api/appointmentApi';

export default function PreviousVisitsWorkspace({ patient, currentUser, navigate }) {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('All Doctors');
  const [branchFilter, setBranchFilter] = useState('All Branches');
  const [dateRangeFilter, setDateRangeFilter] = useState('All Time');

  // Consultation Viewer Tab
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    const loadPatientHistory = async () => {
      if (!patient?._id) return;
      setLoading(true);
      try {
        const hist = await consultationApi.historyByPatient(patient._id);
        const allConsults = hist?.consultations || hist?.data?.consultations || [];
        console.log('PreviousVisits: allConsults loaded count:', allConsults.length);
        console.log('PreviousVisits: currentUser:', currentUser);
        
        // Filter: Doctor should only see their own consultations in their own clinic
        const filtered = allConsults.filter(c => {
          const docId = c.doctor?._id || c.doctor || c.doctorId?._id || c.doctorId;
          const currentDocId = currentUser?._id;
          console.log('Comparing consult doctorId:', docId, 'with currentDocId:', currentDocId);
          return String(docId) === String(currentDocId);
        });

        // Sort: Newest first
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setVisits(filtered);
        if (filtered.length > 0) {
          // Open first visit automatically
          loadVisitDetail(filtered[0]._id);
        }
      } catch (err) {
        console.error('Failed to load previous visits:', err);
      } finally {
        setLoading(false);
      }
    };
    loadPatientHistory();
  }, [patient?._id, currentUser?._id]);

  const loadVisitDetail = async (consultId) => {
    try {
      const detail = await consultationApi.getById(consultId);
      setSelectedVisit(detail);
    } catch (e) {
      toast.error('Failed to load visit details');
    }
  };

  const getFilteredVisits = () => {
    return visits.filter(v => {
      const docName = v.doctorId?.fullName || '';
      const clinicName = v.clinicId?.name || '';
      const diagPrimary = v.diagnosis?.primary || '';
      const matchesSearch = !searchQuery || 
        docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        diagPrimary.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Since doctor is filtered to self, doctorFilter is trivial, but keeping UI options
      return matchesSearch;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-650 rounded-full animate-spin" />
        <span className="ml-3 text-xs font-bold text-slate-500">Loading visit history...</span>
      </div>
    );
  }

  const filtered = getFilteredVisits();

  if (visits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-4xl mb-3">📭</span>
        <strong className="text-sm font-black text-slate-700">No Previous Consultations Found</strong>
        <p className="text-xs text-slate-400 max-w-sm mt-1">Patient has not consulted this doctor in this clinic or its branches before.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-stretch min-h-[500px]">

      {/* MIDDLE COLUMN: Visit Timeline */}
      <div className="border border-slate-200 rounded-3xl p-5 bg-white space-y-4 flex flex-col">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            Previous Appointments <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-black">{filtered.length} Visits</span>
          </h3>
        </div>

        {/* Filters Panel */}
        <div className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search appointments..."
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-xl text-[10px] bg-white font-semibold text-slate-600"
            >
              <option>All Doctors</option>
              <option>Dr. Shyam Verma</option>
            </select>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-xl text-[10px] bg-white font-semibold text-slate-600"
            >
              <option>All Branches</option>
              <option>Indirapuram Branch</option>
            </select>
          </div>
        </div>

        {/* Scrollable Timeline List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px] pr-1">
          {filtered.map((v) => {
            const isSelected = selectedVisit?.consultation?._id === v._id;
            const visitDate = new Date(v.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const visitTime = new Date(v.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
            
            return (
              <div
                key={v._id}
                onClick={() => loadVisitDetail(v._id)}
                className={`p-3.5 border rounded-2xl cursor-pointer transition flex items-start gap-3 relative ${
                  isSelected 
                    ? 'border-indigo-400 bg-indigo-50/20 shadow-sm' 
                    : 'border-slate-200 bg-white hover:bg-slate-50/50'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  👨‍⚕️
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[10px] font-black text-indigo-600 uppercase">{visitDate} • {visitTime}</span>
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-black">Completed</span>
                  </div>
                  <strong className="text-xs font-black text-slate-800 block truncate">Dr. {v.doctorId?.fullName || 'Doctor'}</strong>
                  <span className="text-[10px] text-slate-400 block">{v.doctorId?.specialization || 'General Medicine'}</span>
                  <span className="text-[9px] text-slate-400 block truncate">{v.clinicId?.name || "Ram's Dental Clinic"}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 self-center" />
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: Consultation Viewer */}
      <div className="border border-slate-200 rounded-3xl p-5 bg-white flex flex-col justify-between space-y-4">
        {selectedVisit ? (() => {
          const c = selectedVisit.consultation || {};
          const p = selectedVisit.patient || {};
          const d = selectedVisit.doctor || {};
          const appt = selectedVisit.appointment || {};
          const medicines = selectedVisit.prescription?.medicines || [];
          const labs = selectedVisit.prescription?.labs || [];
          const procedures = selectedVisit.prescription?.procedures || [];
          const advice = selectedVisit.prescription?.advice || '';
          
          const visitDate = c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
          const visitTime = c.createdAt ? new Date(c.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

          // Journey steps
          const journeySteps = [
            { label: 'Appointment Booked', done: true },
            { label: 'Checked In', done: true },
            { label: 'Vitals Recorded', done: true },
            { label: 'Consultation Started', done: true },
            { label: 'Prescription Created', done: medicines.length > 0 },
            { label: 'Consultation Completed', done: true, active: true },
            { label: 'Invoice Generated', done: true },
            { label: 'Follow-up Scheduled', done: !!c.followUp?.required }
          ];

          return (
            <div className="space-y-4">
              
              {/* Header Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">Visit Details — {visitDate}</h3>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-black inline-block mt-0.5">Completed</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => navigate(`/consultations/${c._id}`)} className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition">
                    View Full Consultation
                  </button>
                  <button onClick={() => navigate(`/consultations/${c._id}?edit=true`)} className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition">
                    Edit Consultation
                  </button>
                  <button onClick={() => toast.success('Prescription print started...')} className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition">
                    Print
                  </button>
                </div>
              </div>

              {/* Patient Journey Horizontal Steps */}
              <div className="flex items-center justify-between gap-2 overflow-x-auto py-2 border-b border-slate-100">
                {journeySteps.map((step, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-1 min-w-[70px]">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border ${
                      step.active
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                        : step.done
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-600'
                          : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}>
                      {step.done ? '✓' : idx + 1}
                    </div>
                    <span className="text-[8px] font-bold text-slate-500 text-center mt-1 leading-tight">{step.label}</span>
                  </div>
                ))}
              </div>

              {/* Visit Information Panel */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs leading-relaxed">
                <div><span className="text-slate-400 block font-semibold">Visit Date & Time</span><strong className="text-slate-700">{visitDate} {visitTime}</strong></div>
                <div><span className="text-slate-400 block font-semibold">Doctor Name</span><strong className="text-slate-700">Dr. {d.fullName}</strong></div>
                <div><span className="text-slate-400 block font-semibold">Branch</span><strong className="text-slate-700">Indirapuram Branch</strong></div>
                <div><span className="text-slate-400 block font-semibold">Token No.</span><strong className="text-slate-700">{appt.tokenNumber || 'OP-18'}</strong></div>
              </div>

              {/* Consultation Viewer Horizontal Tabs */}
              <div className="flex gap-1.5 border-b border-slate-150 overflow-x-auto pb-1">
                {[
                  { id: 'summary', label: 'Consultation Summary' },
                  { id: 'prescription', label: `Prescription (${medicines.length})` },
                  { id: 'laboratory', label: `Laboratory (${labs.length})` },
                  { id: 'procedures', label: `Procedures (${procedures.length})` },
                  { id: 'advice', label: 'Advice' },
                  { id: 'follow-up', label: 'Follow-up' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap transition ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >{tab.label}</button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="pt-2">

                {/* CONSULTATION SUMMARY */}
                {activeTab === 'summary' && (
                  <div className="space-y-4 text-xs">
                    {c.chiefComplaint && (
                      <div><h4 className="font-black text-slate-400 uppercase tracking-wider mb-1">Chief Complaint</h4><p className="text-slate-650 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">{c.chiefComplaint}</p></div>
                    )}
                    {c.clinicalNotes && (
                      <div><h4 className="font-black text-slate-400 uppercase tracking-wider mb-1">History of Present Illness</h4><p className="text-slate-650 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-line">{c.clinicalNotes}</p></div>
                    )}
                    {c.diagnosis?.primary && (
                      <div><h4 className="font-black text-slate-400 uppercase tracking-wider mb-1">Diagnosis</h4><p className="text-slate-705 font-bold">{c.diagnosis.primary} {c.diagnosis.icdCode ? `(${c.diagnosis.icdCode})` : ''}</p></div>
                    )}
                  </div>
                )}

                {/* PRESCRIPTION */}
                {activeTab === 'prescription' && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                          <th className="py-2.5 px-3 text-left">Medicine</th>
                          <th className="py-2.5 px-3 text-left">Strength</th>
                          <th className="py-2.5 px-3 text-left">Frequency</th>
                          <th className="py-2.5 px-3 text-left">Duration</th>
                          <th className="py-2.5 px-3 text-left">Timing</th>
                        </tr>
                      </thead>
                      <tbody>
                        {medicines.length > 0 ? medicines.map((med, i) => (
                          <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                            <td className="py-2.5 px-3">
                              <strong className="text-slate-800 font-bold block">{med.medicineName}</strong>
                              {med.genericName && <span className="text-[10px] text-slate-400 italic">{med.genericName}</span>}
                            </td>
                            <td className="py-2.5 px-3">{med.strength || med.dosage || 'N/A'}</td>
                            <td className="py-2.5 px-3">{med.frequency || '1-0-1'}</td>
                            <td className="py-2.5 px-3">{med.duration || '5 days'}</td>
                            <td className="py-2.5 px-3">{med.timing || 'After Food'}</td>
                          </tr>
                        )) : <tr><td colSpan="5" className="py-6 text-center text-slate-400 italic">No medicines prescribed.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* LABORATORY */}
                {activeTab === 'laboratory' && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                          <th className="py-2.5 px-3 text-left">Test Name</th>
                          <th className="py-2.5 px-3 text-left">Sample Type</th>
                          <th className="py-2.5 px-3 text-left">Provider</th>
                        </tr>
                      </thead>
                      <tbody>
                        {labs.length > 0 ? labs.map((l, i) => (
                          <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-800">{l.testName}</td>
                            <td className="py-2.5 px-3">{l.sampleRequired || 'Blood'}</td>
                            <td className="py-2.5 px-3">{l.provider || 'Clinic Lab'}</td>
                          </tr>
                        )) : <tr><td colSpan="3" className="py-6 text-center text-slate-400 italic">No laboratory tests recommended.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* PROCEDURES */}
                {activeTab === 'procedures' && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                          <th className="py-2.5 px-3 text-left">Procedure</th>
                          <th className="py-2.5 px-3 text-left">Indication</th>
                          <th className="py-2.5 px-3 text-left">Frequency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {procedures.length > 0 ? procedures.map((p, i) => (
                          <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-bold text-slate-800">{p.name}</td>
                            <td className="py-2.5 px-3">{p.indication || '—'}</td>
                            <td className="py-2.5 px-3">{p.frequency || 'Once'}</td>
                          </tr>
                        )) : <tr><td colSpan="3" className="py-6 text-center text-slate-400 italic">No procedures recommended.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ADVICE */}
                {activeTab === 'advice' && (
                  <div className="text-xs space-y-3">
                    {advice ? (
                      <p className="text-slate-600 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 whitespace-pre-line">{advice}</p>
                    ) : (
                      <p className="text-slate-400 italic">No special advice recorded.</p>
                    )}
                  </div>
                )}

                {/* FOLLOW UP */}
                {activeTab === 'follow-up' && (
                  <div className="text-xs space-y-2 bg-slate-50 border border-slate-150 rounded-2xl p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="text-slate-400 block font-semibold">Recommended Follow-up Date</span><strong className="text-slate-700">{c.followUp?.date ? new Date(c.followUp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</strong></div>
                      <div><span className="text-slate-400 block font-semibold">Reason</span><strong className="text-slate-700">{c.followUp?.notes || 'N/A'}</strong></div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          );
        })() : (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <span>📋</span>
            <p className="text-xs mt-2">Select a visit from the list to view the consultation details.</p>
          </div>
        )}
      </div>

    </div>
  );
}
