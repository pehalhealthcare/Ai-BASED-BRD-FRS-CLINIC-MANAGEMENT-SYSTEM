import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, CheckCircle, X,
  Building, Plus, Trash2, Printer, Mail, Share2, CreditCard
} from 'lucide-react';
import { billingApi, prescriptionApi, patientApi } from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';

export default function BillingListPage() {
  const [searchParams] = useSearchParams();
  const initialInvoiceId = searchParams.get('invoiceId') || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [patientsList, setPatientsList] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [activeInvoice, setActiveInvoice] = useState(null);
  
  const [billItems, setBillItems] = useState([
    { name: 'Doctor Consultation', quantity: 1, unitPrice: 500, taxRate: 18 }
  ]);
  const [pharmacyItems, setPharmacyItems] = useState([]);
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [gstRate, setGstRate] = useState(18);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Insurance States
  const [isInsuranceClaim, setIsInsuranceClaim] = useState(false);
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [coveragePercentage, setCoveragePercentage] = useState(80);
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [allInvoices, setAllInvoices] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await billingApi.getInvoices({ limit: 100 });
      setAllInvoices(res?.data?.invoices || res?.invoices || []);
      
      if (initialInvoiceId) {
        const matching = (res?.data?.invoices || res?.invoices || []).find(i => i._id === initialInvoiceId);
        if (matching) {
          handleLoadInvoice(matching);
        }
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [initialInvoiceId]);

  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length > 1) {
      try {
        const res = await patientApi.list({ search: val });
        setPatientsList(res?.data?.patients || res?.patients || []);
      } catch (err) {
        console.error(err);
      }
    } else {
      setPatientsList([]);
    }
  };

  const handleLoadInvoice = async (invoice) => {
    setLoading(true);
    try {
      const res = await billingApi.getInvoiceById(invoice._id);
      const fullInvoice = res?.data?.invoice || res?.invoice || invoice;
      setSelectedInvoice(fullInvoice);
      setActiveInvoice(fullInvoice);
      setSelectedPatient(fullInvoice.patientId);
      setNotes(fullInvoice.notes || '');
      setDiscountType(fullInvoice.discountType || 'none');
      setDiscountValue(fullInvoice.discountValue || 0);
      setGstRate(fullInvoice.gstRate || 18);

      if (fullInvoice.insuranceCoveredAmount > 0) {
        setPaymentMethod('Insurance');
        setIsInsuranceClaim(true);
        setInsuranceProvider(fullInvoice.patientId?.insuranceDetails?.provider || 'Star Health');
        setPolicyNumber(fullInvoice.patientId?.insuranceDetails?.policyNumber || 'SHI-987654');
        const percentage = Math.round((fullInvoice.insuranceCoveredAmount / fullInvoice.totalAmount) * 100) || 80;
        setCoveragePercentage(percentage);
      } else {
        setPaymentMethod('Cash');
        setIsInsuranceClaim(false);
      }
      
      if (fullInvoice.items && fullInvoice.items.length > 0) {
        setBillItems(fullInvoice.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: fullInvoice.gstRate || 18
        })));
      }

      if (fullInvoice.consultationId) {
        try {
          const rxRes = await prescriptionApi.getByConsultation(fullInvoice.consultationId?._id || fullInvoice.consultationId);
          const rxList = rxRes?.data?.prescriptions || rxRes?.prescriptions || [];
          if (rxList.length > 0 && rxList[0].medicines) {
            setPharmacyItems(rxList[0].medicines.map(m => ({
              name: m.medicineName,
              quantity: m.quantity || 10,
              unitPrice: 10,
              stockStatus: 'In Stock'
            })));
          }
        } catch (_rxErr) {}
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load invoice details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setSelectedInvoice(null);
    setActiveInvoice(null);
    setSearchQuery('');
    setPatientsList([]);
    setPharmacyItems([]);
    setBillItems([
      { name: 'Doctor Consultation', quantity: 1, unitPrice: 500, taxRate: 18 }
    ]);

    if (patient.insuranceDetails?.provider || patient.insuranceDetails?.policyNumber) {
      setPaymentMethod('Insurance');
      setIsInsuranceClaim(true);
      setInsuranceProvider(patient.insuranceDetails.provider || 'Star Health');
      setPolicyNumber(patient.insuranceDetails.policyNumber || 'SHI-987654');
      setCoveragePercentage(80);
    } else {
      setPaymentMethod('Cash');
      setIsInsuranceClaim(false);
      setInsuranceProvider('');
      setPolicyNumber('');
      setCoveragePercentage(80);
    }
  };

  const calculatedTotals = useMemo(() => {
    const itemsTotal = billItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const pharmacyTotal = pharmacyItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const grossAmount = itemsTotal + pharmacyTotal;
    
    let discountAmount = 0;
    if (discountType === 'fixed') {
      discountAmount = Number(discountValue || 0);
    } else if (discountType === 'percentage') {
      discountAmount = grossAmount * (Number(discountValue || 0) / 100);
    }
    
    const taxableAmount = Math.max(0, grossAmount - discountAmount);
    const gstAmount = taxableAmount * (gstRate / 100);
    const grandTotal = taxableAmount + gstAmount;

    const useInsurance = isInsuranceClaim || paymentMethod === 'Insurance';
    const insuranceCovered = useInsurance ? Math.round(grandTotal * (coveragePercentage / 100)) : 0;
    const payableAmount = grandTotal - insuranceCovered;

    return {
      grossAmount,
      discountAmount,
      taxableAmount,
      gstAmount,
      grandTotal,
      insuranceCovered,
      payableAmount
    };
  }, [billItems, pharmacyItems, discountType, discountValue, gstRate, selectedPatient, isInsuranceClaim, paymentMethod, coveragePercentage]);

  const handleAddItem = () => {
    setBillItems([...billItems, { name: '', quantity: 1, unitPrice: 0, taxRate: 18 }]);
  };

  const handleRemoveItem = (index) => {
    const next = [...billItems];
    next.splice(index, 1);
    setBillItems(next.length ? next : [{ name: '', quantity: 1, unitPrice: 0, taxRate: 18 }]);
  };

  const handleItemChange = (index, key, val) => {
    const next = [...billItems];
    next[index][key] = val;
    setBillItems(next);
  };

  const handleCollectPayment = () => {
    if (!selectedPatient) return;
    setShowConfirmModal(true);
  };

  const handleConfirmPayment = async () => {
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      let invoiceId = activeInvoice?._id;
      
      const payloadDetails = {
        patientId: selectedPatient._id,
        items: billItems.map(item => ({
          itemType: 'consultation',
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        })),
        discountType,
        discountValue: Number(discountValue),
        gstRate,
        insuranceCoveredAmount: calculatedTotals.insuranceCovered,
        patientPayableAmount: calculatedTotals.payableAmount,
        notes: notes + (paymentMethod === 'Insurance' ? `\n[INSURANCE PAYMENT SPLIT] Insurance Approved: ₹${calculatedTotals.insuranceCovered} (${insuranceProvider} Policy: ${policyNumber}). Patient Paid: ₹${calculatedTotals.payableAmount}.` : '')
      };

      if (!invoiceId) {
        const createRes = await billingApi.createInvoice(payloadDetails);
        invoiceId = createRes?.data?.invoice?._id || createRes?.invoice?._id;
      } else {
        await billingApi.updateInvoice(invoiceId, payloadDetails);
      }

      const payRes = await billingApi.recordPayment(invoiceId, {
        amount: calculatedTotals.payableAmount,
        paymentMode: paymentMethod.toLowerCase(),
        transactionId: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
        notes: `Paid via Receptionist Workspace (${paymentMethod}). Split: Insurance ₹${calculatedTotals.insuranceCovered}, Patient ₹${calculatedTotals.payableAmount}.`
      });

      setSuccessDetails({
        invoiceId,
        patientName: selectedPatient.fullName || selectedPatient.userId?.name,
        amount: calculatedTotals.payableAmount,
        insuranceAmount: calculatedTotals.insuranceCovered,
        paymentMode: paymentMethod,
        invoiceNumber: payRes?.data?.invoice?.invoiceNumber || payRes?.invoice?.invoiceNumber || 'INV-TEMP'
      });
      setPaymentSuccess(true);
      loadInvoices();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to process payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const response = await billingApi.downloadInvoicePdf(invoiceId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `invoice-${invoiceId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      console.error(err);
      alert('Unable to download invoice PDF.');
    }
  };

  const handlePrintPrescription = async (invoiceId) => {
    try {
      const res = await billingApi.getInvoiceById(invoiceId);
      const inv = res?.data?.invoice || res?.invoice;
      let consultationId = inv?.consultationId?._id || inv?.consultationId;
      let rx;
      if (consultationId) {
        const rxRes = await prescriptionApi.getByConsultation(consultationId);
        rx = rxRes?.data?.prescriptions?.[0] || rxRes?.prescriptions?.[0];
      }
      if (!rx && selectedPatient?._id) {
        const rxRes = await prescriptionApi.getByPatient(selectedPatient._id, { status: 'finalized', limit: 1 });
        rx = rxRes?.data?.prescriptions?.[0] || rxRes?.prescriptions?.[0];
      }

      if (rx) {
        const response = await prescriptionApi.download(rx._id);
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const objectUrl = window.URL.createObjectURL(blob);
        
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = objectUrl;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
            window.URL.revokeObjectURL(objectUrl);
          }, 1000);
        };
      } else {
        alert('No prescription found linked to this patient check-out.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load prescription print.');
    }
  };

  const handleReset = () => {
    setSelectedPatient(null);
    setSelectedInvoice(null);
    setActiveInvoice(null);
    setBillItems([{ name: 'Doctor Consultation', quantity: 1, unitPrice: 500, taxRate: 18 }]);
    setPharmacyItems([]);
    setDiscountType('none');
    setDiscountValue(0);
    setNotes('');
    setPaymentSuccess(false);
    setSuccessDetails(null);
    setIsInsuranceClaim(false);
    setInsuranceProvider('');
    setPolicyNumber('');
  };

  if (loading) return <LoadingState label="Loading patient billing records..." />;

  return (
    <div className="space-y-6 bg-slate-50/50 p-6 min-h-screen text-slate-800">
      
      {/* Title Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Patient Billing</h1>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            Create invoices, manage discounts, and collect check-out payments
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">
            <Building size={14} className="text-blue-600" />
            <span>Gurugram Clinic HQ</span>
          </div>
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="w-8 h-8 rounded-full bg-pink-50 text-pink-650 border border-pink-100 flex items-center justify-center font-bold text-xs">
              R
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-slate-800 leading-none">Riya Sharma</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Receptionist Desk</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative w-full">
        <div className="relative w-full">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search Patient by Name, UHID, Mobile number, Appointment ID..."
            className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 font-medium transition shadow-sm"
          />
        </div>
        {patientsList.length > 0 && (
          <div className="absolute left-0 right-0 top-14 z-50 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden p-1.5 max-h-60 overflow-y-auto">
            {patientsList.map(pat => (
              <button
                key={pat._id}
                onClick={() => handleSelectPatient(pat)}
                className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-pink-50 text-pink-650 flex items-center justify-center text-xs font-black">
                    {pat.fullName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition">{pat.fullName}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{pat.age} Y • {pat.gender} • {pat.phone}</p>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase font-mono">
                  {pat.patientId}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {paymentSuccess ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6 my-10 shadow-md">
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <CheckCircle size={48} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-wider">Payment Collected Successfully</h2>
            <p className="text-xs text-slate-400 font-semibold">Invoice {successDetails?.invoiceNumber} has been finalized.</p>
            <p className="text-3xl font-black text-blue-600 mt-2">₹{successDetails?.amount}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 w-full text-xs text-left grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Patient</p>
              <p className="font-extrabold text-slate-800 mt-1">{successDetails?.patientName}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Prescription Access</p>
              <p className="font-extrabold text-emerald-600 mt-1 flex items-center gap-1">Unlocked EMR &amp; Ready ✓</p>
            </div>
            {successDetails?.insuranceAmount > 0 && (
              <>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Paid by Insurance</p>
                  <p className="font-extrabold text-slate-800 mt-1">₹{successDetails?.insuranceAmount}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Paid by Patient</p>
                  <p className="font-extrabold text-blue-600 mt-1">₹{successDetails?.amount} ({successDetails?.paymentMode})</p>
                </div>
              </>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={() => handlePrintPrescription(successDetails?.invoiceId)}
              className="py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Printer size={14} />
              <span>Print Prescription</span>
            </button>
            <button
              onClick={() => handleDownloadInvoice(successDetails?.invoiceId)}
              className="py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer size={14} />
              <span>Download Invoice</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full pt-2">
            <button className="py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-blue-200/50 cursor-pointer">
              <Share2 size={13} />
              <span>WhatsApp Receipt</span>
            </button>
            <button className="py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer">
              <Mail size={13} />
              <span>Email Receipt</span>
            </button>
          </div>
          <button
            onClick={handleReset}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition shadow-md cursor-pointer"
          >
            New Billing Checkout
          </button>
        </div>
      ) : selectedPatient ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr_360px] gap-6 overflow-hidden">
          {/* Patient Details Left Panel */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col gap-6 shadow-sm overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Patient Info</h3>
              <button onClick={handleReset} className="text-slate-400 hover:text-slate-600 transition cursor-pointer">
                <X size={15} />
              </button>
            </div>
            <div className="flex flex-col items-center text-center space-y-3 pb-5 border-b border-slate-100">
              <div className="w-16 h-16 rounded-full bg-pink-50 text-pink-650 border border-pink-100 flex items-center justify-center font-black text-2xl shadow-sm">
                {selectedPatient.fullName?.charAt(0).toUpperCase() || 'P'}
              </div>
              <div>
                <h4 className="font-black text-slate-900 text-base leading-tight">{selectedPatient.fullName}</h4>
                <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase">UHID: {selectedPatient.patientId || 'MCUH-1254'}</p>
                <p className="text-[11px] text-slate-500 font-semibold mt-1">
                  {selectedPatient.age} Y / {selectedPatient.gender}
                </p>
                <p className="text-[10px] text-blue-600 font-bold mt-1">✓ {selectedPatient.phone}</p>
              </div>
            </div>
            <div className="space-y-4 border-b border-slate-100 pb-5 text-xs">
              <div>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-wider">Clinic Location</span>
                <span className="font-semibold text-slate-600">Metro Clinic Lucknow</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-wider">Appointment Status</span>
                <span className="inline-block bg-emerald-50 text-emerald-600 border border-emerald-100 font-black px-2 py-0.5 rounded-lg text-[9px] uppercase mt-1">Completed</span>
              </div>
            </div>
            {selectedPatient?.insuranceDetails?.provider && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Insurance Information</h4>
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-xs space-y-2">
                  <p className="font-semibold text-slate-600">Provider: <span className="text-slate-900 font-extrabold">{selectedPatient?.insuranceDetails?.provider || 'Star Health'}</span></p>
                  <p className="text-slate-400 text-[10px]">Policy: {selectedPatient?.insuranceDetails?.policyNumber || 'SHI-987654'}</p>
                  <span className="inline-block bg-emerald-50 text-emerald-600 border border-emerald-100 text-[8px] font-extrabold px-1.5 py-0.5 rounded-lg uppercase tracking-wider">Cashless Eligible</span>
                </div>
              </div>
            )}
          </div>

          {/* Central Order/Services Editor Panel */}
          <div className="flex flex-col gap-6 overflow-y-auto pr-1">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Bill Services</h3>
                <button
                  onClick={handleAddItem}
                  className="flex items-center gap-1 text-[11px] font-black text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Add Item</span>
                </button>
              </div>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[9px] font-black uppercase tracking-wider">
                    <th className="py-2.5">Service Name</th>
                    <th className="py-2.5 w-20">Qty</th>
                    <th className="py-2.5 w-24">Unit Price</th>
                    <th className="py-2.5 w-20">Tax</th>
                    <th className="py-2.5 w-24">Total</th>
                    <th className="py-2.5 text-right w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {billItems.map((item, idx) => (
                    <tr key={idx} className="group">
                      <td className="py-3 pr-4">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:bg-white transition font-bold"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-2 text-xs text-slate-800 focus:outline-none focus:bg-white text-center transition font-bold"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₹</span>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-2 pl-6 text-xs text-slate-800 focus:outline-none focus:bg-white transition font-bold"
                          />
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-400 font-semibold">{item.taxRate}%</td>
                      <td className="py-3 text-slate-900 font-extrabold">₹{item.quantity * item.unitPrice}</td>
                      <td className="py-3 text-right">
                        <button onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-red-500 p-1 transition opacity-0 group-hover:opacity-100 cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pharmacyItems.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-3xl p-5 space-y-4 shadow-sm">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Prescribed Pharmacy Items</h3>
                <div className="space-y-3">
                  {pharmacyItems.map((med, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs">
                      <div>
                        <p className="font-extrabold text-slate-800">{med.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Qty: {med.quantity} • {med.stockStatus}</p>
                      </div>
                      <span className="font-extrabold text-slate-700">₹{med.quantity * med.unitPrice}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-100 rounded-3xl p-5 space-y-3 shadow-sm">
              <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Billing Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add billing remarks, invoice comments, insurance approvals..."
                className="w-full h-20 bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-2xl p-3 text-xs text-slate-800 focus:outline-none focus:bg-white transition resize-none placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          {/* Right Checkout Panel */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 flex flex-col gap-6 shadow-sm overflow-y-auto">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Checkout Summary</h3>

            {/* Calculations Breakdown */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 text-xs font-semibold text-slate-500">
              <div className="flex justify-between">
                <span>Services Fee</span>
                <span className="text-slate-800">₹{calculatedTotals.grossAmount}</span>
              </div>
              {calculatedTotals.discountAmount > 0 && (
                <div className="flex justify-between text-red-500">
                  <span>Discount Applied</span>
                  <span>- ₹{calculatedTotals.discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>GST ({gstRate}%)</span>
                <span className="text-slate-800">₹{Math.round(calculatedTotals.gstAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span>Grand Total</span>
                <span className="text-slate-800 font-extrabold">₹{calculatedTotals.grandTotal}</span>
              </div>
              {calculatedTotals.insuranceCovered > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Insurance Approved ({coveragePercentage}%)</span>
                  <span>- ₹{calculatedTotals.insuranceCovered}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-3 flex justify-between text-sm font-black text-slate-800">
                <span>Payable by Patient</span>
                <span className="text-xl text-blue-600">₹{calculatedTotals.payableAmount}</span>
              </div>
            </div>

            {/* Apply Discount Options */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Apply Discount</h4>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountType('none')}
                  className={`py-2 rounded-xl text-[10px] font-black border transition cursor-pointer ${discountType === 'none' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-transparent border-slate-200 text-slate-400 hover:text-slate-700'}`}
                >
                  NONE
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('fixed')}
                  className={`py-2 rounded-xl text-[10px] font-black border transition cursor-pointer ${discountType === 'fixed' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-transparent border-slate-200 text-slate-400 hover:text-slate-700'}`}
                >
                  ₹ FLAT
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('percentage')}
                  className={`py-2 rounded-xl text-[10px] font-black border transition cursor-pointer ${discountType === 'percentage' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-transparent border-slate-200 text-slate-400 hover:text-slate-700'}`}
                >
                  % PERCENT
                </button>
              </div>

              {discountType !== 'none' && (
                <div className="relative">
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    placeholder="Enter discount value..."
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:bg-white transition font-bold"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-extrabold">
                    {discountType === 'fixed' ? '₹' : '%'}
                  </span>
                </div>
              )}
            </div>

            {/* Payment Method Option Selector */}
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Payment Method</h4>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                {['Cash', 'UPI', 'Debit Card', 'Credit Card', 'Insurance'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(mode);
                      if (mode === 'Insurance') {
                        setIsInsuranceClaim(true);
                        if (!insuranceProvider) {
                          setInsuranceProvider(selectedPatient?.insuranceDetails?.provider || 'Star Health');
                          setPolicyNumber(selectedPatient?.insuranceDetails?.policyNumber || 'SHI-987654');
                        }
                      } else {
                        setIsInsuranceClaim(false);
                      }
                    }}
                    className={`py-3 rounded-xl border transition flex items-center justify-center gap-1.5 cursor-pointer ${paymentMethod === mode ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-transparent border-slate-200 text-slate-400 hover:text-slate-700'}`}
                  >
                    <CreditCard size={12} />
                    <span>{mode}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Insurance Input Panel */}
            {paymentMethod === 'Insurance' && (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 text-xs">
                <h4 className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Insurance Details (Co-Pay)</h4>
                
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase">Insurance Provider</label>
                  <input
                    type="text"
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
                    placeholder="e.g. Star Health, HDFC Ergo"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase">Policy/Claim Number</label>
                  <input
                    type="text"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2 text-xs text-slate-800 focus:outline-none"
                    placeholder="e.g. SHI-987654"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] text-slate-400 font-extrabold uppercase">Insurance Coverage Portion</label>
                    <span className="text-blue-600 font-bold">{coveragePercentage}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={coveragePercentage}
                    onChange={(e) => setCoveragePercentage(parseInt(e.target.value))}
                    className="w-full accent-blue-600 bg-slate-200 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Collect Button */}
            <button
              onClick={handleCollectPayment}
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle size={15} />
              <span>{submitting ? 'Processing Payment...' : 'Collect Checkout Payment'}</span>
            </button>

            <button
              onClick={handleReset}
              className="w-full py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Cancel Checkout
            </button>
          </div>
        </div>
      ) : (
        /* Outstanding Invoices List panel */
        <div className="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col shadow-sm min-h-0">
          <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Outstanding Clinic Invoices</h3>
            <span className="text-xs text-slate-400 font-bold">Total Invoices: {allInvoices.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.12em]">
                  <th className="py-4 px-5">Invoice No.</th>
                  <th className="py-4 px-5">Patient Name</th>
                  <th className="py-4 px-5">Due Date</th>
                  <th className="py-4 px-5">Total Amount</th>
                  <th className="py-4 px-5">Due Amount</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-600">
                {allInvoices.length > 0 ? (
                  allInvoices.map(inv => {
                    const patName = inv.patientId?.fullName || inv.patientName || 'General Patient';
                    return (
                      <tr key={inv._id} className="hover:bg-slate-50/50 transition">
                        <td className="py-4 px-5 text-slate-900 font-black">{inv.invoiceNumber || 'INV-0000'}</td>
                        <td className="py-4 px-5">{patName}</td>
                        <td className="py-4 px-5 text-slate-400 font-semibold">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-GB') : 'TBD'}</td>
                        <td className="py-4 px-5 text-slate-800 font-extrabold">₹{inv.totalAmount}</td>
                        <td className="py-4 px-5 text-blue-600 font-black">₹{inv.dueAmount}</td>
                        <td className="py-4 px-5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${
                            inv.paymentStatus === 'paid' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}>
                            {inv.paymentStatus || 'UNPAID'}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right">
                          {inv.paymentStatus !== 'paid' ? (
                            <button
                              onClick={() => handleLoadInvoice(inv)}
                              className="px-3.5 py-1.5 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-600 text-[11px] font-black transition cursor-pointer"
                            >
                              Checkout &amp; Pay
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDownloadInvoice(inv._id)}
                              className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold transition cursor-pointer"
                            >
                              Print Invoice
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 font-bold">
                      No invoices currently outstanding.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Collect Payment Modal Dialog Confirmation */}
      {showConfirmModal && selectedPatient && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5 animate-fade-in text-slate-800 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
              <CreditCard size={20} />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Confirm Payment?</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">Please verify the billing amount and confirm to generate invoice receipt.</p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-2 text-xs text-left text-slate-600">
              <p className="font-semibold text-slate-500">Grand Total: <span className="text-slate-800 font-extrabold">₹{calculatedTotals.grandTotal}</span></p>
              {paymentMethod === 'Insurance' && (
                <>
                  <p className="text-emerald-600 text-[11px] font-bold">Insurance approved ({coveragePercentage}%): ₹{calculatedTotals.insuranceCovered}</p>
                  <p className="text-amber-600 text-[11px] font-bold">Patient Payable Portion: ₹{calculatedTotals.payableAmount}</p>
                </>
              )}
              <p className="text-slate-700 text-xs font-bold border-t border-slate-200 pt-2 mt-1">Receive Portion: <span className="text-blue-600 font-black">₹{calculatedTotals.payableAmount}</span></p>
              <p className="text-slate-400 text-[10px]">Patient Name: {selectedPatient.fullName}</p>
              {activeInvoice && <p className="text-slate-400 text-[10px]">Invoice Ref: {activeInvoice.invoiceNumber}</p>}
              <p className="text-slate-400 text-[10px]">Payment Method: {paymentMethod}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPayment}
                className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition cursor-pointer"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
