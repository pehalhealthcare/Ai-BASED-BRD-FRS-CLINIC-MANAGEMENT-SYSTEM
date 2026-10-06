import { useState, useRef } from 'react';
import { UploadCloud, FileText, Trash2, Download, AlertCircle, CheckCircle2, Loader2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { patientApi } from '../../../lib/api';
import aiApi from '../../../api/aiApi';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

const CATEGORIES = [
  'Prescription',
  'Lab Report',
  'Imaging/Scan (MRI/CT/X-Ray)',
  'Discharge Summary',
  'Insurance Document',
  'Other'
];

const PatientMedicalDocuments = ({ patientId, documents = [], onDocumentsChanged }) => {
  const [category, setCategory] = useState('Prescription');
  const [documentTitle, setDocumentTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState(null);
  const [fieldError, setFieldError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    setFieldError('');
    setUploadNotice(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_MIME_TYPES.includes(file.type)) {
      setFieldError('Only JPG, PNG and PDF files are supported.');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    if (!documentTitle) {
      setDocumentTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setFieldError('');
    setUploadNotice(null);

    if (!selectedFile) {
      setFieldError('Please select a file to upload.');
      return;
    }

    if (!category) {
      setFieldError('Please select a document category.');
      return;
    }

    const title = (documentTitle.trim() || selectedFile.name).trim();

    setUploading(true);
    try {
      // 1. Read file as Base64 for storing document
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(selectedFile);
      });

      // 2. Upload Document directly to Patient Document Record
      await patientApi.uploadDocument(patientId, {
        file_name: title,
        file_data: base64Data,
        document_type: category
      });

      // 3. Optional OCR / AI extraction in background
      let ocrFailed = false;
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('document_type', category.toLowerCase());
        await aiApi.extractDocument(formData);
      } catch (ocrErr) {
        console.warn('Optional OCR extraction failed or unavailable:', ocrErr);
        ocrFailed = true;
      }

      if (ocrFailed) {
        setUploadNotice({
          type: 'info',
          message: 'Document uploaded successfully. Automatic information extraction is temporarily unavailable.'
        });
        toast.success('Document uploaded successfully.');
      } else {
        setUploadNotice({
          type: 'success',
          message: 'Document uploaded and processed successfully.'
        });
        toast.success('Document uploaded successfully.');
      }

      // Reset form
      setSelectedFile(null);
      setDocumentTitle('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      if (onDocumentsChanged) {
        onDocumentsChanged();
      }
    } catch (err) {
      console.error('Document upload error:', err);
      const msg = err?.response?.data?.message || err.message || 'Unable to upload document. Please try again.';
      setFieldError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (doc) => {
    if (!doc.file_data) {
      toast.error('Document data not available for download.');
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = doc.file_data;
      link.download = doc.file_name || 'document';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download document.');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await patientApi.deleteDocument(patientId, docId);
      toast.success('Document deleted successfully.');
      if (onDocumentsChanged) {
        onDocumentsChanged();
      }
    } catch (err) {
      console.error('Delete document error:', err);
      toast.error('Failed to delete document.');
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Upload Medical Document Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-5">
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">Upload Medical Document</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Upload and store prescriptions, lab reports, MRI/CT scans, and discharge summaries safely.
          </p>
        </div>

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={uploading}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Document Title Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Document Title
              </label>
              <input
                type="text"
                placeholder="e.g. Chest X-Ray, Blood Test 2026"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                disabled={uploading}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition placeholder:text-slate-400 font-medium"
              />
            </div>
          </div>

          {/* File Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Choose File <span className="text-rose-500">*</span></span>
              <span className="text-[10px] font-bold text-slate-400">Supported: JPG, JPEG, PNG, PDF</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="w-full px-3.5 py-2 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-xs font-medium text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer transition"
            />
          </div>

          {/* Field Error Alert */}
          {fieldError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2 font-medium">
              <AlertCircle size={15} className="text-rose-500 shrink-0" />
              <span>{fieldError}</span>
            </div>
          )}

          {/* Upload Notice (e.g., OCR fallback notice) */}
          {uploadNotice && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 font-medium border ${
              uploadNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              {uploadNotice.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={16} className="text-blue-600 shrink-0 mt-0.5" />
              )}
              <span>{uploadNotice.message}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Uploading Document...</span>
                </>
              ) : (
                <>
                  <UploadCloud size={15} />
                  <span>Upload Document</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Uploaded Documents List */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xs space-y-4">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Your Files ({documents.length})</h4>

        {documents.length === 0 ? (
          <div className="text-center py-10 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <FileText size={22} />
            </div>
            <p className="text-xs font-bold text-slate-700">No medical documents uploaded yet.</p>
            <p className="text-[11px] text-slate-400">Upload your prescriptions, test reports, or scan summaries above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {documents.map((doc) => {
              const isPdf = (doc.file_name || '').toLowerCase().endsWith('.pdf') || (doc.file_data || '').includes('application/pdf');
              return (
                <div
                  key={doc._id}
                  className="p-4 rounded-2xl bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                      {isPdf ? <FileText size={18} /> : <ImageIcon size={18} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">{doc.file_name}</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        {doc.document_type || 'General'} • {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'Uploaded'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {doc.file_data && (
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        title="Download Document"
                        className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-300 transition shadow-2xs"
                      >
                        <Download size={13} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(doc._id)}
                      title="Delete Document"
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-rose-600 hover:border-rose-300 transition shadow-2xs"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientMedicalDocuments;
