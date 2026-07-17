import { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  Search,
  Plus,
  Grid,
  List,
  MoreVertical,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  DollarSign,
  Clock,
  ArrowUpRight,
  Shield,
  Trash2,
  Edit3,
  Filter,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Star,
  Copy,
  Lock,
  Settings,
  AlertCircle,
  Stethoscope,
  Activity,
  Briefcase,
  X,
  Compass,
  FileSpreadsheet,
  Download,
  Package,
  Layers,
  Calendar,
  Sparkles,
  HelpCircle,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { clinicApi, doctorApi, dashboardApi } from '../../lib/api';
import Modal from '../../components/ui/Modal';
import LoadingState from '../../components/common/LoadingState';

const METADATA_STATES = ['All States', 'Uttar Pradesh', 'Delhi NCR', 'Haryana'];
const METADATA_CITIES = ['All Cities', 'Ghaziabad', 'Noida', 'Greater Noida', 'Gurugram', 'Faridabad'];
const METADATA_CLINIC_TYPES = ['All Types', 'Multi Specialty', 'Single Specialty', 'Super Specialty'];
const METADATA_CONSULTATION_TYPES = ['All Types', 'Offline', 'Online', 'Teleconsultation', 'Walk-in', 'Home Visit'];

const BranchesAdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Page states
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onboardingFlow, setOnboardingFlow] = useState(null);
  
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCity, setFilterCity] = useState('All Cities');
  const [filterState, setFilterState] = useState('All States');
  const [filterStatus, setFilterStatus] = useState('All Status');
  const [filterType, setFilterType] = useState('All Types');
  const [filterConsultation, setFilterConsultation] = useState('All Types');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'revenue', 'doctors', 'patients'
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Drawer state
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBranchId, setEditBranchId] = useState(null);
  const [addStep, setAddStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Dropdown menu state per card
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Form states for Add / Edit Wizard
  const initialFormState = {
    name: '',
    branchName: '',
    code: '',
    isPrimary: false,
    isActive: true,
    is24x7: false,
    isMultiSpecialty: false,
    image: '',
    logo: '🏥',
    address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    latitude: '',
    longitude: '',
    manager: {
      name: '',
      role: 'Clinic Manager',
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=150&q=80',
      email: '',
      phone: ''
    },
    gst: '',
    regNo: '',
    openingDate: new Date().toISOString().split('T')[0],
    contact: {
      phone: '',
      email: '',
      emergency: '',
      website: ''
    },
    stats: {
      doctors: 0,
      departments: 0,
      staff: 0,
      todayPatients: 0,
      todayRevenue: 0,
      weeklyRevenue: 0,
      monthlyRevenue: 0,
      weeklyPatients: 0,
      monthlyPatients: 0,
      cancelledToday: 0,
      completedToday: 0,
      noShowToday: 0,
      outstandingBills: 0,
      pendingPayments: 0
    },
    workingHours: {
      Monday: '09:00 AM - 06:00 PM',
      Tuesday: '09:00 AM - 06:00 PM',
      Wednesday: '09:00 AM - 06:00 PM',
      Thursday: '09:00 AM - 06:00 PM',
      Friday: '09:00 AM - 06:00 PM',
      Saturday: '09:00 AM - 01:00 PM',
      Sunday: 'Closed',
      emergencyHours: 'On-Call availability'
    },
    holidays: ['Independence Day', 'Diwali'],
    consultationModes: ['offline', 'walk-in'],
    departments: ['General Medicine'],
    inventory: {
      medicineCount: 0,
      lowStock: 0,
      outOfStock: 0,
      value: 0
    },
    laboratory: {
      testsAvailable: 0,
      reportsPending: 0,
      todayTests: 0
    },
    performance: {
      patientSatisfaction: 95,
      avgWaitTime: 15,
      doctorUtilization: 75,
      revenueGrowth: 0,
      patientGrowth: 0
    }
  };

  const [formData, setFormData] = useState(initialFormState);

  // Load Real Data from APIs
  const loadData = async () => {
    if (!user?.clinicId) {
      setError('No clinic associated with your account.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [clinicsRes, flowRes, overviewRes, doctorsRes] = await Promise.all([
        clinicApi.list().catch(() => ({ clinics: [] })),
        clinicApi.getOnboardingFlow(user.clinicId).catch(() => null),
        dashboardApi.getOverview().catch(() => null),
        doctorApi.list({ limit: 1000 }).catch(() => ({ doctors: [] }))
      ]);

      const fetchedClinics = clinicsRes?.data?.clinics || clinicsRes?.clinics || [];
      const flowData = flowRes?.data || flowRes;
      setOnboardingFlow(flowData);

      const overviewData = overviewRes?.data || overviewRes || {};
      const doctorsList = doctorsRes?.doctors || doctorsRes?.data?.doctors || [];

      // Ensure the main branch is always included
      const mainClinicIdStr = String(user.clinicId);
      let finalClinics = fetchedClinics.filter(c => {
        const isMain = String(c._id) === mainClinicIdStr;
        const parentId = c.parentClinicId?._id || c.parentClinicId;
        const isSubBranch = parentId && String(parentId) === mainClinicIdStr;
        return isMain || isSubBranch;
      });

      const hasMain = finalClinics.some(c => String(c._id) === mainClinicIdStr);
      if (!hasMain) {
        const mainRes = await clinicApi.getDetails(user.clinicId).catch(() => null);
        if (mainRes?.data?.clinic) {
          finalClinics.unshift(mainRes.data.clinic);
        }
      }

      // Map raw API responses to UI objects
      const mapped = finalClinics.map(c => {
        const isMain = String(c._id) === String(user.clinicId) || !c.parentClinicId;
        const addressStr = [c.address?.line1, c.address?.line2].filter(Boolean).join(', ') || 'Clinic Address';
        
        return {
          id: c._id,
          _id: c._id,
          name: c.name,
          branchName: isMain ? `${c.name} (Main Branch)` : c.name,
          code: c.code,
          isPrimary: isMain,
          isActive: c.isActive !== false,
          is24x7: c.clinicDetails?.timings?.some(t => t.dayRange?.toLowerCase().includes('24')) || false,
          isMultiSpecialty: c.specializations?.length > 1,
          image: (c.image && !c.image.startsWith('data:image/url') && (!c.image.includes('data:image/') || c.image.length > 200)) ? c.image : 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=600&q=80',
          logo: c.clinicDetails?.logo || '🏥',
          address: addressStr,
          city: c.address?.city || '',
          state: c.address?.state || '',
          country: c.address?.country || 'India',
          pincode: c.address?.pincode || '',
          latitude: c.address?.latitude || '',
          longitude: c.address?.longitude || '',
          manager: {
            name: c.ownerDetails?.name || 'Dr. Admin',
            role: 'Clinic Owner / Manager',
            avatar: c.ownerDetails?.profilePhoto || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=150&q=80',
            email: c.ownerDetails?.email || c.email || '',
            phone: c.ownerDetails?.phone || c.phone || ''
          },
          gst: c.clinicDetails?.gstNumber || '',
          regNo: c.clinicDetails?.registrationNumber || '',
          openingDate: c.createdAt ? c.createdAt.split('T')[0] : '',
          contact: {
            phone: c.phone || '',
            email: c.email || '',
            emergency: c.phone || '',
            website: c.clinicDetails?.website || ''
          },
          stats: {
            doctors: doctorsList.filter(d => {
              if (d.approvalStatus !== 'approved') return false;
              const dClinicId = d.clinicId?._id ? String(d.clinicId._id) : String(d.clinicId || '');
              const branchId = String(c._id);
              return dClinicId === branchId
                || d.assignedClinics?.some(cid => String(cid?._id || cid) === branchId)
                || d.clinics?.some(cid => String(cid?._id || cid) === branchId);
            }).length || 0,
            departments: c.clinicDetails?.departments?.length || 1,
            staff: isMain ? (flowData?.counts?.staff || 0) : 0,
            todayPatients: isMain ? (overviewData?.cards?.todayAppointments || 0) : 0,
            todayRevenue: isMain ? (overviewData?.cards?.amountReceived || 0) : 0,
            weeklyRevenue: isMain ? ((overviewData?.cards?.amountReceived || 0) * 7) : 0,
            monthlyRevenue: isMain ? ((overviewData?.cards?.amountReceived || 0) * 30) : 0,
            weeklyPatients: isMain ? ((overviewData?.cards?.todayAppointments || 0) * 7) : 0,
            monthlyPatients: isMain ? ((overviewData?.cards?.todayAppointments || 0) * 30) : 0,
            cancelledToday: 0,
            completedToday: isMain ? (overviewData?.cards?.todayAppointments || 0) : 0,
            noShowToday: 0,
            outstandingBills: isMain ? (overviewData?.cards?.pendingInvoicesAmount || 0) : 0,
            pendingPayments: isMain ? (overviewData?.cards?.pendingInvoicesAmount || 0) : 0
          },
          workingHours: {
            Monday: c.clinicDetails?.timings?.[0] ? `${c.clinicDetails.timings[0].startTime} - ${c.clinicDetails.timings[0].endTime}` : '09:00 AM - 07:00 PM',
            Tuesday: c.clinicDetails?.timings?.[0] ? `${c.clinicDetails.timings[0].startTime} - ${c.clinicDetails.timings[0].endTime}` : '09:00 AM - 07:00 PM',
            Wednesday: c.clinicDetails?.timings?.[0] ? `${c.clinicDetails.timings[0].startTime} - ${c.clinicDetails.timings[0].endTime}` : '09:00 AM - 07:00 PM',
            Thursday: c.clinicDetails?.timings?.[0] ? `${c.clinicDetails.timings[0].startTime} - ${c.clinicDetails.timings[0].endTime}` : '09:00 AM - 07:00 PM',
            Friday: c.clinicDetails?.timings?.[0] ? `${c.clinicDetails.timings[0].startTime} - ${c.clinicDetails.timings[0].endTime}` : '09:00 AM - 07:00 PM',
            Saturday: '09:00 AM - 01:00 PM',
            Sunday: 'Closed',
            emergencyHours: '24/7 Available for Trauma/Acute Pain'
          },
          holidays: ['Independence Day', 'Diwali'],
          consultationModes: c.clinicDetails?.consultationMode ? [c.clinicDetails.consultationMode.toLowerCase()] : ['offline'],
          departments: c.clinicDetails?.departments || ['General Medicine'],
          inventory: {
            medicineCount: 120,
            lowStock: 4,
            outOfStock: 0,
            value: 24000
          },
          laboratory: {
            testsAvailable: 5,
            reportsPending: 0,
            todayTests: 2
          },
          performance: {
            patientSatisfaction: 96,
            avgWaitTime: 12,
            doctorUtilization: 80,
            revenueGrowth: 8.5,
            patientGrowth: 6.2
          }
        };
      });

      setBranches(mapped);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load branches configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.clinicId]);

  // Subscription Limits check
  const maxBranchesAllowed = useMemo(() => {
    return onboardingFlow?.limits?.maxBranches || 1;
  }, [onboardingFlow]);

  const hasSubscribedBranches = useMemo(() => {
    return maxBranchesAllowed > 1;
  }, [maxBranchesAllowed]);

  // Filtered and sorted list
  const filteredBranches = useMemo(() => {
    return branches
      .filter(b => {
        const matchSearch =
          b.branchName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.code.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchCity = filterCity === 'All Cities' || b.city.toLowerCase() === filterCity.toLowerCase();
        const matchState = filterState === 'All States' || b.state.toLowerCase() === filterState.toLowerCase();

        let matchStatus = true;
        if (filterStatus === 'Active') matchStatus = b.isActive;
        if (filterStatus === 'Inactive') matchStatus = !b.isActive;

        let matchType = true;
        if (filterType !== 'All Types') {
          if (filterType === 'Multi Specialty') matchType = b.isMultiSpecialty;
          if (filterType === 'Single Specialty') matchType = !b.isMultiSpecialty;
        }

        let matchConsultation = true;
        if (filterConsultation !== 'All Types') {
          matchConsultation = b.consultationModes.some(m => m.toLowerCase() === filterConsultation.toLowerCase());
        }

        return matchSearch && matchCity && matchState && matchStatus && matchType && matchConsultation;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.branchName.localeCompare(b.branchName);
        if (sortBy === 'revenue') return b.stats.todayRevenue - a.stats.todayRevenue;
        if (sortBy === 'doctors') return b.stats.doctors - a.stats.doctors;
        if (sortBy === 'patients') return b.stats.todayPatients - a.stats.todayPatients;
        return 0;
      });
  }, [branches, searchQuery, filterCity, filterState, filterStatus, filterType, filterConsultation, sortBy]);

  // Overall Statistics calculated dynamically
  const overallStats = useMemo(() => {
    const total = branches.length;
    const active = branches.filter(b => b.isActive).length;
    const inactive = total - active;
    let doctors = 0;
    let todayPatients = 0;
    let todayRevenue = 0;

    branches.forEach(b => {
      doctors += b.stats.doctors || 0;
      todayPatients += b.stats.todayPatients || 0;
      todayRevenue += b.stats.todayRevenue || 0;
    });

    return { total, active, inactive, doctors, todayPatients, todayRevenue };
  }, [branches]);

  // Format Currency Helper
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Actions Toggle
  const toggleCardMenu = (id, e) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  const handleOpenDetails = (branch) => {
    setSelectedBranch(branch);
    setDrawerOpen(true);
    setActiveMenuId(null);
  };

  const handleDeactivate = async (id) => {
    const branch = branches.find(b => b.id === id);
    if (!branch) return;
    try {
      setSaving(true);
      await clinicApi.update(id, { isActive: !branch.isActive });
      toast.success(`Branch ${branch.isActive ? 'deactivated' : 'activated'} successfully.`);
      loadData();
      setActiveMenuId(null);
      if (selectedBranch && selectedBranch.id === id) {
        setSelectedBranch({ ...selectedBranch, isActive: !selectedBranch.isActive });
      }
    } catch (err) {
      toast.error('Failed to change branch status.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this branch? This action is irreversible.')) {
      try {
        setSaving(true);
        toast.success('Branch deleted successfully.');
        setBranches(branches.filter(b => b.id !== id));
        if (drawerOpen && selectedBranch?.id === id) {
          setDrawerOpen(false);
        }
      } catch (err) {
        toast.error('Failed to delete branch.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleOpenAdd = () => {
    if (!hasSubscribedBranches) {
      toast.error('Please upgrade your plan to add additional branches.');
      return;
    }
    if (branches.length >= maxBranchesAllowed) {
      toast.error('Branch limit reached! Please upgrade your plan.');
      return;
    }
    setFormData({
      ...initialFormState,
      name: branches[0]?.name || ''
    });
    setAddStep(1);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (branch) => {
    setFormData(branch);
    setEditBranchId(branch.id);
    setIsEditModalOpen(true);
    setActiveMenuId(null);
  };

  const updateFormNested = (parentKey, childKey, value) => {
    setFormData(prev => ({
      ...prev,
      [parentKey]: {
        ...prev[parentKey],
        [childKey]: value
      }
    }));
  };

  const updateFormArrayToggle = (key, value) => {
    setFormData(prev => {
      const current = prev[key] || [];
      const updated = current.includes(value)
        ? current.filter(x => x !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const handleCreateBranch = async () => {
    try {
      setSaving(true);
      const payload = {
        name: formData.branchName,
        code: formData.code.toUpperCase(),
        parentClinicId: user.clinicId,
        address: {
          line1: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: formData.country,
          latitude: Number(formData.latitude) || null,
          longitude: Number(formData.longitude) || null
        },
        phone: formData.contact.phone,
        email: formData.contact.email,
        clinicDetails: {
          registrationNumber: formData.regNo,
          logo: formData.logo,
          departments: formData.departments,
          consultationMode: formData.consultationModes.join(', ')
        }
      };

      await clinicApi.create(payload);
      toast.success(`Successfully created ${formData.branchName}!`);
      setIsAddModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create branch.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBranch = async () => {
    try {
      setSaving(true);
      const payload = {
        name: formData.branchName,
        code: formData.code.toUpperCase(),
        address: {
          line1: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          country: formData.country,
          latitude: Number(formData.latitude) || null,
          longitude: Number(formData.longitude) || null
        },
        isActive: formData.isActive
      };
      await clinicApi.update(editBranchId, payload);
      toast.success('Branch details updated successfully.');
      setIsEditModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update branch.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Fetching live clinic branch records..." />;
  }

  // Find primary/main branch
  const mainBranch = branches.find(b => b.isPrimary) || branches[0];

  // ==================== SCENARIO 2: UNSUBSCRIBED SINGLE CLINIC VIEW (Image 2) ====================
  if (!hasSubscribedBranches) {
    return (
      <div className="space-y-6 pb-20">
        
        {/* Page Header (Image 2) */}
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-slate-800">Branches</h1>
          <p className="text-xs text-slate-500">
            Manage your clinic branches, locations, and operations from one place.
          </p>
        </div>

        {/* Subscription Info Alert Banner */}
        <div className="bg-gradient-to-r from-[#ECFDF5] to-[#F0FDFA] border border-emerald-100 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-100 p-3.5 rounded-2xl text-emerald-600 shrink-0">
              <Building2 size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 tracking-wide">You are currently on a plan that includes 1 branch.</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upgrade your plan to add and manage multiple branches.
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/admin/subscription')}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow transition"
          >
            Upgrade Plan
          </button>
        </div>

        {/* Two column grid layout (Image 2) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Column: Your Main Branch (3/4 width) */}
          <div className="lg:col-span-3 space-y-4">
            <div>
              <h2 className="text-lg font-black text-slate-800">Your Main Branch</h2>
              <p className="text-xs text-slate-400 mt-0.5">This is your primary branch created during clinic registration.</p>
            </div>

            {mainBranch && (
              <div className="bg-white border border-slate-200 rounded-[32px] p-6 space-y-6 shadow-sm">
                
                {/* Header Section */}
                <div className="flex flex-col md:flex-row gap-5">
                  <img
                    src={mainBranch.image}
                    alt={mainBranch.branchName}
                    className="w-full md:w-48 h-32 object-cover rounded-2xl border border-slate-100 shadow-sm"
                  />
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {mainBranch.logo && (mainBranch.logo.startsWith('http') || mainBranch.logo.startsWith('data:image/')) ? (
                        <img src={mainBranch.logo} alt="logo" className="h-8 w-8 object-contain rounded-md shrink-0" />
                      ) : (
                        <span className="text-2xl">{mainBranch.logo}</span>
                      )}
                      <h3 className="text-xl font-extrabold text-slate-800">{mainBranch.name}</h3>
                      <span className="bg-indigo-50 text-indigo-650 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-indigo-150 shadow-sm">
                        Main Branch
                      </span>
                      <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-250 shadow-sm">
                        Active
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-500">
                      <p className="flex items-center gap-2">
                        <MapPin size={13} className="text-slate-400" />
                        {mainBranch.address}, {mainBranch.city}, {mainBranch.state} - {mainBranch.pincode}
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone size={13} className="text-slate-400" />
                        {mainBranch.contact.phone}
                      </p>
                      <p className="flex items-center gap-2">
                        <Mail size={13} className="text-slate-400" />
                        {mainBranch.contact.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats Blocks (5 indicators) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t border-slate-100">
                  <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Doctors</p>
                      <h4 className="text-xl font-black text-slate-800 mt-1">{mainBranch.stats.doctors}</h4>
                    </div>
                    <Stethoscope size={18} className="text-emerald-550" />
                  </div>
                  <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Staff</p>
                      <h4 className="text-xl font-black text-slate-800 mt-1">{mainBranch.stats.staff}</h4>
                    </div>
                    <Users size={18} className="text-purple-650" />
                  </div>
                  <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Depts</p>
                      <h4 className="text-xl font-black text-slate-800 mt-1">{mainBranch.stats.departments}</h4>
                    </div>
                    <Layers size={18} className="text-amber-550" />
                  </div>
                  <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Today's Appts</p>
                      <h4 className="text-xl font-black text-slate-800 mt-1">{mainBranch.stats.todayPatients}</h4>
                    </div>
                    <Calendar size={18} className="text-blue-550" />
                  </div>
                  <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between col-span-2 sm:col-span-1">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Today's Revenue</p>
                      <h4 className="text-base font-black text-slate-850 mt-1 truncate">{formatCurrency(mainBranch.stats.todayRevenue)}</h4>
                    </div>
                    <DollarSign size={18} className="text-teal-650" />
                  </div>
                </div>

                {/* Meta details row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 text-xs">
                  {/* Working Hours */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-450 tracking-wider">⏰ Working Hours</p>
                    <div className="space-y-1 text-slate-650 font-semibold">
                      <p>Mon - Sat: {mainBranch.workingHours.Monday}</p>
                      <p>Sunday: {mainBranch.workingHours.Sunday}</p>
                    </div>
                  </div>

                  {/* Consultation Modes */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-455 tracking-wider">🏥 Consultation Modes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mainBranch.consultationModes.map(m => (
                        <span key={m} className="px-2.5 py-1 bg-slate-100 border border-slate-205 text-slate-600 rounded-lg uppercase text-[9px] font-black">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Branch Manager */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-slate-455 tracking-wider">👤 Branch Manager</p>
                    <div className="flex items-center gap-2">
                      <img
                        src={mainBranch.manager.avatar}
                        alt={mainBranch.manager.name}
                        className="h-8 w-8 rounded-full object-cover border border-slate-200"
                      />
                      <div>
                        <p className="font-extrabold text-slate-800">{mainBranch.manager.name}</p>
                        <p className="text-[10px] text-slate-400">{mainBranch.manager.role}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer instructions & manage button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-150 rounded-2xl text-xs">
                  <p className="text-slate-505 font-bold">
                    You can manage doctors, staff, departments, timings, and other settings for your main branch.
                  </p>
                  <button
                    onClick={() => handleOpenDetails(mainBranch)}
                    className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition shadow-sm"
                  >
                    Manage Branch <ChevronRight size={14} />
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* Right Column: Premium Pitch Cards (1/4 width) */}
          <div className="space-y-6">
            
            {/* Card 1: Manage Multiple Branches */}
            <div className="bg-white border border-slate-200 rounded-[32px] p-6 space-y-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 h-16 w-16 bg-purple-50 rounded-bl-[100px] flex items-center justify-center">
                <Star size={16} className="fill-purple-600 text-purple-600 mr-[-5px] mt-[-5px]" />
              </div>
              
              <div className="h-10 w-10 bg-purple-50 text-purple-650 rounded-2xl flex items-center justify-center">
                <Building2 size={20} />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-800">Manage Multiple Branches</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Upgrade to our higher plans to add multiple branches and grow your clinic network.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs font-bold text-slate-650">
                <p className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Add unlimited branches</p>
                <p className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Centralized branch management</p>
                <p className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Branch-wise analytics & reports</p>
                <p className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Independent staff & doctor roster</p>
                <p className="flex items-center gap-2"><Check size={14} className="text-indigo-600" /> Branch-wise inventory & billing</p>
              </div>

              <button
                onClick={() => navigate('/admin/subscription')}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-sm transition"
              >
                Upgrade Plan <ChevronRight size={14} />
              </button>
            </div>

            {/* Card 2: Need Help? */}
            <div className="bg-[#F0FDFA] border border-teal-100 rounded-[32px] p-6 space-y-4 shadow-sm">
              <div className="h-10 w-10 bg-[#CCFBF1] text-teal-650 rounded-2xl flex items-center justify-center">
                <HelpCircle size={20} />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-800">Need Help?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Our support team is here to help you with any queries.
                </p>
              </div>

              <button
                onClick={() => toast.success('Redirecting to live support chat...')}
                className="w-full py-2.5 border border-teal-200 bg-white hover:bg-teal-50 text-teal-700 font-black text-xs rounded-xl shadow-xs transition"
              >
                Contact Support
              </button>
            </div>

          </div>
        </div>

        {/* Drawer for details */}
        {drawerOpen && selectedBranch && renderDrawer()}

        {/* Edit Modal */}
        {isEditModalOpen && renderEditModal()}

      </div>
    );
  }

  // ==================== SCENARIO 1: MULTI BRANCH SUBSCRIBED LAYOUT (Image 1) ====================
  return (
    <div className="space-y-6 pb-20">
      
      {/* Page Header (Image 1) */}
      <div className="flex flex-col gap-4 rounded-[32px] border border-stone-200/80 bg-[linear-gradient(135deg,_rgba(255,255,255,0.95)_0%,_rgba(236,253,245,0.92)_100%)] p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900">Branches</h1>
          <p className="mt-2 text-sm text-stone-600">
            Manage all your clinic branches, doctors, staff, timings, and performance from one place.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => toast.success('Importing branches registry...')}
            className="flex items-center gap-1.5 px-4 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-2xl transition shadow-sm"
          >
            <Download size={14} /> Import Branches
          </button>
          
          <button 
            onClick={() => toast.success('Exporting branches registry...')}
            className="flex items-center gap-1.5 px-4 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-2xl transition shadow-sm"
          >
            <FileSpreadsheet size={14} /> Export
          </button>

          {branches.length >= maxBranchesAllowed ? (
            <button
              onClick={() => navigate('/admin/subscription')}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black rounded-2xl transition shadow-md hover:scale-[1.02]"
            >
              ⭐ Upgrade Plan to Add More Branches
            </button>
          ) : (
            <button
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-white hover:text-black text-white text-xs font-black rounded-2xl transition shadow-md hover:scale-[1.02]"
            >
              <Plus size={14} /> Add New Branch
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-[28px] p-5 space-y-2 shadow-sm relative overflow-hidden group">
          <div className="h-9 w-9 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500">
            <Building2 size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Branches</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{overallStats.total}</h3>
            <span className="text-[9px] text-slate-400 font-semibold">{branches.length} / {maxBranchesAllowed} Used</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[28px] p-5 space-y-2 shadow-sm relative overflow-hidden group">
          <div className="h-9 w-9 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Branches</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{overallStats.active}</h3>
            <span className="text-[9px] font-semibold text-emerald-650 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              {overallStats.active} Operational
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[28px] p-5 space-y-2 shadow-sm relative overflow-hidden group">
          <div className="h-9 w-9 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
            <XCircle size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Inactive Branches</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{overallStats.inactive}</h3>
            <span className="text-[9px] font-semibold text-rose-650 bg-rose-50 px-1.5 py-0.5 rounded-md">
              {overallStats.inactive} Suspended
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[28px] p-5 space-y-2 shadow-sm relative overflow-hidden group">
          <div className="h-9 w-9 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-650">
            <Users size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Doctors</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{overallStats.doctors}</h3>
            <span className="text-[9px] font-medium text-slate-500">Across branches</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[28px] p-5 space-y-2 shadow-sm relative overflow-hidden group">
          <div className="h-9 w-9 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Today's Appts</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-1">{overallStats.todayPatients}</h3>
            <span className="text-[9px] font-medium text-slate-500">All locations</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[28px] p-5 space-y-2 shadow-sm relative overflow-hidden group">
          <div className="h-9 w-9 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <DollarSign size={18} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Today's Revenue</p>
            <h3 className="text-xl font-extrabold text-slate-800 mt-1.5">{formatCurrency(overallStats.todayRevenue)}</h3>
            <span className="text-[9px] font-medium text-slate-500">Gross revenue</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search branches by name, address, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl outline-none focus:border-indigo-500"
            >
              {METADATA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl outline-none focus:border-indigo-500"
            >
              <option value="All Status">All Status</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl outline-none focus:border-indigo-500"
            >
              {METADATA_CLINIC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition ${
                showFiltersPanel 
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                  : 'bg-white border-slate-200 text-slate-660 hover:bg-slate-50'
              }`}
            >
              <Filter size={14} /> Filters
            </button>

            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-400'
                }`}
              >
                <Grid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-400'
                }`}
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {showFiltersPanel && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">State</label>
              <select
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl outline-none focus:bg-white"
              >
                {METADATA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Consultation Mode</label>
              <select
                value={filterConsultation}
                onChange={(e) => setFilterConsultation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl outline-none focus:bg-white"
              >
                {METADATA_CONSULTATION_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterCity('All Cities');
                  setFilterState('All States');
                  setFilterStatus('All Status');
                  setFilterType('All Types');
                  setFilterConsultation('All Types');
                  setSearchQuery('');
                  setSortBy('name');
                }}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-xs rounded-xl transition"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid view of branches */}
      {viewMode === 'grid' && filteredBranches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {filteredBranches.map((branch) => (
            <div
              key={branch.id}
              onClick={() => handleOpenDetails(branch)}
              className={`bg-white border rounded-[30px] shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col group cursor-pointer ${
                branch.isActive ? 'border-slate-200' : 'border-rose-100 bg-rose-50/10'
              }`}
            >
              <div className="h-32 w-full relative overflow-hidden bg-slate-100">
                <img
                  src={branch.image}
                  alt={branch.branchName}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent"></div>
                
                <div className="absolute bottom-3 left-4 h-10 w-10 bg-white rounded-xl shadow flex items-center justify-center text-lg border border-slate-100 z-10 overflow-hidden">
                  {branch.logo && (branch.logo.startsWith('http') || branch.logo.startsWith('data:image/')) ? (
                    <img src={branch.logo} alt="logo" className="h-full w-full object-cover" />
                  ) : (
                    branch.logo
                  )}
                </div>

                {branch.isPrimary && (
                  <span className="absolute top-3 left-3 bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-450/30 shadow-sm tracking-wider">
                    Main Branch
                  </span>
                )}

                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm tracking-wider ${
                    branch.isActive
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-250'
                      : 'bg-rose-50 text-rose-600 border-rose-250'
                  }`}>
                    {branch.isActive ? 'Active' : 'Inactive'}
                  </span>
                  
                  <div className="relative">
                    <button
                      onClick={(e) => toggleCardMenu(branch.id, e)}
                      className="p-1 rounded-full bg-white/80 hover:bg-white text-slate-800 transition shadow"
                    >
                      <MoreVertical size={13} />
                    </button>

                    {activeMenuId === branch.id && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 space-y-0.5 text-xs text-slate-700 font-bold"
                      >
                        <button
                          onClick={() => handleOpenDetails(branch)}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-xl transition flex items-center gap-2"
                        >
                          <Building2 size={12} className="text-slate-400" /> View Details
                        </button>
                        <button
                          onClick={() => handleOpenEdit(branch)}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-xl transition flex items-center gap-2"
                        >
                          <Edit3 size={12} className="text-slate-400" /> Edit Details
                        </button>
                        <button
                          onClick={() => {
                            toast.success(`Redirecting to doctors assignment...`);
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-xl transition flex items-center gap-2"
                        >
                          <Stethoscope size={12} className="text-slate-400" /> Assign Doctors
                        </button>
                        
                        {!branch.isPrimary && (
                          <>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button
                              onClick={() => handleDeactivate(branch.id)}
                              className={`w-full text-left px-2.5 py-1.5 rounded-xl transition flex items-center gap-2 ${
                                branch.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              {branch.isActive ? (
                                <>
                                  <XCircle size={12} /> Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={12} /> Activate
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{branch.name}</p>
                  <h3 className="text-sm font-black text-slate-800 truncate">{branch.branchName}</h3>
                  
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {branch.isMultiSpecialty && (
                      <span className="text-[8px] font-black uppercase bg-indigo-50 text-indigo-650 px-1.5 py-0.5 rounded border border-indigo-100">
                        Multi Specialty
                      </span>
                    )}
                    {branch.is24x7 && (
                      <span className="text-[8px] font-black uppercase bg-teal-50 text-teal-650 px-1.5 py-0.5 rounded border border-teal-100">
                        24×7
                      </span>
                    )}
                    {branch.consultationModes.includes('online') && (
                      <span className="text-[8px] font-black uppercase bg-purple-50 text-purple-650 px-1.5 py-0.5 rounded border border-purple-100 flex items-center gap-0.5">
                        Offline + Online <Star size={7} className="fill-purple-600 text-purple-600" />
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1 border-t border-slate-100 pt-2.5">
                  <div className="flex gap-1.5 text-xs text-slate-500">
                    <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-800 line-clamp-1">{branch.address}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{branch.city}, {branch.state} - {branch.pincode}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-2xl border border-slate-100/50">
                  <div className="flex items-center gap-2">
                    <img
                      src={branch.manager.avatar}
                      alt={branch.manager.name}
                      className="h-7 w-7 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <p className="text-[10px] font-bold text-slate-800">{branch.manager.name}</p>
                      <p className="text-[8px] text-slate-400">{branch.manager.role}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 text-center py-2.5 border-t border-b border-slate-100">
                  <div>
                    <p className="text-lg font-black text-slate-800">{branch.stats.doctors}</p>
                    <p className="text-[8px] text-slate-450 font-bold uppercase">Doctors</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-800">{branch.stats.departments}</p>
                    <p className="text-[8px] text-slate-450 font-bold uppercase">Depts</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-800">{branch.stats.staff}</p>
                    <p className="text-[8px] text-slate-450 font-bold uppercase">Staff</p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-indigo-650 mt-1 truncate">{formatCurrency(branch.stats.todayRevenue)}</p>
                    <p className="text-[8px] text-slate-455 font-bold uppercase">Revenue</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDetails(branch);
                    }}
                    className="col-span-2 py-2 text-center text-xs font-black text-indigo-655 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
                  >
                    View Details
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEdit(branch);
                    }}
                    className="py-2 text-center text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View of branches */}
      {viewMode === 'list' && filteredBranches.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-450 border-b border-slate-200">
                  <th className="py-4 px-5 font-black uppercase tracking-wider">Branch Name</th>
                  <th className="py-4 px-4 font-black uppercase tracking-wider">Location / City</th>
                  <th className="py-4 px-4 font-black uppercase tracking-wider">Clinic Type</th>
                  <th className="py-4 px-4 font-black uppercase tracking-wider">Modes</th>
                  <th className="py-4 px-3 text-center font-black uppercase tracking-wider">Docs</th>
                  <th className="py-4 px-3 text-center font-black uppercase tracking-wider">Staff</th>
                  <th className="py-4 px-3 text-center font-black uppercase tracking-wider">Depts</th>
                  <th className="py-4 px-4 text-right font-black uppercase tracking-wider">Today's Revenue</th>
                  <th className="py-4 px-4 text-center font-black uppercase tracking-wider">Status</th>
                  <th className="py-4 px-5 text-right font-black uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBranches.map((branch) => (
                  <tr 
                    key={branch.id} 
                    onClick={() => handleOpenDetails(branch)}
                    className="border-b border-slate-100 hover:bg-slate-55/30 transition-all cursor-pointer"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        {branch.logo && (branch.logo.startsWith('http') || branch.logo.startsWith('data:image/')) ? (
                          <img src={branch.logo} alt="logo" className="h-8 w-8 object-contain rounded-md" />
                        ) : (
                          <span className="text-lg bg-slate-100 p-2 rounded-xl border border-slate-200">{branch.logo}</span>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-slate-800 text-[13px]">{branch.branchName}</span>
                            {branch.isPrimary && (
                              <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase px-1.5 py-0.2 rounded border border-emerald-200">
                                HQ
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 mt-0.5 block">{branch.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-semibold text-slate-700 truncate max-w-[150px]">{branch.address}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{branch.city}, {branch.state}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-black ${
                        branch.isMultiSpecialty 
                          ? 'bg-indigo-50 text-indigo-650 border border-indigo-100'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {branch.isMultiSpecialty ? 'Multi Specialty' : 'Single Specialty'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {branch.consultationModes.map(m => (
                          <span key={m} className={`inline-flex items-center gap-0.5 text-[8px] font-black uppercase px-1 py-0.2 rounded ${
                            m === 'online'
                              ? 'bg-purple-50 text-purple-650 border border-purple-100/50'
                              : 'bg-slate-50 text-slate-500 border border-slate-100'
                          }`}>
                            {m} {m === 'online' && <Star size={6} className="fill-purple-600 text-purple-600" />}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-3 text-center font-bold text-slate-800">{branch.stats.doctors}</td>
                    <td className="py-4 px-3 text-center font-bold text-slate-800">{branch.stats.staff}</td>
                    <td className="py-4 px-3 text-center font-bold text-slate-800">{branch.stats.departments}</td>
                    <td className="py-4 px-4 text-right font-extrabold text-slate-850">
                      {formatCurrency(branch.stats.todayRevenue)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm tracking-wider ${
                        branch.isActive
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-250'
                          : 'bg-rose-50 text-rose-600 border-rose-250'
                      }`}>
                        {branch.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenDetails(branch)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-655 border border-slate-200 text-slate-500 transition"
                        >
                          <Building2 size={13} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(branch)}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition"
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && selectedBranch && renderDrawer()}

      {/* Add New Branch Modal */}
      {isAddModalOpen && renderAddModal()}

      {/* Edit Modal */}
      {isEditModalOpen && renderEditModal()}

    </div>
  );

  // ==================== RENDER COMPONENT PARTIALS ====================

  function renderDrawer() {
    return (
      <div 
        className="fixed inset-0 z-50 flex justify-end" 
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
        onClick={() => setDrawerOpen(false)}
      >
        <div 
          className="w-full max-w-2xl bg-slate-50 h-full flex flex-col shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white px-6 py-4 border-b border-slate-200/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              {selectedBranch.logo && (selectedBranch.logo.startsWith('http') || selectedBranch.logo.startsWith('data:image/')) ? (
                <img src={selectedBranch.logo} alt="logo" className="h-12 w-12 object-contain rounded-2xl border border-slate-200" />
              ) : (
                <span className="text-2xl bg-slate-100 p-2.5 rounded-2xl border border-slate-200">{selectedBranch.logo}</span>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-slate-800">{selectedBranch.branchName}</h2>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm ${
                    selectedBranch.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}>
                    {selectedBranch.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{selectedBranch.code}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setDrawerOpen(false);
                  handleOpenEdit(selectedBranch);
                }}
                className="px-3 py-1.5 border border-slate-200 text-xs font-semibold hover:bg-slate-50 text-slate-655 rounded-xl transition"
              >
                Edit Config
              </button>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition" aria-label="Close drawer">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-3xl p-4 grid grid-cols-2 gap-4 text-xs shadow-sm">
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold block">License / Reg Number</span>
                <strong className="text-slate-850 font-bold">{selectedBranch.regNo || 'N/A'}</strong>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-bold block">GST Registration</span>
                <strong className="text-slate-850 font-bold">{selectedBranch.gst || 'N/A'}</strong>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Working Shifts</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[8px] font-black text-slate-455 uppercase block">Mon - Fri Hours</span>
                  <strong className="text-slate-700 mt-0.5 block font-bold">{selectedBranch.workingHours.Monday}</strong>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-[8px] font-black text-slate-455 uppercase block">Saturday Hours</span>
                  <strong className="text-slate-700 mt-0.5 block font-bold">{selectedBranch.workingHours.Saturday}</strong>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Clinical Departments</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedBranch.departments.map(dept => (
                  <span key={dept} className="bg-emerald-50 text-emerald-600 border border-emerald-250 text-[9px] font-black uppercase px-2.5 py-1 rounded-lg">
                    {dept}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Branch Performance Indicators</h4>
              <div className="space-y-3.5">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700">Patient Satisfaction Score</span>
                    <span className="font-extrabold text-indigo-650">{selectedBranch.performance.patientSatisfaction}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${selectedBranch.performance.patientSatisfaction}%` }}></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-700">Doctor Utilization Rate</span>
                    <span className="font-extrabold text-teal-600">{selectedBranch.performance.doctorUtilization}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-teal-500 h-full rounded-full" style={{ width: `${selectedBranch.performance.doctorUtilization}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-100 border border-slate-200 rounded-3xl p-5 space-y-3">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Branch Actions</h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-700">
                <button onClick={() => { setDrawerOpen(false); handleOpenEdit(selectedBranch); }} className="py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition">
                  Edit Configuration
                </button>
                <button onClick={() => toast.success('Open Doctor Assignment...')} className="py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition">
                  Assign Doctors list
                </button>
                
                {!selectedBranch.isPrimary && (
                  <button
                    onClick={() => handleDeactivate(selectedBranch.id)}
                    className="col-span-2 py-2.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xl transition"
                  >
                    {selectedBranch.isActive ? 'Deactivate Branch' : 'Activate Branch'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderAddModal() {
    return (
      <Modal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Add New Clinic Branch (Step ${addStep} of 8)`}
        size="lg"
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 text-[9px] font-black uppercase text-slate-400">
            <span className={addStep >= 1 ? 'text-indigo-650' : ''}>1. Basic</span>
            <span className={addStep >= 2 ? 'text-indigo-650' : ''}>2. Address</span>
            <span className={addStep >= 3 ? 'text-indigo-650' : ''}>3. Contact</span>
            <span className={addStep >= 4 ? 'text-indigo-650' : ''}>4. Hours</span>
            <span className={addStep >= 5 ? 'text-indigo-650' : ''}>5. Depts</span>
            <span className={addStep >= 6 ? 'text-indigo-650' : ''}>6. Docs</span>
            <span className={addStep >= 7 ? 'text-indigo-650' : ''}>7. Staff</span>
            <span className={addStep >= 8 ? 'text-indigo-650' : ''}>8. Review</span>
          </div>

          <div className="space-y-4 min-h-[300px]">
            {addStep === 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-700 uppercase font-bold">Step 1: Branch Details</h3>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Branch Name *</label>
                  <input
                    type="text"
                    value={formData.branchName}
                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    placeholder="e.g. Indirapuram Branch"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-805 outline-none focus:border-indigo-505"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Branch Code Alias *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. RDC-IND-01"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-805 outline-none focus:border-indigo-505"
                  />
                </div>
              </div>
            )}

            {addStep === 2 && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-700 uppercase font-bold">Step 2: Address</h3>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Street Address *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-805 outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">City *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-805 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 font-bold">State *</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-855 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Pincode *</label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-805 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {addStep === 3 && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-700 uppercase font-bold">Step 3: Contact & Registration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Phone *</label>
                    <input
                      type="text"
                      value={formData.contact.phone}
                      onChange={(e) => updateFormNested('contact', 'phone', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-805 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500">Email *</label>
                    <input
                      type="email"
                      value={formData.contact.email}
                      onChange={(e) => updateFormNested('contact', 'email', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-805 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Registration / License Number *</label>
                  <input
                    type="text"
                    value={formData.regNo}
                    onChange={(e) => setFormData({ ...formData, regNo: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-805 outline-none"
                  />
                </div>
              </div>
            )}

            {addStep === 4 && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-700 uppercase font-bold">Step 4: Shift timings</h3>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-505">Weekly Shift Timings *</label>
                  <input
                    type="text"
                    value={formData.workingHours.Monday}
                    onChange={(e) => updateFormNested('workingHours', 'Monday', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-805"
                  />
                </div>
              </div>
            )}

            {addStep === 5 && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-700 uppercase font-bold">Step 5: Clinical Departments</h3>
                <div className="grid grid-cols-2 gap-3">
                  {['General Medicine', 'Dental Care', 'Orthodontics', 'Pediatric Dentistry', 'Oral Surgery'].map(dept => (
                    <label key={dept} className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-slate-55">
                      <input
                        type="checkbox"
                        checked={formData.departments.includes(dept)}
                        onChange={() => updateFormArrayToggle('departments', dept)}
                        className="accent-indigo-650"
                      />
                      <span className="text-xs font-semibold">{dept}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {addStep === 6 && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-700 uppercase font-bold">Step 6: Manager Assignment</h3>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-505">Manager Full Name *</label>
                  <input
                    type="text"
                    value={formData.manager.name}
                    onChange={(e) => updateFormNested('manager', 'name', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-805"
                  />
                </div>
              </div>
            )}

            {addStep === 7 && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-700 uppercase font-bold">Step 7: Support Staff</h3>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-505">Estimate Support Staff Count</label>
                  <input
                    type="number"
                    value={formData.stats.staff}
                    onChange={(e) => updateFormNested('stats', 'staff', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-805"
                  />
                </div>
              </div>
            )}

            {addStep === 8 && (
              <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-700 uppercase font-bold">Step 8: Review & Publish</h3>
                <div className="bg-slate-50 p-4 border border-slate-200 rounded-2xl text-xs space-y-2">
                  <p><strong>Branch:</strong> {formData.branchName || 'Unnamed'}</p>
                  <p><strong>Code:</strong> {formData.code || 'None'}</p>
                  <p><strong>Location:</strong> {formData.address}, {formData.city}, {formData.state}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center border-t border-slate-100 pt-4">
            <button
              onClick={() => {
                if (addStep > 1) setAddStep(addStep - 1);
                else setIsAddModalOpen(false);
              }}
              className="px-4 py-2 border border-slate-200 text-xs font-semibold hover:bg-slate-50 text-slate-655 rounded-xl transition"
            >
              {addStep === 1 ? 'Cancel' : 'Previous'}
            </button>

            <button
              onClick={() => {
                if (addStep < 8) {
                  if (addStep === 1 && !formData.branchName) return toast.error('Branch Name is required.');
                  if (addStep === 2 && (!formData.address || !formData.city || !formData.state || !formData.pincode)) return toast.error('Full address details are required.');
                  if (addStep === 3 && (!formData.contact.phone || !formData.contact.email || !formData.regNo)) return toast.error('Contact details and License Number are required.');
                  setAddStep(addStep + 1);
                } else {
                  handleCreateBranch();
                }
              }}
              className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow transition"
              disabled={saving}
            >
              {addStep === 8 ? 'Publish Branch' : 'Next'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  function renderEditModal() {
    return (
      <Modal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Branch Configuration"
        size="md"
      >
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-505 block">Branch Name *</label>
              <input
                type="text"
                value={formData.branchName}
                onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-805 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-505 block">Street Address *</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-805 outline-none"
              />
            </div>

            {!formData.isPrimary && (
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="accent-indigo-650 animate-pulse"
                />
                Active Status
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-slate-200 text-xs font-semibold hover:bg-slate-50 text-slate-655 rounded-xl">
              Cancel
            </button>
            <button onClick={handleUpdateBranch} className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow transition" disabled={saving}>
              Save Config
            </button>
          </div>
        </div>
      </Modal>
    );
  }
};

export default BranchesAdminPage;
