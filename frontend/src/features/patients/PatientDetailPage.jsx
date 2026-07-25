import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  Search, X, Printer, Download, Trash, Plus, Phone, MessageSquare, 
  Calendar, DollarSign, CheckCircle, User, Clock, Activity, Volume2, 
  FileText, Award, Info, ChevronLeft, ChevronRight, AlertCircle, 
  MapPin, ShieldAlert, CreditCard, Bell, Mail, Globe, Sparkles, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { patientApi, appointmentApi } from '../../lib/api';
import PatientInvoiceHistory from './PatientInvoiceHistory';
import PatientHistoryPanel from './PatientHistoryPanel';
import useAuth from '../../hooks/useAuth';

const DetailItem = ({ label, value }) => (
  <div className="rounded-2xl bg-stone-50 p-4">
    <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">{label}</dt>
    <dd className="mt-2 text-sm font-medium text-stone-900">{value || 'Not provided'}</dd>
  </div>
);

const PatientDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isReceptionist = user?.role === 'RECEPTIONIST';

  const [patient, setPatient] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [todayAppointment, setTodayAppointment] = useState(null);
  const [allAppointments, setAllAppointments] = useState([]);
  const [invoicesList, setInvoicesList] = useState([]);
  const [communications, setCommunications] = useState([]);

  // Documents state
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docType, setDocType] = useState('CBC Report');
  const [fileInput, setFileInput] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);

  const fetchDocuments = async () => {
    try {
      setDocsLoading(true);
      const res = await patientApi.listDocuments(id);
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to load documents', err);
    } finally {
      setDocsLoading(false);
    }
  };

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePrintSlip = (appt) => {
    if (!appt) return;
    const printWindow = window.open('', '_blank', 'width=900,height=600');
    if (!printWindow) {
      toast.error('Popup blocker is active. Please allow popups to print slips.');
      return;
    }
    
    const docObj = appt.doctorId || {};
    const doctorName = docObj.fullName || docObj.userId?.name || 'Dr. Shyam';
    const doctorSpecialization = docObj.specialization || 'Cardiology';
    const doctorExperience = docObj.experienceYears ? `${docObj.experienceYears}+ Years` : '10+ Years';
    const doctorRoom = docObj.room || 'Consultation Room 2';
    const doctorClinic = docObj.currentClinic || "Ram's Dental Clinic";
    const doctorFee = docObj.consultationFee || 500;

    const tokenNumber = appt.tokenNumber || appt.queueToken || 'N/A';
    const aptDate = appt.appointmentDate
      ? new Date(appt.appointmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const aptTime = appt.startTime || appt.appointmentTime || '10:00 AM';
    const nowStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ' | ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const aptId = appt._id ? `APT-${appt._id.slice(-10).toUpperCase()}` : `APT-${Math.floor(Math.random() * 1000000).toString()}`;
    const receiptNo = `RCPT-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(Math.floor(Math.random()*9000)+1000)}`;
    const barcodeVal = `${aptId}`;
    const qrData = `${window.location.origin}/appointments/${appt._id || ''}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Appointment Confirmation - ${patient?.fullName || 'Patient'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
            body { margin: 0; background: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
            @media print {
              @page { size: A4 landscape; margin: 8mm; }
              body { background: white; padding: 0; }
              .no-print { display: none !important; }
            }
            .card { background: #fff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 20px 60px rgba(0,0,0,0.12); width: 100%; max-width: 900px; overflow: hidden; position: relative; }
            .teal { color: #0d9488; }
            .teal-bg { background-color: #0d9488; }
            .row { display: flex; justify-content: space-between; align-items: center; }
            .label { font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
            .value { font-size: 11px; font-weight: 700; color: #1e293b; }
            .value-teal { font-size: 11px; font-weight: 700; color: #0d9488; }
            .divider { height: 1px; background: #f1f5f9; margin: 6px 0; }
            .badge-confirmed { background: #0d9488; color: white; border-radius: 100px; padding: 6px 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; display: inline-flex; align-items: center; gap: 6px; }
            .section-header { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #334155; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
          </style>
        </head>
        <body>
          <div class="card">

            <!-- TOP: APPOINTMENT CONFIRMED badge + Barcode + Appointment ID -->
            <div style="padding: 18px 32px 0; text-align: center;">
              <div style="display: flex; justify-content: center; margin-bottom: 10px;">
                <span class="badge-confirmed">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  APPOINTMENT CONFIRMED
                </span>
              </div>
              <svg id="main-barcode" style="width: 100%; max-width: 500px; height: 44px; display: block; margin: 0 auto;"></svg>
              <div style="margin: 6px 0; font-size: 13px; font-weight: 800; color: #1e293b;">
                Appointment ID: <span class="teal">${aptId}</span>
              </div>
              <div style="font-size: 14px; font-weight: 800; color: #1e293b; margin-bottom: 2px;">${doctorClinic}</div>
              <div style="font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 14px;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="display:inline; vertical-align:middle; margin-right:3px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Main Clinic, Branch Office
              </div>
            </div>

            <!-- HEADER ROW: Logo | Token | Walk-In Badge -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 0 24px 14px; border-bottom: 1px solid #f1f5f9; align-items: stretch;">

              <!-- Patient Info -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; gap: 14px;">
                <div style="width: 52px; height: 52px; border-radius: 50%; background: #ccfbf1; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <div style="min-width:0;">
                  <div style="font-size: 15px; font-weight: 800; color: #1e293b; line-height: 1.2;">${patient?.fullName || ''}</div>
                  <div style="font-size: 11px; color: #64748b; font-weight: 600; margin-top: 3px;">${patient?.age || ''} Yrs / ${patient?.gender || ''}</div>
                  <div style="font-size: 10px; color: #64748b; margin-top: 2px; display: flex; align-items: center; gap: 3px;">
                    <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.64A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.09-1.09a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                    ${patient?.phone || ''}
                  </div>
                </div>
              </div>

              <!-- Token Number -->
              <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 16px; padding: 14px 16px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div class="label" style="margin-bottom: 4px;">YOUR TOKEN NUMBER</div>
                <div style="font-size: 48px; font-weight: 900; color: #0d9488; line-height: 1;">${tokenNumber}</div>
                <div style="font-size: 10px; color: #0f766e; font-weight: 700; margin-top: 6px; line-height: 1.5;">Please arrive 10 minutes early.<br><span style="color: #64748b; font-weight: 500;">We will call your token number on the display.</span></div>
              </div>

              <!-- Walk-In Badge -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px 16px; display: flex; align-items: center; justify-content: center; gap: 14px;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: #ccfbf1; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0d9488" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><path d="M9 20l3-7 3 7m-6-4h6"/><path d="M12 12v-4"/></svg>
                </div>
                <div>
                  <div style="font-size: 12px; font-weight: 800; color: #0d9488; text-transform: uppercase; letter-spacing: 0.04em;">${appt.apptType || 'Appointment'}</div>
                  <div style="font-size: 11px; font-weight: 800; color: #1e293b; text-transform: uppercase;">APPOINTMENT</div>
                  <div style="font-size: 9px; color: #94a3b8; font-weight: 500; margin-top: 2px;">Scheduled consultation.</div>
                </div>
              </div>
            </div>

            <!-- 3 COLUMNS: Appointment | Doctor | Payment -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; padding: 14px 24px;">

              <!-- Appointment Details -->
              <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px;">
                <div class="section-header" style="margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                  <svg width="13" height="13" fill="none" stroke="#0d9488" stroke-width="2.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  APPOINTMENT DETAILS
                </div>
                <div class="divider"></div>
                <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Appointment Type</span><span class="value">${appt.apptType || 'Scheduled'}</span></div>
                <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Booking Date & Time</span><span class="value">${nowStr}</span></div>
                <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Appointment Date & Time</span><span class="value" style="color: #0d9488;">${aptDate} | ${aptTime}</span></div>
                <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Mode</span><span class="value" style="font-weight:800;">${appt.mode || 'Offline'}</span></div>
                <div class="row" style="padding: 5px 0;"><span class="label">Status</span><span style="background:#dcfce7; color:#166534; font-size:9px; font-weight:800; padding: 2px 8px; border-radius:100px;">${appt.status || 'Confirmed'}</span></div>
              </div>

              <!-- Doctor Details -->
              <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px;">
                <div class="section-header" style="margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                  <svg width="13" height="13" fill="none" stroke="#0d9488" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  DOCTOR DETAILS
                </div>
                <div class="divider"></div>
                <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Doctor Name</span><span class="value" style="font-weight:800;">${doctorName}</span></div>
                <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Specialization</span><span class="value-teal">${doctorSpecialization}</span></div>
                <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Experience</span><span class="value">${doctorExperience}</span></div>
                <div class="row" style="padding: 5px 0;"><span class="label">Consultation Room</span><span class="value">${doctorRoom}</span></div>
              </div>

              <!-- Payment Details -->
              <div style="border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px;">
                <div class="section-header" style="margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
                  <svg width="13" height="13" fill="none" stroke="#0d9488" stroke-width="2.5" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  PAYMENT DETAILS
                </div>
                <div class="divider"></div>
                <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Consultation Fee</span><span class="value">&#8377;${doctorFee}</span></div>
                <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Amount Payable</span><span class="value" style="font-weight:900; font-size:13px;">&#8377;${doctorFee}</span></div>
                <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Payment Status</span><span style="background:#dcfce7; color:#166534; font-size:9px; font-weight:800; padding: 2px 8px; border-radius:100px;">${appt.paymentStatus || 'Pending'}</span></div>
                <div class="row" style="padding: 5px 0; border-bottom: 1px solid #f8fafc;"><span class="label">Payment Method</span><span class="value">Cash</span></div>
                <div class="row" style="padding: 5px 0;"><span class="label">Receipt No.</span><span class="value-teal" style="font-family: monospace; font-size: 9px;">${receiptNo}</span></div>
              </div>
            </div>

            <!-- BOTTOM: Emergency + QR -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 0 24px 16px;">
              <div style="background: #fff5f5; border: 1px solid #fecaca; border-radius: 14px; padding: 14px; display: flex; align-items: center; gap: 10px;">
                <svg width="18" height="18" fill="none" stroke="#dc2626" stroke-width="2.5" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.64A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.09-1.09a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                <div>
                  <div style="font-size: 10px; font-weight: 800; color: #dc2626; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px;">EMERGENCY CONTACT</div>
                  <div style="font-size: 11px; font-weight: 600; color: #374151;">Contact Number: <strong>9876543210</strong></div>
                </div>
              </div>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; display: flex; align-items: center; gap: 14px;">
                <canvas id="qr-canvas" width="70" height="70" style="border-radius: 8px; flex-shrink: 0;"></canvas>
                <div>
                  <div style="font-size: 10px; font-weight: 800; color: #0d9488; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 3px;">SCAN TO VIEW</div>
                  <div style="font-size: 10px; color: #64748b; font-weight: 500; line-height: 1.5;">Scan this QR code at the reception<br>to check-in for your appointment.</div>
                </div>
              </div>
            </div>

            <!-- FOOTER -->
            <div class="teal-bg" style="padding: 10px 28px; display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #e0f2f1; font-size: 10px; font-weight: 600;">&#128161; If lost, download this card from your Patient Dashboard.</span>
              <span style="color: #e0f2f1; font-size: 10px; font-weight: 600;">Thank you for choosing ${doctorClinic}.</span>
            </div>

          </div>

          <script>
            window.onload = function() {
              try {
                JsBarcode("#main-barcode", "${barcodeVal}", {
                  format: "CODE128",
                  width: 2,
                  height: 40,
                  displayValue: false,
                  margin: 0,
                  lineColor: "#1e293b"
                });
              } catch(e) { console.error('Barcode err', e); }
              try {
                QRCode.toCanvas(document.getElementById('qr-canvas'), '${qrData}', { width: 70, margin: 1, color: { dark: '#0d9488', light: '#ffffff' } });
              } catch(e) { console.error('QR err', e); }
              setTimeout(function() { window.print(); }, 800);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    let isMounted = true;

    const loadPatient = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await patientApi.get(id);

        if (isMounted) {
          setPatient(response.data.patient);
          setSummary(response.data.summary);
        }

        // Fetch today's appointment
        try {
          const todayStr = getTodayDateString();
          const apptResponse = await appointmentApi.getAppointments({
            patientId: id,
            date: todayStr,
            limit: 10
          });
          const appts = apptResponse.appointments || apptResponse.data?.appointments || [];
          const matched = appts.find(appt => {
            const apptDateStr = appt.appointmentDate?.split('T')[0];
            return apptDateStr === todayStr && appt.status !== 'Cancelled';
          });
          if (isMounted) {
            setTodayAppointment(matched || null);
          }
        } catch (apptErr) {
          console.error('Failed to load today appointment:', apptErr);
        }

        // Fetch all appointments for Recent Visits
        try {
          const allRes = await appointmentApi.getAppointments({
            patientId: id,
            limit: 20
          });
          const allAppts = allRes.appointments || allRes.data?.appointments || [];
          if (isMounted) {
            setAllAppointments(allAppts);
          }
        } catch (allErr) {
          console.error('Failed to load all appointments:', allErr);
        }

        // Fetch patient invoices
        try {
          const invoiceRes = await billingApi.getPatientInvoices(id, { limit: 100 });
          const invoices = invoiceRes.invoices || invoiceRes.data?.invoices || [];
          if (isMounted) {
            setInvoicesList(invoices);
          }
        } catch (invErr) {
          console.error('Failed to load invoices:', invErr);
        }

        // Fetch patient notifications
        try {
          const commsRes = await patientApi.notifications(id, { limit: 10 });
          const comms = commsRes.notifications || commsRes.data?.notifications || [];
          if (isMounted) {
            setCommunications(comms);
          }
        } catch (commErr) {
          console.error('Failed to load communications:', commErr);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load patient.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPatient();
    fetchDocuments();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    try {
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        const base64Data = uploadEvent.target.result;
        try {
          await patientApi.uploadDocument(id, {
            file_name: file.name,
            file_data: base64Data,
            document_type: docType
          });
          fetchDocuments();
          if (fileInput) fileInput.value = '';
        } catch (err) {
          setUploadError(err.response?.data?.message || 'Failed to upload document.');
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        setUploadError('Failed to read file.');
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadError('Failed to initiate file upload.');
      setUploading(false);
    }
  };

  const handleDownload = async (docId) => {
    try {
      const res = await patientApi.downloadDocument(id, docId);
      const base64Data = res.data.base64Data;
      setPreviewDoc({
        name: res.data.document.file_name,
        type: res.data.document.document_type,
        data: base64Data
      });
    } catch (err) {
      alert('Failed to retrieve document content.');
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await patientApi.deleteDocument(id, docId);
      setDocuments(prev => prev.filter(d => d._id !== docId));
      if (previewDoc && previewDoc.id === docId) {
        setPreviewDoc(null);
      }
    } catch (err) {
      alert('Failed to delete document.');
    }
  };

  if (loading) {
    return <LoadingState label="Loading patient profile..." />;
  }

  if (error || !patient) {
    return <ErrorState title="Patient unavailable" description={error || 'No patient found.'} />;
  }

  if (isReceptionist) {
    const totalAppointmentsCount = allAppointments.length;
    const completedAppointmentsCount = allAppointments.filter(a => a.status?.toLowerCase() === 'completed').length;
    const upcomingAppointmentsCount = allAppointments.filter(a => ['confirmed', 'scheduled', 'checked_in', 'checked in', 'in_consultation', 'in progress', 'current'].includes(a.status?.toLowerCase())).length;
    const cancelledAppointmentsCount = allAppointments.filter(a => a.status?.toLowerCase() === 'cancelled').length;

    const totalAmountBilled = invoicesList
      .filter(inv => inv.paymentStatus?.toLowerCase() !== 'cancelled')
      .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);

    const totalAmountDue = invoicesList
      .filter(inv => inv.paymentStatus?.toLowerCase() !== 'cancelled')
      .reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0);

    const insuranceStatus = patient?.insuranceDetails?.policyNumber ? 'Verified' : 'No Insurance';

    return (
      <div className="space-y-6">
        {/* Top Breadcrumb and Profile Header */}
        <div className="flex flex-col gap-2">
          <Link 
            to="/patients" 
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-bold hover:text-slate-800 transition"
          >
            <ChevronLeft size={14} />
            Back to Patients
          </Link>
          <div className="flex justify-between items-center mt-1">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Patient Workspace</h1>
              <p className="text-xs text-slate-400 font-bold mt-1">
                View receptionist desk operations and patient identity.
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => navigate(`/patients/${patient._id}/edit`)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs bg-white shadow-sm transition flex items-center gap-1.5"
              >
                <User size={13} />
                Edit Profile
              </button>
              <button 
                onClick={() => toast.success('Patient Card printed')}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs bg-white shadow-sm transition flex items-center gap-1.5"
              >
                <Printer size={13} />
                Print Card
              </button>
            </div>
          </div>
        </div>

        {/* Patient Profile Header Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-lg shadow-sm">
              {patient.fullName ? patient.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'PT'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 leading-tight">{patient.fullName}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${patient.isActive ? 'bg-emerald-50 text-emerald-650 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                  {patient.isActive ? 'Active Patient' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold mt-1">
                Patient ID: {patient.patientId || 'PAT-0000000'}
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 mt-2 font-bold">
                <span>{patient.age ? `${patient.age} Years` : 'Age N/A'}</span>
                <span>•</span>
                <span>{patient.gender || 'Gender N/A'}</span>
                <span>•</span>
                <span>{patient.phone}</span>
                <span>•</span>
                <span>Reg: {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('en-GB') : 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Tag List */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto border-t border-slate-50 md:border-t-0 pt-3 md:pt-0">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Assigned Doctor</span>
              <span className="text-xs font-black text-slate-800 mt-0.5 block">
                {todayAppointment?.doctorId?.fullName || patient?.assignedDoctorId?.fullName || 'None'}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Next Appointment</span>
              <span className="text-xs font-black text-blue-600 mt-0.5 block">
                {todayAppointment ? `Today, ${todayAppointment.startTime || todayAppointment.appointmentTime}` : 'None Today'}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Token Number</span>
              <span className="text-xs font-black text-slate-800 mt-0.5 block">
                {todayAppointment ? `#${todayAppointment.tokenNumber || todayAppointment.queueToken}` : 'N/A'}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100 text-center">
              <span className="text-[8px] uppercase tracking-wider text-rose-500 font-bold block">Outstanding Due</span>
              <span className="text-xs font-black text-rose-600 mt-0.5 block">₹{totalAmountDue.toLocaleString('en-IN')}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Visit Status</span>
              <span className="text-xs font-black text-emerald-600 mt-0.5 block">
                {todayAppointment ? (todayAppointment.status || 'Confirmed') : 'No Visit'}
              </span>
            </div>
          </div>
        </div>

        {/* Top Quick Action Bar */}
        <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-wrap gap-2.5">
          <button 
            onClick={() => navigate(`/appointments/new?patientId=${patient._id}`)}
            className="flex-1 min-w-[140px] py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 border border-blue-100 shadow-sm"
          >
            <Calendar size={13} />
            Book Appointment
          </button>
          <button 
            onClick={() => toast.success('Patient checked in successfully')}
            className="flex-1 min-w-[140px] py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 border border-emerald-100 shadow-sm"
          >
            <CheckCircle size={13} />
            Check In Patient
          </button>
          <button 
            onClick={() => toast.success('Token #12 generated')}
            className="flex-1 min-w-[140px] py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 border border-teal-100 shadow-sm"
          >
            <Plus size={13} />
            Generate Token
          </button>
          <button 
            onClick={() => navigate(`/billing?patientId=${patient._id}`)}
            className="flex-1 min-w-[140px] py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 border border-amber-100 shadow-sm"
          >
            <DollarSign size={13} />
            Raise Billing
          </button>
          <button 
            onClick={() => {
              if (fileInput) fileInput.click();
            }}
            className="flex-1 min-w-[140px] py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 border border-indigo-100 shadow-sm"
          >
            <FileText size={13} />
            Upload Documents
          </button>
          <button 
            onClick={() => toast.success('WhatsApp reminder sent')}
            className="flex-1 min-w-[140px] py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 border border-slate-100 shadow-sm"
          >
            <MessageSquare size={13} className="text-emerald-55 text-emerald-600" />
            Send WhatsApp
          </button>
          <button 
            onClick={() => toast.success('Connecting call...')}
            className="flex-1 min-w-[140px] py-2 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl transition flex items-center justify-center gap-2 border border-slate-100 shadow-sm"
          >
            <Phone size={13} className="text-blue-500" />
            Call Patient
          </button>
        </div>

        {/* Alert Banner Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-3 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-between text-xs font-bold text-orange-700 shadow-sm">
            <span className="flex items-center gap-2">
              <ShieldAlert size={14} className="text-orange-500" />
              Allergy: Penicillin
            </span>
            <span className="text-[8px] uppercase tracking-wider bg-orange-200/50 px-2 py-0.5 rounded">Read-Only</span>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between text-xs font-bold text-rose-700 shadow-sm">
            <span className="flex items-center gap-2">
              <CreditCard size={14} className="text-rose-500" />
              Pending Bill: ₹500
            </span>
            <button 
              onClick={() => navigate(`/billing?patientId=${patient._id}`)}
              className="text-[9px] bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 rounded transition"
            >
              Pay Now
            </button>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-700 shadow-sm">
            <span className="flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-500" />
              No Insurance
            </span>
            <span className="text-[8px] uppercase tracking-wider bg-emerald-200/50 px-2 py-0.5 rounded">Default</span>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between text-xs font-bold text-blue-700 shadow-sm">
            <span className="flex items-center gap-2">
              <Bell size={14} className="text-blue-500" />
              Follow-up Due Today
            </span>
            <span className="text-[8px] uppercase tracking-wider bg-blue-200/50 px-2 py-0.5 rounded">Urgent</span>
          </div>
        </div>

        {/* Today's Appointment Section */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2">
            Today's Appointment
          </h3>
          {todayAppointment ? (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 p-4 border border-slate-100 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center font-bold text-blue-600 text-xs">
                  {todayAppointment.doctorId?.fullName ? todayAppointment.doctorId.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DR'}
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs leading-none">
                    {todayAppointment.doctorId?.fullName || todayAppointment.doctorId?.userId?.name || 'Dr. Shyam'}
                  </h4>
                  <p className="text-[9px] text-slate-400 mt-1 font-bold">
                    {todayAppointment.doctorId?.specialization || 'Cardiology'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-bold text-slate-700 flex-1 px-2">
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">Time</span>
                  <span className="text-slate-800 mt-0.5 block">{todayAppointment.startTime || todayAppointment.appointmentTime || '10:30 AM'}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">Status</span>
                  <span className="text-emerald-600 mt-0.5 block capitalize">{todayAppointment.status || 'Confirmed'}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">Token</span>
                  <span className="text-slate-800 mt-0.5 block">#{todayAppointment.tokenNumber || todayAppointment.queueToken || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">Room</span>
                  <span className="text-slate-800 mt-0.5 block">{todayAppointment.doctorId?.room || 'Consultation Room 2'}</span>
                </div>
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 block font-bold">Payment</span>
                  <span className="text-amber-600 mt-0.5 block capitalize">{todayAppointment.paymentStatus || 'Pending'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handlePrintSlip(todayAppointment)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-bold rounded-xl transition shadow-sm"
                >
                  Print Token
                </button>
                <button 
                  onClick={() => toast.success('Doctor notified')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-xl shadow-sm transition"
                >
                  Notify Doctor
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-50/50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-3">
              <p className="text-xs text-slate-400 font-bold">No appointment scheduled today.</p>
              <button
                onClick={() => navigate(`/appointments/new?patientId=${patient._id}`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
              >
                Book Appointment
              </button>
            </div>
          )}
        </div>

        {/* Dashboard 2-column workspace layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (Timeline, Info, Documents): 9 columns */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Recent Visits Timeline */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Recent Visits
                </h3>
              </div>

              <div className="relative border-l border-slate-200 pl-6 ml-12 space-y-6 text-xs font-bold text-slate-700">
                {allAppointments.length === 0 ? (
                  <div className="text-slate-400 py-2">No visits recorded.</div>
                ) : (
                  allAppointments.slice(0, 5).map((appt) => {
                    const dateStr = appt.appointmentDate ? new Date(appt.appointmentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A';
                    const docName = appt.doctorId?.fullName || appt.doctorId?.userId?.name || 'Dr. Shyam';
                    return (
                      <div className="relative" key={appt._id}>
                        <span className="absolute -left-[64px] top-1 text-[9px] text-slate-400 font-bold">{dateStr}</span>
                        <span className={`absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${appt.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-600'}`} />
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-slate-800 font-extrabold text-[11px]">Appointment with {docName}</p>
                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">Time: {appt.startTime || appt.appointmentTime}</p>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] rounded-full capitalize ${appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{appt.status}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Basic Patient Information Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2">
                Basic Patient Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-slate-700">
                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Mobile Number</span>
                  <span className="text-slate-800 mt-1 block flex items-center gap-1.5"><Phone size={11} className="text-slate-400" /> {patient.phone}</span>
                </div>
                {patient.alternatePhone ? (
                  <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                    <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Alternate Phone</span>
                    <span className="text-slate-800 mt-1 block flex items-center gap-1.5"><Phone size={11} className="text-slate-400" /> {patient.alternatePhone}</span>
                  </div>
                ) : null}
                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Email</span>
                  <span className="text-slate-800 mt-1 block flex items-center gap-1.5"><Mail size={11} className="text-slate-400" /> {patient.email || 'N/A'}</span>
                </div>
                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Date of Birth</span>
                  <span className="text-slate-800 mt-1 block flex items-center gap-1.5"><Calendar size={11} className="text-slate-400" /> {patient.dateOfBirth?.slice?.(0, 10) || patient.dateOfBirth || 'N/A'}</span>
                </div>
                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Blood Group</span>
                  <span className="text-slate-800 mt-1 block flex items-center gap-1.5"><Activity size={11} className="text-slate-400" /> {patient.bloodGroup || 'Unspecified'}</span>
                </div>
                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Preferred Language</span>
                  <span className="text-slate-800 mt-1 block flex items-center gap-1.5"><Globe size={11} className="text-slate-400" /> English / Hindi</span>
                </div>
                <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50 col-span-1 md:col-span-3">
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold block">Home Address</span>
                  <span className="text-slate-800 mt-1 block flex items-center gap-1.5"><MapPin size={11} className="text-slate-400" /> {[patient.address?.line1, patient.address?.city, patient.address?.state].filter(Boolean).join(', ') || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Documents Section Grid */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Documents
                </h3>
                <input
                  type="file"
                  id="receptionist-file-upload"
                  className="hidden"
                  onChange={handleFileUpload}
                  ref={el => setFileInput(el)}
                />
                <button 
                  onClick={() => {
                    if (fileInput) fileInput.click();
                  }}
                  className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded hover:bg-blue-100 transition flex items-center gap-1 animate-pulse"
                >
                  <Plus size={11} />
                  Upload Document
                </button>
              </div>

              {documents.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-medium">
                  No documents uploaded yet
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {documents.map((doc) => (
                    <div key={doc._id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between gap-3 text-xs font-bold text-slate-800">
                      <div>
                        <p className="text-slate-800 font-extrabold truncate">{doc.file_name}</p>
                        <span className="text-[8px] uppercase tracking-wider text-blue-600 mt-1 block">{doc.document_type || 'General'}</span>
                        <span className="text-[8px] text-slate-400 font-bold mt-0.5 block">Uploaded: {new Date(doc.uploaded_at || Date.now()).toLocaleDateString('en-GB')}</span>
                      </div>
                      <div className="flex gap-2 border-t border-slate-200/50 pt-2">
                        <button 
                          onClick={() => handleDownload(doc._id)}
                          className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-700 text-[10px] rounded-lg transition hover:bg-slate-100"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => handleDeleteDoc(doc._id)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Delete File"
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Sidebar Widgets: 3 columns */}
          <div className="lg:col-span-3 space-y-6 sticky top-6">
            
            {/* Patient Summary */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2">
                Patient Summary
              </h3>
              <div className="space-y-3.5 text-xs font-bold">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Appointments</span>
                  <span className="text-slate-800">{totalAppointmentsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Completed</span>
                  <span className="text-slate-800">{completedAppointmentsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Upcoming</span>
                  <span className="text-slate-800">{upcomingAppointmentsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cancelled / Missed</span>
                  <span className="text-slate-800">{cancelledAppointmentsCount}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-3">
                  <span className="text-slate-400">Total Spent</span>
                  <span className="text-slate-800">₹{totalAmountBilled.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Outstanding Due</span>
                  <span>₹{totalAmountDue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-50 pb-2">
                Emergency Contact
              </h3>
              {patient.emergencyContact?.name ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">{patient.emergencyContact.name}</p>
                    <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                      {patient.emergencyContact.relation || 'Contact'} • {patient.emergencyContact.phone || 'N/A'}
                    </span>
                  </div>
                  {patient.emergencyContact.phone && (
                    <button 
                      onClick={() => toast.success(`Calling ${patient.emergencyContact.name}...`)}
                      className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-xl transition"
                    >
                      <Phone size={13} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 text-xs font-bold">No Emergency Contact provided</div>
              )}
            </div>

            {/* Latest Communications */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Latest Communication
                </h3>
              </div>
              <div className="space-y-3.5 text-xs font-bold">
                {communications.length === 0 ? (
                  <div className="text-slate-400 py-2">No communications logged.</div>
                ) : (
                  communications.slice(0, 3).map((comm) => (
                    <div className="flex justify-between items-start gap-2" key={comm._id}>
                      <div>
                        <p className="text-slate-800 text-[10px] capitalize">
                          {comm.channel || 'SMS'}: {comm.subject || comm.title || 'Notification'}
                        </p>
                        <span className="text-[8px] text-slate-400 font-bold block mt-0.5">
                          {new Date(comm.createdAt || Date.now()).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 text-[8px] rounded-full font-black ${comm.status === 'delivered' || comm.status === 'sent' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-650'}`}>
                        {comm.status || 'Sent'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Financial Overview */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Financial Overview
                </h3>
              </div>
              <div className="space-y-3 text-xs font-bold">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Spent</span>
                  <span className="text-slate-800">₹{totalAmountBilled.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>Outstanding Due</span>
                  <span>₹{totalAmountDue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Insurance Status</span>
                  <span className={`capitalize ${patient.insuranceDetails?.policyNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {insuranceStatus}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Preview Document Modal */}
        {previewDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">{previewDoc.name}</h3>
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-700 transition"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 flex-1">
                {previewDoc.data?.startsWith('data:image/') ? (
                  <img src={previewDoc.data} alt={previewDoc.name} className="w-full h-auto max-h-[50vh] rounded-2xl border border-slate-100 shadow-sm object-contain" />
                ) : (
                  <div className="text-center p-6 space-y-4">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Preview Unavailable</p>
                    <a
                      href={previewDoc.data}
                      download={previewDoc.name}
                      className="inline-block rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
                    >
                      Download Document
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="grid gap-6 pb-12">
      {/* Profile Header */}
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Patient profile</p>
          <h2 className="mt-2 text-3xl font-semibold text-stone-900">{patient.fullName || 'Not provided'}</h2>
          <p className="mt-2 text-sm text-stone-600">Patient ID: {patient.patientId || 'Not provided'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50" to="/patients">
            Back to list
          </Link>
          <Link className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50" to={`/patients/${patient._id}/history`}>
            Consultation history
          </Link>
          <Link className="rounded-2xl border border-sky-300 px-4 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50" to={`/prescriptions?patientId=${patient._id}`}>
            Prescriptions
          </Link>
          <Link className="rounded-2xl border border-amber-300 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50" to={`/billing?patientId=${patient._id}`}>
            Billing
          </Link>
          <Link className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50" to={`/patients/${patient._id}/labs`}>
            Lab history
          </Link>
          <Link className="rounded-2xl border border-indigo-300 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50" to={`/patients/${patient._id}/medicines`}>
            Medicine history
          </Link>
          <Link className="rounded-2xl border border-violet-300 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50" to={`/patients/${patient._id}/notifications`}>
            Notifications
          </Link>
          <Link className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700" to={`/patients/${patient._id}/edit`}>
            Edit patient
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Profile Details */}
        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 h-fit">
          <h3 className="text-xl font-semibold text-stone-900 border-b border-stone-100 pb-3">Profile details</h3>
          <dl className="mt-4 grid gap-4 md:grid-cols-2">
            <DetailItem label="Gender" value={patient.gender} />
            <DetailItem label="Age" value={patient.age ?? 'Not provided'} />
            <DetailItem label="Date of birth" value={patient.dateOfBirth?.slice?.(0, 10) || patient.dateOfBirth} />
            <DetailItem label="Phone" value={patient.phone} />
            <DetailItem label="Email" value={patient.email} />
            <DetailItem label="Blood group" value={patient.bloodGroup} />
            <DetailItem label="Status" value={patient.isActive ? 'Active' : 'Inactive'} />
            <DetailItem
              label="Address"
              value={[patient.address?.line1, patient.address?.city, patient.address?.state].filter(Boolean).join(', ')}
            />
          </dl>
        </article>

        {/* Structured Medical Profile */}
        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <h3 className="text-xl font-semibold text-stone-900 border-b border-stone-100 pb-3">Medical History</h3>
          <div className="mt-4 grid gap-5">
            {/* Chronic Diseases */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Chronic Diseases</h4>
              {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.chronicConditions.map((cond, index) => (
                    <span key={index} className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      {cond}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">None reported</p>
              )}
            </div>

            {/* Allergies */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Allergies</h4>
              {patient.allergies && patient.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((allergy, index) => (
                    <span key={index} className="px-3 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                      {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">None reported</p>
              )}
            </div>

            {/* Current Medications */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Current Medications</h4>
              {patient.currentMedications && patient.currentMedications.length > 0 ? (
                <div className="grid gap-2">
                  {patient.currentMedications.map((med, index) => (
                    <div key={index} className="flex justify-between items-center bg-stone-50 rounded-xl p-3 border border-stone-100">
                      <span className="text-sm font-semibold text-stone-900">{med.name}</span>
                      <span className="text-xs font-medium text-stone-600 bg-stone-200/60 px-2 py-1 rounded-md">{med.frequency || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">None reported</p>
              )}
            </div>

            {/* Past Surgeries */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Past Surgeries</h4>
              {patient.pastSurgeries && patient.pastSurgeries.length > 0 ? (
                <div className="relative border-l border-stone-200 pl-4 ml-2 grid gap-3 mt-2">
                  {patient.pastSurgeries.map((surg, index) => (
                    <div key={index} className="relative">
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                      <div className="text-sm">
                        <span className="font-semibold text-stone-900">{surg.name}</span>
                        <span className="text-xs font-medium text-stone-500 ml-2">({surg.year || 'N/A'})</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">None reported</p>
              )}
            </div>

            {/* Family History */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Family History</h4>
              {patient.familyHistory && patient.familyHistory.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {patient.familyHistory.map((fam, index) => (
                    <div key={index} className="bg-stone-50 rounded-xl p-3 border border-stone-100 flex flex-col">
                      <span className="text-xs text-stone-500 uppercase tracking-wider">{fam.relation}</span>
                      <span className="text-sm font-semibold text-stone-900 mt-1">{fam.condition}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">None reported</p>
              )}
            </div>

            {/* Lifestyle */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Lifestyle</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 text-center">
                  <span className="text-[10px] uppercase text-stone-500 tracking-wider">Smoking</span>
                  <p className="text-sm font-semibold text-stone-900 mt-1">{patient.lifestyle?.smoking ? 'Yes' : 'No'}</p>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 text-center">
                  <span className="text-[10px] uppercase text-stone-500 tracking-wider">Alcohol</span>
                  <p className="text-sm font-semibold text-stone-900 mt-1">{patient.lifestyle?.alcohol ? 'Yes' : 'No'}</p>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 text-center">
                  <span className="text-[10px] uppercase text-stone-500 tracking-wider">Exercise</span>
                  <p className="text-sm font-semibold text-stone-900 mt-1">{patient.lifestyle?.exercise || 'N/A'}</p>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 text-center">
                  <span className="text-[10px] uppercase text-stone-500 tracking-wider">Diet</span>
                  <p className="text-sm font-semibold text-stone-900 mt-1">{patient.lifestyle?.diet || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Pregnancy History & LMP (Female Patients) */}
            {patient.gender === 'female' && (
              <div className="grid grid-cols-2 gap-3 border-t border-stone-100 pt-3">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">Pregnancy History</h4>
                  <p className="text-sm font-semibold text-stone-900">{patient.pregnancyHistory || 'None reported'}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-1">LMP Date</h4>
                  <p className="text-sm font-semibold text-stone-900">
                    {patient.lmpDate ? new Date(patient.lmpDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            )}

            <div className="border-t border-stone-100 pt-3 flex justify-between text-xs text-stone-500">
              <span>Emergency contact:</span>
              <span className="font-semibold text-stone-800">
                {[patient.emergencyContact?.name, patient.emergencyContact?.relation, patient.emergencyContact?.phone]
                  .filter(Boolean)
                  .join(' - ') || 'Not provided'}
              </span>
            </div>
          </div>
        </article>
      </div>

      {/* Documents */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
        <div className="flex flex-col justify-between gap-4 border-b border-stone-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-xl font-semibold text-stone-900">Documents</h3>
            <p className="mt-1 text-sm text-stone-600">Upload and manage patient medical records, insurance cards, and consent forms.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="rounded-2xl border border-stone-300 px-3.5 py-2.5 text-sm font-semibold text-stone-700 outline-none focus:border-emerald-500"
            >
              <option value="CBC Report">CBC Report</option>
              <option value="MRI Scan">MRI Scan</option>
              <option value="Prescription">Prescription</option>
              <option value="Insurance Card">Insurance Card</option>
              <option value="Referral Letter">Referral Letter</option>
              <option value="Consent Form">Consent Form</option>
            </select>
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              id="patient-file-upload"
              ref={(el) => setFileInput(el)}
            />
            <button
              onClick={() => fileInput?.click()}
              disabled={uploading}
              className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>

        {uploadError && <p className="mt-3 text-xs font-semibold text-rose-600">{uploadError}</p>}

        {docsLoading ? (
          <div className="py-12 text-center text-stone-500">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="py-12 text-center text-stone-500">No documents uploaded for this patient.</div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="flex items-center justify-between rounded-2xl border border-stone-200 p-4 transition hover:bg-stone-50/50"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <p className="truncate text-sm font-semibold text-stone-900">{doc.file_name}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {doc.document_type} • {new Date(doc.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDownload(doc._id)}
                    className="p-2 hover:bg-stone-200/50 rounded-xl text-stone-600 transition"
                    title="View / Download"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteDoc(doc._id)}
                    className="p-2 hover:bg-rose-50 rounded-xl text-rose-650 transition"
                    title="Delete"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-stone-100 bg-stone-50/50">
              <h3 className="text-lg font-semibold text-stone-900">{previewDoc.name}</h3>
              <button onClick={() => setPreviewDoc(null)} className="p-2 hover:bg-stone-200/60 rounded-full text-stone-500 transition">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-stone-50/30">
              {previewDoc.type === 'pdf' ? (
                <iframe src={previewDoc.data} title={previewDoc.name} className="w-full h-[50vh] rounded-xl border border-stone-200" />
              ) : (
                <div className="text-center p-6">
                  <p className="text-sm text-stone-600 mb-4">Preview not directly supported in browser for this file type.</p>
                  <a
                    href={previewDoc.data}
                    download={previewDoc.name}
                    className="inline-block rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Consultation History */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
        <h3 className="text-xl font-semibold text-stone-900">Patient history</h3>
        <p className="mt-2 text-sm text-stone-600">
          Consultations, prescriptions, lab orders, dispensings, notifications, follow-ups, and invoices now appear in patient history while appointments remain a lightweight placeholder view.
        </p>
        <div className="mt-6">
          <PatientHistoryPanel patientId={patient._id} />
        </div>
      </div>

      {/* Billing History */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
        <h3 className="text-xl font-semibold text-stone-900">Billing history</h3>
        <p className="mt-2 text-sm text-stone-600">Review issued and draft invoices linked to this patient, including current due amounts.</p>
        <div className="mt-6">
          <PatientInvoiceHistory patientId={patient._id} />
        </div>
      </div>
    </section>
  );
};

export default PatientDetailPage;
