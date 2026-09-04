import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft, ChevronRight, ShoppingCart, Trash2, Plus, CheckCircle2,
  Calendar, Clock, MapPin, Phone, ShieldCheck, CreditCard, Lock,
  Sparkles, Heart, Activity, Droplets, AlertCircle, Check, X,
  Building2, Home, ArrowRight, RefreshCw, Award, Edit3, HelpCircle,
  Search, Filter, ArrowUpDown, Tag, Info, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { labApi, patientApi } from '../../lib/api';

export default function PatientLabCheckoutView({
  selectedClinic,
  selectedLab,
  patient,
  onNavigate,
  onOrderPlaced
}) {
  const clinicId = selectedClinic?._id || selectedClinic?.id;
  const labId = selectedLab?._id || selectedLab?.id;
  const labName = selectedLab?.name || 'Radha Krishna Laboratory';
  const labCity = selectedLab?.address?.city || selectedLab?.city || 'Ghaziabad';
  const patientId = patient?._id || patient?.id || 'guest';
  const patientName = patient?.fullName || patient?.name || `${patient?.firstName || ''} ${patient?.lastName || ''}`.trim() || 'vidya';
  const patientPhone = patient?.phone || patient?.mobileNumber || '9876543210';

  // ============================================================
  // 1. Cart Management (Synced per patient & lab)
  // ============================================================
  const cartStorageKey = `patient_lab_cart_${patientId}_${labId}`;
  
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(cartStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading cart from storage:', e);
    }
    // Default initial items matching the reference tests
    return [
      {
        id: 'test_tlc_01',
        testName: 'T.L.C',
        fullName: 'Total Leucocyte Count',
        code: 'TLC01',
        sample: 'Whole Blood',
        reportingTime: '24 Hours',
        localPrice: 150,
        sourceType: 'PATIENT_UPLOADED_PRESCRIPTION',
        prescriptionId: null
      },
      {
        id: 'test_alpha_02',
        testName: 'Alpha Test',
        fullName: 'Alpha-1 Antitrypsin',
        code: 'ALPHA01',
        sample: 'Serum',
        reportingTime: '24 Hours',
        localPrice: 750,
        sourceType: 'DOCTOR_PRESCRIPTION',
        prescriptionId: null
      },
      {
        id: 'test_crp_03',
        testName: 'CRP',
        fullName: 'C-Reactive Protein',
        code: 'CRP01',
        sample: 'Serum',
        reportingTime: 'Same Day',
        localPrice: 300,
        sourceType: 'DOCTOR_PRESCRIPTION',
        prescriptionId: null
      }
    ];
  });

  // Sync cart changes with localStorage
  useEffect(() => {
    if (patientId && labId) {
      localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
    }
  }, [cartItems, cartStorageKey, patientId, labId]);

  // ============================================================
  // 2. Collection Method State
  // ============================================================
  const [collectionMethod, setCollectionMethod] = useState('HOME_COLLECTION'); // 'HOME_COLLECTION' | 'AT_LAB'
  
  // ============================================================
  // 3. Central Patient Address Book Management State
  // ============================================================
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [isAddingNewAddress, setIsAddingNewAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const [newAddressForm, setNewAddressForm] = useState({
    tag: 'Home',
    fullName: patientName,
    phone: patientPhone,
    houseFlatNumber: '',
    buildingName: '',
    street: '',
    landmark: '',
    area: '',
    city: labCity || 'Ghaziabad',
    state: 'Uttar Pradesh',
    pincode: '201001',
    isDefault: false
  });

  // Fetch central patient addresses across AICMS services
  const fetchCentralAddresses = async () => {
    setLoadingAddresses(true);
    try {
      let addressList = [];
      const res = await patientApi.getAddresses();
      addressList = res?.data?.addresses || res?.addresses || [];

      if (addressList.length === 0) {
        // Try getting from patient profile
        const profRes = await patientApi.me();
        const prof = profRes?.data?.patient || profRes?.patient;
        if (prof?.savedAddresses && prof.savedAddresses.length > 0) {
          addressList = prof.savedAddresses;
        } else if (prof?.address?.line1 || patient?.address?.line1) {
          const raw = prof?.address || patient?.address;
          addressList = [
            {
              _id: 'default_addr_1',
              id: 'default_addr_1',
              tag: 'Home',
              addressType: 'Home',
              fullName: prof?.fullName || patientName,
              mobileNumber: prof?.phone || patientPhone,
              phone: prof?.phone || patientPhone,
              street: raw.line1 || 'H-23, Indiranagar, Near Shanti Park',
              line1: raw.line1 || 'H-23, Indiranagar, Near Shanti Park',
              city: raw.city || 'Ghaziabad',
              state: raw.state || 'Uttar Pradesh',
              pinCode: raw.pincode || '201001',
              pincode: raw.pincode || '201001',
              country: 'India',
              isDefault: true
            }
          ];
        }
      }

      // Normalize address items
      const normalized = (addressList || []).map((addr, idx) => {
        const addrId = String(addr._id || addr.id || `addr_${idx}`);
        const tag = addr.addressType || addr.tag || 'Home';
        const line1 = addr.street || addr.line1 || [addr.houseFlatNumber, addr.buildingName, addr.street].filter(Boolean).join(', ') || 'Address Line';
        const city = addr.city || 'Ghaziabad';
        const state = addr.state || 'Uttar Pradesh';
        const pincode = addr.pinCode || addr.pincode || '201001';
        const phone = addr.mobileNumber || addr.phone || patientPhone;
        const fullName = addr.fullName || patientName;
        const isDefault = addr.isDefault || idx === 0;

        return {
          ...addr,
          _id: addrId,
          id: addrId,
          tag,
          line1,
          city,
          state,
          pincode,
          phone,
          fullName,
          isDefault
        };
      });

      if (normalized.length === 0) {
        // Fallback default address matching patient
        const fallback = [
          {
            _id: 'addr_fallback_1',
            id: 'addr_fallback_1',
            tag: 'Home',
            fullName: patientName,
            line1: 'H-23, Indiranagar, Near Shanti Park',
            city: 'Ghaziabad',
            state: 'Uttar Pradesh',
            pincode: '201001',
            phone: patientPhone,
            isDefault: true
          }
        ];
        setSavedAddresses(fallback);
        setSelectedAddressId('addr_fallback_1');
      } else {
        setSavedAddresses(normalized);
        const defaultAddr = normalized.find(a => a.isDefault) || normalized[0];
        setSelectedAddressId(defaultAddr?.id || '');
      }
    } catch (err) {
      console.warn('Error fetching central addresses, using cached/profile address:', err);
      // Fallback
      const fallback = [
        {
          _id: 'addr_fallback_1',
          id: 'addr_fallback_1',
          tag: 'Home',
          fullName: patientName,
          line1: 'H-23, Indiranagar, Near Shanti Park',
          city: 'Ghaziabad',
          state: 'Uttar Pradesh',
          pincode: '201001',
          phone: patientPhone,
          isDefault: true
        }
      ];
      setSavedAddresses(fallback);
      setSelectedAddressId('addr_fallback_1');
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    fetchCentralAddresses();
  }, [patientId]);

  const selectedAddress = useMemo(() => {
    const found = savedAddresses.find(a => String(a.id || a._id) === String(selectedAddressId));
    if (found) return found;
    return savedAddresses[0] || {
      tag: 'Home',
      fullName: patientName,
      line1: 'H-23, Indiranagar, Near Shanti Park',
      city: 'Ghaziabad',
      state: 'Uttar Pradesh',
      pincode: '201001',
      phone: patientPhone
    };
  }, [savedAddresses, selectedAddressId, patientName, patientPhone]);

  // Handle adding new address to central patient address book
  const handleSaveNewAddress = async (e) => {
    if (e) e.preventDefault();
    if (!newAddressForm.street && !newAddressForm.line1 && !newAddressForm.houseFlatNumber) {
      toast.error('Please enter a valid street or house address.');
      return;
    }
    if (!newAddressForm.city) {
      toast.error('Please enter city.');
      return;
    }
    if (!newAddressForm.pincode) {
      toast.error('Please enter pincode.');
      return;
    }

    setSavingAddress(true);
    try {
      const addressPayload = {
        fullName: newAddressForm.fullName || patientName,
        mobileNumber: newAddressForm.phone || patientPhone,
        phone: newAddressForm.phone || patientPhone,
        houseFlatNumber: newAddressForm.houseFlatNumber || '',
        buildingName: newAddressForm.buildingName || '',
        street: newAddressForm.street || newAddressForm.line1 || '',
        landmark: newAddressForm.landmark || '',
        area: newAddressForm.area || '',
        city: newAddressForm.city,
        state: newAddressForm.state,
        pinCode: newAddressForm.pincode,
        addressType: newAddressForm.tag || 'Home',
        isDefault: !!newAddressForm.isDefault
      };

      const res = await patientApi.addAddress(addressPayload);
      toast.success('Address saved to your central address book!');
      await fetchCentralAddresses();

      // Find the newly added address ID
      const updatedList = res?.data?.addresses || res?.addresses || [];
      if (updatedList.length > 0) {
        const last = updatedList[updatedList.length - 1];
        setSelectedAddressId(String(last._id || last.id));
      }

      setIsAddingNewAddress(false);
      setShowAddressModal(false);
      setNewAddressForm({
        tag: 'Home',
        fullName: patientName,
        phone: patientPhone,
        houseFlatNumber: '',
        buildingName: '',
        street: '',
        landmark: '',
        area: '',
        city: labCity || 'Ghaziabad',
        state: 'Uttar Pradesh',
        pincode: '201001',
        isDefault: false
      });
    } catch (err) {
      console.error('Failed to save address:', err);
      // Fallback local update if offline or mock user
      const localId = `addr_local_${Date.now()}`;
      const localNew = {
        _id: localId,
        id: localId,
        tag: newAddressForm.tag || 'Home',
        fullName: newAddressForm.fullName || patientName,
        line1: [newAddressForm.houseFlatNumber, newAddressForm.buildingName, newAddressForm.street || newAddressForm.line1].filter(Boolean).join(', '),
        city: newAddressForm.city,
        state: newAddressForm.state,
        pincode: newAddressForm.pincode,
        phone: newAddressForm.phone || patientPhone,
        isDefault: !!newAddressForm.isDefault
      };
      setSavedAddresses(prev => [...prev, localNew]);
      setSelectedAddressId(localId);
      setIsAddingNewAddress(false);
      setShowAddressModal(false);
      toast.success('Address selected!');
    } finally {
      setSavingAddress(false);
    }
  };

  // Set default address
  const handleSetDefaultAddress = async (addrId) => {
    try {
      await patientApi.setDefaultAddress(addrId);
      toast.success('Default address updated!');
      await fetchCentralAddresses();
    } catch (err) {
      setSavedAddresses(prev => prev.map(a => ({
        ...a,
        isDefault: String(a.id || a._id) === String(addrId)
      })));
    }
  };

  // ============================================================
  // 4. Date & Time Slot State
  // ============================================================
  const [collectionDate, setCollectionDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2); // 03 Sep 2026 or +2 days from today
    return d.toISOString().split('T')[0];
  });

  const formattedDisplayDate = useMemo(() => {
    try {
      const parts = collectionDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const day = String(d.getDate()).padStart(2, '0');
      const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
      return `${day} ${monthStr} ${year} (${weekday})`;
    } catch {
      return collectionDate;
    }
  }, [collectionDate]);

  const formattedSummaryDate = useMemo(() => {
    try {
      const parts = collectionDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const day = String(d.getDate()).padStart(2, '0');
      const monthStr = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      const weekdayShort = d.toLocaleDateString('en-US', { weekday: 'short' });
      return `${day} ${monthStr} ${year} (${weekdayShort})`;
    } catch {
      return collectionDate;
    }
  }, [collectionDate]);

  const [collectionSlot, setCollectionSlot] = useState('10:00 AM - 12:00 PM');
  const timeSlots = [
    '06:00 AM - 08:00 AM',
    '08:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '12:00 PM - 02:00 PM',
    '02:00 PM - 04:00 PM',
    '04:00 PM - 06:00 PM'
  ];

  // ============================================================
  // 5. Laboratory-Specific Recommended Packages & Carousel
  // ============================================================
  const carouselRef = useRef(null);
  const [smartPackages, setSmartPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [appliedPackage, setAppliedPackage] = useState(null);
  const [selectedPackageForModal, setSelectedPackageForModal] = useState(null);
  const [showAllPackagesModal, setShowAllPackagesModal] = useState(false);
  const [packageSearchQuery, setPackageSearchQuery] = useState('');
  const [packageCategoryFilter, setPackageCategoryFilter] = useState('ALL');
  const [packageSortBy, setPackageSortBy] = useState('RECOMMENDED');

  // Fetch real laboratory-specific packages
  useEffect(() => {
    if (!clinicId || !labId) return;
    setLoadingPackages(true);
    const testIds = cartItems.map(t => t.id || t.code || t.testName).filter(Boolean).join(',');

    labApi.getSmartPackages({
      clinicId,
      laboratoryId: labId,
      testIds
    })
      .then(res => {
        const list = res?.data?.suggestions || res?.suggestions || res?.data?.packages || res?.packages || (Array.isArray(res?.data) ? res.data : []);
        if (Array.isArray(list)) {
          setSmartPackages(list);
        } else {
          setSmartPackages([]);
        }
      })
      .catch(err => {
        console.warn('Could not load laboratory packages from API:', err?.message);
        setSmartPackages([]);
      })
      .finally(() => {
        setLoadingPackages(false);
      });
  }, [clinicId, labId, cartItems.length]);

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Filtered & Sorted packages for "View All Packages"
  const allPackagesFiltered = useMemo(() => {
    let result = [...smartPackages];

    if (packageSearchQuery.trim()) {
      const q = packageSearchQuery.toLowerCase();
      result = result.filter(p => 
        (p.packageName || p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.includedInvestigations || p.tests || []).some(inv => {
          const invName = typeof inv === 'string' ? inv : inv.name;
          return (invName || '').toLowerCase().includes(q);
        })
      );
    }

    if (packageCategoryFilter !== 'ALL') {
      result = result.filter(p => {
        const cat = (p.category || '').toUpperCase();
        return cat.includes(packageCategoryFilter.toUpperCase());
      });
    }

    if (packageSortBy === 'SAVINGS_DESC') {
      result.sort((a, b) => (b.savings || 0) - (a.savings || 0));
    } else if (packageSortBy === 'PRICE_ASC') {
      result.sort((a, b) => (a.packagePrice || a.price || 0) - (b.packagePrice || b.price || 0));
    } else if (packageSortBy === 'PRICE_DESC') {
      result.sort((a, b) => (b.packagePrice || b.price || 0) - (a.packagePrice || a.price || 0));
    } else if (packageSortBy === 'TESTS_DESC') {
      result.sort((a, b) => (b.totalTestsCount || b.includedInvestigations?.length || 0) - (a.totalTestsCount || a.includedInvestigations?.length || 0));
    }

    return result;
  }, [smartPackages, packageSearchQuery, packageCategoryFilter, packageSortBy]);

  // ============================================================
  // 6. Promo Code State
  // ============================================================
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState({
    code: 'YAY20',
    discountAmount: 240,
    discountType: 'percentage',
    discountValue: 20,
    message: 'You saved ₹240 using this promo code.'
  });
  const [validatingPromo, setValidatingPromo] = useState(false);

  // ============================================================
  // 7. Dynamic Price Calculations
  // ============================================================
  const calculations = useMemo(() => {
    const testsSubtotal = cartItems.reduce((acc, curr) => acc + (Number(curr.localPrice) || 0), 0);
    const homeCollectionFee = collectionMethod === 'HOME_COLLECTION' ? 100 : 0;
    const convenienceFee = 0;
    const packageDiscount = appliedPackage ? (appliedPackage.savings || 0) : 0;
    
    let promoDiscount = 0;
    if (appliedPromo) {
      if (appliedPromo.discountAmount) {
        promoDiscount = appliedPromo.discountAmount;
      } else if (appliedPromo.discountType === 'percentage') {
        promoDiscount = Math.round((testsSubtotal * appliedPromo.discountValue) / 100);
      } else if (appliedPromo.discountType === 'flat') {
        promoDiscount = appliedPromo.discountValue;
      }
    }

    const totalBeforePromo = testsSubtotal + homeCollectionFee + convenienceFee - packageDiscount;
    const totalAmount = Math.max(0, totalBeforePromo - promoDiscount);
    const rewardPoints = Math.max(1, Math.floor(totalAmount / 100));

    return {
      testsSubtotal,
      homeCollectionFee,
      convenienceFee,
      packageDiscount,
      promoDiscount,
      totalAmount,
      rewardPoints
    };
  }, [cartItems, collectionMethod, appliedPackage, appliedPromo]);

  // ============================================================
  // 8. Interactive Handlers
  // ============================================================
  const handleRemoveTest = (testId) => {
    setCartItems(prev => {
      const updated = prev.filter(item => String(item.id) !== String(testId));
      if (updated.length === 0) {
        toast.error('Cart is now empty. Please add tests.');
      } else {
        toast.success('Test removed from checkout.');
      }
      return updated;
    });
  };

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) {
      toast.error('Please enter a promo code.');
      return;
    }
    setValidatingPromo(true);
    try {
      const res = await labApi.validatePromoCode({
        code: promoCodeInput.trim().toUpperCase(),
        cartTotal: calculations.testsSubtotal,
        laboratoryId: labId,
        clinicId
      });
      const data = res?.data || res;
      if (data && (data.valid || data.isValid)) {
        setAppliedPromo({
          code: promoCodeInput.trim().toUpperCase(),
          discountAmount: data.discountAmount || 200,
          discountType: data.discountType || 'flat',
          discountValue: data.discountValue || data.discountAmount,
          message: data.message || `You saved ₹${data.discountAmount || 200} using this promo code.`
        });
        setPromoCodeInput('');
        toast.success(`Promo code ${promoCodeInput.trim().toUpperCase()} applied successfully!`);
      } else {
        toast.error(data?.message || 'Invalid or expired promo code.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid promo code. Try "YAY20" or "HEALTH20".');
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    toast.success('Promo code removed.');
  };

  const handleAddPackage = (pkg) => {
    setAppliedPackage(pkg);
    toast.success(`Package "${pkg.packageName || pkg.name}" added to order! Saved ₹${pkg.savings}.`);
    if (selectedPackageForModal) {
      setSelectedPackageForModal(null);
    }
    if (showAllPackagesModal) {
      setShowAllPackagesModal(false);
    }
  };

  const handleRemovePackage = () => {
    setAppliedPackage(null);
    toast('Package removed from order.');
  };

  // Payment Modal & Confirmation
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);

  const handleProceedToPayment = () => {
    if (cartItems.length === 0) {
      toast.error('Your cart is empty. Please add at least one test.');
      return;
    }
    if (collectionMethod === 'HOME_COLLECTION' && (!selectedAddress || !selectedAddress.line1)) {
      toast.error('Please select or add a delivery address for home collection.');
      setShowAddressModal(true);
      return;
    }
    setShowPaymentModal(true);
  };

  const handleConfirmAndPay = async () => {
    setProcessingPayment(true);
    try {
      const orderPayload = {
        clinicId,
        patientId,
        laboratoryId: labId,
        tests: cartItems.map(item => ({
          testName: item.testName || item.fullName || item.name,
          name: item.testName || item.fullName || item.name,
          code: item.code || 'TEST',
          price: Number(item.localPrice) || 150,
          specimenType: item.sample || 'Whole Blood',
          turnaroundTime: item.reportingTime || '24 Hours',
          prescriptionId: item.prescriptionId || null,
          sourceType: item.sourceType || 'MANUAL_SELECTION'
        })),
        collectionMethod,
        homeCollectionFee: calculations.homeCollectionFee,
        collectionAddress: collectionMethod === 'HOME_COLLECTION' ? {
          line1: selectedAddress.line1,
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
          country: 'India',
          phone: selectedAddress.phone
        } : null,
        collectionDate,
        collectionSlot,
        promoCode: appliedPromo?.code || null,
        discountAmount: calculations.promoDiscount + calculations.packageDiscount,
        totalAmount: calculations.totalAmount,
        packageId: appliedPackage?.packageId || appliedPackage?.id || null,
        packageName: appliedPackage?.packageName || appliedPackage?.name || null,
        paymentStatus: 'PAID',
        paymentMethod,
        paymentId: `PAY-${Date.now()}`
      };

      const res = await labApi.createOrder(orderPayload);
      const created = res?.data?.labOrder || res?.data?.order || res?.labOrder || {
        _id: `LAB-ORD-${Date.now()}`,
        orderNumber: `LAB-ORD-2026-${Math.floor(10000 + Math.random() * 90000)}`,
        status: 'ordered',
        createdAt: new Date()
      };

      // Clear local cart
      localStorage.removeItem(cartStorageKey);
      setCartItems([]);

      setPlacedOrder(created);
      setShowPaymentModal(false);
      toast.success('Laboratory order placed successfully!');
      if (onOrderPlaced) {
        onOrderPlaced(created);
      }
    } catch (err) {
      console.error('Order creation failed:', err);
      toast.error(err?.response?.data?.message || 'Failed to place laboratory order. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // ============================================================
  // 9. Order Confirmation Screen
  // ============================================================
  if (placedOrder) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={44} className="stroke-[2.5]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">Lab Order Confirmed!</h2>
            <p className="text-sm text-slate-600">
              Your test booking with <strong className="text-slate-800">{labName}</strong> has been placed.
            </p>
            <div className="inline-block px-4 py-1.5 bg-blue-50 text-blue-700 font-black text-xs rounded-full mt-2">
              Order ID: {placedOrder.orderNumber || placedOrder._id}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 text-left text-xs space-y-2.5 max-w-lg mx-auto border border-slate-200/70">
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Collection Mode:</span>
              <span className="font-black text-slate-800">
                {collectionMethod === 'HOME_COLLECTION' ? '🏠 Collect Sample at Home' : '🏥 Collect Sample at Laboratory'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-bold">Scheduled Date & Slot:</span>
              <span className="font-black text-slate-800">{formattedSummaryDate} • {collectionSlot}</span>
            </div>
            {collectionMethod === 'HOME_COLLECTION' && (
              <div className="flex justify-between">
                <span className="text-slate-500 font-bold">Delivery Address:</span>
                <span className="font-black text-slate-800 text-right max-w-[240px]">{selectedAddress.line1}, {selectedAddress.city}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-black">
              <span className="text-slate-700">Amount Paid:</span>
              <span className="text-blue-600">₹{calculations.totalAmount}</span>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => onNavigate && onNavigate('lab-orders')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl transition shadow-md"
            >
              View My Lab Orders
            </button>
            <button
              onClick={() => onNavigate && onNavigate('lab-prescriptions')}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition"
            >
              Back to Tests from Prescription
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // 10. Main Checkout Page Layout
  // ============================================================
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in font-sans">
      
      {/* ── HEADER & WORKFLOW PROGRESS ── */}
      <div className="space-y-4">
        <button
          onClick={() => onNavigate && onNavigate('lab-prescriptions')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition"
        >
          <ChevronLeft size={16} />
          <span>Back to Tests From Prescription</span>
        </button>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Checkout</h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Review your tests, choose sample collection method and place your lab order
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 text-xs font-bold">
            <div className="flex items-center gap-1.5 text-emerald-700">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Check size={12} className="stroke-[3]" />
              </div>
              <span>Review Tests</span>
            </div>
            <span className="text-slate-300">──</span>
            <div className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1 rounded-full shadow-sm">
              <span className="w-4 h-4 rounded-full bg-white text-blue-600 flex items-center justify-center text-[10px] font-black">2</span>
              <span>Collection</span>
            </div>
            <span className="text-slate-300">──</span>
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">3</span>
              <span>Payment</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN 2-COLUMN GRID (70% Left Content / 30% Right Sticky Summary) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ============================================================ */}
        {/* ── LEFT COLUMN (lg:col-span-8) ── */}
        {/* ============================================================ */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Top Banner: Need to Add More Tests? */}
          <div className="bg-gradient-to-r from-blue-50/80 via-white to-blue-50/50 border border-blue-100 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Droplets size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Need to add more tests?</h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  Add more lab tests from this laboratory before placing your order.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate && onNavigate('lab-tests')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs whitespace-nowrap flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add More Lab Tests</span>
            </button>
          </div>

          {/* ── SECTION 1: REVIEW SELECTED TESTS TABLE ── */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                  1
                </div>
                <h2 className="text-sm font-black text-slate-900">Review Selected Tests ({cartItems.length} Tests)</h2>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                Selected Laboratory: <strong className="text-slate-700">{labName}</strong>
              </span>
            </div>

            {cartItems.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No tests selected. <button onClick={() => onNavigate('lab-tests')} className="text-blue-600 font-bold underline ml-1">Browse tests</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                      <th className="pb-3 pl-2">Test Name</th>
                      <th className="pb-3">Sample</th>
                      <th className="pb-3">Reporting Time</th>
                      <th className="pb-3 text-right">Price</th>
                      <th className="pb-3 text-center pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/70 font-medium">
                    {cartItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 pl-2">
                          <div className="font-black text-slate-900">{item.testName || item.fullName}</div>
                          {item.fullName && item.fullName !== item.testName && (
                            <div className="text-[10px] text-slate-400">{item.fullName}</div>
                          )}
                        </td>
                        <td className="py-3.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                            <Droplets size={10} className="text-rose-500" />
                            {item.sample || 'Whole Blood'}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-500">
                          <span className="inline-flex items-center gap-1 text-[11px]">
                            <Clock size={11} className="text-slate-400" />
                            {item.reportingTime || '24 Hours'}
                          </span>
                        </td>
                        <td className="py-3.5 text-right font-black text-slate-900 text-sm">
                          ₹{item.localPrice || 150}
                        </td>
                        <td className="py-3.5 text-center pr-2">
                          <button
                            onClick={() => handleRemoveTest(item.id)}
                            title="Remove test"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 text-center">
              <button
                onClick={() => onNavigate && onNavigate('lab-tests')}
                className="text-xs font-black text-blue-600 hover:text-blue-800 transition inline-flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Add More Lab Tests</span>
              </button>
            </div>
          </div>

          {/* ── SECTION 2: CHOOSE SAMPLE COLLECTION METHOD ── */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                2
              </div>
              <h2 className="text-sm font-black text-slate-900">Choose Sample Collection Method</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Option 1: Collect Sample at Home */}
              <div
                onClick={() => setCollectionMethod('HOME_COLLECTION')}
                className={`p-5 rounded-2xl border-2 transition cursor-pointer relative space-y-3 ${
                  collectionMethod === 'HOME_COLLECTION'
                    ? 'border-blue-600 bg-blue-50/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Home size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">Collect Sample at Home</h4>
                      <p className="text-[10px] text-slate-400 font-bold">Home Collection Fee: ₹100</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-wider">
                    Convenient
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Certified phlebotomist will visit your delivery address to collect blood/urine samples safely.
                </p>
              </div>

              {/* Option 2: Collect Sample at Laboratory */}
              <div
                onClick={() => setCollectionMethod('AT_LAB')}
                className={`p-5 rounded-2xl border-2 transition cursor-pointer relative space-y-3 ${
                  collectionMethod === 'AT_LAB'
                    ? 'border-blue-600 bg-blue-50/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">Collect Sample at Laboratory</h4>
                      <p className="text-[10px] text-emerald-600 font-bold">Fee: ₹0</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wider">
                    No Additional Charges
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Walk in directly to {labName} during working hours. No home collection charges.
                </p>
              </div>
            </div>

            {/* Sub-view: Home Collection Details (Address & Date/Time) */}
            {collectionMethod === 'HOME_COLLECTION' && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                
                {/* Central Delivery Address Selection Card */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin size={16} />
                    </div>
                    <div className="space-y-0.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">Delivery Address</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded-md">
                          {selectedAddress.tag || 'Home'}
                        </span>
                        {selectedAddress.isDefault && (
                          <span className="px-1.5 py-0.2 bg-slate-200 text-slate-700 text-[9px] font-bold rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 font-medium leading-snug">
                        {selectedAddress.line1}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                      </p>
                      <p className="text-slate-400 font-bold">
                        Phone: {selectedAddress.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewAddress(false);
                        setShowAddressModal(true);
                      }}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-black text-xs rounded-xl transition shadow-2xs"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewAddress(true);
                        setShowAddressModal(true);
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl transition flex items-center gap-1"
                    >
                      <Plus size={13} />
                      <span>Add New</span>
                    </button>
                  </div>
                </div>

                {/* Preferred Date & Time Slot Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      <span>Preferred Date</span>
                    </label>
                    <input
                      type="date"
                      value={collectionDate}
                      onChange={(e) => setCollectionDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-blue-600 font-bold block pl-1">
                      {formattedDisplayDate}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                      <Clock size={13} className="text-slate-400" />
                      <span>Preferred Time Slot</span>
                    </label>
                    <select
                      value={collectionSlot}
                      onChange={(e) => setCollectionSlot(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {timeSlots.map(slot => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Alert Notice */}
                <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-[11px] text-amber-800 flex items-start gap-2 font-medium">
                  <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Our phlebotomist will contact you on <strong>{selectedAddress.phone}</strong> before arriving for sample collection. Please ensure you are available during the chosen time window.
                  </span>
                </div>
              </div>
            )}

            {/* Sub-view: Lab Walk-in Address */}
            {collectionMethod === 'AT_LAB' && (
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 size={16} />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="font-black text-slate-900">{labName}</div>
                  <p className="text-slate-600">Plot 14, Main Medical Corridor, Indiranagar, Ghaziabad, Uttar Pradesh - 201001</p>
                  <p className="text-slate-400 font-bold">Working Hours: 07:00 AM - 08:00 PM (Monday to Sunday)</p>
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 3: RECOMMENDED PACKAGES FOR YOU (DATA-DRIVEN & LAB-SPECIFIC) ── */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                  3
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-black text-slate-900">Recommended Packages for You</h2>
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black">
                    Offered by {labName}
                  </span>
                </div>
              </div>

              {smartPackages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllPackagesModal(true)}
                  className="text-xs font-black text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
                >
                  <span>View All Packages</span>
                  <ArrowRight size={13} />
                </button>
              )}
            </div>

            {loadingPackages ? (
              <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400 text-xs">
                <RefreshCw size={20} className="animate-spin text-blue-500" />
                <span>Checking available packages from {labName}...</span>
              </div>
            ) : smartPackages.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-1">
                <p className="text-xs font-bold text-slate-700">No specialized health packages currently offered by this laboratory.</p>
                <p className="text-[11px] text-slate-400">All tests can be ordered as individual investigations above.</p>
              </div>
            ) : (
              /* Horizontal Scrollable Carousel */
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => scrollCarousel('left')}
                  className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarousel('right')}
                  className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition"
                >
                  <ChevronRight size={16} />
                </button>

                <div
                  ref={carouselRef}
                  className="flex gap-4 overflow-x-auto scrollbar-none py-2 px-1 snap-x snap-mandatory"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {smartPackages.map((pkg) => {
                    const isAdded = appliedPackage?.packageId === pkg.packageId || appliedPackage?.id === pkg.id;
                    const testsList = pkg.includedInvestigations || pkg.tests || [];
                    const investigationsFormatted = testsList.map(t => typeof t === 'string' ? t : t.name);

                    return (
                      <div
                        key={pkg.packageId || pkg.id}
                        className={`w-72 shrink-0 rounded-2xl p-4 border transition flex flex-col justify-between space-y-3 bg-white shadow-2xs snap-start ${
                          isAdded ? 'border-emerald-600 bg-emerald-50/20 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-blue-400 hover:shadow-md'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                              {pkg.category || 'Package'}
                            </span>
                            {pkg.isBestValue && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                BEST VALUE
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="text-xs font-black text-slate-900 leading-tight">
                              {pkg.packageName || pkg.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-bold">
                              <span>⏱ {pkg.fastingRequired || 'No Fasting'}</span>
                              <span>•</span>
                              <span>🕒 {pkg.turnaroundTime || '24 Hours'}</span>
                            </div>
                          </div>

                          {/* Included Investigations Checklist */}
                          <div className="space-y-1 bg-slate-50/80 rounded-xl p-2.5 text-[11px] font-bold text-slate-700 border border-slate-100">
                            <div className="text-[10px] uppercase text-slate-400 font-black">
                              Includes {investigationsFormatted.length} Tests:
                            </div>
                            {investigationsFormatted.slice(0, 4).map((testName, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 truncate">
                                <Check size={12} className="text-emerald-600 shrink-0 stroke-[3]" />
                                <span className="truncate">{testName}</span>
                              </div>
                            ))}
                            {investigationsFormatted.length > 4 && (
                              <div className="text-[10px] text-blue-600 font-bold pt-0.5">
                                + {investigationsFormatted.length - 4} more tests
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Pricing & CTA */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-baseline justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 line-through font-bold block">
                                ₹{pkg.individualTotal || pkg.individualPrice}
                              </span>
                              <span className="text-sm font-black text-slate-900">
                                ₹{pkg.packagePrice || pkg.price}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md">
                              Save ₹{pkg.savings} ({pkg.discountPercent}% OFF)
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPackageForModal(pkg)}
                              className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition"
                            >
                              View Details
                            </button>
                            {isAdded ? (
                              <button
                                type="button"
                                onClick={handleRemovePackage}
                                className="px-3 py-1.5 bg-emerald-600 text-white font-bold text-[11px] rounded-xl transition flex items-center gap-1"
                              >
                                <Check size={13} />
                                <span>Added</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddPackage(pkg)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl transition"
                              >
                                Add Package
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 4: APPLY PROMO CODE ── */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                4
              </div>
              <h2 className="text-sm font-black text-slate-900">Apply Promo Code</h2>
            </div>

            {appliedPromo ? (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-900">
                      🎉 {appliedPromo.code} Applied!
                    </h4>
                    <p className="text-[11px] text-emerald-700 font-medium">
                      {appliedPromo.message || `You saved ₹${appliedPromo.discountAmount} using this promo code.`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemovePromo}
                  className="px-3 py-1.5 bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold rounded-xl transition"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Promo Code (e.g. YAY20, HEALTH20)"
                  value={promoCodeInput}
                  onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 uppercase placeholder:normal-case placeholder:font-normal focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  disabled={validatingPromo}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl transition disabled:opacity-50"
                >
                  {validatingPromo ? 'Applying...' : 'Apply'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* ── RIGHT COLUMN: STICKY ORDER SUMMARY (lg:col-span-4) ── */}
        {/* ============================================================ */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 space-y-5">
            <h3 className="text-sm font-black text-slate-900 pb-3 border-b border-slate-100">
              Order Summary
            </h3>

            {/* Selected Laboratory Info Box */}
            <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100/80 flex items-start gap-2.5 text-xs">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Building2 size={15} />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Selected Laboratory</span>
                <h4 className="font-black text-slate-900 leading-tight">{labName}</h4>
                <p className="text-[10px] text-slate-500">{labCity}, Uttar Pradesh</p>
              </div>
            </div>

            {/* Tests in Cart Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>Tests ({cartItems.length})</span>
                <button
                  onClick={() => onNavigate && onNavigate('lab-tests')}
                  className="text-blue-600 hover:underline"
                >
                  Edit
                </button>
              </div>
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate max-w-[190px]">{item.testName || item.fullName}</span>
                    <span className="font-bold text-slate-900">₹{item.localPrice || 150}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Details */}
            <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Tests Subtotal</span>
                <span className="font-bold text-slate-800">₹{calculations.testsSubtotal}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Home Collection Fee</span>
                <span className="font-bold text-slate-800">
                  {collectionMethod === 'HOME_COLLECTION' ? `₹${calculations.homeCollectionFee}` : <strong className="text-emerald-600 font-black">FREE</strong>}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Convenience Fee</span>
                <span className="font-bold text-emerald-600">₹0</span>
              </div>
              {appliedPackage && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Package Savings ({appliedPackage.packageName || appliedPackage.name})</span>
                  <span>-₹{calculations.packageDiscount}</span>
                </div>
              )}
              {appliedPromo && calculations.promoDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Promo Discount ({appliedPromo.code})</span>
                  <span>-₹{calculations.promoDiscount}</span>
                </div>
              )}
            </div>

            {/* Total Amount */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-300 font-medium">Total Amount</span>
                <span className="text-xl font-black text-white">₹{calculations.totalAmount}</span>
              </div>
              <p className="text-[10px] text-slate-400">Inclusive of all applicable taxes & charges</p>
            </div>

            {/* Reward Points Badge */}
            <div className="p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center gap-2 text-[11px] text-emerald-900 font-bold">
              <Award size={16} className="text-emerald-600 shrink-0" />
              <span>You will earn <strong>{calculations.rewardPoints} Reward Points</strong> on this order</span>
            </div>

            {/* Sample Collection Details Summary */}
            <div className="bg-slate-50 rounded-2xl p-3.5 space-y-2 text-[11px] border border-slate-100 font-medium text-slate-600">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Collection Details:</div>
              <div className="flex justify-between">
                <span>Mode:</span>
                <strong className="text-slate-800 font-bold">
                  {collectionMethod === 'HOME_COLLECTION' ? 'Home Sample Collection' : 'Lab Walk-in'}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <strong className="text-slate-800 font-bold">{formattedSummaryDate}</strong>
              </div>
              <div className="flex justify-between">
                <span>Slot:</span>
                <strong className="text-slate-800 font-bold">{collectionSlot}</strong>
              </div>
              {collectionMethod === 'HOME_COLLECTION' && (
                <div className="flex justify-between pt-1 border-t border-slate-200/60">
                  <span>Address:</span>
                  <strong className="text-slate-800 font-bold text-right max-w-[170px] truncate">
                    {selectedAddress.line1} ({selectedAddress.tag || 'Home'})
                  </strong>
                </div>
              )}
            </div>

            {/* Proceed to Payment CTA */}
            <button
              type="button"
              onClick={handleProceedToPayment}
              disabled={cartItems.length === 0}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-sm rounded-2xl transition shadow-lg hover:shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              <CreditCard size={17} />
              <span>Proceed to Payment | ₹{calculations.totalAmount}</span>
              <Lock size={14} className="opacity-70 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* ── CENTRAL PATIENT ADDRESS BOOK MODAL ── */}
      {/* ============================================================ */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Patient Address Book</h3>
                <p className="text-xs text-slate-500 font-medium">Reused across AICMS labs, pharmacies and clinics</p>
              </div>
              <button onClick={() => setShowAddressModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {isAddingNewAddress ? (
              <form onSubmit={handleSaveNewAddress} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Address Tag</label>
                    <select
                      value={newAddressForm.tag}
                      onChange={(e) => setNewAddressForm({ ...newAddressForm, tag: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="Home">Home</option>
                      <option value="Work">Work</option>
                      <option value="Parents House">Parents House</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={newAddressForm.phone}
                      onChange={(e) => setNewAddressForm({ ...newAddressForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Recipient Full Name</label>
                  <input
                    type="text"
                    value={newAddressForm.fullName}
                    onChange={(e) => setNewAddressForm({ ...newAddressForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">House/Flat No., Building Name</label>
                  <input
                    type="text"
                    value={newAddressForm.houseFlatNumber}
                    onChange={(e) => setNewAddressForm({ ...newAddressForm, houseFlatNumber: e.target.value })}
                    placeholder="e.g. Flat 402, Tower B"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Street Address / Landmark</label>
                  <input
                    type="text"
                    value={newAddressForm.street}
                    onChange={(e) => setNewAddressForm({ ...newAddressForm, street: e.target.value })}
                    placeholder="e.g. Indiranagar, Near Shanti Park"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">City</label>
                    <input
                      type="text"
                      value={newAddressForm.city}
                      onChange={(e) => setNewAddressForm({ ...newAddressForm, city: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Pincode</label>
                    <input
                      type="text"
                      value={newAddressForm.pincode}
                      onChange={(e) => setNewAddressForm({ ...newAddressForm, pincode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isDefaultCheckbox"
                    checked={newAddressForm.isDefault}
                    onChange={(e) => setNewAddressForm({ ...newAddressForm, isDefault: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isDefaultCheckbox" className="text-xs font-medium text-slate-700 cursor-pointer">
                    Set as default delivery address for all services
                  </label>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={savingAddress}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-xs"
                  >
                    {savingAddress ? 'Saving...' : 'Save & Select Address'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewAddress(false)}
                    className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                {savedAddresses.map((addr) => {
                  const isCurrent = String(selectedAddressId) === String(addr.id || addr._id);
                  return (
                    <div
                      key={addr.id || addr._id}
                      onClick={() => {
                        setSelectedAddressId(String(addr.id || addr._id));
                        setShowAddressModal(false);
                        toast.success(`Selected ${addr.tag || 'Home'} address.`);
                      }}
                      className={`p-4 rounded-2xl border-2 transition cursor-pointer flex items-start justify-between gap-3 ${
                        isCurrent ? 'border-blue-600 bg-blue-50/30 shadow-xs' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900">{addr.tag || addr.addressType || 'Home'}</span>
                          {addr.isDefault && (
                            <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 text-[9px] font-bold rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-800">{addr.fullName || patientName}</p>
                        <p className="text-slate-700 leading-snug">{addr.line1}</p>
                        <p className="text-slate-400">{addr.city}, {addr.state} - {addr.pincode}</p>
                        <p className="font-bold text-slate-700 pt-0.5">Phone: {addr.phone}</p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {isCurrent ? (
                          <CheckCircle2 size={20} className="text-blue-600" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                        )}

                        {!addr.isDefault && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetDefaultAddress(addr._id || addr.id);
                            }}
                            className="text-[10px] text-blue-600 hover:underline font-bold"
                          >
                            Set Default
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => setIsAddingNewAddress(true)}
                  className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-blue-500 text-blue-600 font-bold text-xs rounded-2xl transition flex items-center justify-center gap-1.5"
                >
                  <Plus size={15} />
                  <span>+ Add New Address to Address Book</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ── VIEW ALL PACKAGES MODAL (LABORATORY-SPECIFIC ONLY) ── */}
      {/* ============================================================ */}
      {showAllPackagesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">All Packages Offered by {labName}</h3>
                <p className="text-xs text-slate-500 font-medium">Showing active laboratory packages and health screens</p>
              </div>
              <button onClick={() => setShowAllPackagesModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            {/* Search & Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search package name or included test..."
                  value={packageSearchQuery}
                  onChange={(e) => setPackageSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={packageSortBy}
                  onChange={(e) => setPackageSortBy(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
                >
                  <option value="RECOMMENDED">Recommended Priority</option>
                  <option value="SAVINGS_DESC">Highest Savings</option>
                  <option value="PRICE_ASC">Price: Low to High</option>
                  <option value="PRICE_DESC">Price: High to Low</option>
                  <option value="TESTS_DESC">Most Tests Included</option>
                </select>
              </div>
            </div>

            {/* Packages Grid */}
            <div className="overflow-y-auto flex-1 pr-1 space-y-3">
              {allPackagesFiltered.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No packages matched your search from {labName}.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allPackagesFiltered.map((pkg) => {
                    const isAdded = appliedPackage?.packageId === pkg.packageId || appliedPackage?.id === pkg.id;
                    const testsList = pkg.includedInvestigations || pkg.tests || [];
                    const investigationsFormatted = testsList.map(t => typeof t === 'string' ? t : t.name);

                    return (
                      <div
                        key={pkg.packageId || pkg.id}
                        className={`p-4 rounded-2xl border transition flex flex-col justify-between space-y-3 bg-white shadow-2xs ${
                          isAdded ? 'border-emerald-600 bg-emerald-50/20' : 'border-slate-200 hover:border-blue-400'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                              {pkg.category || 'Package'}
                            </span>
                            {pkg.isBestValue && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                                BEST VALUE
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="text-xs font-black text-slate-900 leading-tight">
                              {pkg.packageName || pkg.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-bold">
                              ⏱ {pkg.fastingRequired || 'No Fasting'} • 🕒 {pkg.turnaroundTime || '24 Hours'}
                            </p>
                          </div>

                          <div className="space-y-1 bg-slate-50/80 rounded-xl p-2.5 text-[11px] font-bold text-slate-700 border border-slate-100">
                            <div className="text-[10px] uppercase text-slate-400 font-black">
                              Includes {investigationsFormatted.length} Tests:
                            </div>
                            {investigationsFormatted.slice(0, 4).map((testName, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 truncate">
                                <Check size={12} className="text-emerald-600 shrink-0 stroke-[3]" />
                                <span className="truncate">{testName}</span>
                              </div>
                            ))}
                            {investigationsFormatted.length > 4 && (
                              <div className="text-[10px] text-blue-600 font-bold pt-0.5">
                                + {investigationsFormatted.length - 4} more tests
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-baseline justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 line-through font-bold block">
                                ₹{pkg.individualTotal || pkg.individualPrice}
                              </span>
                              <span className="text-sm font-black text-slate-900">
                                ₹{pkg.packagePrice || pkg.price}
                              </span>
                            </div>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md">
                              Save ₹{pkg.savings} ({pkg.discountPercent}% OFF)
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedPackageForModal(pkg)}
                              className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl transition"
                            >
                              View Details
                            </button>
                            {isAdded ? (
                              <button
                                type="button"
                                onClick={handleRemovePackage}
                                className="px-3.5 py-2 bg-emerald-600 text-white font-bold text-[11px] rounded-xl transition flex items-center gap-1"
                              >
                                <Check size={13} />
                                <span>Added</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleAddPackage(pkg)}
                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl transition"
                              >
                                Add Package
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAllPackagesModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ── PACKAGE DETAILS MODAL ── */}
      {/* ============================================================ */}
      {selectedPackageForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">{selectedPackageForModal.packageName || selectedPackageForModal.name}</h3>
                <p className="text-xs text-slate-500 font-medium">Provided by {labName}</p>
              </div>
              <button onClick={() => setSelectedPackageForModal(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {selectedPackageForModal.description}
            </p>

            <div className="grid grid-cols-2 gap-2 bg-blue-50/50 p-3 rounded-2xl border border-blue-100 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">Fasting Requirement:</span>
                <span className="font-bold text-slate-800">{selectedPackageForModal.fastingRequired || 'No Fasting Required'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">Reporting Time:</span>
                <span className="font-bold text-slate-800">{selectedPackageForModal.turnaroundTime || '24 Hours'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Included Investigations ({selectedPackageForModal.includedInvestigations?.length || 5})
              </h4>
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                {(selectedPackageForModal.includedInvestigations || []).map((t, idx) => {
                  const testName = typeof t === 'string' ? t : t.name;
                  const sample = typeof t === 'object' ? t.sampleType : 'Blood';
                  const price = typeof t === 'object' ? t.price : null;

                  return (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between gap-2 text-xs font-bold text-slate-700 border border-slate-100">
                      <div className="flex items-center gap-2">
                        <Check size={14} className="text-emerald-600 stroke-[3] shrink-0" />
                        <span>{testName}</span>
                        {sample && (
                          <span className="text-[10px] text-slate-400 font-normal">({sample})</span>
                        )}
                      </div>
                      {price > 0 && (
                        <span className="text-[11px] text-slate-400 font-medium">₹{price}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-400 line-through block font-bold">
                  Individual Test Total ₹{selectedPackageForModal.individualTotal || selectedPackageForModal.individualPrice}
                </span>
                <span className="text-xl font-black text-slate-900">
                  Package Price ₹{selectedPackageForModal.packagePrice || selectedPackageForModal.price}
                </span>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black text-xs rounded-xl">
                Save ₹{selectedPackageForModal.savings} ({selectedPackageForModal.discountPercent}% OFF)
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleAddPackage(selectedPackageForModal)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-2xl transition shadow-md"
              >
                Add Package to Order
              </button>
              <button
                type="button"
                onClick={() => setSelectedPackageForModal(null)}
                className="py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ── PAYMENT MODAL ── */}
      {/* ============================================================ */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Complete Payment</h3>
                <p className="text-xs text-slate-500">Payable: ₹{calculations.totalAmount}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Select Payment Method</label>
              <div className="grid grid-cols-2 gap-2">
                {['UPI', 'CARD', 'NET_BANKING', 'PAY_ON_COLLECTION'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`p-3 rounded-xl border text-xs font-bold text-left transition ${
                      paymentMethod === method
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-2xs'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {method === 'UPI' && '📱 UPI / QR'}
                    {method === 'CARD' && '💳 Credit / Debit Card'}
                    {method === 'NET_BANKING' && '🏦 Net Banking'}
                    {method === 'PAY_ON_COLLECTION' && '💵 Pay on Collection'}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Patient:</span>
                <strong className="text-slate-900">{patientName}</strong>
              </div>
              <div className="flex justify-between">
                <span>Laboratory:</span>
                <strong className="text-slate-900">{labName}</strong>
              </div>
              <div className="flex justify-between">
                <span>Collection Mode:</span>
                <strong className="text-slate-900">
                  {collectionMethod === 'HOME_COLLECTION' ? 'Home Sample Collection' : 'Lab Walk-in'}
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConfirmAndPay}
              disabled={processingPayment}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs rounded-2xl transition shadow-lg flex items-center justify-center gap-2"
            >
              {processingPayment ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Processing Payment...</span>
                </>
              ) : (
                <>
                  <Lock size={14} />
                  <span>Pay ₹{calculations.totalAmount} & Place Order</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
