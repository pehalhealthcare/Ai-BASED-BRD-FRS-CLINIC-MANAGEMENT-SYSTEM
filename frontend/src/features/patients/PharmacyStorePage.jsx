import { useEffect, useState, useRef } from 'react';
import {
  Pill, Search, UserCheck, MessageSquare, AlertCircle, ShoppingBag,
  X, ChevronRight, Upload, Percent, Gift, Truck, ShoppingCart,
  MapPin, Star, Filter, Heart, ArrowRight, ShieldCheck,
  Camera, FileText, UploadCloud, CheckCircle2, Image, Loader2
} from 'lucide-react';
import { pharmacyApi, prescriptionApi, patientApi } from '../../lib/api';
import useAuth from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { FullPageSpinner } from '../../components/ui/Spinner';

export default function PharmacyStorePage() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);

  // Pharmacist help modal state
  const [pharmacistModalOpen, setPharmacistModalOpen] = useState(false);
  const [pharmacistQuery, setPharmacistQuery] = useState('');
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [querySuccess, setQuerySuccess] = useState(false);

  // Reserve modal state
  const [reserveModalOpen, setReserveModalOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [reserveQty, setReserveQty] = useState(1);
  const [reserving, setReserving] = useState(false);
  const [reserveSuccess, setReserveSuccess] = useState(false);
  
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
  const [prescriptionType, setPrescriptionType] = useState('system'); // 'system' or 'manual'
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Upload Prescription modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState('select'); // 'select', 'camera', 'manual', 'choose'
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadingManual, setUploadingManual] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [unavailableMedicines, setUnavailableMedicines] = useState([]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);


  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await pharmacyApi.listOrders({ limit: 10 });
        setOrders(response.data?.pharmacyOrders || response.pharmacyOrders || []);
      } catch (err) {
        console.error('Failed to load orders', err);
      }
    };
    fetchOrders();
  }, [cart]);

  useEffect(() => {
    const fetchPatientPrescriptions = async () => {
      try {
        const profileRes = await patientApi.me();
        const pt = profileRes.data?.patient || profileRes.patient;
        if (pt?._id) {
          const response = await prescriptionApi.getByPatient(pt._id, { status: 'finalized', limit: 10 });
          setPatientPrescriptions(response.data?.prescriptions || response.prescriptions || []);
        }
      } catch (err) {
        console.error('Failed to load prescriptions', err);
      }
    };
    if (reserveModalOpen || uploadModalOpen) {
      fetchPatientPrescriptions();
    }
  }, [reserveModalOpen, uploadModalOpen]);

  const startCamera = async () => {
    setCameraError('');
    setCameraActive(true);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setCameraError('Unable to access camera. Please check permissions or upload manually.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(dataUrl);
      stopCamera();
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleFileSelection = (file) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit. Please choose a smaller file.");
      return;
    }
    setSelectedFile(file);
  };

  const handleUsePrescription = (presc) => {
    setSelectedPrescriptionId(presc._id);
    setPrescriptionType('system');
    setUploadedFileName(presc.fileName || 'Prescription.pdf');
    
    setUnavailableMedicines([]);
    const unavailableList = [];

    if (presc.medicines && presc.medicines.length > 0) {
      const addedItems = [];
      presc.medicines.forEach(pre => {
        const medName = pre.medicineName || pre.name || '';
        if (!medName) return;

        // Find matching medicine in stock
        const matchedMed = medicines.find(
          m => m.name.toLowerCase().includes(medName.toLowerCase()) || 
               (m.genericName && m.genericName.toLowerCase().includes(medName.toLowerCase()))
        );

        const qty = Number(pre.quantity) || Number(pre.qty) || 1;

        if (matchedMed && matchedMed.totalStock > 0) {
          addedItems.push({
            medicine: matchedMed,
            qty: qty,
            price: Number(matchedMed.unitPrice || 100) * qty
          });
        } else {
          unavailableList.push(medName);
        }
      });
      
      setCart(prev => {
        const merged = [...prev];
        addedItems.forEach(item => {
          if (!merged.some(m => m.medicine.name.toLowerCase() === item.medicine.name.toLowerCase())) {
            merged.push(item);
          }
        });
        return merged;
      });
    }

    if (unavailableList.length > 0) {
      setUnavailableMedicines(unavailableList);
      alert(`Prescription processed. Available items added to cart. Note: some items are currently unavailable.`);
    } else {
      alert(`Prescription selected. All medicines added to cart!`);
    }
    closeUploadModal();
  };

  const handleSubmitManualUpload = () => {
    if (!selectedFile && !capturedImage) {
      alert("Please select a file or capture a photo first.");
      return;
    }
    setUploadingManual(true);
    setTimeout(() => {
      setUploadingManual(false);
      setPrescriptionType('manual');
      setUploadedFileName(selectedFile ? selectedFile.name : 'captured-prescription.jpg');
      alert("Prescription uploaded successfully!");
      closeUploadModal();
    }, 1500);
  };

  const closeUploadModal = () => {
    stopCamera();
    setUploadModalOpen(false);
    setUploadStep('select');
    setSelectedFile(null);
    setCapturedImage(null);
  };

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        setLoading(true);
        const response = await pharmacyApi.listMedicines({ limit: 50, isActive: true });
        const list = response.data?.medicines || response.medicines || [];
        setMedicines(list);

        // Check if there is pre-filled medicines from EMR prescription details modal
        const rawPrefill = localStorage.getItem('pharmacy_cart_prefill');
        if (rawPrefill) {
          try {
            const prefill = JSON.parse(rawPrefill);
            localStorage.removeItem('pharmacy_cart_prefill'); // Clear it so it doesn't trigger repeatedly
            
            const addedItems = [];
            prefill.forEach(pre => {
              // Find matching medicine in database by name substring (case-insensitive)
              const matchedMed = list.find(m => m.name.toLowerCase().includes(pre.name.toLowerCase()));
              if (matchedMed) {
                addedItems.push({
                  medicine: matchedMed,
                  qty: pre.qty || 1,
                  price: Number(matchedMed.unitPrice || 100) * (pre.qty || 1)
                });
              } else {
                // Fallback virtual medicine item if not in stock inventory database
                addedItems.push({
                  medicine: {
                    _id: `fallback-${Date.now()}-${Math.random()}`,
                    name: pre.name,
                    category: 'Prescription Medicine',
                    unitPrice: 150,
                    stockLevel: 100
                  },
                  qty: pre.qty || 1,
                  price: 150 * (pre.qty || 1)
                });
              }
            });

            if (addedItems.length > 0) {
              setCart(prev => {
                // Avoid duplicating items if they are already in cart
                const merged = [...prev];
                addedItems.forEach(item => {
                  if (!merged.some(m => m.medicine.name.toLowerCase() === item.medicine.name.toLowerCase())) {
                    merged.push(item);
                  }
                });
                return merged;
              });
            }
          } catch (e) {
            console.error('Error parsing pharmacy cart prefill:', e);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch pharmacy inventory.');
      } finally {
        setLoading(false);
      }
    };
    fetchMedicines();
  }, []);

  const handleContactPharmacist = (e) => {
    e.preventDefault();
    if (!pharmacistQuery.trim()) return;
    setSubmittingQuery(true);
    setTimeout(() => {
      setSubmittingQuery(false);
      setQuerySuccess(true);
      setPharmacistQuery('');
      setTimeout(() => {
        setQuerySuccess(false);
        setPharmacistModalOpen(false);
      }, 2500);
    }, 1200);
  };

  const handleReserveMedication = async (e) => {
    e.preventDefault();
    if (!selectedMedicine) return;
    try {
      setReserving(true);
      await pharmacyApi.createOrder({
        medicineId: selectedMedicine._id,
        quantity: reserveQty,
        prescriptionType,
        prescriptionId: prescriptionType === 'system' ? (selectedPrescriptionId || null) : null,
        prescriptionFile: prescriptionType === 'manual' ? (uploadedFileName || 'manual-rx.pdf') : '',
        clinicId: selectedMedicine.clinicId
      });

      setReserveSuccess(true);
      
      // Add to local cart for visual purposes
      setCart(prev => [...prev, {
        medicine: selectedMedicine,
        qty: reserveQty,
        price: Number(selectedMedicine.unitPrice || 0) * reserveQty
      }]);

      // Refresh medicines list so the new stock levels are shown!
      const medicinesRes = await pharmacyApi.listMedicines({ limit: 50, isActive: true });
      setMedicines(medicinesRes.data?.medicines || medicinesRes.medicines || []);

      setTimeout(() => {
        setReserveSuccess(false);
        setReserveModalOpen(false);
        setSelectedMedicine(null);
        setReserveQty(1);
        setSelectedPrescriptionId('');
        setUploadedFileName('');
      }, 2500);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to place reservation.');
    } finally {
      setReserving(false);
    }
  };

  const categories = ['All', ...new Set(medicines.map(m => m.category).filter(Boolean))];

  const filteredMedicines = medicines.filter(med => {
    const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (med.genericName && med.genericName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || med.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) return <FullPageSpinner message="Opening the AuraPharmacy catalog..." />;

  return (
    <div className="w-full space-y-6 p-4 md:p-6 animate-fade-in">
      
      {/* ERROR DISPLAY */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* TWO COLUMN PORTAL LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-6 w-full items-start">
        
        {/* LEFT COLUMN: Main Catalog & Shops (2/3 width) */}
        <div className="flex-1 min-w-0 space-y-6 w-full lg:w-2/3">
          
          {/* Header Panel */}
          <div className="relative overflow-hidden rounded-2xl p-6 bg-[#060d18] dark:bg-navy-900 border border-white/[0.06] flex flex-col md:flex-row md:items-center justify-between gap-6">
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="absolute -bottom-16 -left-10 w-64 h-64 rounded-full bg-indigo-600/10 blur-3xl" />
            </div>

            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <ShoppingBag size={26} className="text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-extrabold text-white">Order Medicines & Essentials</h1>
                <p className="text-xs text-slate-400 mt-1 max-w-md">
                  Browse medicines, compare prices, and get them delivered to your doorstep.
                </p>
              </div>
            </div>

            {/* Quick stats items */}
            <div className="relative flex flex-wrap gap-4 shrink-0">
              {[
                { title: '100% Genuine', desc: 'Authentic medicines' },
                { title: 'Fast Delivery', desc: 'Doorstep pickup' },
                { title: 'Secure Payments', desc: 'Secure checkout' },
                { title: 'Prescription', desc: 'Quick Rx upload' }
              ].map(stat => (
                <div key={stat.title} className="bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-1.5 min-w-[110px]">
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider">{stat.title}</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">{stat.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Search bar & Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-navy-800 p-4 rounded-2xl border border-slate-200 dark:border-white/[0.08]">
            <div className="relative w-full sm:flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medicines or healthcare products..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="All">All Categories</option>
                {categories.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button
                onClick={() => setUploadModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
              >
                <Upload size={13} />
                Upload Prescription
              </button>
            </div>
          </div>

          {/* Popular Categories */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Popular Categories</h3>
              <button onClick={() => setSelectedCategory('All')} className="text-xs font-bold text-aura-500 hover:text-aura-600">View All</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {[
                { name: 'Pain Relief', count: '120 Items', icon: <Pill size={18} className="text-indigo-500" />, bg: 'bg-indigo-500/10' },
                { name: 'Vitamins & Supplements', count: '86 Items', icon: <Pill size={18} className="text-emerald-500" />, bg: 'bg-emerald-500/10' },
                { name: 'Cold & Cough', count: '64 Items', icon: <Pill size={18} className="text-blue-500" />, bg: 'bg-blue-500/10' },
                { name: 'Diabetes Care', count: '44 Items', icon: <Pill size={18} className="text-amber-500" />, bg: 'bg-amber-500/10' },
                { name: 'Skin Care', count: '72 Items', icon: <Pill size={18} className="text-rose-500" />, bg: 'bg-rose-500/10' },
                { name: 'Baby Care', count: '58 Items', icon: <Pill size={18} className="text-purple-500" />, bg: 'bg-purple-500/10' }
              ].map(cat => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name.split(' ')[0])}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 hover:border-aura-400 dark:hover:border-aura-500/50 hover:shadow-sm transition-all text-left flex items-center gap-3 shrink-0 min-w-[180px]"
                >
                  <div className={`w-10 h-10 rounded-xl ${cat.bg} flex items-center justify-center shrink-0`}>
                    {cat.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{cat.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{cat.count}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* DYNAMIC VIEW: Show Search results of medicines if user types search query, else show Nearby Pharmacies */}
          {/* DYNAMIC VIEW: Show Search results of medicines if user types search query, else show Nearby Pharmacies */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{searchQuery ? 'Medicine Search Results' : 'All Medicines'}</h3>
            {filteredMedicines.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredMedicines.map(med => {
                  const isOutOfStock = (med.totalStock ?? 0) <= 0;
                  return (
                    <Card
                      key={med._id}
                      className="hover:border-aura-400 dark:hover:border-aura-500/40 hover:shadow-sm transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="w-9 h-9 rounded-lg bg-aura-50 dark:bg-aura-500/10 flex items-center justify-center">
                            <Pill size={16} className="text-aura-600 dark:text-aura-400" />
                          </div>
                          <Badge color={isOutOfStock ? 'danger' : 'success'}>
                            {isOutOfStock ? 'Out of Stock' : `${med.totalStock} In Stock`}
                          </Badge>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{med.name}</h4>
                          <p className="text-[11px] text-slate-400 italic mt-0.5">{med.genericName || 'Active Ingredient'}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                        <div>
                          <span className="text-[9px] uppercase text-slate-400 font-bold">Price</span>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">₹{Number(med.unitPrice || 0).toFixed(2)}</p>
                        </div>
                        <button
                          disabled={isOutOfStock}
                          onClick={() => {
                            setSelectedMedicine(med);
                            setReserveModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-aura-600 hover:bg-aura-700 text-white disabled:bg-slate-100 disabled:text-slate-400 transition"
                        >
                          Reserve
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-white/[0.08]">
                <Pill size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No matching medicines found.</p>
              </div>
            )}
          </div>

          {/* Secure details footer block */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-navy-900/40 text-center">
            {[
              { label: 'Easy Upload', desc: 'Upload Rx & place order' },
              { label: 'Secure Payment', desc: '100% secure checkouts' },
              { label: 'Timely Delivery', desc: 'On-time doorstep delivery' },
              { label: 'Pharmacist Support', desc: 'Get expert advice' }
            ].map(b => (
              <div key={b.label}>
                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200">{b.label}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{b.desc}</p>
              </div>
            ))}
          </div>
          
          <p className="text-[11px] text-slate-400 dark:text-slate-600 text-center">
            ⚠️ Always consult your doctor before starting any medication. Not all products are available at all locations.
          </p>
        </div>

        {/* RIGHT COLUMN: Cart & Sidebar widgets (1/3 width) */}
        <div className="w-full lg:w-1/3 space-y-6">
          
          {/* Cart Widget */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Your Cart</h3>
            
            {unavailableMedicines.length > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-[11px] font-semibold space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-650 dark:text-rose-450">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>Unavailable Items</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">The following prescribed items are not in stock right now:</p>
                <ul className="list-disc pl-4 text-[10px] space-y-0.5">
                  {unavailableMedicines.map((med, i) => (
                    <li key={i} className="text-[10px] text-rose-500 dark:text-rose-400">{med} is not available with us right now.</li>
                  ))}
                </ul>
              </div>
            )}

            {cart.length > 0 ? (
              <div className="space-y-3">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{item.medicine.name}</p>
                      <p className="text-[10px] text-slate-400">Qty: {item.qty}</p>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white">₹{item.price.toFixed(2)}</p>
                  </div>
                ))}
                <button
                  onClick={() => {
                    alert('Order confirmed successfully! Pickup ready in 24 hours.');
                    setCart([]);
                  }}
                  className="w-full py-2 bg-aura-600 hover:bg-aura-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Checkout (₹{cart.reduce((sum, item) => sum + item.price, 0).toFixed(2)})
                </button>
              </div>
            ) : (
              <div className="py-8 text-center space-y-3">
                <ShoppingCart size={32} className="mx-auto text-slate-300 dark:text-slate-600" />
                <div>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Your cart is empty</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Add medicines to get started</p>
                </div>
                <button
                  onClick={() => alert('Search medicines by typing in the search bar above')}
                  className="px-4 py-2 bg-aura-600 hover:bg-aura-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Browse Medicines
                </button>
              </div>
            )}
          </div>

          {/* My Orders Widget */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5">
            <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">My Orders</h3>
              <button onClick={() => alert('Redirecting to order history')} className="text-xs font-bold text-aura-500 hover:text-aura-600">View All</button>
            </div>
            
            <div className="space-y-3.5">
              {orders.map(ord => (
                <div key={ord._id} className="flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 p-1.5 rounded-lg transition-colors cursor-pointer">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{ord.medicineId?.name || 'Medicine'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(ord.createdAt).toLocaleDateString()} • Qty: {ord.quantity} • ₹{Number(ord.totalPrice || 0).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                      ord.status === 'completed'
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : ord.status === 'cancelled'
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {ord.status}
                    </span>
                    <ChevronRight size={13} className="text-slate-400" />
                  </div>
                </div>
              ))}
              {orders.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-4">No recent orders.</p>
              )}
            </div>
          </div>

          {/* Offers for You Widget */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5">
            <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-100 dark:border-white/[0.06]">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Offers for You</h3>
              <button onClick={() => alert('Viewing all active promotional coupon offers')} className="text-xs font-bold text-aura-500 hover:text-aura-600">View All</button>
            </div>

            <div className="space-y-3">
              {[
                { title: 'FLAT 20% OFF', desc: 'On all medicines', code: 'SAVE20', icon: <Percent size={14} className="text-indigo-500" />, bg: 'bg-indigo-500/10' },
                { title: 'FLAT 15% OFF', desc: 'On orders above ₹999', code: 'HEALTH15', icon: <Gift size={14} className="text-amber-500" />, bg: 'bg-amber-500/10' },
                { title: 'FREE DELIVERY', desc: 'On orders above ₹499', code: 'FREEDEL', icon: <Truck size={14} className="text-emerald-500" />, bg: 'bg-emerald-500/10' }
              ].map(promo => (
                <div key={promo.code} className="p-3 rounded-xl border border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-navy-900/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-lg ${promo.bg} flex items-center justify-center shrink-0`}>
                      {promo.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{promo.title}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{promo.desc}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold font-mono text-aura-500 bg-aura-500/10 px-2 py-0.5 rounded border border-aura-500/20">{promo.code}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pharmacist Help Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600"><MessageSquare size={18} /></div>
              <div>
                <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200">Need Help?</h4>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  Get help with your orders, medicines or prescriptions from our team of professional pharmacists.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPharmacistModalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-semibold text-emerald-500 dark:text-emerald-400 transition"
            >
              <MessageSquare size={13} />
              Contact Pharmacy Support
            </button>
          </div>
        </div>
      </div>

      {/* Ask a Pharmacist Modal */}
      {pharmacistModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 animate-scale-up">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                  <UserCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Duty Pharmacist Desk</h3>
              </div>
              <button onClick={() => setPharmacistModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {querySuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-aura-500/10 flex items-center justify-center mx-auto text-aura-500">
                  <UserCheck size={24} />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Request Sent to Pharmacist</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500">A pharmacist will get back to you shortly on your registered number.</p>
              </div>
            ) : (
              <form onSubmit={handleContactPharmacist} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Your Message or Medication Query</label>
                  <textarea
                    rows={4}
                    value={pharmacistQuery}
                    onChange={(e) => setPharmacistQuery(e.target.value)}
                    required
                    placeholder="Ask about side effects, correct dosage, drug interactions, or stock availability..."
                    className="w-full px-4 py-3 rounded-xl text-sm bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-aura-500 transition resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingQuery}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-aura-600 hover:bg-aura-700 text-white transition flex justify-center items-center gap-2"
                >
                  {submittingQuery ? 'Sending...' : 'Submit Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reserve Medication Modal */}
      {reserveModalOpen && selectedMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-navy-800 rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 animate-scale-up">
            <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-aura-50 dark:bg-aura-500/10 flex items-center justify-center">
                  <Pill size={16} className="text-aura-600 dark:text-aura-400" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Reserve Medication</h3>
              </div>
              <button onClick={() => setReserveModalOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {reserveSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-aura-500/10 flex items-center justify-center mx-auto text-aura-500">
                  <ShoppingBag size={24} />
                </div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Reservation Successful</h4>
                <p className="text-xs text-slate-400 dark:text-slate-500">Your reserved medications are held under patient name: <span className="font-semibold">{user?.name}</span> for pickup within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleReserveMedication} className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{selectedMedicine.name}</h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">{selectedMedicine.genericName}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Unit Price</label>
                    <p className="text-sm font-bold text-slate-950 dark:text-white">₹{Number(selectedMedicine.unitPrice || 0).toFixed(2)}</p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Max Available</label>
                    <p className="text-sm font-bold text-slate-950 dark:text-white">{selectedMedicine.totalStock}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quantity to Reserve</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedMedicine.totalStock}
                    value={reserveQty}
                    onChange={(e) => setReserveQty(Math.min(selectedMedicine.totalStock, Math.max(1, Number(e.target.value))))}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-aura-500 transition"
                  />
                </div>

                {/* Prescription Type Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Prescription Verification</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPrescriptionType('system')}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition ${
                        prescriptionType === 'system'
                          ? 'bg-aura-600 text-white'
                          : 'bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      Use Clinic Rx
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrescriptionType('manual')}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition ${
                        prescriptionType === 'manual'
                          ? 'bg-aura-600 text-white'
                          : 'bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      Upload Manual Rx
                    </button>
                  </div>
                </div>

                {/* Selection Fields */}
                {prescriptionType === 'system' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Choose Available Prescription</label>
                    {patientPrescriptions.length > 0 ? (
                      <select
                        value={selectedPrescriptionId}
                        onChange={(e) => setSelectedPrescriptionId(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-aura-500 transition"
                      >
                        <option value="">Select prescription...</option>
                        {patientPrescriptions.map((rx) => (
                          <option key={rx._id} value={rx._id}>
                            {new Date(rx.createdAt).toLocaleDateString()} — Dr. {rx.doctorId?.fullName || 'Physician'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[11px] text-amber-500 dark:text-amber-400 italic bg-amber-50 dark:bg-amber-500/10 p-2 rounded-xl border border-amber-200 dark:border-amber-500/20">
                        No active clinic prescriptions found. Please upload manually.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Upload prescription document</label>
                    <input
                      type="file"
                      required
                      accept=".pdf,image/*"
                      onChange={(e) => setUploadedFileName(e.target.files[0]?.name || '')}
                      className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-aura-600 file:text-white hover:file:bg-aura-700 cursor-pointer"
                    />
                    {uploadedFileName && (
                      <p className="text-[10px] text-aura-600 dark:text-aura-400 mt-1">File selected: {uploadedFileName}</p>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Est. Total</span>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">₹{(Number(selectedMedicine.unitPrice || 0) * reserveQty).toFixed(2)}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={reserving || (prescriptionType === 'system' && patientPrescriptions.length === 0)}
                    className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-aura-600 hover:bg-aura-700 text-white transition disabled:opacity-50"
                  >
                    {reserving ? 'Reserving...' : 'Confirm'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Upload Prescription Wizard Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-opacity duration-300">
          <div className="w-full max-w-lg bg-[#0e1726] border border-white/[0.08] rounded-3xl shadow-2xl p-6 relative flex flex-col text-white animate-scale-up max-h-[90vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start pb-4 mb-4 border-b border-white/[0.08]">
              <div>
                <h3 className="text-lg font-black text-white">Upload Prescription</h3>
                <p className="text-xs text-slate-400 mt-1">Upload your prescription to order medicines</p>
              </div>
              <button 
                onClick={closeUploadModal} 
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto min-h-0 py-2">
              
              {/* STEP 1: select */}
              {uploadStep === 'select' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Open Camera Card */}
                  <button
                    onClick={() => {
                      setUploadStep('camera');
                      startCamera();
                    }}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-emerald-500/30 transition-all duration-200 group text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform mb-4">
                      <Camera size={22} />
                    </div>
                    <h4 className="font-bold text-sm text-white">Open Camera</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Take a photo of your prescription</p>
                  </button>

                  {/* Upload Manually Card */}
                  <button
                    onClick={() => setUploadStep('manual')}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all duration-200 group text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform mb-4">
                      <Upload size={22} />
                    </div>
                    <h4 className="font-bold text-sm text-white">Upload Manually</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Choose image from device</p>
                  </button>

                  {/* Choose Available Prescription Card */}
                  <button
                    onClick={() => setUploadStep('choose')}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.06] hover:border-amber-500/30 transition-all duration-200 group text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform mb-4">
                      <FileText size={22} />
                    </div>
                    <h4 className="font-bold text-sm text-white">Choose Prescription</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Use from your saved prescriptions</p>
                  </button>
                </div>
              )}

              {/* STEP 2: camera */}
              {uploadStep === 'camera' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-white">Capture Prescription</h4>
                    <span className="text-[10px] text-slate-400">Open Camera</span>
                  </div>

                  {cameraError && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                      {cameraError}
                    </div>
                  )}

                  {!capturedImage ? (
                    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black aspect-video flex items-center justify-center">
                      {cameraActive ? (
                        <>
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-full object-cover"
                          />
                          {/* Guides */}
                          <div className="absolute inset-4 border border-dashed border-emerald-500/40 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                            <div className="flex justify-between">
                              <span className="w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                              <span className="w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                            </div>
                            <p className="text-[9px] font-semibold text-emerald-400/80 bg-black/60 px-2 py-1 rounded self-center leading-none">
                              Position the prescription within the frame
                            </p>
                            <div className="flex justify-between">
                              <span className="w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                              <span className="w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-6 text-slate-505">
                          <Loader2 className="animate-spin text-slate-500 mx-auto mb-2" size={24} />
                          <p className="text-xs">Initializing camera feed...</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black aspect-video flex items-center justify-center relative">
                      <img src={capturedImage} alt="Captured Prescription" className="w-full h-full object-contain" />
                      <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1 rounded-full shadow-lg">
                        <CheckCircle2 size={16} />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 justify-end pt-2">
                    {!capturedImage ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            stopCamera();
                            setUploadStep('select');
                          }}
                          className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white border border-white/[0.08] hover:bg-white/[0.04] rounded-xl transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={capturePhoto}
                          disabled={!cameraActive}
                          className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center gap-1.5"
                        >
                          <Camera size={13} />
                          Capture Photo
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setCapturedImage(null);
                            startCamera();
                          }}
                          className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white border border-white/[0.08] hover:bg-white/[0.04] rounded-xl transition"
                        >
                          Retake
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitManualUpload}
                          disabled={uploadingManual}
                          className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition"
                        >
                          {uploadingManual ? 'Uploading...' : 'Confirm Upload'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: manual */}
              {uploadStep === 'manual' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-white">Upload Manually</h4>
                    <span className="text-[10px] text-slate-400">Choose file or image</span>
                  </div>

                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                      dragActive 
                        ? 'border-indigo-500 bg-indigo-500/5' 
                        : 'border-white/[0.08] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.15]'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center text-indigo-400 mb-3.5">
                      <UploadCloud size={22} />
                    </div>

                    {selectedFile ? (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-indigo-400 truncate max-w-[280px]">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-white">Drag &amp; drop your image here</p>
                        <p className="text-[10px] text-slate-500 my-2">or</p>
                        <button
                          type="button"
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition shadow-md"
                        >
                          Browse Files
                        </button>
                      </>
                    )}

                    <p className="text-[9px] text-slate-500 mt-4 leading-none">
                      Supported formats: JPG, PNG, JPEG, PDF. Max size: 5MB
                    </p>
                  </div>

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setUploadStep('select');
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white border border-white/[0.08] hover:bg-white/[0.04] rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitManualUpload}
                      disabled={!selectedFile || uploadingManual}
                      className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition disabled:opacity-40"
                    >
                      {uploadingManual ? 'Uploading...' : 'Confirm Upload'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: choose */}
              {uploadStep === 'choose' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-white">Choose Available Prescription</h4>
                    <span className="text-[10px] text-slate-400">Completed consultations</span>
                  </div>

                  {patientPrescriptions.length > 0 ? (
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/[0.06]">
                      {patientPrescriptions.map((rx) => {
                        const rxDate = rx.createdAt 
                          ? new Date(rx.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Recent Date';
                        return (
                          <div 
                            key={rx._id}
                            className="p-3.5 rounded-2xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.03] transition flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                                <FileText size={18} />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-white truncate">Prescription — {rxDate}</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                  Dr. {rx.doctorId?.fullName || 'Physician'} • {rx.medicines?.length || 0} medicines
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleUsePrescription(rx)}
                              className="px-3.5 py-1.5 text-[10px] font-bold border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition shrink-0"
                            >
                              Use
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-400/80">
                      <FileText size={28} className="mx-auto mb-2 text-amber-500/50" />
                      <p className="text-xs font-semibold">No active clinic prescriptions found.</p>
                      <p className="text-[10px] text-slate-500 mt-1">Prescriptions are created during completed appointments with the doctor.</p>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setUploadStep('select')}
                      className="px-4 py-2 text-xs font-bold text-slate-350 hover:text-white border border-white/[0.08] hover:bg-white/[0.04] rounded-xl transition"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Hidden components */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}
    </div>
  );
}
