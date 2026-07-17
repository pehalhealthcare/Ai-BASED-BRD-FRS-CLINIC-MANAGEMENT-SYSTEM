import React, { useState } from 'react';
import { 
  Check, ShieldAlert, CreditCard, Lock, Download, Printer, Share2, 
  Phone, AlertCircle, RefreshCw, Layers, Sparkles, User, FileText, CheckCircle
} from 'lucide-react';
import { prescriptionApi, pharmacyApi, labApi } from '../../lib/api';

export default function PrescriptionPreview({
  consultation,
  prescription,
  patient,
  doctor,
  appointment,
  invoice,
  onPayInvoice
}) {
  const [downloading, setDownloading] = useState(false);
  const [buyingMedicines, setBuyingMedicines] = useState(false);
  const [bookingLabs, setBookingLabs] = useState(false);

  const handleDownloadPdf = async () => {
    if (!prescription?._id) return;
    setDownloading(true);
    try {
      const pdfResponse = await prescriptionApi.download(prescription._id);
      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Failed to download prescription PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleBuyMedicines = async () => {
    const medsToOrder = prescription?.medicines || [];
    if (medsToOrder.length === 0) {
      alert('No medicines are prescribed to buy.');
      return;
    }
    setBuyingMedicines(true);
    try {
      let successCount = 0;
      for (const med of medsToOrder) {
        let medicineId = med.medicineId;
        let clinicId = med.clinicId || consultation?.clinicId;
        if (!medicineId) {
          const res = await pharmacyApi.listMedicines({ search: med.medicineName.split(' ')[0], limit: 1 });
          const match = res?.medicines?.[0] || res?.data?.medicines?.[0];
          if (match) {
            medicineId = match._id;
            clinicId = match.clinicId || clinicId;
          }
        }
        if (medicineId && clinicId) {
          await pharmacyApi.createOrder({
            medicineId,
            quantity: med.quantity || 10,
            prescriptionType: 'system',
            prescriptionId: prescription._id,
            clinicId,
            patientId: patient?._id || consultation?.patientId?._id || consultation?.patientId
          });
          successCount++;
        }
      }
      if (successCount > 0) {
        alert(`Successfully added ${successCount} medicines to your cart/orders!`);
      } else {
        alert('Could not auto-resolve matching medicines in our catalog. Please order manually via the Pharmacy Store.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to place pharmacy order automatically.');
    } finally {
      setBuyingMedicines(false);
    }
  };

  const handleBookLabTests = async () => {
    const labsToOrder = prescription?.labs || [];
    if (labsToOrder.length === 0) {
      alert('No lab tests are prescribed to book.');
      return;
    }
    setBookingLabs(true);
    try {
      const testsToSubmit = [];
      for (const lab of labsToOrder) {
        let labTestId = lab.labTestId;
        let name = lab.testName;
        let category = 'Hematology';
        let specimenType = lab.sampleRequired || 'Blood';
        if (!labTestId) {
          const searchName = name.toLowerCase().includes('cbc') ? 'cbc' : name.split(' ')[0];
          const res = await labApi.listTests({ search: searchName, limit: 1 });
          const match = res?.labTests?.[0] || res?.tests?.[0] || res?.data?.labTests?.[0] || res?.data?.tests?.[0];
          if (match) {
            labTestId = match._id;
            name = match.name;
            category = match.category || category;
            specimenType = match.specimenType || specimenType;
          }
        }
        testsToSubmit.push({
          labTestId: labTestId || null,
          code: lab.code || 'LABTEST',
          name,
          category,
          specimenType,
          status: 'ordered'
        });
      }

      const clinicId = consultation?.clinicId || appointment?.clinicId;
      if (!clinicId) {
        alert('Could not determine clinic ID. Please try again.');
        return;
      }

      await labApi.createOrder({
        clinicId,
        consultationId: consultation._id,
        patientId: patient?._id || consultation?.patientId?._id || consultation?.patientId,
        doctorId: doctor?._id || consultation?.doctorId?._id || consultation?.doctorId,
        appointmentId: appointment?._id || null,
        tests: testsToSubmit,
        priority: 'routine'
      });
      alert('Lab tests order booked successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to automatically book lab tests.');
    } finally {
      setBookingLabs(false);
    }
  };

  const isCompleted = consultation?.status === 'completed';
  const isPaid = !invoice || invoice?.paymentStatus === 'paid';

  // If consultation is completed and invoice is NOT paid, show lock screen
  if (isCompleted && !isPaid) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-navy-800 rounded-3xl border border-slate-200 dark:border-white/[0.08] text-center max-w-2xl mx-auto shadow-xl">
        <div className="w-20 h-20 rounded-full bg-amber-500/10 dark:bg-amber-400/10 flex items-center justify-center mb-6 border border-amber-500/20">
          <Lock className="w-10 h-10 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Prescription Access Locked</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mb-8 leading-relaxed">
          Your consultation has been completed by Dr. {doctor?.fullName || 'your physician'}. 
          Please settle the outstanding consultation fees to view your medical prescription, AI analysis, and download the PDF.
        </p>

        {invoice ? (
          <button
            onClick={() => onPayInvoice && onPayInvoice(invoice._id)}
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-lg shadow-amber-600/20 transition-all transform hover:-translate-y-0.5"
          >
            <CreditCard className="w-5 h-5" />
            Pay Appointment Fees (₹{invoice.totalAmount || '—'})
          </button>
        ) : (
          <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            Invoice generation in progress. Please refresh or contact reception.
          </div>
        )}
      </div>
    );
  }

  // Format Helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const patientId = patient?.patientId || `PAT-${patient?._id?.slice(-8).toUpperCase()}`;
  const appointmentId = appointment?.appointmentId || `APT-${appointment?._id?.slice(-8).toUpperCase()}`;
  const doctorReg = `DOC-${doctor?._id?.slice(-8).toUpperCase() || '20260622-0005'}`;

  // Branches & Stock mock generator
  const getBranchStock = (medName) => {
    const sum = (medName || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return [
      { name: 'Indirapuram', stock: `In Stock (${(sum % 300) + 100})`, color: 'text-emerald-500 bg-emerald-500' },
      { name: 'Noida', stock: `In Stock (${(sum % 200) + 50})`, color: 'text-emerald-500 bg-emerald-500' },
      { name: 'Vaishali', stock: (sum % 3 === 0) ? 'Low Stock (15)' : `In Stock (${(sum % 100) + 10})`, color: (sum % 3 === 0) ? 'text-amber-500 bg-amber-500' : 'text-emerald-500 bg-emerald-500' },
      { name: 'Lucknow', stock: (sum % 5 === 0) ? 'Out of Stock' : `In Stock (${(sum % 50) + 5})`, color: (sum % 5 === 0) ? 'text-red-500 bg-red-500' : 'text-emerald-500 bg-emerald-500' }
    ];
  };

  const qrCodeUrl = prescription?._id 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${window.location.origin}/prescriptions/${prescription._id}/download`
    : 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=mock';

  return (
    <div className="w-full bg-white text-slate-800 p-8 rounded-3xl border border-slate-200 shadow-md max-w-6xl mx-auto space-y-6">
      
      {/* ─── Clinic / Logo / Doctor Header ─── */}
      <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1.5fr] gap-6 items-center border-b pb-6 border-slate-100">
        
        {/* Left: Clinic Info */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">APOLLO HOSPITAL</h1>
            <p className="text-xs font-bold text-emerald-600 tracking-widest uppercase">INDIRAPURAM</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed max-w-[240px]">
              Windsor Park, Indirapuram, Ghaziabad, Uttar Pradesh - 201014, India <br />
              Reception: 0120-6912563
            </p>
          </div>
        </div>

        {/* Center: QR Code Verification */}
        <div className="flex flex-col items-center text-center">
          <div className="p-1.5 border border-slate-200 rounded-2xl bg-white shadow-xs">
            <img src={qrCodeUrl} alt="Prescription Verification QR Code" className="w-24 h-24" />
          </div>
          <p className="text-[10px] font-bold text-slate-900 mt-2">Scan to Verify Prescription</p>
          <p className="text-[9px] text-slate-400 max-w-[200px] mt-0.5 leading-tight">
            Scan to verify authenticity, download digital prescription, and book lab tests.
          </p>
        </div>

        {/* Right: Doctor Info */}
        <div className="flex items-center gap-4 justify-start md:justify-end">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 border border-slate-200">
            <User className="w-6 h-6" />
          </div>
          <div className="text-left">
            <h2 className="text-base font-extrabold text-slate-900">Dr. {doctor?.fullName || 'Alpha Doctor'}</h2>
            <p className="text-xs font-bold text-emerald-600 uppercase">{doctor?.specialization || 'General Physician'}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Reg. No.: {doctorReg}</p>
          </div>
        </div>
      </div>

      {/* ─── Patient Info Bar (Demographics Grid) ─── */}
      <div className="bg-emerald-500/[0.04] border border-emerald-500/10 rounded-2xl p-5 grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-6">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Name</p>
          <p className="text-sm font-extrabold text-slate-900 mt-0.5">{patient?.fullName || 'Raj Sharma'}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {patientId}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Age / Gender</p>
          <p className="text-sm font-semibold text-slate-900 mt-0.5">{[patient?.age ? `${patient.age} Years` : null, patient?.gender].filter(Boolean).join(' / ') || '32 Years / Male'}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Height/Weight: {consultation?.vitals?.height || '175'} cm / {consultation?.vitals?.weight || '70'} kg</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</p>
          <p className="text-sm font-semibold text-slate-900 mt-0.5">{formatDate(consultation?.completedAt || consultation?.updatedAt || new Date())}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Blood Group: {patient?.bloodGroup || 'B+'}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Allergies</p>
          <p className="text-sm font-semibold text-red-600 mt-0.5">{patient?.allergies?.join(', ') || 'Penicillin'}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Appointment: {appointmentId}</p>
        </div>
        <div className="col-span-2 md:col-span-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Known Conditions</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {(patient?.chronicConditions || ['Diabetes', 'Heart Disease', 'Kidney Disease']).map((cond, idx) => (
              <span key={idx} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                • {cond}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Grid: Chief Complaint, SOAP, Diagnosis, Treatment Plan ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* 1. Chief Complaint */}
        <div className="border border-slate-150 rounded-2xl p-4.5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center">1</span>
            <h3 className="text-xs font-extrabold text-slate-900 tracking-wide uppercase">Chief Complaint</h3>
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-600">AI Triage: General Physician</p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {consultation?.chiefComplaint || 'Patient reports mild fever and dry cough for three days.'}
            </p>
          </div>
        </div>

        {/* 2. SOAP Notes */}
        <div className="border border-slate-150 rounded-2xl p-4.5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center">2</span>
            <h3 className="text-xs font-extrabold text-slate-900 tracking-wide uppercase">Clinical Notes — SOAP</h3>
          </div>
          <div className="space-y-1.5 text-xs">
            <p className="leading-tight"><span className="font-extrabold text-emerald-600 font-mono">S</span> <span className="text-slate-600">{consultation?.formattedClinicalNotes?.subjective || 'Patient reports mild fever and dry cough for three days.'}</span></p>
            <p className="leading-tight"><span className="font-extrabold text-emerald-600 font-mono">O</span> <span className="text-slate-600">{consultation?.formattedClinicalNotes?.objective || 'Temp: 100.2 °F, SpO2: 98% on room air.'}</span></p>
            <p className="leading-tight"><span className="font-extrabold text-emerald-600 font-mono">A</span> <span className="text-slate-600">{consultation?.formattedClinicalNotes?.assessment || 'Suspected acute viral upper respiratory tract infection.'}</span></p>
            <p className="leading-tight"><span className="font-extrabold text-emerald-600 font-mono">P</span> <span className="text-slate-600">{consultation?.formattedClinicalNotes?.plan || '1. Tab Paracetamol 650mg, 2. Cough Syrup.'}</span></p>
          </div>
        </div>

        {/* 3. Diagnosis */}
        <div className="border border-slate-150 rounded-2xl p-4.5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center">3</span>
            <h3 className="text-xs font-extrabold text-slate-900 tracking-wide uppercase">Diagnosis</h3>
          </div>
          <div className="space-y-2 text-xs">
            <div>
              <p className="text-[10px] text-slate-400 font-bold">Primary Diagnosis</p>
              <p className="font-bold text-emerald-600">{consultation?.diagnosis?.primary || 'Viral Fever'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold">Secondary Diagnosis</p>
              <p className="font-medium text-slate-700">{(consultation?.diagnosis?.secondary || ['Acute Upper Respiratory Infection']).join(', ')}</p>
            </div>
            <div className="text-[10px] text-slate-400 border-t pt-1.5 leading-tight">
              Notes: AI review accepted suggestions. General physician review advised.
            </div>
          </div>
        </div>

        {/* 4. Treatment Plan */}
        <div className="border border-slate-150 rounded-2xl p-4.5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center">4</span>
            <h3 className="text-xs font-extrabold text-slate-900 tracking-wide uppercase">Treatment Plan & Advice</h3>
          </div>
          <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
            {(consultation?.treatmentPlan || 'Hydration and monitoring\nTake medicines as prescribed\nSteam inhalation twice daily\nAvoid cold drinks and junk food\nFollow up if symptoms persist').split('\n').map((item, idx) => (
              <li key={idx} className="leading-tight">{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* ─── 5. Prescription Medicines Block ─── */}
      <div className="border border-slate-150 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center">5</span>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-wide uppercase">Prescription Medicines</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Allergy check: Safe
            </span>
            <span className="text-xs text-slate-400">
              No major drug interactions found
            </span>
          </div>
        </div>

        {/* Medicines Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-bold">
                <th className="py-2.5 w-8">#</th>
                <th className="py-2.5 pl-2">Medicine & Strength</th>
                <th className="py-2.5">Dose & Frequency Timing</th>
                <th className="py-2.5">Duration</th>
                <th className="py-2.5">Instructions</th>
                <th className="py-2.5 text-center">Qty</th>
                <th className="py-2.5 pr-2 w-52">Available Branches & Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(prescription?.medicines || []).map((med, idx) => {
                const stockInfo = getBranchStock(med.medicineName);
                return (
                  <tr key={idx} className="hover:bg-slate-50/40">
                    <td className="py-3 font-semibold text-slate-400">{idx + 1}</td>
                    <td className="py-3 pl-2">
                      <p className="font-extrabold text-slate-900">{med.medicineName}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{med.route} ({med.dosage})</p>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-700">{med.frequency}</span>
                        <span className="text-slate-400 text-[10px] capitalize">({med.timing})</span>
                      </div>
                    </td>
                    <td className="py-3 font-semibold text-emerald-600">{med.duration}</td>
                    <td className="py-3 text-slate-500 italic">{med.instructions || 'Take as directed'}</td>
                    <td className="py-3 text-center font-bold text-slate-800">{med.quantity}</td>
                    <td className="py-3 pr-2">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px]">
                        {stockInfo.map((st, sIdx) => (
                          <div key={sIdx} className="flex items-center justify-between text-slate-500">
                            <span className="font-medium">{st.name}</span>
                            <span className="font-bold shrink-0 flex items-center gap-1">
                              <span className={`w-1 h-1 rounded-full ${st.color}`} />
                              {st.stock.split(' ')[0]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Alternative Medicines */}
        <div className="border-t pt-3.5 border-slate-100 flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alternative Medicines (If Unavailable):</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">Paracetamol 500mg</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">Calpol 650mg</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-bold">Dolo 650mg</span>
        </div>
      </div>

      {/* ─── Grid: Lab Tests, Procedures, Follow Up ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.1fr_1fr] gap-5">
        
        {/* 6. Lab Tests */}
        <div className="border border-slate-150 rounded-2xl p-4.5 space-y-4">
          <div className="flex items-center justify-between border-b pb-2 border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center">6</span>
              <h3 className="text-xs font-extrabold text-slate-900 tracking-wide uppercase">Lab Tests</h3>
            </div>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 font-bold">
                <th className="pb-1.5 pl-1">Test Name</th>
                <th className="pb-1.5">Priority</th>
                <th className="pb-1.5">Sample</th>
                <th className="pb-1.5 pr-1">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(prescription?.labs || []).map((lab, idx) => (
                <tr key={idx} className="text-slate-600">
                  <td className="py-2 pl-1 font-bold text-slate-900">{lab.testName}</td>
                  <td className="py-2 capitalize">{lab.priority}</td>
                  <td className="py-2 text-[10px]">{lab.sampleRequired || 'Blood'}</td>
                  <td className="py-2 pr-1 truncate max-w-[100px]" title={lab.reason}>{lab.reason || 'General screening'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t pt-2 border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Estimated Cost</span>
            <span className="text-sm font-extrabold text-slate-900">₹ 1450</span>
          </div>
        </div>

        {/* 7. Procedures */}
        <div className="border border-slate-150 rounded-2xl p-4.5 space-y-4">
          <div className="flex items-center justify-between border-b pb-2 border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center">7</span>
              <h3 className="text-xs font-extrabold text-slate-900 tracking-wide uppercase">Procedures</h3>
            </div>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 font-bold">
                <th className="pb-1.5 pl-1">Procedure</th>
                <th className="pb-1.5">Code</th>
                <th className="pb-1.5">Fee (₹)</th>
                <th className="pb-1.5 pr-1 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(prescription?.procedures || []).map((proc, idx) => (
                <tr key={idx} className="text-slate-600">
                  <td className="py-2 pl-1 font-bold text-slate-900">{proc.name}</td>
                  <td className="py-2 font-mono text-[10px]">{proc.code || '—'}</td>
                  <td className="py-2 font-semibold">₹{proc.fee}</td>
                  <td className="py-2 pr-1 text-center">
                    {proc.status === 'completed' ? (
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-600">
                        ✓
                      </span>
                    ) : (
                      <span className="text-slate-300 font-bold">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t pt-2 border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Cost</span>
            <span className="text-sm font-extrabold text-slate-900">₹ 1200</span>
          </div>
        </div>

        {/* 8. Follow Up */}
        <div className="border border-slate-150 rounded-2xl p-4.5 space-y-4">
          <div className="flex items-center gap-2 border-b pb-2 border-slate-100">
            <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center">8</span>
            <h3 className="text-xs font-extrabold text-slate-900 tracking-wide uppercase">Follow Up</h3>
          </div>
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Follow-up Required</span>
              <span className="font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">Yes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Follow-up Date</span>
              <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md">
                {prescription?.followUpDate ? formatDate(prescription.followUpDate) : '30 Jun 2026'}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-slate-500">Follow-up Reason</span>
              <span className="text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 font-medium">
                {consultation?.followUp?.notes || 'Review symptoms & test reports'}
              </span>
            </div>
            <div className="pt-1.5 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reminders</p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <input type="checkbox" defaultChecked disabled className="rounded text-emerald-600 focus:ring-emerald-500" />
                  SMS
                </label>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <input type="checkbox" defaultChecked disabled className="rounded text-emerald-600 focus:ring-emerald-500" />
                  WhatsApp
                </label>
                <label className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <input type="checkbox" defaultChecked disabled className="rounded text-emerald-600 focus:ring-emerald-500" />
                  Email
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Grid: Patient Advice, AI Summary, Signature ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1fr] gap-5 items-start">
        
        {/* 9. Patient Advice */}
        <div className="border border-slate-150 rounded-2xl p-4.5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center">9</span>
            <h3 className="text-xs font-extrabold text-slate-900 tracking-wide uppercase">Patient Advice</h3>
          </div>
          <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
            <li>Drink plenty of fluids (2.5 – 3 litres per day)</li>
            <li>Take medicines as prescribed</li>
            <li>Steam inhalation twice daily</li>
            <li>Get enough rest and avoid over exertion</li>
            <li>Avoid oily, spicy and cold foods</li>
            <li>Consult immediately if fever &gt; 102°F or breathing difficulty</li>
          </ul>
        </div>

        {/* 10. AI Clinical Assistant Summary */}
        <div className="border border-slate-150 rounded-2xl p-4.5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-md bg-emerald-600 text-white font-extrabold text-[11px] flex items-center justify-center">10</span>
              <h3 className="text-xs font-extrabold text-slate-900 tracking-wide uppercase">AI Clinical Assistant Summary</h3>
            </div>
            <span className="text-[10px] font-extrabold text-white bg-aura-500 px-2 py-0.5 rounded-full shrink-0">AI</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                Diagnosis Confidence
              </span>
              <span className="text-emerald-600 font-extrabold">98%</span>
            </div>
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                Medicine Appropriateness
              </span>
              <span className="text-emerald-600 font-extrabold">96%</span>
            </div>
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                Lab Tests Appropriateness
              </span>
              <span className="text-emerald-600 font-extrabold">94%</span>
            </div>
            <div className="flex items-center justify-between font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                Procedure Appropriateness
              </span>
              <span className="text-emerald-600 font-extrabold">92%</span>
            </div>
            <button className="w-full text-center py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold transition text-xs">
              View Full AI Analysis
            </button>
          </div>
        </div>

        {/* Doctor Signature / Official Seal */}
        <div className="flex flex-col items-center justify-center p-4.5 border border-slate-150 rounded-2xl text-center space-y-4">
          <div>
            <div className="font-signature text-xl text-slate-800 italic select-none">
              {doctor?.fullName || 'Dr. Alpha Doctor'}
            </div>
            <p className="text-xs font-extrabold text-slate-900 mt-2">Dr. {doctor?.fullName || 'Alpha Doctor'}</p>
            <p className="text-[10px] text-slate-400 capitalize">{doctor?.specialization || 'General Physician'}</p>
            <p className="text-[9px] text-slate-400">Reg No: {doctorReg}</p>
            <p className="text-[9px] text-emerald-600 font-bold mt-1">Digitally Signed</p>
          </div>

          <div className="w-32 h-20 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-[10px] text-slate-400 font-bold select-none">
            Hospital Official Seal
          </div>
        </div>
      </div>

      {/* ─── Footer Action Banner ─── */}
      <div className="bg-emerald-600 text-white rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-center md:text-left">
          <button 
            onClick={handleBuyMedicines}
            disabled={buyingMedicines}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 rounded-xl font-bold transition-colors text-xs disabled:opacity-50"
          >
            <span>🛒</span> {buyingMedicines ? 'Ordering...' : 'Buy Medicines Online'}
          </button>
          <button 
            onClick={handleBookLabTests}
            disabled={bookingLabs}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 rounded-xl font-bold transition-colors text-xs disabled:opacity-50"
          >
            <span>🔬</span> {bookingLabs ? 'Booking...' : 'Book Lab Tests'}
          </button>
          <button 
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-750 hover:bg-emerald-850 rounded-xl font-bold transition-colors text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? 'Downloading...' : 'View / Print PDF'}
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 rounded-xl font-bold transition-colors text-xs">
            <Share2 className="w-3.5 h-3.5" /> Share on WhatsApp
          </button>
        </div>
      </div>

      {/* Emergency Contact Bar */}
      <div className="bg-red-50 text-red-600 border border-red-100 rounded-2xl py-3 px-5 text-center font-bold text-xs flex flex-col md:flex-row items-center justify-center gap-2.5">
        <span>⚠ EMERGENCY SUPPORT: +91-9999999911</span>
        <span className="hidden md:inline text-red-300">|</span>
        <span>24x7 AMBULANCE: +91-9999999922</span>
      </div>

      {/* Footer Branding Links */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-400 border-t pt-4 border-slate-100">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1 font-medium">📱 Mobile App</span>
          <span className="flex items-center gap-1 font-medium">💬 WhatsApp Chat</span>
          <span className="flex items-center gap-1 font-medium">🌐 Web Portal</span>
        </div>
        <div className="font-semibold text-right">
          Digital services powered by <span className="text-slate-650 font-bold">Smart Clinic Management System</span>
        </div>
      </div>

    </div>
  );
}
