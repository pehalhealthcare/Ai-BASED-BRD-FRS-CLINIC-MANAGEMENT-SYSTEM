import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { patientApi } from '../../lib/api';
import PatientInvoiceHistory from './PatientInvoiceHistory';
import PatientHistoryPanel from './PatientHistoryPanel';

const DetailItem = ({ label, value }) => (
  <div className="rounded-2xl bg-stone-50 p-4">
    <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">{label}</dt>
    <dd className="mt-2 text-sm font-medium text-stone-900">{value || 'Not provided'}</dd>
  </div>
);

const PatientDetailPage = () => {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
                      <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white" />
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
                  <p className="text-sm font-semibold text-stone-900 mt-1 capitalize">{patient.lifestyle?.smoking || 'no'}</p>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 text-center">
                  <span className="text-[10px] uppercase text-stone-500 tracking-wider">Alcohol</span>
                  <p className="text-sm font-semibold text-stone-900 mt-1 capitalize">{patient.lifestyle?.alcohol || 'no'}</p>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 text-center">
                  <span className="text-[10px] uppercase text-stone-500 tracking-wider">Exercise</span>
                  <p className="text-sm font-semibold text-stone-900 mt-1 truncate">{patient.lifestyle?.exerciseFrequency || 'N/A'}</p>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 text-center">
                  <span className="text-[10px] uppercase text-stone-500 tracking-wider">Diet</span>
                  <p className="text-sm font-semibold text-stone-900 mt-1 truncate">{patient.lifestyle?.dietType || 'N/A'}</p>
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

      {/* Patient Documents evidence upload section */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
        <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center border-b border-stone-100 pb-4">
          <div>
            <h3 className="text-xl font-semibold text-stone-900">Patient Documents & Evidence</h3>
            <p className="mt-1 text-sm text-stone-600">Upload reports, MRI scans, old hospital prescriptions (Image/PDF/Word).</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="CBC Report">CBC Report</option>
              <option value="MRI Scan">MRI Scan</option>
              <option value="old Prescription">Old Prescription</option>
              <option value="Other">Other Document</option>
            </select>
            <label className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white cursor-pointer transition disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Upload Document'}
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={handleFileUpload}
                ref={(el) => setFileInput(el)}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {uploadError && <p className="mt-2 text-sm text-rose-700 rounded-xl bg-rose-50 px-3 py-2">{uploadError}</p>}

        <div className="mt-4">
          {docsLoading ? (
            <p className="text-sm text-stone-500">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-stone-500 py-6 text-center">No documents uploaded yet.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <div key={doc._id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 relative hover:shadow-md transition">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    {doc.document_type}
                  </span>
                  <h4 className="font-semibold text-stone-900 mt-2 truncate pr-6" title={doc.file_name}>
                    {doc.file_name}
                  </h4>
                  <div className="text-xs text-stone-500 mt-2 grid gap-1">
                    <span>Uploaded by: {doc.uploaded_by?.name || 'Unknown'}</span>
                    <span>Date: {new Date(doc.uploaded_at).toLocaleDateString()}</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleDownload(doc._id)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      View / Preview
                    </button>
                    <button
                      onClick={() => handleDeleteDoc(doc._id)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document Preview Lightbox */}
      {previewDoc && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] p-6 shadow-2xl flex flex-col">
            <div className="flex justify-between items-center border-b border-stone-200 pb-3 mb-4">
              <div>
                <span className="text-xs font-semibold uppercase text-emerald-700 tracking-wider">{previewDoc.type}</span>
                <h3 className="text-lg font-bold text-stone-900 mt-1 truncate">{previewDoc.name}</h3>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="text-stone-500 hover:text-stone-700 font-bold text-lg px-2"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-stone-100 rounded-2xl p-4 flex justify-center items-center min-h-[300px]">
              {previewDoc.data.startsWith('data:image/') ? (
                <img src={previewDoc.data} alt={previewDoc.name} className="max-w-full max-h-[50vh] object-contain" />
              ) : previewDoc.data.startsWith('data:application/pdf') ? (
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
