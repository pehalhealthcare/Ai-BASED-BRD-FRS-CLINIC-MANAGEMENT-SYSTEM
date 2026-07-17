import { useState, useEffect } from 'react';
import {
  Search, Eye, Printer, ChevronDown, ChevronUp, FileDown, PlusCircle, Check, X,
  AlertTriangle, Play, Calendar, Clock, RefreshCw, Trash2, Edit2, AlertCircle,
  Folder, Shield, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

// Initial Mock Patient Documents Registry entries matching active patient medical states
const INITIAL_DOCUMENTS_REGISTRY = [
  {
    _id: "doc-001",
    documentName: "Consultation Report",
    category: "Consultation Reports",
    type: "Report",
    clinic: "Ram's Dental Clinic",
    branch: "Indirapuram Branch",
    doctor: "Dr. Shyam Verma",
    consultationId: "APT-2026-0716-032",
    time: "10:30 AM",
    date: "16 Jul 2026",
    fileSize: "245 KB",
    previewUrl: "/pdf-mock-url"
  },
  {
    _id: "doc-002",
    documentName: "Prescription - Dr. Shyam Verma",
    category: "Prescriptions",
    type: "Prescription",
    clinic: "Ram's Dental Clinic",
    branch: "Indirapuram Branch",
    doctor: "Dr. Shyam Verma",
    consultationId: "APT-2026-0716-032",
    time: "10:45 AM",
    date: "16 Jul 2026",
    fileSize: "180 KB",
    previewUrl: "/pdf-mock-url"
  },
  {
    _id: "doc-003",
    documentName: "CBC Report",
    category: "Laboratory Reports",
    type: "Lab Report",
    clinic: "Ram's Diagnostic Center",
    branch: "Indirapuram Branch",
    doctor: "Dr. Shyam Verma",
    consultationId: "LAB-2026-0716-118",
    time: "11:30 AM",
    date: "16 Jul 2026",
    fileSize: "320 KB",
    previewUrl: "/pdf-mock-url"
  },
  {
    _id: "doc-004",
    documentName: "Lipid Profile Report",
    category: "Laboratory Reports",
    type: "Lab Report",
    clinic: "Ram's Diagnostic Center",
    branch: "Indirapuram Branch",
    doctor: "Dr. Shyam Verma",
    consultationId: "LAB-2026-0716-119",
    time: "11:30 AM",
    date: "16 Jul 2026",
    fileSize: "280 KB",
    previewUrl: "/pdf-mock-url"
  },
  {
    _id: "doc-005",
    documentName: "Invoice",
    category: "Bills & Invoices",
    type: "Invoice",
    clinic: "Ram's Dental Clinic",
    branch: "Indirapuram Branch",
    doctor: "Dr. Shyam Verma",
    consultationId: "INV-2026-0716-090",
    time: "12:15 PM",
    date: "16 Jul 2026",
    fileSize: "150 KB",
    previewUrl: "/pdf-mock-url"
  },
  {
    _id: "doc-006",
    documentName: "Chest X-Ray",
    category: "Radiology Reports",
    type: "Radiology",
    clinic: "City Scan Center",
    branch: "Ghaziabad",
    doctor: "Dr. Shyam Verma",
    consultationId: "RAD-2026-0710-556",
    time: "09:20 AM",
    date: "10 Jul 2026",
    fileSize: "1.2 MB",
    previewUrl: "/pdf-mock-url"
  }
];

export default function DocumentsWorkspace({
  patient, currentUser, navigate, currentMedicines, setMedicines, setIsDirty
}) {
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS_REGISTRY);
  const [activeCategory, setActiveCategory] = useState('All Documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState(INITIAL_DOCUMENTS_REGISTRY[0]);

  // Form states
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('External Uploads');
  const [uploadFile, setUploadFile] = useState(null);

  const categoriesList = [
    'All Documents',
    'Consultation Reports',
    'Laboratory Reports',
    'Radiology Reports',
    'Prescriptions',
    'Certificates',
    'Referral Letters',
    'Insurance Documents',
    'Bills & Invoices',
    'External Uploads'
  ];

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadName) return;

    const newDoc = {
      _id: `doc-new-${Date.now()}`,
      documentName: uploadName,
      category: uploadCategory,
      type: "External Upload",
      clinic: "Ram's Dental Clinic",
      branch: "Indirapuram Branch",
      doctor: currentUser?.fullName || "Dr. Shyam Verma",
      consultationId: "N/A",
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      fileSize: "450 KB",
      previewUrl: "/pdf-mock-url"
    };

    setDocuments([newDoc, ...documents]);
    toast.success(`${uploadName} uploaded successfully!`);
    setShowUploadModal(false);
    setUploadName('');
    setUploadFile(null);
  };

  const filteredDocs = documents.filter(doc => {
    const matchesCategory = activeCategory === 'All Documents' || doc.category === activeCategory;
    const matchesSearch = !searchQuery ||
      doc.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.doctor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 border border-slate-200 rounded-3xl p-6">
        <div>
          <h2 className="text-base font-black text-slate-800">
            Documents
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            View every consultation report, prescription, laboratory report, certificate, referral, invoice and uploaded file.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 shadow-sm"
        >
          <PlusCircle size={14} /> Upload Document
        </button>
      </div>

      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Documents', count: documents.length, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
          { label: 'Consultation Reports', count: documents.filter(d => d.category === 'Consultation Reports').length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Lab Reports', count: documents.filter(d => d.category === 'Laboratory Reports').length, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Prescriptions', count: documents.filter(d => d.category === 'Prescriptions').length, color: 'bg-purple-50 text-purple-700 border-purple-200' },
          { label: 'External Uploads', count: documents.filter(d => d.category === 'External Uploads').length, color: 'bg-slate-50 text-slate-700 border-slate-200' }
        ].map((c, i) => (
          <div key={i} className={`p-3 border rounded-2xl ${c.color} text-center space-y-1`}>
            <span className="text-[9px] uppercase font-bold block opacity-75 leading-tight">{c.label}</span>
            <strong className="text-base font-black block">{c.count}</strong>
          </div>
        ))}
      </div>

      {/* Grid Layout Container */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_360px] gap-6 items-start">

        {/* Left Categories Navigator */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Categories</h3>
          <div className="flex flex-col gap-1 text-xs">
            {categoriesList.map(cat => {
              const count = cat === 'All Documents' ? documents.length : documents.filter(d => d.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`w-full text-left py-2 px-3 rounded-lg font-bold flex justify-between items-center transition ${
                    activeCategory === cat ? 'bg-indigo-50 border-l-2 border-indigo-650 text-indigo-707 font-extrabold' : 'hover:bg-slate-50 text-slate-650'
                  }`}
                >
                  <span>{cat}</span>
                  <span className="text-[10px] text-slate-400 font-semibold">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Timeline Document Lists */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-4 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Documents Timeline</h3>
            <div className="relative w-full max-w-[200px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="space-y-4">
            {filteredDocs.length > 0 ? (
              // Simple chronological group
              Object.entries(
                filteredDocs.reduce((acc, doc) => {
                  acc[doc.date] = acc[doc.date] || [];
                  acc[doc.date].push(doc);
                  return acc;
                }, {})
              ).map(([date, docsList]) => (
                <div key={date} className="space-y-2">
                  <div className="text-[10px] uppercase font-black text-slate-450 tracking-wider px-1">{date}</div>
                  <div className="space-y-2">
                    {docsList.map(doc => (
                      <div
                        key={doc._id}
                        onClick={() => setSelectedPreviewDoc(doc)}
                        className={`p-4 border rounded-2xl bg-white flex justify-between items-center gap-4 cursor-pointer hover:border-indigo-300 transition shadow-sm ${
                          selectedPreviewDoc?._id === doc._id ? 'border-indigo-650 bg-indigo-50/10' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">📄</span>
                          <div>
                            <strong className="text-xs font-bold text-slate-800 block">{doc.documentName}</strong>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {doc.doctor} • {doc.clinic} ({doc.branch})
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-black">
                            {doc.fileSize}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toast.success('Download initiated.');
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600"
                          >
                            <FileDown size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 italic bg-white border border-slate-200 rounded-3xl">
                No documents found in this category.
              </div>
            )}
          </div>
        </div>

        {/* Right Embedded Preview Panel */}
        {selectedPreviewDoc ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 block">Preview Panel</span>
                <strong className="text-xs font-black text-slate-800 block max-w-[200px] truncate">
                  {selectedPreviewDoc.documentName}
                </strong>
              </div>
              <button
                onClick={() => setSelectedPreviewDoc(null)}
                className="text-slate-400 hover:text-rose-600"
              >
                <X size={16} />
              </button>
            </div>

            {/* Embedded PDF/Image Frame Mockup matching approved EMR document list layout */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-100/50 aspect-[3/4] flex flex-col justify-between p-4 relative shadow-inner">
              <div className="flex justify-between items-center bg-white/80 backdrop-blur-sm p-2 rounded-xl border border-slate-150 text-[10px] font-bold text-slate-500">
                <span>1 / 2 Pages</span>
                <div className="flex gap-2">
                  <button onClick={() => toast.success('Zoom In')}>＋</button>
                  <button onClick={() => toast.success('Zoom Out')}>－</button>
                </div>
              </div>

              <div className="space-y-4 text-center my-auto">
                <span className="text-5xl block">📄</span>
                <div className="space-y-1">
                  <strong className="text-xs text-slate-800 block font-black">{selectedPreviewDoc.documentName}</strong>
                  <span className="text-[10px] text-slate-400 block">{selectedPreviewDoc.clinic}</span>
                </div>
                <span className="text-[10px] bg-indigo-50 border border-indigo-200 text-indigo-707 px-2 py-0.5 rounded-full font-bold">
                  {selectedPreviewDoc.category}
                </span>
              </div>

              <div className="bg-slate-900/90 text-white rounded-xl p-3 text-[10px] leading-relaxed space-y-1 border border-slate-800">
                <div><span className="opacity-70">Consultation:</span> <strong className="float-right">{selectedPreviewDoc.consultationId}</strong></div>
                <div><span className="opacity-70">Doctor:</span> <strong className="float-right">{selectedPreviewDoc.doctor}</strong></div>
                <div><span className="opacity-70">Size:</span> <strong className="float-right">{selectedPreviewDoc.fileSize}</strong></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => toast.success('Downloading report...')}
                className="py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold text-center transition"
              >
                Download File
              </button>
              <button
                onClick={() => toast.success('Document shared.')}
                className="py-2.5 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 text-center transition text-slate-700"
              >
                Share
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400 italic text-xs">
            Select a document from the timeline list to open the live preview panel.
          </div>
        )}

      </div>

      {/* Upload Document Modal Dialog */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleUploadSubmit} className="bg-white border border-slate-200 shadow-2xl rounded-3xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <strong className="text-sm font-black text-slate-800">Upload Patient Document</strong>
              <button type="button" onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-rose-600 transition">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 col-span-2">
                <span className="text-slate-400 font-semibold block">Document Name *</span>
                <input
                  type="text"
                  required
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="e.g. Hospital Discharge Summary, ECG Report"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <span className="text-slate-400 font-semibold block">Category</span>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white font-semibold text-slate-700"
                >
                  <option>External Uploads</option>
                  <option>Consultation Reports</option>
                  <option>Laboratory Reports</option>
                  <option>Radiology Reports</option>
                  <option>Prescriptions</option>
                </select>
              </div>

              <div className="space-y-1 col-span-2">
                <span className="text-slate-400 font-semibold block">File Upload</span>
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 cursor-pointer transition">
                  <span className="text-slate-400 block mb-2">Drag & drop files or click to browse</span>
                  <input
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="mx-auto text-[11px]"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Upload File
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
