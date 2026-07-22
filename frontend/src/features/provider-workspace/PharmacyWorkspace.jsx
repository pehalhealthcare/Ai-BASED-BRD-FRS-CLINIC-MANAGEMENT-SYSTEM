import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import {
  TrendingUp, Pill, ShoppingBag, Users, AlertTriangle,
  Search, Scan, RefreshCw, Barcode, Plus, Minus, Trash2,
  CreditCard, CheckCircle2, ChevronRight, Ban, Eye, FileText,
  Printer, ArrowLeftRight, Activity, ArrowUpRight, DollarSign, Calendar,
  ChevronDown, Bell,RotateCcw  ,LogOut, MessageSquare, ShieldAlert, Package,
  Layers, Truck, FileBarChart, Settings, HelpCircle, Star, X, Clock, Check, ArrowRight, UserPlus, Menu, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { TfiAngleRight } from "react-icons/tfi";
import { TfiAngleLeft } from "react-icons/tfi";
import { pharmacyApi } from '../../api/pharmacyApi';
import { prescriptionApi } from '../../api/prescriptionApi';
import { authApi } from '../../api/authApi';
import { patientApi } from '../../api/patientApi';

import useAuth from '../../hooks/useAuth';

const PharmacyWorkspace = ({ user }) => {
  const [profileData, setProfileData] = useState(null);
  const { logout } = useAuth();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await authApi.me();
        if (res && res.user) {
          setProfileData(res.user);
        }
      } catch (err) {
        console.error('Failed to load profile details:', err);
      }
    };
    loadProfile();
  }, []);
  // --- SYNC TAB WITH ROUTER SEARCH PARAMS ---
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';

  const setActiveTab = (newTab) => {
    setSearchParams({ tab: newTab });
  };

  // --- SIDEBAR TOGGLE STATE ---
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // --- RIGHT SIDEBAR TOGGLE STATE ---
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  // --- SELF-CONTAINED FULL SCREEN LAYOUT EFFECT ---
  useLayoutEffect(() => {
    const sidebar = document.querySelector('aside');
    const header = document.querySelector('header');
    const main = document.querySelector('main');

    if (sidebar) sidebar.style.display = 'none';
    if (header) header.style.display = 'none';
    if (main) {
      main.style.padding = '0';
      main.style.margin = '0';
      main.style.maxWidth = '100%';
    }

    return () => {
      if (sidebar) sidebar.style.display = '';
      if (header) header.style.display = '';
      if (main) {
        main.style.padding = '';
        main.style.margin = '';
        main.style.maxWidth = '';
      }
    };
  }, []);

  const [globalCatalog, setGlobalCatalog] = useState([]);

  // Inventory is loaded from API on mount — do NOT seed with mock data
  const [inventory, setInventory] = useState([]);

  // Prescriptions are loaded from database — do NOT seed with mock data
  const [prescriptions, setPrescriptions] = useState([]);

  // Sales history is loaded from API on mount — do NOT seed with mock data
  const [sales, setSales] = useState([]);

  const [suppliers] = useState([
    { id: 's1', name: 'Zydus Corp', contact: 'Zydus Contact', phone: '9988776655', email: 'sales@zydus.com' },
    { id: 's2', name: 'Cipla Wholesalers', contact: 'Cipla Sales Manager', phone: '9988776644', email: 'sales@cipla.com' }
  ]);

  const [activities, setActivities] = useState([
    { id: 1, type: 'Prescription Completed', desc: 'Order #INV-1024 completed for Rohan Sharma', time: '10 mins ago', icon: 'check' },
    { id: 2, type: 'Stock Inward', desc: 'Stock Inward #GRN-125 (Paracetamol 650mg) logged', time: '25 mins ago', icon: 'stock' },
    { id: 3, type: 'New Prescription', desc: 'New prescription order #RX-589 received for Neha Verma', time: '35 mins ago', icon: 'rx' },
    { id: 4, type: 'Medicine Added', desc: 'Medicine Dolo 650mg added to local inventory', time: '1 hour ago', icon: 'plus' },
    { id: 5, type: 'Medicine Returned', desc: 'Batch B-PR2025 returned to Zydus Corp', time: '3 hours ago', icon: 'return' }
  ]);

  // --- STATE FOR INTERACTIVE FLOWS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [rxSearchTerm, setRxSearchTerm] = useState('');
  const [walkinSearchTerm, setWalkinSearchTerm] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Custom sidebar collapsible navigation sections
  const [inventoryCollapsed, setInventoryCollapsed] = useState(false);
  const [reportsCollapsed, setReportsCollapsed] = useState(false);

  // Active filter state from Donut Chart selection
  const [selectedQueueFilter, setSelectedQueueFilter] = useState('ALL');

  // Checkout states
  const [cart, setCart] = useState([]);
  const [selectedRx, setSelectedRx] = useState(null);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [showNewMedicineModal, setShowNewMedicineModal] = useState(false);
  const [newBatch, setNewBatch] = useState({
    batchNo: '', expiry: '', mfg: '', supplier: 'Zydus Corp', gst: 12, mrp: 40, ptr: 28, purchasePrice: 25, quantity: 50, minStock: 20, reorderLevel: 50, rack: 'Rack A-3', condition: 'Cool & Dry'
  });
  const [walkinCustomer, setWalkinCustomer] = useState({ name: '', phone: '' });
  const [walkinSearchResults, setWalkinSearchResults] = useState([]);
  const [isSearchingWalkin, setIsSearchingWalkin] = useState(false);
  const [newMedicine, setNewMedicine] = useState({ name: '', brand: '', salt: '', strength: '', form: 'Tablet', stripSize: 10, mrp: 50, barcode: '', sku: '' });
  // Suppliers Registry Management States
  const [suppliersList, setSuppliersList] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [selectedSupplierFilter, setSelectedSupplierFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'PREFERRED' | 'BLOCKED' | 'RECENT'
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [addSupplierStep, setAddSupplierStep] = useState(1);
  const [showSupplierAdvancedFilters, setShowSupplierAdvancedFilters] = useState(false);
  
  // Advanced filters state
  const [supplierAdvFilters, setSupplierAdvFilters] = useState({
    city: '', state: '', company: '', minOutstanding: '', status: '', preferred: ''
  });

  const [newSupplierData, setNewSupplierData] = useState({
    name: '',
    companyName: '',
    supplierCode: '',
    supplierType: 'Distributor', // 'Manufacturer' | 'Distributor' | 'Wholesaler'
    gstin: '',
    pan: '',
    drugLicense: '',
    website: '',
    contactPerson: '',
    designation: '',
    phone: '',
    alternatePhone: '',
    email: '',
    address: '',
    landmark: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    paymentTerms: 'Net 30', // 'Net 15' | 'Net 30' | 'Net 45' | 'COD'
    creditLimit: 50000,
    creditDays: 30,
    isPreferred: false,
    defaultGst: 12,
    leadTimeDays: 3,
    status: 'Active'
  });

  const [scanning, setScanning] = useState(false);
  
  // Expiry & Batch Management State Variables
  const [selectedBatchFilter, setSelectedBatchFilter] = useState('ALL');
  const [batchSearchQuery, setBatchSearchQuery] = useState('');
  const [selectedBatchDetail, setSelectedBatchDetail] = useState(null);
  const [showBatchAdvancedFilters, setShowBatchAdvancedFilters] = useState(false);
  const [batchAdvFilters, setBatchAdvFilters] = useState({
    expiryRange: '', // 'today' | '7days' | '30days' | '60days' | 'expired'
    status: '',
    supplier: '',
    rack: '',
    category: ''
  });
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [quarantineReason, setQuarantineReason] = useState('Manual Hold');
  const [showQuarantineModal, setShowQuarantineModal] = useState(false);
  const [batchToQuarantine, setBatchToQuarantine] = useState(null);
  
  // Simulated recall notices
  const [recallNotices, setRecallNotices] = useState([
    { id: 'REC-991', medicineName: 'Metrogyl 400 Tablet', batchNo: 'B-19580', manufacturer: 'Unique Pharma', recallDate: '2026-07-15', reason: 'Sub-standard dissolution profile identified during routine quality check.', riskLevel: 'Class II (Moderate Risk)', status: 'Pending Quarantine' },
    { id: 'REC-992', medicineName: 'Augmentin 625 Tablet', batchNo: 'B-20310', manufacturer: 'GlaxoSmithKline', recallDate: '2026-07-18', reason: 'Packaging sealing defect reported in batch series.', riskLevel: 'Class III (Low Risk)', status: 'Quarantined' }
  ]);

  // Stock Transfer Module State Variables
  const [transfersList, setTransfersList] = useState([
    { id: 'TRF-00048', transferNumber: 'TRF-00048', type: 'Branch Transfer', fromLocation: 'Ram\'s Dental Clinic (Indirapuram)', toLocation: 'Ram\'s Dental Clinic (Vaishali)', createdBy: 'Pharmacy Staff', createdDate: '2026-07-17', medicineCount: 4, batchCount: 4, transferValue: 18450, status: 'Completed', expectedArrival: '2026-07-20', priority: 'High', reason: 'Routine Replenishment', medicines: [
      { medicineName: 'Crocin Advance 650', brand: 'Crocin', batchNumber: 'B-19876', qty: 50, unit: 'Strips', sellingPrice: 100, purchasePrice: 70 },
      { medicineName: 'Augmentin 625', brand: 'Augmentin', batchNumber: 'B-20310', qty: 20, unit: 'Strips', sellingPrice: 150, purchasePrice: 110 }
    ]},
    { id: 'TRF-00047', transferNumber: 'TRF-00047', type: 'Pharmacy -> Warehouse', fromLocation: 'Ram\'s Dental Clinic (Vaishali)', toLocation: 'Central Warehouse (Noida)', createdBy: 'Pharmacy Staff', createdDate: '2026-07-15', medicineCount: 2, batchCount: 2, transferValue: 4320, status: 'In Transit', expectedArrival: '2026-07-22', priority: 'Medium', reason: 'Stock Balancing', medicines: [
      { medicineName: 'Azithral 500 Tablet', brand: 'Azithral', batchNumber: 'B-19840', qty: 30, unit: 'Strips', sellingPrice: 120, purchasePrice: 90 }
    ]},
    { id: 'TRF-00046', transferNumber: 'TRF-00046', type: 'Branch Transfer', fromLocation: 'Ram\'s Dental Clinic (Vaishali)', toLocation: 'Ram\'s Dental Clinic (Indirapuram)', createdBy: 'Admin Operator', createdDate: '2026-07-12', medicineCount: 5, batchCount: 5, transferValue: 9800, status: 'Completed', expectedArrival: '2026-07-14', priority: 'High', reason: 'Low Stock', medicines: [] },
    { id: 'TRF-00045', transferNumber: 'TRF-00045', type: 'Emergency Stock Transfer', fromLocation: 'Ram\'s Dental Clinic (Indirapuram)', toLocation: 'Ram\'s Dental Clinic (Vaishali)', createdBy: 'Pharmacy Staff', createdDate: '2026-07-10', medicineCount: 1, batchCount: 1, transferValue: 1200, status: 'Cancelled', expectedArrival: '2026-07-11', priority: 'Critical', reason: 'Emergency', medicines: [] }
  ]);
  const [selectedTransferDetail, setSelectedTransferDetail] = useState(null);
  const [showNewTransferWizard, setShowNewTransferWizard] = useState(false);
  const [newTransferStep, setNewTransferStep] = useState(1); // 1: Details, 2: Select Medicines, 3: Review
  const [newTransferData, setNewTransferData] = useState({
    transferType: 'Branch Transfer',
    fromLocation: 'Ram\'s Dental Clinic (Indirapuram)',
    toLocation: 'Ram\'s Dental Clinic (Vaishali)',
    transferDate: '2026-07-19',
    expectedDelivery: '2026-07-22',
    referenceNo: '',
    reason: 'Routine Replenishment',
    priority: 'Medium',
    remarks: '',
    medicines: []
  });
  const [transferSearchQuery, setTransferSearchQuery] = useState('');
  const [showAddMedicineToTransferModal, setShowAddMedicineToTransferModal] = useState(false);
  const [transferMedSearchQuery, setTransferMedSearchQuery] = useState('');
  const [selectedMedForTransfer, setSelectedMedForTransfer] = useState(null);
  const [selectedBatchForTransfer, setSelectedBatchForTransfer] = useState(null);
  const [transferQty, setTransferQty] = useState(1);
  const [transferUnit, setTransferUnit] = useState('Strips');

  // Returns Management Module State Variables
  const [returnsList, setReturnsList] = useState([
    { id: 'RET-00056', returnNumber: 'RET-00056', type: 'Return to Supplier', supplierOrCustomer: 'Zydus Healthcare Ltd. (SUP-0001)', reference: 'INV-2548', returnDate: '2026-07-19', medicineCount: 6, batchCount: 6, amount: 8450, status: 'Completed', createdBy: 'Pharmacy Staff', medicines: [
      { medicineName: 'Crocin Advance 650', brand: 'Crocin', batchNumber: 'B-19876', qty: 50, unit: 'Strips', sellingPrice: 100, purchasePrice: 70, reason: 'Wrong Supply' }
    ]},
    { id: 'RET-00055', returnNumber: 'RET-00055', type: 'Customer Return', supplierOrCustomer: 'Rahul Sharma (CUST-00125)', reference: 'BILL-78952', returnDate: '2026-07-18', medicineCount: 2, batchCount: 2, amount: 1280, status: 'Completed', createdBy: 'Pharmacy Staff', medicines: [
      { medicineName: 'Augmentin 625', brand: 'Augmentin', batchNumber: 'B-20310', qty: 2, unit: 'Strips', sellingPrice: 150, purchasePrice: 110, reason: 'Wrong Medicine' }
    ]},
    { id: 'RET-00054', returnNumber: 'RET-00054', type: 'Return to Supplier', supplierOrCustomer: 'Sun Pharmaceutical Ind. (SUP-0002)', reference: 'INV-2535', returnDate: '2026-07-16', medicineCount: 4, batchCount: 4, amount: 6750, status: 'Pending Approval', createdBy: 'Pharmacy Staff', medicines: [] },
    { id: 'RET-00053', returnNumber: 'RET-00053', type: 'Customer Return', supplierOrCustomer: 'Priya Gupta (CUST-00122)', reference: 'BILL-78914', returnDate: '2026-07-15', medicineCount: 3, batchCount: 3, amount: 950, status: 'Approved', createdBy: 'Pharmacy Staff', medicines: [] },
    { id: 'RET-00052', returnNumber: 'RET-00052', type: 'Return to Supplier', supplierOrCustomer: 'Cipla Ltd. (SUP-0003)', reference: 'INV-2522', returnDate: '2026-07-14', medicineCount: 5, batchCount: 5, amount: 7320, status: 'Completed', createdBy: 'Admin Operator', medicines: [] },
    { id: 'RET-00050', returnNumber: 'RET-00050', type: 'Return to Supplier', supplierOrCustomer: 'Alkem Laboratories Ltd. (SUP-0004)', reference: 'INV-2508', returnDate: '2026-07-12', medicineCount: 7, batchCount: 7, amount: 9860, status: 'Rejected', createdBy: 'Pharmacy Staff', medicines: [] }
  ]);
  const [selectedReturnDetail, setSelectedReturnDetail] = useState(null);
  const [showNewReturnWizard, setShowNewReturnWizard] = useState(false);
  const [newReturnStep, setNewReturnStep] = useState(1); // 1: Select Type, 2: Select Source, 3: Select Medicines, 4: Financial, 5: Review
  const [newReturnData, setNewReturnData] = useState({
    returnType: 'Return to Supplier',
    source: 'Supplier',
    supplierId: 'Zydus Healthcare Ltd.',
    invoiceNo: '',
    customerPhone: '',
    customerName: '',
    compensationType: 'Refund',
    reason: 'Wrong Supply',
    remarks: '',
    medicines: []
  });
  const [returnSearchQuery, setReturnSearchQuery] = useState('');
  const [selectedReturnTabFilter, setSelectedReturnTabFilter] = useState('ALL'); // 'ALL' | 'SUPPLIER' | 'CUSTOMER' | 'PENDING' | 'COMPLETED' | 'REJECTED'
  const [showAddMedicineToReturnModal, setShowAddMedicineToReturnModal] = useState(false);
  const [selectedMedForReturn, setSelectedMedForReturn] = useState(null);
  const [selectedBatchForReturn, setSelectedBatchForReturn] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnUnit, setReturnUnit] = useState('Strips');
  const [returnMedReason, setReturnMedReason] = useState('Wrong Supply');

  // Onboarding Wizard States
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingGlobalItem, setOnboardingGlobalItem] = useState(null);
  const [onboardingMasterDetails, setOnboardingMasterDetails] = useState({
    brand: '', name: '', salt: '', strength: '', form: '', manufacturer: '', stripSize: 10, stripPrice: 100
  });
  const [onboardingLocalDetails, setOnboardingLocalDetails] = useState({
    displayName: '', brandName: '', supplier: 'Zydus Corp', supplierSku: '', internalCode: '', rack: 'Rack A-3', shelf: 'Shelf B-1', bin: 'Drawer C-2', minStock: 20, reorderLevel: 50, sellingEnabled: true, purchaseEnabled: true
  });
  const [onboardingBatchDetails, setOnboardingBatchDetails] = useState({
    batchNo: '', mfgDate: '', expiryDate: '', purchaseInvoice: '', purchaseRate: 28, mrpPrice: 40, gstRate: 12, discountRate: 0, qtyPurchasedStrips: 50, remarks: ''
  });

  // Auto-reset onboarding form inputs on open/close
  useEffect(() => {
    setOnboardingLocalDetails({
      displayName: '', brandName: '', supplier: 'Zydus Corp', supplierSku: '', internalCode: '', rack: 'Rack A-3', shelf: 'Shelf B-1', bin: 'Drawer C-2', minStock: 20, reorderLevel: 50, sellingEnabled: true, purchaseEnabled: true
    });
    setOnboardingBatchDetails({
      batchNo: '', mfgDate: '', expiryDate: '', purchaseInvoice: '', purchaseRate: 28, mrpPrice: 40, gstRate: 12, discountRate: 0, qtyPurchasedStrips: 50, remarks: ''
    });
  }, [showOnboardingWizard]);

  // ── INVENTORY MODULE STATE ──────────────────────────────────────────────────
  const [inventorySubTab, setInventorySubTab] = useState('stock-list'); // 'stock-list' | 'stock-inward'
  const [stockInwardSearch, setStockInwardSearch] = useState('');
  const [showAddMoreStockModal, setShowAddMoreStockModal] = useState(false);
  const [showInwardBatchModal, setShowInwardBatchModal] = useState(false);
  const [showInventoryDetailDrawer, setShowInventoryDetailDrawer] = useState(false);
  const [selectedInventoryMedicine, setSelectedInventoryMedicine] = useState(null);
  const [showInwardMedicineSearch, setShowInwardMedicineSearch] = useState(false);
  const [inwardMedicineQuery, setInwardMedicineQuery] = useState('');
  const [addMoreStockSaving, setAddMoreStockSaving] = useState(false);
  const [newStockBatch, setNewStockBatch] = useState({
    batchNumber: '', mfgDate: '', expiryDate: '', invoiceNumber: '', supplier: '',
    purchasePrice: '', sellingPrice: '', gst: '12', discount: '0',
    quantityStrips: '', stripSize: '10', rack: '', shelf: ''
  });

  const isFieldEditable = (fieldName) => {
    if (!onboardingGlobalItem) return false;
    const isBrandFirst = onboardingGlobalItem.medicineType === 'Brand-First';
    if (isBrandFirst) {
      return ['strength', 'form', 'stripSize', 'stripPrice'].includes(fieldName);
    } else {
      const masterVal = onboardingGlobalItem[fieldName];
      return !masterVal || String(masterVal).trim() === '' || masterVal === 'N/A';
    }
  };

  // Floating Patient Search Widget
  const [showFloatingSearch, setShowFloatingSearch] = useState(false);
  const [floatingSearchText, setFloatingSearchText] = useState('');

  // ── ADD MEDICINE TO ORDER MODAL STATE ──────────────────────────────────────
  const [showAddMedToOrderModal, setShowAddMedToOrderModal] = useState(false);
  const [addMedSearchQuery, setAddMedSearchQuery] = useState('');
  const [addMedResults, setAddMedResults] = useState([]);
  const [isSearchingAddMed, setIsSearchingAddMed] = useState(false);
  const [addMedInitialLoad, setAddMedInitialLoad] = useState(false);

  // Interactive Chart Toggles
  const [salesTimeframe, setSalesTimeframe] = useState('Monthly');
  const [notes, setNotes] = useState('');
  const [patientConsoleSearch, setPatientConsoleSearch] = useState('');
  const [selectedConsolePatient, setSelectedConsolePatient] = useState(null);
  const [activeConsoleRx, setActiveConsoleRx] = useState(null);
  const [selectedDetailCatalogItem, setSelectedDetailCatalogItem] = useState(null);
  const [showRequestNewMedicineModal, setShowRequestNewMedicineModal] = useState(false);

  // --- SALES MANAGEMENT MODULE STATE ---
  const [salesSubTab, setSalesSubTab] = useState('all');
  const [salesSearchQuery, setSalesSearchQuery] = useState('');
  const [selectedSaleDetail, setSelectedSaleDetail] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundForm, setRefundForm] = useState({ type: 'Full Refund', reason: 'Patient Request', amount: 0, remarks: '', items: [] });
  const [salesSort, setSalesSort] = useState('newest');
  const [showSalesFilters, setShowSalesFilters] = useState(false);
  const [salesFilters, setSalesFilters] = useState({ paymentMode: 'ALL', status: 'ALL', startDate: '', endDate: '' });

  // --- NOTIFICATION CENTER STATE ---
  const [notifications, setNotifications] = useState([
    { id: 'n1', title: 'Stock below reorder level', message: 'Dolo 650 Tablet stock is low (15 strips left)', module: 'Inventory', type: 'Low Stock Alert', priority: 'High', status: 'Unread', createdTime: new Date(Date.now() - 5 * 60000).toISOString() },
    { id: 'n2', title: 'New Prescription Order', message: 'Prescription order #RX-000785 received', module: 'Prescription', type: 'New Prescription', priority: 'Medium', status: 'Unread', createdTime: new Date(Date.now() - 15 * 60000).toISOString() },
    { id: 'n3', title: 'Payment received', message: '₹1,250 received from Amit Verma', module: 'Sales', type: 'Payment Received', priority: 'Low', status: 'Unread', createdTime: new Date(Date.now() - 45 * 60000).toISOString() }
  ]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState({
    desktop: true, email: true, sms: false, whatsapp: true, push: true, sound: true, retention: 30
  });
  const [notificationSearch, setNotificationSearch] = useState('');
  const [notificationTab, setNotificationTab] = useState('all');
  const [selectedNotifications, setSelectedNotifications] = useState([]);

  // --- SETTINGS MODULE TOP-LEVEL STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubPage, setActiveSubPage] = useState(null); // e.g. 'medicine', 'batch', 'rack', 'purchase'
  const [isDirty, setIsDirty] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [medSettings, setMedSettings] = useState({
    allowSubstitution: true,
    dispensingUnit: 'Strips',
    barcodeRequired: false,
    autoInternalCode: true,
    brandMapping: true,
    imageRequired: false,
    defaultTax: 12,
    storageCondition: 'Cool & Dry',
    searchPriority: 'Brand First'
  });
  const [batchSettings, setBatchSettings] = useState({
    rule: 'FIFO',
    warningDays: 90,
    nearExpiryThreshold: 180,
    autoBatchNo: true,
    batchPrefix: 'BAT-',
    allowExpiredSale: false,
    quarantineExpired: true,
    autoLockExpired: true,
    disposeApproval: true
  });
  const [rackSettings, setRackSettings] = useState({
    rackPrefix: 'RACK-',
    shelfPrefix: 'SHELF-',
    binPrefix: 'BIN-',
    rackValidation: true,
    barcodeLabel: true
  });
  const [purchaseSettings, setPurchaseSettings] = useState({
    defaultSupplier: 'Zydus Corp',
    gstCalc: 'Inclusive',
    invoicePrefix: 'PUR-',
    creditDays: 30,
    approvalRequired: true,
    allowManualPrice: true,
    ratingEnabled: true
  });


  // --- KPI COMPUTATION ---
  const kpis = useMemo(() => {
    const todaySalesAmount = sales.reduce((acc, curr) => acc + curr.amount, 0);
    const lowStockCount = inventory.filter(item => item.totalStock <= item.reorderLevel && item.totalStock > 0).length;
    const outOfStockCount = inventory.filter(item => item.totalStock === 0).length;

    let expiredCount = 0;
    let nearExpiryCount = 0;
    const today = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(today.getDate() + 30);

    inventory.forEach(item => {
      item.batches.forEach(b => {
        const expDate = new Date(b.expiry);
        if (expDate <= today) expiredCount++;
        else if (expDate <= thirtyDaysLater) nearExpiryCount++;
      });
    });

    const pendingTokens = sales.filter(s => ['Waiting', 'Preparing', 'Ready'].includes(s.handoverStatus)).length;
    const completedTokens = sales.filter(s => ['Completed', 'Handed Over'].includes(s.handoverStatus) || s.status === 'Completed').length;

    return {
      todaySalesAmount,
      todayOrdersCount: sales.length,
      pendingTokens,
      completedTokens,
      lowStockCount,
      outOfStockCount,
      expiredCount,
      nearExpiryCount,
      totalInventoryVal: inventory.reduce((acc, curr) => {
        return acc + curr.batches.reduce((bAcc, b) => bAcc + (b.quantity * (b.purchasePrice / (curr.stripSize || 10))), 0);
      }, 0).toFixed(2)
    };
  }, [sales, inventory]);

  const salesStats = useMemo(() => {
    const rxCount = sales.filter(s => s.type === 'Prescription').length;
    const walkinCount = sales.filter(s => s.type === 'Walk-in').length;
    const pendingCount = sales.filter(s => ['Waiting', 'Preparing', 'Ready', 'Pending'].includes(s.handoverStatus) || s.status === 'Pending').length;
    const totalCount = sales.length || 1;

    const rxPct = rxCount / totalCount;
    const walkinPct = walkinCount / totalCount;
    const pendingPct = pendingCount / totalCount;

    const rxLength = rxPct * 377;
    const walkinLength = walkinPct * 377;
    const pendingLength = pendingPct * 377;

    const rxOffset = 0;
    const walkinOffset = -rxLength;
    const pendingOffset = -(rxLength + walkinLength);

    const grossRevenue = sales.reduce((acc, curr) => acc + curr.amount, 0);
    const netProfit = grossRevenue * 0.30;
    const avgBasket = sales.length ? (grossRevenue / sales.length) : 0;

    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toLocaleDateString('en-CA'));
    }

    const dailyAmounts = dates.map(dateStr => {
      const daySales = sales.filter(s => s.date === dateStr);
      const total = daySales.reduce((acc, curr) => acc + curr.amount, 0);
      return {
        dateStr,
        label: new Date(dateStr).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        amount: total,
        count: daySales.length
      };
    });

    const maxAmount = Math.max(...dailyAmounts.map(d => d.amount), 100);
    const coordinates = dailyAmounts.map((d, index) => {
      const x = (index / 6) * 600;
      const y = 100 - (d.amount / maxAmount) * 80;
      return { x, y, amount: d.amount, label: d.label, count: d.count };
    });

    let pathD = '';
    if (coordinates.length > 0) {
      pathD = `M ${coordinates[0].x} ${coordinates[0].y}`;
      for (let i = 1; i < coordinates.length; i++) {
        pathD += ` L ${coordinates[i].x} ${coordinates[i].y}`;
      }
    }

    const fillD = pathD ? `${pathD} L 600 120 L 0 120 Z` : '';

    return {
      rxCount,
      walkinCount,
      pendingCount,
      totalCount: sales.length,
      rxPct: (rxPct * 100).toFixed(1),
      walkinPct: (walkinPct * 100).toFixed(1),
      pendingPct: (pendingPct * 100).toFixed(1),
      rxLength,
      walkinLength,
      pendingLength,
      rxOffset,
      walkinOffset,
      pendingOffset,
      grossRevenue,
      netProfit,
      avgBasket,
      dailyAmounts,
      coordinates,
      pathD,
      fillD
    };
  }, [sales]);

  // --- DISPENSING QUANTITY SUGGESTION HELPER ---
  const calculateRequiredStrips = (dosageStr, durationStr, stripSize = 10) => {
    let dailyQty = 1;
    if (dosageStr.toLowerCase().includes('twice daily') || dosageStr.toLowerCase().includes('bid') || dosageStr.toLowerCase().includes('2 times')) {
      dailyQty = 2;
    } else if (dosageStr.toLowerCase().includes('thrice daily') || dosageStr.toLowerCase().includes('tid') || dosageStr.toLowerCase().includes('3 times')) {
      dailyQty = 3;
    }

    const durationDays = parseInt(durationStr) || 5;
    const totalRequired = dailyQty * durationDays;

    const stripsSuggested = Math.floor(totalRequired / stripSize);
    const tabsRemainder = totalRequired % stripSize;

    return { totalRequired, stripsSuggested, tabsRemainder };
  };

  // --- ACTIONS ---
  const handleBarcodeScan = () => {
    setScanning(true);
    toast.loading('Initializing scan framework...', { id: 'scan' });
    setTimeout(() => {
      const matched = globalCatalog.find(m => m.barcode === '8901234567890');
      if (matched) {
        toast.success(`Scanned: ${matched.brand} (${matched.name})`, { id: 'scan' });
        handleAddToCart(matched);
      } else {
        toast.error('Scanned barcode not registered in Global Catalogue.', { id: 'scan' });
      }
      setScanning(false);
    }, 1200);
  };

  const handleAddToCart = (invItem, isTablet = false, customQty = 1) => {
    if (!invItem) return;
    
    // Find active non-expired batches using FIFO
    const today = new Date();
    const activeBatches = (invItem.batches || [])
      .filter(b => {
        if (b.status === 'Quarantined' || b.status === 'Recalled') return false;
        const qty = b.availableStock ?? b.quantity ?? 0;
        if (qty <= 0) return false;
        if (!b.expiryDate) return true;
        return new Date(b.expiryDate) >= today;
      })
      .sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));

    const activeBatch = activeBatches[0];
    if (!activeBatch) {
      toast.error(`No active non-expired batch found with stock for ${invItem.brandName || invItem.brand || invItem.name}.`);
      return;
    }

    const brand = invItem.brandName || invItem.brand || invItem.name;
    const name = invItem.genericName || invItem.name;
    const stripSize = invItem.stripSize || invItem.globalMedicineId?.stripSize || 10;
    const mrp = activeBatch.sellingPrice || invItem.sellingPrice || 40;
    const unitPrice = mrp / stripSize;
    const invItemId = invItem._id || invItem.id;
    const batchId = activeBatch._id || activeBatch.id || 'b1';
    const batchNo = activeBatch.batchNumber || activeBatch.batchNo || 'No Batch';
    const expiry = activeBatch.expiryDate || activeBatch.expiry || 'N/A';

    const existingCartItem = cart.find(c => c.itemId === invItemId && c.batchId === batchId);

    // If there is an active selected Rx, make sure the medicine exists in it as well
    if (selectedRx) {
      const alreadyPrescribed = selectedRx.medicines.some(m => 
        (m.brand || '').toLowerCase() === brand.toLowerCase() || (m.name || '').toLowerCase() === name.toLowerCase()
      );
      if (!alreadyPrescribed) {
        setSelectedRx(prev => ({
          ...prev,
          medicines: [
            ...prev.medicines,
            {
              brand,
              name,
              dosage: 'As directed by pharmacist',
              duration: '5 days',
              quantityRequired: isTablet ? customQty : customQty * stripSize
            }
          ]
        }));
      }
    }

    if (existingCartItem) {
      setCart(cart.map(c => {
        if (c.itemId === invItemId && c.batchId === batchId) {
          const nextStrips = isTablet ? c.strips : c.strips + customQty;
          const nextTablets = isTablet ? c.tablets + customQty : c.tablets;
          const totalRequestedQty = (nextStrips * stripSize) + nextTablets;
          const availableBatchStock = activeBatch.availableStock ?? activeBatch.quantity ?? 0;

          if (totalRequestedQty > availableBatchStock) {
            toast.error(`Cannot add more. Available batch stock: ${availableBatchStock} units.`);
            return c;
          }
          return { ...c, strips: nextStrips, tablets: nextTablets };
        }
        return c;
      }));
    } else {
      const totalRequestedQty = isTablet ? customQty : customQty * stripSize;
      const availableBatchStock = activeBatch.availableStock ?? activeBatch.quantity ?? 0;
      if (totalRequestedQty > availableBatchStock) {
        toast.error(`Cannot add. Available batch stock: ${availableBatchStock} units.`);
        return;
      }
      setCart([...cart, {
        id: Math.random().toString(),
        itemId: invItemId,
        brand,
        name,
        strips: isTablet ? 0 : customQty,
        tablets: isTablet ? customQty : 0,
        mrp,
        unitPrice,
        stripSize,
        batchId,
        batchNo,
        expiry
      }]);
    }
    toast.success(`${brand} added to checkout cart.`);
  };

  const handleUpdateCartQty = (id, field, inc) => {
    setCart(cart.map(c => {
      if (c.id === id) {
        const nextVal = Math.max(0, c[field] + inc);
        return { ...c, [field]: nextVal };
      }
      return c;
    }).filter(c => c.strips > 0 || c.tablets > 0));
  };

  const handleCreateNewBatch = async (e) => {
    e.preventDefault();
    if (!selectedCatalogItem) return;

    const matchedInv = inventory.find(i => i.catalogId === selectedCatalogItem.id || i.globalMedicineId === selectedCatalogItem.id || i._id === selectedCatalogItem._id || i.id === selectedCatalogItem.id);
    if (!matchedInv) {
      toast.error('Local medicine inventory record not found.');
      return;
    }

    try {
      const payload = {
        batchNumber: newBatch.batchNo,
        quantity: parseInt(newBatch.quantity) || 0,
        expiryDate: newBatch.expiry,
        purchasePrice: parseFloat(newBatch.purchasePrice || newBatch.ptr || 0),
        sellingPrice: parseFloat(newBatch.mrp || 0),
        supplier: newBatch.supplier,
        invoiceNumber: newBatch.invoiceNumber || ''
      };

      await pharmacyApi.addBatch(matchedInv._id || matchedInv.id, payload);
      toast.success(`Batch "${payload.batchNumber}" added successfully.`);
      
      // Reload local inventory list
      const updatedInvData = await pharmacyApi.listMedicines();
      const updatedItems = updatedInvData?.medicines || updatedInvData?.data?.medicines || (Array.isArray(updatedInvData) ? updatedInvData : []);
      setInventory(updatedItems);
      setShowAddBatchModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add stock batch.');
    }
  };

  const handleCreateNewMedicine = (e) => {
    e.preventDefault();
    const newItem = {
      id: Math.random().toString(),
      ...newMedicine,
      unitPrice: parseFloat(newMedicine.mrp) / parseInt(newMedicine.stripSize)
    };
    setGlobalCatalog([...globalCatalog, newItem]);

    setActivities([
      {
        id: Date.now(),
        type: 'Medicine Added',
        desc: `New medicine ${newMedicine.brand} proposed for catalog approval`,
        time: 'Just now',
        icon: 'plus'
      },
      ...activities
    ]);

    toast.success(`"${newMedicine.brand}" submitted to Global Catalog. Pending admin approval.`);
    setShowNewMedicineModal(false);
  };

  const handleCheckout = (paymentMode = 'UPI') => {
    if (cart.length === 0) {
      toast.error('Cart is empty.');
      return;
    }

    const subTotal = cart.reduce((acc, c) => {
      const price = (c.strips * c.mrp) + (c.tablets * c.unitPrice);
      return acc + price;
    }, 0);

    const tokenNo = `T-${sales.length + 101}`;
    const newInvoice = {
      id: `INV-${sales.length + 8823}`,
      token: tokenNo,
      date: new Date().toLocaleDateString('en-CA'),
      patientName: selectedRx ? selectedRx.patientName : walkinCustomer.name || 'Walk-in Customer',
      type: selectedRx ? 'Prescription' : 'Walk-in',
      amount: subTotal,
      paymentMode,
      status: 'Completed',
      handoverStatus: 'Waiting',
      waitTime: '0 mins',
      queuePos: sales.filter(s => s.handoverStatus === 'Waiting' || s.handoverStatus === 'Preparing').length + 1,
      estFinish: new Date(Date.now() + 10 * 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    };

    const nextInventory = inventory.map(invItem => {
      const invItemId = invItem._id || invItem.id;
      const cartItemsForThisInv = cart.filter(c => c.itemId === invItemId);
      if (cartItemsForThisInv.length === 0) return invItem;

      let updatedBatches = invItem.batches.map(b => {
        const batchId = b._id || b.id;
        const cartMatch = cartItemsForThisInv.find(c => c.batchId === batchId);
        if (!cartMatch) return b;

        const totalToDeduct = (cartMatch.strips * (invItem.stripSize || 10)) + cartMatch.tablets;
        return {
          ...b,
          availableStock: Math.max(0, (b.availableStock ?? b.quantity ?? 0) - totalToDeduct),
          quantity: Math.max(0, (b.quantity ?? 0) - totalToDeduct)
        };
      });

      return {
        ...invItem,
        batches: updatedBatches,
        totalStock: updatedBatches.reduce((acc, b) => acc + (b.availableStock ?? b.quantity ?? 0), 0)
      };
    });

    setInventory(nextInventory);
    setSales([newInvoice, ...sales]);

    if (selectedRx) {
      setPrescriptions(prescriptions.map(rx => rx.id === selectedRx.id ? { ...rx, status: 'Completed' } : rx));
    }

    setActivities([
      {
        id: Date.now(),
        type: selectedRx ? 'Prescription Completed' : 'Walk-in Sale',
        desc: `${selectedRx ? 'Prescription' : 'Walk-in'} order completed. Bill: ₹${subTotal}. Token: ${tokenNo}`,
        time: 'Just now',
        icon: 'check'
      },
      ...activities
    ]);

    setCart([]);
    setSelectedRx(null);
    setWalkinCustomer({ name: '', phone: '' });
    toast.success(`Payment verified successfully! Token ${tokenNo} generated.`);
  };

  const handleUpdateHandover = (token, nextStatus) => {
    setSales(sales.map(s => s.token === token ? { ...s, handoverStatus: nextStatus } : s));

    setActivities([
      {
        id: Date.now(),
        type: 'Inventory Updated',
        desc: `Token ${token} handover status updated to ${nextStatus}`,
        time: 'Just now',
        icon: 'plus'
      },
      ...activities
    ]);

    toast.success(`Token ${token} status updated to ${nextStatus}.`);
  };

  // --- FILTERS & SEARCHES ---
  const [filteredCatalog, setFilteredCatalog] = useState([]);

  useEffect(() => {
    const performSearch = async () => {
      try {
        const res = await pharmacyApi.searchGlobalMeds(searchTerm || '');
        const rawItems = res?.items || res?.data?.items || (Array.isArray(res) ? res : []);
        if (rawItems && rawItems.length >= 0) {
          const mapped = rawItems.map(item => ({
            id: item._id || item.globalId || Math.random().toString(),
            brand: item.brandName || item.displayName || 'Unnamed Brand',
            name: item.genericName || item.displayName || 'Unnamed Generic',
            salt: item.activeIngredients?.map(i => `${i.name} ${i.strength}`).join(' + ') || item.genericName || 'N/A',
            strength: item.strength || 'N/A',
            form: item.dosageForm || 'Tablet',
            manufacturer: item.manufacturer || 'N/A',
            stripSize: 10,
            stripPrice: 100,
            unitPrice: 10,
            barcode: item.globalId || 'N/A',
            medicineType: item.medicineType || 'Generic',
            version: item.version || item.__v || 1
          }));
          setFilteredCatalog(mapped);
          if (!searchTerm) {
            setGlobalCatalog(mapped);
          }
        } else {
          setFilteredCatalog([]);
        }
      } catch (err) {
        console.error("Live global medicine search failed:", err);
      }
    };

    const delayDebounce = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  useEffect(() => {
    const fetchLocalInventory = async () => {
      try {
        const invData = await pharmacyApi.listMedicines();
        // API returns { medicines: [...], pagination: {...} } or a bare array
        const items = invData?.medicines || invData?.data?.medicines || (Array.isArray(invData) ? invData : []);
        setInventory(items);
      } catch (err) {
        console.error("Failed to load local inventory:", err);
      }
    };
    // Re-fetch whenever the user navigates to the inventory or dashboard tab
    if (tab === 'inventory' || tab === 'dashboard') {
      fetchLocalInventory();
    }
  }, [tab]);

  // ── ADD MEDICINE TO ORDER MODAL – Debounced inventory search ───────────────
  useEffect(() => {
    if (!showAddMedToOrderModal) return;
    const query = addMedSearchQuery.trim();

    const doSearch = async () => {
      setIsSearchingAddMed(true);
      try {
        const data = await pharmacyApi.listMedicines({ search: query || undefined, limit: 30 });
        const items = data?.medicines || data?.data?.medicines || (Array.isArray(data) ? data : []);
        // Filter out fully out-of-stock medicines and sort FIFO
        const today = new Date();
        const valid = items.filter(m => {
          const stock = m.totalStock ?? m.batches?.reduce((s, b) => s + (b.availableStock ?? b.quantity ?? 0), 0) ?? 0;
          return stock > 0;
        });
        setAddMedResults(valid);
      } catch (err) {
        console.error('Add-med search failed:', err);
      } finally {
        setIsSearchingAddMed(false);
        setAddMedInitialLoad(true);
      }
    };

    const timer = setTimeout(doSearch, query ? 350 : 0);
    return () => clearTimeout(timer);
  }, [addMedSearchQuery, showAddMedToOrderModal]);

  // Reset modal state when it closes
  useEffect(() => {
    if (!showAddMedToOrderModal) {
      setAddMedSearchQuery('');
      setAddMedResults([]);
      setIsSearchingAddMed(false);
      setAddMedInitialLoad(false);
    }
  }, [showAddMedToOrderModal]);

  // Fetch real Completed sales / dispensing history from database
  useEffect(() => {
    const fetchSalesHistory = async () => {
      try {
        const data = await pharmacyApi.listDispensings();
        const records = data?.dispensingRecords || data?.data?.dispensingRecords || (Array.isArray(data) ? data : []);
        const mappedSales = records.map(r => ({
          id: r.id || r._id,
          token: r.tokenNumber || r.token || `T-${r.dispensingNumber || '101'}`,
          date: r.dispensedAt ? new Date(r.dispensedAt).toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA'),
          patientName: r.patientName || r.patientId?.fullName || 'Walk-in Customer',
          type: r.patientId ? 'Prescription' : 'Walk-in',
          amount: r.totalAmount || r.amount || 0,
          paymentMode: r.paymentMethod || 'Cash',
          status: r.status === 'finalized' ? 'Completed' : r.status,
          handoverStatus: r.handoverStatus || 'Handed Over',
          waitTime: '0 mins',
          queuePos: 0,
          estFinish: 'N/A'
        }));
        setSales(mappedSales);
      } catch (err) {
        console.error("Failed to fetch sales history:", err);
      }
    };
    if (tab === 'walk-in' || tab === 'dashboard' || tab === 'sales') {
      fetchSalesHistory();
    }
  }, [tab]);

  // Real-time backend search for walk-in sales page
  useEffect(() => {
    const performWalkinSearch = async () => {
      if (!walkinSearchTerm.trim()) {
        setWalkinSearchResults([]);
        return;
      }
      setIsSearchingWalkin(true);
      try {
        const data = await pharmacyApi.listMedicines({ search: walkinSearchTerm, limit: 20 });
        const items = data?.medicines || data?.data?.medicines || (Array.isArray(data) ? data : []);
        setWalkinSearchResults(items);
      } catch (err) {
        console.error("Walkin search failed:", err);
      } finally {
        setIsSearchingWalkin(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      performWalkinSearch();
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [walkinSearchTerm]);

  // Fetch suppliers from backend
  const fetchSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const data = await pharmacyApi.listSuppliers();
      const items = data?.suppliers || data?.data?.suppliers || (Array.isArray(data) ? data : []);
      setSuppliersList(items);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  useEffect(() => {
    if (tab === 'suppliers' || tab === 'dashboard') {
      fetchSuppliers();
    }
  }, [tab]);

  // Live prescription search hook (detects 24-char MongoDB Object ID OR phone number in search term)
  useEffect(() => {
    if (!rxSearchTerm) return;

    const term = rxSearchTerm.trim();

    // Helper to format raw database prescription to match local UI structure
    const formatPrescription = (data) => ({
      id: data._id,
      appointmentId: data.appointmentId?._id || data.appointmentId || '',
      patientName: data.patientId?.fullName || (data.patientId?.firstName ? `${data.patientId.firstName} ${data.patientId.lastName || ''}` : 'Patient'),
      phone: data.patientId?.phone || '',
      doctor: data.doctorId?.fullName || (data.doctorId?.firstName ? `Dr. ${data.doctorId.firstName} ${data.doctorId.lastName || ''}` : 'Doctor'),
      diagnosis: data.consultationId?.diagnosis || 'N/A',
      date: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-CA') : new Date().toLocaleDateString('en-CA'),
      rawDate: data.createdAt ? new Date(data.createdAt) : new Date(),
      status: data.status === 'finalized' ? 'Pending' : (data.status === 'draft' ? 'Pending' : data.status),
      medicines: (data.medicines || []).map(m => ({
        name: m.genericName || m.medicineName,
        brand: m.brandName || m.medicineName,
        dosage: m.dosage,
        duration: m.duration,
        quantityRequired: m.quantity
      }))
    });

    // Helper to populate cart for a formatted prescription
    const populateCartForRx = (rxObj) => {
      if (!rxObj || !rxObj.medicines) return;
      const newCart = rxObj.medicines.map(m => {
        const matchedInv = inventory.find(i => 
          (i.brandName || i.brand || '').toLowerCase().includes(m.brand.toLowerCase()) || 
          (i.genericName || i.name || '').toLowerCase() === m.name.toLowerCase()
        );
        const stripSize = matchedInv?.stripSize || matchedInv?.globalMedicineId?.stripSize || 10;
        const suggestions = calculateRequiredStrips(m.dosage, m.duration, stripSize);
        return {
          id: Math.random().toString(),
          itemId: matchedInv?._id || matchedInv?.id || '1',
          brand: m.brand,
          name: m.name,
          strips: suggestions.stripsSuggested || 1,
          tablets: suggestions.tabsRemainder || 0,
          mrp: matchedInv?.sellingPrice || 40,
          unitPrice: (matchedInv?.sellingPrice || 40) / stripSize,
          stripSize: stripSize,
          batchId: 'b1',
          batchNo: 'Default Batch',
          expiry: 'N/A'
        };
      });
      setCart(newCart);
    };

    // 1. Detect 24-char MongoDB Object ID (Prescription ID or Appointment ID)
    const matchId = term.match(/[0-9a-fA-F]{24}/);
    if (matchId) {
      const targetId = matchId[0];
      const fetchPrescription = async () => {
        try {
          const res = await prescriptionApi.getById(targetId);
          const data = res?.prescription || res?.data?.prescription || res?.data || res;
          if (data && data._id) {
            const formatted = formatPrescription(data);
            
            // Also fetch all prescriptions for this patient so old history is loaded too
            const patientId = data.patientId?._id || data.patientId;
            let patientPrescriptions = [formatted];
            if (patientId) {
              try {
                const rxRes = await prescriptionApi.getByPatient(patientId);
                const rxList = rxRes?.prescriptions || rxRes?.data?.prescriptions || rxRes?.data || rxRes || [];
                if (Array.isArray(rxList) && rxList.length > 0) {
                  patientPrescriptions = rxList.map(formatPrescription);
                }
              } catch (err) {
                console.error("Failed to fetch all patient prescriptions:", err);
              }
            }

            setPrescriptions(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newItems = patientPrescriptions.filter(p => !existingIds.has(p.id));
              return [...newItems, ...prev];
            });

            setSelectedRx(formatted);
            populateCartForRx(formatted);
            toast.success(`Prescription loaded from database!`);
          }
        } catch (err) {
          console.error("Live prescription search failed:", err);
        }
      };
      fetchPrescription();
      return;
    }

    // 2. Detect phone number (between 5 and 15 digits/chars, digits only or with +, -, spaces)
    const isPhoneNumber = /^[+\d\s-]{5,15}$/.test(term) && /\d{5,}/.test(term);
    if (isPhoneNumber) {
      const fetchByPhone = async () => {
        try {
          // Use the dedicated by-phone endpoint accessible to pharmacists
          const res = await prescriptionApi.getByPhone(term.replace(/\s/g, ''));
          const rxList = res?.prescriptions || res?.data?.prescriptions || res?.data || [];
          if (Array.isArray(rxList) && rxList.length > 0) {
            const allPatientRx = rxList.map(formatPrescription);

            // Sort by date descending so the newest prescription is first
            allPatientRx.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

            setPrescriptions(prev => {
              const existingIds = new Set(prev.map(p => p.id));
              const newItems = allPatientRx.filter(p => !existingIds.has(p.id));
              return [...newItems, ...prev];
            });

            // Select the latest prescription automatically and populate cart
            const latestRx = allPatientRx[0];
            setSelectedRx(latestRx);
            populateCartForRx(latestRx);

            toast.success(`Loaded ${allPatientRx.length} prescription(s) for patient!`);
          } else {
            toast.error('No prescriptions found for this phone number.');
          }
        } catch (err) {
          console.error('Prescription search by phone failed:', err);
          toast.error('Could not search prescriptions. Please try a Prescription ID instead.');
        }
      };

      const timer = setTimeout(() => {
        fetchByPhone();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [rxSearchTerm]);

  const matchedPrescriptions = useMemo(() => {
    if (!rxSearchTerm) return prescriptions;
    const q = rxSearchTerm.toLowerCase();
    return prescriptions.filter(rx =>
      rx.patientName.toLowerCase().includes(q) ||
      rx.phone.includes(q) ||
      (rx.id || '').toLowerCase().includes(q) ||
      (rx.appointmentId || '').toLowerCase().includes(q)
    );
  }, [rxSearchTerm, prescriptions]);

  const filteredLocalInventory = useMemo(() => {
    if (!walkinSearchTerm) return inventory;
    return walkinSearchResults;
  }, [walkinSearchTerm, inventory, walkinSearchResults]);

  const globalSearchResults = useMemo(() => {
    if (!globalSearchQuery) return null;
    const q = globalSearchQuery.toLowerCase();

    const matchedPats = prescriptions.filter(p => p.patientName.toLowerCase().includes(q) || p.phone.includes(q));
    const matchedMeds = inventory.filter(m => (m.brandName || m.brand || '').toLowerCase().includes(q) || (m.genericName || m.name || '').toLowerCase().includes(q));
    const matchedInvs = sales.filter(s => s.id.toLowerCase().includes(q) || s.token.toLowerCase().includes(q) || s.patientName.toLowerCase().includes(q));
    const matchedBatches = [];
    inventory.forEach(i => (i.batches || []).forEach(b => {
      const batchNo = b.batchNumber || b.batchNo || '';
      if (batchNo.toLowerCase().includes(q)) {
        matchedBatches.push({ ...b, medBrand: i.brandName || i.brand || i.name });
      }
    }));

    return {
      patients: matchedPats,
      medicines: matchedMeds,
      invoices: matchedInvs,
      batches: matchedBatches
    };
  }, [globalSearchQuery, prescriptions, inventory, sales]);

  const filteredTokenQueue = useMemo(() => {
    let result = sales;
    if (selectedQueueFilter !== 'ALL') {
      result = sales.filter(s => s.handoverStatus.toUpperCase() === selectedQueueFilter.toUpperCase());
    }
    return result;
  }, [sales, selectedQueueFilter]);

  // Floating Patient Search Selection
  const handleFloatingSearchSelect = (patient) => {
    setSelectedRx(patient);
    setActiveTab('orders');
    setShowFloatingSearch(false);
    setFloatingSearchText('');
    toast.success(`Selected prescription for ${patient.patientName}`);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Waiting': return 'bg-blue-50 text-blue-600 border border-blue-100';
      case 'Preparing': return 'bg-amber-50 text-amber-600 border border-amber-100';
      case 'Ready': return 'bg-emerald-50 text-emerald-600 border border-emerald-100';
      case 'Handed Over': case 'Completed': return 'bg-slate-100 text-slate-600 border border-slate-200';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900 font-sans text-slate-800 antialiased">

      {/* ================= LEFT SIDEBAR ================= */}
      <aside className={`bg-slate-950 flex flex-col border-r border-slate-800 shrink-0 text-slate-300 transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'w-[260px]' : 'w-0'}`}>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Pill size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-white leading-none">AICMS</h1>
            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider leading-none">
              Pharmacy Store
            </p>
          </div>
        </div>

        {/* Collapsible Nav Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white text-slate-400'
              }`}
          >
            <div className="flex items-center gap-2.5">
              <Activity size={16} />
              <span>Dashboard</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === 'orders' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white text-slate-400'
              }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText size={16} />
              <span>Prescription Orders</span>
            </div>
            {prescriptions.filter(p => p.status === 'Pending').length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                {prescriptions.filter(p => p.status === 'Pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('walk-in')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === 'walk-in' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white text-slate-400'
              }`}
          >
            <div className="flex items-center gap-2.5">
              <CreditCard size={16} />
              <span>Walk-in Sales</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('patients')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === 'patients' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white text-slate-400'
              }`}
          >
            <div className="flex items-center gap-2.5">
              <Users size={16} />
              <span>Patients</span>
            </div>
          </button>

          {/* Collapsible Inventory Dropdown */}
          <div className="space-y-1">
            <button
              onClick={() => setInventoryCollapsed(!inventoryCollapsed)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 hover:text-white text-slate-400 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Package size={16} />
                <span>Inventory</span>
              </div>
              <ChevronRight size={14} className={`transition-transform duration-200 ${!inventoryCollapsed ? 'rotate-90' : ''}`} />
            </button>

            {!inventoryCollapsed && (
              <div className="pl-6 pr-2 space-y-1.5">
                <button
                  onClick={() => { setActiveTab('inventory'); setInventorySubTab('stock-list'); }}
                  className={`w-full text-left py-1.5 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-2 ${tab === 'inventory' && inventorySubTab === 'stock-list' ? 'text-blue-500 bg-blue-500/10' : 'text-slate-500 hover:text-white'}`}
                >
                  <span>•</span> Stock List
                </button>
                <button
                  onClick={() => { setActiveTab('inventory'); setInventorySubTab('stock-inward'); }}
                  className={`w-full text-left py-1.5 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-2 ${tab === 'inventory' && inventorySubTab === 'stock-inward' ? 'text-blue-500 bg-blue-500/10' : 'text-slate-500 hover:text-white'}`}
                >
                  <span>•</span> Stock Inward
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveTab('catalogue')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === 'catalogue' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white text-slate-400'
              }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers size={16} />
              <span>Global Medicine Catalogue</span>
            </div>
          </button>


          <button
            onClick={() => setActiveTab('suppliers')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === 'suppliers' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
          >
            <div className="flex items-center gap-2.5">
              <Users size={16} />
              <span>Suppliers</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('expiry')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === 'expiry' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert size={16} />
              <span>Expiry &amp; Batch Management</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('transfer')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === 'transfer' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
          >
            <div className="flex items-center gap-2.5">
              <ArrowLeftRight size={16} />
              <span>Stock Transfer</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('returns')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === 'returns' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
          >
            <div className="flex items-center gap-2.5">
              <RotateCcwIcon size={16} />
              <span>Returns</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === 'sales' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
          >
            <div className="flex items-center gap-2.5">
              <TrendingUp size={16} />
              <span>Sales</span>
            </div>
          </button>

          {/* Collapsible Reports */}
          <div className="space-y-1">
            <button
              onClick={() => setReportsCollapsed(!reportsCollapsed)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 hover:text-white text-slate-400 transition-all"
            >
              <div className="flex items-center gap-2.5">
                <FileBarChart size={16} />
                <span>Reports &amp; Analytics</span>
              </div>
              <ChevronRight size={14} className={`transition-transform duration-200 ${!reportsCollapsed ? 'rotate-90' : ''}`} />
            </button>
            {!reportsCollapsed && (
              <div className="pl-6 pr-2 space-y-1.5">
                <button onClick={() => toast.success('Sales report exported.')} className="w-full text-left py-1.5 px-3 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-white">
                  • Sales Performance
                </button>
                <button onClick={() => toast.success('Inventory balance sheet ready.')} className="w-full text-left py-1.5 px-3 rounded-lg text-[11px] font-semibold text-slate-500 hover:text-white">
                  • Inventory Ledger
                </button>
              </div>
            )}
          </div>


          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === 'settings' ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white text-slate-400'}`}
          >
            <div className="flex items-center gap-2.5">
              <Settings size={16} />
              <span>Settings</span>
            </div>
          </button>
        </nav>

        {/* Branch Selector Footer */}
        <div className="p-4 border-t border-slate-800 space-y-3 shrink-0 bg-slate-950/50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pharmacy Store</p>
                <p className="text-xs font-extrabold text-white mt-0.5 truncate max-w-[130px]">Ram's Pharmacy Store</p>
                <p className="text-[9px] text-slate-500 font-semibold mt-0.5">Indirapuram, Ghaziabad</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 justify-center py-1 text-[11px] text-slate-400 font-bold">
            <HelpCircle size={14} />
            <span>Need Help?</span>
            <button onClick={() => toast.success('Help desk notified.')} className="text-blue-500 hover:underline">Contact Support</button>
          </div>
        </div>
      </aside>

      {/* ================= MAIN COLUMN CENTER ================= */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">

        {/* ================= TOP HEADER ================= */}
        <header className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between shrink-0">
          {/* Header Left (Hamburger + Title + Badge) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all duration-150"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <h2 className="text-base font-black text-slate-900 tracking-tight">Pharmacist Dashboard</h2>
            <span className="bg-purple-50 text-purple-600 border border-purple-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              Pharmacy Workspace
            </span>
          </div>

          {/* Header Middle (Global Search Engine) */}
          <div className="hidden md:flex items-center flex-1 max-w-lg mx-6 relative">
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Search patient, medicine, prescription, invoice, batch number..."
                value={globalSearchQuery}
                onChange={(e) => setGlobalSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-850 focus:outline-none focus:bg-white focus:border-blue-500 transition shadow-sm"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              {globalSearchQuery && (
                <button onClick={() => setGlobalSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Global Search Results Overlay */}
            {globalSearchResults && (
              <div className="absolute top-12 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 max-h-96 overflow-y-auto space-y-3.5">
                <div className="flex justify-between items-center border-b border-slate-50 pb-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Search Results</span>
                  <button onClick={() => setGlobalSearchQuery('')} className="text-[10px] text-slate-500 hover:underline">Close</button>
                </div>

                {/* Patient section */}
                {globalSearchResults.patients.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Patients &amp; Prescriptions</p>
                    {globalSearchResults.patients.map(p => (
                      <div key={p.id} onClick={() => handleFloatingSearchSelect(p)} className="p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 flex justify-between items-center cursor-pointer text-xs">
                        <span className="font-extrabold text-slate-805">{p.patientName} ({p.id})</span>
                        <span className="text-[10px] text-slate-400">{p.doctor}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Medicine section */}
                {globalSearchResults.medicines.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Local Stocks</p>
                    {globalSearchResults.medicines.map(m => (
                      <div key={m.id} onClick={() => { setActiveTab('inventory'); setGlobalSearchQuery(''); }} className="p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 flex justify-between items-center cursor-pointer text-xs">
                        <span className="font-extrabold text-slate-850">{m.brand} ({m.name})</span>
                        <span className="font-black text-slate-900">{m.totalStock} tabs</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Invoices */}
                {globalSearchResults.invoices.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Tokens &amp; Invoices</p>
                    {globalSearchResults.invoices.map(i => (
                      <div key={i.id} className="p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-805">{i.token} - {i.patientName}</span>
                        <span className="font-black text-slate-900">₹{i.amount}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Batches */}
                {globalSearchResults.batches.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Batches</p>
                    {globalSearchResults.batches.map(b => (
                      <div key={b.id} className="p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-805">Batch: {b.batchNo} ({b.medBrand})</span>
                        <span className="text-[10px] text-slate-400">Exp: {b.expiry}</span>
                      </div>
                    ))}
                  </div>
                )}

                {globalSearchResults.patients.length === 0 &&
                  globalSearchResults.medicines.length === 0 &&
                  globalSearchResults.invoices.length === 0 &&
                  globalSearchResults.batches.length === 0 && (
                    <p className="text-center text-xs text-slate-400 py-4 font-bold">No matches found.</p>
                  )}
              </div>
            )}
          </div>

          {/* Header Right Widgets */}
          <div className="flex items-center gap-4">
            {/* Branch selector */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-xs">🏫</span>
              <span className="text-xs font-bold text-slate-800">Ram's Dental Clinic</span>
              <ChevronDown size={11} className="text-slate-400" />
            </div>

            {/* Date Display */}
            <div className="hidden lg:flex items-center gap-2 text-slate-500 font-semibold text-xs border-r border-slate-150 pr-4">
              <Calendar size={14} />
              <span>19 July 2026, Sunday</span>
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="relative p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-655 transition"
              >
                <Bell size={18} />
                {notifications.filter(n => n.status === 'Unread').length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white">
                    {notifications.filter(n => n.status === 'Unread').length}
                  </span>
                )}
              </button>

              {showNotificationDropdown && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white/95 backdrop-blur-md border border-slate-100 rounded-3xl shadow-xl z-50 p-4 space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <h4 className="text-xs font-black text-slate-905">Notifications</h4>
                    <button
                      onClick={() => {
                        setNotifications(notifications.map(n => ({ ...n, status: 'Read' })));
                        toast.success('All marked as read.');
                      }}
                      className="text-[9px] text-blue-600 font-bold hover:underline"
                    >
                      Mark all as read
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                      <p className="text-center text-[10px] text-slate-400 font-bold py-6">You're all caught up.</p>
                    ) : (
                      notifications.slice(0, 5).map(n => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-2xl border transition-all flex items-start gap-2.5 relative group ${
                            n.status === 'Unread' ? 'bg-blue-50/20 border-blue-100' : 'bg-slate-50/50 border-slate-100'
                          }`}
                        >
                          <span className="text-base shrink-0">
                            {n.module === 'Inventory' ? '🚨' : n.module === 'Prescription' ? '📝' : '💰'}
                          </span>
                          <div className="flex-1 min-w-0 text-[10px]">
                            <div className="flex justify-between items-start">
                              <p className="font-extrabold text-slate-800 truncate">{n.title}</p>
                              <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-md ${
                                n.priority === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                n.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                'bg-slate-100 text-slate-500'
                              }`}>{n.priority}</span>
                            </div>
                            <p className="text-slate-500 mt-0.5 leading-tight">{n.message}</p>
                            <span className="text-[8px] text-slate-400 mt-1 block">Just now</span>
                          </div>
                          
                          {/* Quick inline action to delete */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotifications(notifications.filter(item => item.id !== n.id));
                              toast.success('Notification deleted.');
                            }}
                            className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-rose-50 hover:text-rose-600 rounded-md text-slate-400 text-xs font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-slate-50 pt-2 text-center">
                    <button
                      onClick={() => {
                        setActiveTab('notifications');
                        setShowNotificationDropdown(false);
                      }}
                      className="w-full py-1.5 hover:bg-slate-50 text-blue-600 text-[10px] font-black rounded-xl transition text-center"
                    >
                      View all notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile widget */}
            <div className="relative group flex items-center gap-2.5 pl-2 cursor-pointer py-1.5 rounded-xl hover:bg-slate-50 transition">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center border border-slate-100">
                {profileData?.name?.slice(0, 2).toUpperCase() || 'PS'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-855 leading-none">{profileData?.name || 'Pharmacy Staff'}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{profileData?.role || 'Pharmacist'}</p>
              </div>

              {/* Profile Dropdown on Hover */}
              <div className="absolute right-0 top-full pt-1.5 w-48 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50">
                <div className="bg-white border border-slate-150 rounded-2xl shadow-xl p-3 space-y-2">
                  <div className="border-b border-slate-100 pb-2 text-[10px] text-slate-500 font-bold break-all">
                    {profileData?.email || 'pharmacist@clinic.com'}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await logout();
                        toast.success('Logged out successfully.');
                      } catch (err) {
                        console.error('Logout error:', err);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-black transition text-left"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ================= CONTENT MAIN WRAPPER ================= */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

          {/* ================= TAB 1: OPERATIONAL DASHBOARD ================= */}
          {tab === 'dashboard' && (
            <div className="space-y-6">

              {/* TOP KPI CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">

                {/* Today's Sales */}
                <div
                  onClick={() => toast.success('Detailed Sales analytics opened.')}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl grid place-items-center shrink-0 text-base font-black">
                      ₹
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Today's Sales</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">₹{kpis.todaySalesAmount}</h3>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                    <ArrowUpRight size={10} /> 18.6% vs yesterday
                  </span>
                </div>

                {/* Total Orders */}
                <div
                  onClick={() => toast.success('Orders history console.')}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl grid place-items-center shrink-0">
                      <ShoppingBag size={16} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Total Orders</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">{kpis.todayOrdersCount}</h3>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                    <ArrowUpRight size={10} /> 12.5% vs yesterday
                  </span>
                </div>

                {/* Pending Tokens */}
                <div
                  onClick={() => { setSelectedQueueFilter('Waiting'); toast.success('Queue filtered for waiting items'); }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl grid place-items-center shrink-0">
                      <Clock size={16} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Pending Tokens</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">{kpis.pendingTokens}</h3>
                  </div>
                  <span className="text-[9px] font-bold text-amber-500 flex items-center gap-0.5 group-hover:text-blue-500 transition-colors">
                    View queue →
                  </span>
                </div>

                {/* Completed Orders */}
                <div
                  onClick={() => { setSelectedQueueFilter('Handed Over'); toast.success('Queue filtered for handed over items'); }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-xl grid place-items-center shrink-0">
                      <CheckCircle2 size={16} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Completed Orders</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">{kpis.completedTokens}</h3>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                    <ArrowUpRight size={10} /> 20.0% vs yesterday
                  </span>
                </div>

                {/* Inventory Value */}
                <div
                  onClick={() => setActiveTab('inventory')}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl grid place-items-center shrink-0">
                      <TrendingUp size={16} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Inventory Value</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight">₹{parseFloat(kpis.totalInventoryVal).toLocaleString()}</h3>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 group-hover:text-blue-500 transition-colors">
                    Total stock value
                  </span>
                </div>

                {/* Low Stock Items */}
                <div
                  onClick={() => { setActiveTab('inventory'); toast.success('Showing low stock medicines.'); }}
                  className="bg-white rounded-2xl border border-rose-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl grid place-items-center shrink-0">
                      <AlertTriangle size={16} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Low Stock Items</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-rose-600 leading-tight">{kpis.lowStockCount}</h3>
                  </div>
                  <span className="text-[9px] font-bold text-rose-400">
                    Reorder soon
                  </span>
                </div>

              </div>

              {/* PHARMACY TOKEN QUEUE & ORDERS OVERVIEW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Pharmacy Token Queue Table */}
                <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-905">Pharmacy Token Queue</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">Real-time prescription dispensing &amp; walk-in queue</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
                      {['ALL', 'Waiting', 'Preparing', 'Ready'].map(filt => (
                        <button
                          key={filt}
                          onClick={() => setSelectedQueueFilter(filt)}
                          className={`px-2.5 py-1 text-[9px] font-extrabold rounded-lg transition-all ${selectedQueueFilter === filt ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                          {filt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-2">Token No</th>
                          <th className="py-2.5 px-2">Patient Name</th>
                          <th className="py-2.5 px-2">Type</th>
                          <th className="py-2.5 px-2">Status</th>
                          <th className="py-2.5 px-2">Waiting</th>
                          <th className="py-2.5 px-2">Queue Position</th>
                          <th className="py-2.5 px-2">Est Completion</th>
                          <th className="py-2.5 px-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredTokenQueue.map((item, index) => {
                          const waitNum = parseInt(item.waitTime) || 0;
                          const isOverdue = waitNum >= 15 && (item.handoverStatus === 'Waiting' || item.handoverStatus === 'Preparing');

                          return (
                            <tr key={item.token} className={`hover:bg-slate-50/50 transition ${isOverdue ? 'bg-rose-50/20' : ''}`}>
                              <td className="py-3 px-2 font-black text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  {isOverdue && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>}
                                  <span>{item.token}</span>
                                </div>
                              </td>
                              <td className="py-3 px-2 font-extrabold text-slate-705">{item.patientName}</td>
                              <td className="py-3 px-2">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${item.type === 'Prescription' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                  {item.type}
                                </span>
                              </td>
                              <td className="py-3 px-2">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${getStatusBadgeClass(item.handoverStatus)}`}>
                                  {item.handoverStatus}
                                </span>
                              </td>
                              <td className={`py-3 px-2 font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}>
                                {item.waitTime}
                              </td>
                              <td className="py-3 px-2 font-bold text-slate-600 pl-4">{item.queuePos}</td>
                              <td className="py-3 px-2 text-slate-400 font-mono font-bold">{item.estFinish}</td>
                              <td className="py-3 px-2 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {item.handoverStatus === 'Waiting' && (
                                    <button
                                      onClick={() => handleUpdateHandover(item.token, 'Preparing')}
                                      className="px-2 py-1 bg-amber-500 text-white rounded-lg text-[9px] font-black hover:bg-amber-600 transition"
                                    >
                                      Prep
                                    </button>
                                  )}
                                  {item.handoverStatus === 'Preparing' && (
                                    <button
                                      onClick={() => handleUpdateHandover(item.token, 'Ready')}
                                      className="px-2 py-1 bg-emerald-500 text-white rounded-lg text-[9px] font-black hover:bg-emerald-600 transition animate-pulse"
                                    >
                                      Ready
                                    </button>
                                  )}
                                  {item.handoverStatus === 'Ready' && (
                                    <button
                                      onClick={() => handleUpdateHandover(item.token, 'Handed Over')}
                                      className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-black hover:bg-blue-700 transition"
                                    >
                                      Handover
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      const rx = prescriptions.find(p => p.patientName === item.patientName);
                                      if (rx) {
                                        setSelectedRx(rx);
                                        setActiveTab('orders');
                                        toast.success(`Dispensing details loaded for ${item.patientName}`);
                                      } else {
                                        toast.error(`No prescription prescription trace found for ${item.patientName}. Proceeding to walk-in catalogue.`);
                                        setActiveTab('walk-in');
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                                    title="Open Order"
                                  >
                                    <Eye size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-50 pt-3 text-[10px] text-slate-400 font-bold">
                    <span>Average Dispense Waiting Time: <span className="text-slate-800 font-black">12 mins</span></span>
                    <button onClick={() => toast.success('Operational audit log log downloaded.')} className="text-blue-500 hover:underline">View All Operations Logs →</button>
                  </div>
                </div>

                {/* Orders Overview Donut Chart */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-905">Orders Overview</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Dispensing and order mix analysis</p>
                  </div>

                  {/* Interactive SVG Donut Chart */}
                  <div className="flex items-center justify-center py-2 relative">
                    <svg width="160" height="160" viewBox="0 0 160 160">
                      <circle cx="80" cy="80" r="60" fill="transparent" stroke="#f1f5f9" strokeWidth="18" />
                      <circle
                        cx="80"
                        cy="80"
                        r="60"
                        fill="transparent"
                        stroke="#3b82f6"
                        strokeWidth="18"
                        strokeDasharray={`${salesStats.rxLength} 377`}
                        strokeDashoffset={`${salesStats.rxOffset}`}
                        className="cursor-pointer hover:stroke-[20px] transition-all"
                        onClick={() => { setSelectedQueueFilter('ALL'); toast.success('Filtering by Prescription orders.'); }}
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="60"
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth="18"
                        strokeDasharray={`${salesStats.walkinLength} 377`}
                        strokeDashoffset={`${salesStats.walkinOffset}`}
                        className="cursor-pointer hover:stroke-[20px] transition-all"
                        onClick={() => { setSelectedQueueFilter('Ready'); toast.success('Filtering Ready walk-in sales.'); }}
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="60"
                        fill="transparent"
                        stroke="#f59e0b"
                        strokeWidth="18"
                        strokeDasharray={`${salesStats.pendingLength} 377`}
                        strokeDashoffset={`${salesStats.pendingOffset}`}
                        className="cursor-pointer hover:stroke-[20px] transition-all"
                        onClick={() => { setSelectedQueueFilter('Waiting'); toast.success('Filtering pending waiting tokens.'); }}
                      />
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-slate-900">{salesStats.totalCount}</span>
                      <span className="text-[9px] text-slate-400 font-extrabold uppercase">Total Orders</span>
                    </div>
                  </div>

                  {/* Chart Legends */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        <span className="text-slate-600 font-semibold">Prescription Orders</span>
                      </div>
                      <span className="font-extrabold text-slate-800">{salesStats.rxCount} ({salesStats.rxPct}%)</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-600 font-semibold">Walk-in Sales</span>
                      </div>
                      <span className="font-extrabold text-slate-800">{salesStats.walkinCount} ({salesStats.walkinPct}%)</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        <span className="text-slate-600 font-semibold">Pending Orders</span>
                      </div>
                      <span className="font-extrabold text-slate-800">{salesStats.pendingCount} ({salesStats.pendingPct}%)</span>
                    </div>
                  </div>

                  <button
                    onClick={() => { setSelectedQueueFilter('ALL'); toast.success('Reset all queue filters.'); }}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl transition border border-slate-100"
                  >
                    Clear Filter Selection
                  </button>
                </div>
              </div>

              {/* SALES OVERVIEW & INVENTORY ALERTS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sales Overview Interactive Chart */}
                <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-slate-905">Sales Overview</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">Interactive revenue tracker</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
                      {['Daily', 'Weekly', 'Monthly', 'Yearly'].map(time => (
                        <button
                          key={time}
                          onClick={() => { setSalesTimeframe(time); toast.success(`Switched sales view to ${time}`); }}
                          className={`px-2.5 py-1 text-[9px] font-extrabold rounded-lg transition-all ${salesTimeframe === time ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-900'
                            }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Revenue metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Gross Revenue</p>
                      <h4 className="text-sm font-black text-slate-900 mt-0.5">₹{salesStats.grossRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
                      <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-full">+22.5% MoM</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Net Profit</p>
                      <h4 className="text-sm font-black text-slate-900 mt-0.5">₹{salesStats.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
                      <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-full">+18.2%</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Average Basket Value</p>
                      <h4 className="text-sm font-black text-slate-900 mt-0.5">₹{salesStats.avgBasket.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h4>
                      <span className="text-[8px] text-slate-400 font-bold">12 items avg</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Stock Valuation</p>
                      <h4 className="text-sm font-black text-slate-900 mt-0.5">₹{parseFloat(kpis.totalInventoryVal).toLocaleString()}</h4>
                      <span className="text-[8px] text-amber-500 font-bold">96% active</span>
                    </div>
                  </div>

                  {/* Curvaceous SVG Line Graph with Tooltip Simulations */}
                  <div className="relative pt-2 h-44 group">
                    <svg className="w-full h-full" viewBox="0 0 600 120" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      <line x1="0" y1="30" x2="600" y2="30" stroke="#f1f5f9" strokeDasharray="3" />
                      <line x1="0" y1="60" x2="600" y2="60" stroke="#f1f5f9" strokeDasharray="3" />
                      <line x1="0" y1="90" x2="600" y2="90" stroke="#f1f5f9" strokeDasharray="3" />

                      {salesStats.fillD && (
                        <path
                          d={salesStats.fillD}
                          fill="url(#chart-grad)"
                        />
                      )}

                      {salesStats.pathD && (
                        <path
                          d={salesStats.pathD}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                      )}

                      {salesStats.coordinates.map((point, idx) => (
                        <circle key={idx} cx={point.x} cy={point.y} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" className="cursor-pointer hover:r-7 transition-all" />
                      ))}
                    </svg>

                    <div className="flex justify-between text-[9px] text-slate-400 font-bold pt-2">
                      {salesStats.dailyAmounts.map((d, index) => (
                        <span key={index}>{d.label}</span>
                      ))}
                    </div>

                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-xl px-2.5 py-1.5 text-[10px] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none text-center">
                      <p className="font-bold text-blue-400">Weekly Performance Summary</p>
                      <p className="font-black text-xs mt-0.5">₹{salesStats.grossRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} Sales</p>
                      <p className="text-[8px] text-slate-300">Total Orders: {salesStats.totalCount}</p>
                    </div>
                  </div>
                </div>

                {/* Inventory Alerts Panel */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <h3 className="text-sm font-black text-slate-905">Inventory Alerts</h3>
                    <button onClick={() => { setActiveTab('inventory'); }} className="text-[10px] text-blue-600 font-bold hover:underline">View All</button>
                  </div>

                  <div className="space-y-2.5">
                    {/* Out of stock */}
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center justify-between gap-3 group">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                          <AlertTriangle size={15} />
                        </div>
                        <div>
                          <p className="font-extrabold text-[11px]">Out of Stock</p>
                          <p className="text-[9px] text-red-500 mt-0.5">{kpis.outOfStockCount} items have zero stock</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setActiveTab('catalogue'); toast.success('Open purchase stock for empty items.'); }}
                        className="px-2.5 py-1 bg-red-600 text-white rounded-xl text-[9px] font-black shadow-xs hover:bg-red-700 transition"
                      >
                        Reorder
                      </button>
                    </div>

                    {/* Low stock */}
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                          <ShieldAlert size={15} />
                        </div>
                        <div>
                          <p className="font-extrabold text-[11px]">Low Stock WARNING</p>
                          <p className="text-[9px] text-amber-600 mt-0.5">{kpis.lowStockCount} items below threshold</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setActiveTab('catalogue'); toast.success('Bulk reorder generated.'); }}
                        className="px-2.5 py-1 bg-amber-500 text-white rounded-xl text-[9px] font-black shadow-xs hover:bg-amber-600 transition"
                      >
                        Reorder
                      </button>
                    </div>

                    {/* Near Expiry */}
                    <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center shrink-0">
                          <Calendar size={15} />
                        </div>
                        <div>
                          <p className="font-extrabold text-[11px]">Near Expiry (30 Days)</p>
                          <p className="text-[9px] text-yellow-600 mt-0.5">{kpis.nearExpiryCount} batches expiring soon</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { toast.success('FIFO clearance discount applied.'); }}
                        className="px-2.5 py-1 bg-yellow-500 text-white rounded-xl text-[9px] font-black shadow-xs hover:bg-yellow-600 transition"
                      >
                        Clearance
                      </button>
                    </div>

                    {/* Expired */}
                    <div className="p-3 bg-rose-50 border border-rose-250 text-rose-700 rounded-2xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                          <Ban size={15} />
                        </div>
                        <div>
                          <p className="font-extrabold text-[11px]">Expired Items</p>
                          <p className="text-[9px] text-rose-500 mt-0.5">{kpis.expiredCount} batches require disposal</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { toast.success('Batches quarantined.'); }}
                        className="px-2.5 py-1 bg-rose-600 text-white rounded-xl text-[9px] font-black shadow-xs hover:bg-rose-700 transition"
                      >
                        Quarantine
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIVE INVENTORY STATUS & SMART INSIGHTS */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Live Inventory Status mini dashboard */}
                <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-905">Live Inventory Status</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Quick stock status summary</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                      <span className="text-[10px] font-bold text-slate-400 block">Available Medicines</span>
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">
                        {inventory.filter(item => item.totalStock > 0).length}
                      </h4>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                      <span className="text-[10px] font-bold text-slate-400 block">Reserved Medicines</span>
                      <h4 className="text-lg font-black text-blue-600 mt-0.5">
                        {prescriptions.filter(p => ['Pending', 'Preparing', 'Ready'].includes(p.status)).reduce((acc, p) => acc + (p.medicines?.length || 0), 0)} items
                      </h4>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                      <span className="text-[10px] font-bold text-slate-400 block">Out of Stock</span>
                      <h4 className="text-lg font-black text-rose-600 mt-0.5">{kpis.outOfStockCount}</h4>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                      <span className="text-[10px] font-bold text-slate-400 block">Damaged / Expired</span>
                      <h4 className="text-lg font-black text-slate-400 mt-0.5">{kpis.expiredCount} batches</h4>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-400">Total Store Batches:</span>
                    <span className="text-slate-800 font-black">{inventory.reduce((acc, i) => acc + (i.batches?.length || 0), 0)} batches</span>
                  </div>
                </div>

                {/* AI Smart Pharmacy Insights */}
                <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-905 flex items-center gap-1.5">
                      <span>✨ Smart Pharmacy Insights</span>
                      <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[9px] font-bold">AI Recommended</span>
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Automated operations intelligence diagnostics</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-start gap-3">
                      <span className="text-xl">⚠️</span>
                      <div>
                        <p className="font-extrabold text-xs text-slate-800">23 medicines require reorder</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Stocks for top antibiotic categories are running below threshold safety buffer.</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-start gap-3">
                      <span className="text-xl">📅</span>
                      <div>
                        <p className="font-extrabold text-xs text-slate-800">12 medicines expire within 30 days</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Flagged batches are placed on high priority clearance discount campaigns.</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-start gap-3">
                      <span className="text-xl">⚡</span>
                      <div>
                        <p className="font-extrabold text-xs text-slate-800">Dispensing Peak Hour Today</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Expected peak traffic: <strong>11 AM - 1 PM</strong>. Optimize staff queue counters.</p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-start gap-3">
                      <span className="text-xl">💊</span>
                      <div>
                        <p className="font-extrabold text-xs text-slate-800">Dolo 650mg is today's top brand</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Antibiotics &amp; Antipyretics are the highest selling categories this afternoon.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM SUMMARY CARDS */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 border-t border-slate-200/60 pt-4">
                <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Medicines</span>
                  <span className="text-sm font-black text-slate-800 mt-1 block">{inventory.length}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Batches</span>
                  <span className="text-sm font-black text-slate-800 mt-1 block">{inventory.reduce((acc, i) => acc + (i.batches ? i.batches.length : 0), 0)}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Expiring (30 days)</span>
                  <span className="text-sm font-black text-amber-500 mt-1 block">{kpis.nearExpiryCount}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Suppliers</span>
                  <span className="text-sm font-black text-slate-800 mt-1 block">{suppliersList.length}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Inventory Value</span>
                  <span className="text-sm font-black text-blue-600 mt-1 block">
                    {(() => {
                      const val = Number(kpis.totalInventoryVal);
                      if (isNaN(val) || val <= 0) return '₹0';
                      if (val >= 100000) {
                        return `₹${(val / 100000).toFixed(2)}L`;
                      }
                      return `₹${val.toLocaleString('en-IN')}`;
                    })()}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Categories</span>
                  <span className="text-sm font-black text-slate-800 mt-1 block">{new Set(inventory.map(i => i.category).filter(Boolean)).size}</span>
                </div>
              </div>

            </div>
          )}

          {/* ================= TAB 2: PRESCRIPTION ORDERS ================= */}
          {tab === 'orders' && (
            <div className="space-y-6">
              
              {/* PAGE TITLE & SUBTITLE */}
              <div className="flex justify-between items-center px-1">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-blue-600">⊕</span> Prescription Orders
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    Manage and dispense medicines from patient prescriptions
                  </p>
                </div>
              </div>

              {/* TOP OPERATIONAL BADGES (KPI STRIP) */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Pending', count: prescriptions.filter(p => p.status === 'Pending').length, desc: 'Waiting to be Dispensed', color: 'text-amber-600 bg-amber-50/50 border-amber-100', icon: '⏳' },
                  { label: 'Preparing', count: prescriptions.filter(p => p.status === 'Preparing').length, desc: 'Being Prepared', color: 'text-blue-600 bg-blue-50/50 border-blue-100', icon: '🛒' },
                  { label: 'Ready for Pickup', count: prescriptions.filter(p => p.status === 'Ready').length, desc: 'Ready to Hand Over', color: 'text-purple-600 bg-purple-50/50 border-purple-100', icon: '🎯' },
                  { label: 'Handed Over', count: prescriptions.filter(p => p.status === 'Handed Over').length, desc: 'Today', color: 'text-green-600 bg-green-50/50 border-green-100', icon: '🚚' },
                  { label: 'Completed', count: prescriptions.filter(p => p.status === 'Completed').length, desc: 'Today', color: 'text-emerald-600 bg-emerald-50/50 border-emerald-100', icon: '✅' },
                  { label: 'Cancelled', count: prescriptions.filter(p => p.status === 'Cancelled').length, desc: 'Today', color: 'text-red-600 bg-red-50/50 border-red-100', icon: '❌' },
                ].map((kpi, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[100px] hover:shadow-md transition-all duration-200 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{kpi.icon}</span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</p>
                    </div>
                    <div className="mt-2.5">
                      <h3 className="text-xl font-black text-slate-900 leading-tight">{kpi.count}</h3>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{kpi.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* THREE COLUMN WORKSPACE */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* ── COLUMN 1: PRESCRIPTION QUEUE (30% / lg:col-span-4) ── */}
                <div className="lg:col-span-4 bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <h3 className="text-sm font-black text-slate-905">Orders Queue</h3>
                    <div className="flex gap-2">
                      {['All Orders', 'Pending', 'Preparing', 'Ready'].map(st => (
                        <button
                          key={st}
                          onClick={() => setSelectedQueueFilter(st === 'All Orders' ? 'ALL' : st)}
                          className={`text-[9px] font-bold px-2 py-1 rounded-lg ${
                            (selectedQueueFilter === 'ALL' && st === 'All Orders') || selectedQueueFilter === st
                              ? 'bg-blue-50 text-blue-600 font-extrabold'
                              : 'text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search Queue */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search by patient name, RX ID, phone, doctor..."
                      value={rxSearchTerm}
                      onChange={(e) => setRxSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs focus:outline-none focus:bg-white transition-all"
                    />
                    <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
                  </div>

                  {/* Prescription Queue List */}
                  <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                    {matchedPrescriptions.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-8 font-bold">No orders found.</div>
                    ) : (
                      matchedPrescriptions.map(rx => {
                        const isSelected = selectedRx?.id === rx.id;
                        return (
                          <div
                            key={rx.id}
                            onClick={() => {
                              setSelectedRx(rx);
                              // Auto populate cart with suggestions from real inventory
                              const newCart = rx.medicines.map(m => {
                                const matchedInv = inventory.find(i => 
                                  (i.brandName || i.brand || '').toLowerCase().includes(m.brand.toLowerCase()) || 
                                  (i.genericName || i.name || '').toLowerCase() === m.name.toLowerCase()
                                );
                                
                                const today = new Date();
                                const activeBatches = matchedInv ? (matchedInv.batches || [])
                                  .filter(b => {
                                    const qty = b.availableStock ?? b.quantity ?? 0;
                                    if (qty <= 0) return false;
                                    if (!b.expiryDate) return true;
                                    return new Date(b.expiryDate) >= today;
                                  })
                                  .sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0)) : [];
                                
                                const activeBatch = activeBatches[0];
                                const stripSize = matchedInv?.stripSize || matchedInv?.globalMedicineId?.stripSize || 10;
                                const suggestions = calculateRequiredStrips(m.dosage, m.duration, stripSize);
                                
                                return {
                                  id: Math.random().toString(),
                                  itemId: matchedInv?._id || matchedInv?.id || '1',
                                  brand: m.brand,
                                  name: m.name,
                                  strips: suggestions.stripsSuggested || 1,
                                  tablets: suggestions.tabsRemainder || 0,
                                  mrp: activeBatch?.sellingPrice || matchedInv?.sellingPrice || 40,
                                  unitPrice: (activeBatch?.sellingPrice || matchedInv?.sellingPrice || 40) / stripSize,
                                  stripSize: stripSize,
                                  batchId: activeBatch?._id || activeBatch?.id || 'b1',
                                  batchNo: activeBatch?.batchNumber || activeBatch?.batchNo || 'No Batch',
                                  expiry: activeBatch?.expiryDate || activeBatch?.expiry || 'N/A'
                                };
                              });
                              setCart(newCart);
                            }}
                            className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-blue-500 bg-blue-50/20 shadow-sm'
                                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 bg-white'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{rx.id}</span>
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                rx.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                              }`}>
                                {rx.status}
                              </span>
                            </div>
                            <h4 className="font-extrabold text-slate-905 mt-2">{rx.patientName}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5">{rx.phone}</p>
                            <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2.5 border-t border-slate-50 pt-2">
                              <span>{rx.doctor}</span>
                              <span>{rx.date}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ── COLUMN 2: ACTIVE WORKSPACE (45% / lg:col-span-5) ── */}
                <div className="lg:col-span-5 space-y-6">
                  {selectedRx ? (
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
                      
                      {/* Active RX Header */}
                      <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{selectedRx.id}</span>
                            <span className="text-[9px] font-extrabold uppercase bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                              {selectedRx.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-[10px] font-bold text-slate-500">
                            <div>Prescription Date: <span className="text-slate-800">{selectedRx.date}</span></div>
                            <div>Doctor: <span className="text-slate-800">{selectedRx.doctor}</span></div>
                            <div>Appointment ID: <span className="text-slate-800">{selectedRx.appointmentId}</span></div>
                            <div>Prescription Type: <span className="text-slate-800">Clinic Visit</span></div>
                          </div>
                        </div>
                        <button 
                          onClick={() => toast.success('Original prescription loaded.')}
                          className="px-3 py-1.5 border border-slate-200 hover:border-slate-350 text-slate-700 rounded-xl text-[10px] font-bold flex items-center gap-1 shadow-xs transition"
                        >
                          <Eye size={12} /> View Prescription
                        </button>
                      </div>

                      {/* Prescribed Items Table */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Prescribed Medicines</h4>
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                <th className="py-2 px-1">Medicine Details</th>
                                <th className="py-2 px-1">Dosage &amp; Instructions</th>
                                <th className="py-2 px-1">Prescribed</th>
                                <th className="py-2 px-1">Available Stock</th>
                                <th className="py-2 px-1">Qty to Dispense</th>
                                <th className="py-2 px-1 text-right">Total Price</th>
                                <th className="py-2 px-1 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {selectedRx.medicines.map((med, index) => {
                                const matchedInv = inventory.find(i => 
                                  (i.brandName || i.brand || '').toLowerCase().includes(med.brand.toLowerCase()) || 
                                  (i.genericName || i.name || '').toLowerCase() === med.name.toLowerCase()
                                );
                                const stock = matchedInv ? (matchedInv.totalStock ?? 0) : 0;
                                const isAvailable = stock > 0;
                                const stripSize = matchedInv?.stripSize || matchedInv?.globalMedicineId?.stripSize || 10;
                                const suggestions = calculateRequiredStrips(med.dosage, med.duration, stripSize);
                                const cartItem = cart.find(c => c.brand.toLowerCase() === med.brand.toLowerCase() || c.name.toLowerCase() === med.name.toLowerCase());

                                return (
                                  <tr key={index} className="hover:bg-slate-50/30 transition-colors">
                                    <td className={`py-3 px-1 font-extrabold ${isAvailable ? 'text-slate-900' : 'text-slate-400'}`}>
                                      <p className="flex items-center gap-1.5">
                                        {med.brand}
                                        {!isAvailable && (
                                          <span className="text-[8px] font-bold px-1 py-0.2 bg-red-50 text-red-500 rounded border border-red-100">Unavailable</span>
                                        )}
                                      </p>
                                      <span className="text-[9px] text-slate-400 font-semibold">{med.name}</span>
                                    </td>
                                    <td className="py-3 px-1 text-[10px] text-slate-600 font-semibold leading-tight">
                                      <p>{med.dosage}</p>
                                      <span className="text-[9px] text-slate-400">For {med.duration}</span>
                                    </td>
                                    <td className="py-3 px-1 text-[10px] text-slate-700 font-bold">{suggestions.totalRequired} Tablets</td>
                                    <td className="py-3 px-1">
                                      <p className="font-extrabold text-slate-700">{stock} tabs</p>
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${
                                        stock === 0 ? 'bg-red-50 text-red-600' : stock <= (matchedInv?.reorderLevel || 10) ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                                      }`}>
                                        {stock === 0 ? 'Out of Stock' : stock <= (matchedInv?.reorderLevel || 10) ? 'Low Stock' : 'In Stock'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-1">
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => {
                                            if (cartItem) handleUpdateCartQty(cartItem.id, 'strips', -1);
                                          }}
                                          disabled={!isAvailable}
                                          className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-bold text-slate-600 disabled:opacity-40"
                                        >
                                          -
                                        </button>
                                        <span className="text-[10px] font-black w-6 text-center">{isAvailable ? (cartItem?.strips || 0) : 0}</span>
                                        <button 
                                          onClick={() => {
                                            if (cartItem) handleUpdateCartQty(cartItem.id, 'strips', 1);
                                          }}
                                          disabled={!isAvailable}
                                          className="w-5 h-5 bg-blue-50 hover:bg-blue-100 rounded flex items-center justify-center font-bold text-blue-600 disabled:opacity-40"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </td>
                                    <td className="py-3 px-1 text-right font-black text-slate-900">
                                      {isAvailable ? `₹${cartItem ? (cartItem.strips * cartItem.mrp) + (cartItem.tablets * cartItem.unitPrice) : 0}` : '₹—'}
                                    </td>
                                    <td className="py-3 px-1 text-center">
                                      <button 
                                        onClick={() => {
                                          setSelectedRx(prev => {
                                            if (!prev) return prev;
                                            return {
                                              ...prev,
                                              medicines: prev.medicines.filter((_, i) => i !== index)
                                            };
                                          });
                                          if (cartItem) {
                                            setCart(prevCart => prevCart.filter(c => c.id !== cartItem.id));
                                          }
                                          toast.success(`${med.brand} removed from prescription.`);
                                        }}
                                        className="w-5 h-5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded flex items-center justify-center transition-colors mx-auto"
                                        title="Delete medicine from order"
                                      >
                                        <X size={12} strokeWidth={3} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Add extra medicines button – opens inventory search modal */}
                        <div className="pt-2">
                          <button
                            onClick={() => setShowAddMedToOrderModal(true)}
                            className="text-xs font-bold text-violet-600 hover:text-violet-700 flex items-center gap-1.5 group transition-colors"
                          >
                            <span className="w-4 h-4 rounded-full bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center text-[10px] font-black transition-colors">+</span>
                            Add Medicine to Order
                          </button>
                        </div>
                      </div>

                      {/* Pricing Summary Block */}
                      {(() => {
                        const isAllAvailable = selectedRx.medicines.every(med => {
                          const matched = inventory.find(i => 
                            (i.brandName || i.brand || '').toLowerCase().includes(med.brand.toLowerCase()) || 
                            (i.genericName || i.name || '').toLowerCase() === med.name.toLowerCase()
                          );
                          return matched && (matched.totalStock ?? 0) > 0;
                        });

                        return (
                          <div className="bg-slate-50/60 border border-slate-100 rounded-3xl p-5 flex justify-between items-center gap-4">
                            <div className="grid grid-cols-3 gap-x-6 gap-y-1.5 text-[10px] font-extrabold text-slate-500">
                              <div>Items: <span className="text-slate-800">{cart.length}</span></div>
                              <div>Total Qty: <span className="text-slate-800">
                                {isAllAvailable ? cart.reduce((acc, curr) => acc + (curr.strips * curr.stripSize) + curr.tablets, 0) : '—'}
                              </span></div>
                              <div>MRP Total: <span className="text-slate-800">
                                {isAllAvailable ? `₹${cart.reduce((acc, curr) => acc + (curr.strips * curr.mrp), 0).toFixed(2)}` : '₹—'}
                              </span></div>
                              <div>Discount: <span className="text-emerald-600">{isAllAvailable ? '₹0.00' : '₹—'}</span></div>
                              <div>GST (12%): <span className="text-slate-800">
                                {isAllAvailable ? `₹${(cart.reduce((acc, curr) => acc + (curr.strips * curr.mrp), 0) * 0.12).toFixed(2)}` : '₹—'}
                              </span></div>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Payable Amount</p>
                              <p className="text-2xl font-black text-emerald-600">
                                {isAllAvailable ? `₹${(cart.reduce((acc, curr) => acc + (curr.strips * curr.mrp), 0) * 1.12).toFixed(2)}` : '₹—'}
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Dispensing Actions */}
                      <div className="pt-2 border-t border-slate-100 flex justify-between gap-3">
                        <button 
                          onClick={() => { setSelectedRx(null); setCart([]); }}
                          className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
                        >
                          Cancel Order
                        </button>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => toast.success('Order draft configuration stored.')}
                            className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
                          >
                            Save as Draft
                          </button>
                          <button 
                            onClick={() => handleCheckout('Card')}
                            className="px-5 py-2 bg-blue-650 hover:bg-white hover:text-black bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-100"
                          >
                            Proceed to Payment →
                          </button>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-16 text-center text-slate-400 font-bold space-y-2">
                      <Pill size={36} className="mx-auto text-slate-300" />
                      <p>Select a prescription order from the queue to start dispensing.</p>
                    </div>
                  )}
                </div>

                {/* ── COLUMN 3: PATIENT SUMMARY & INFO (25% / lg:col-span-3) ── */}
                <div className="lg:col-span-3 space-y-6">
                  {selectedRx ? (
                    <>
                      {/* Patient Information */}
                      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Patient Information</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                            AS
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-905 text-sm">{selectedRx.patientName}</h4>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Male, 32 Yrs</p>
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold space-y-1">
                          <p>Phone: <span className="text-slate-800">{selectedRx.phone}</span></p>
                        </div>
                        <div className="border-t border-slate-50 pt-3">
                          <button 
                            onClick={() => toast.success('Patient profile opened.')}
                            className="w-full text-center py-2 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-655 hover:bg-slate-50 transition"
                          >
                            View Profile
                          </button>
                        </div>
                      </div>

                      {/* Order Summary */}
                      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">Order Summary</h4>
                        <div className="space-y-2 text-[10px] text-slate-500 font-bold">
                          <div className="flex justify-between"><span>Prescription ID</span><span className="text-slate-800">{selectedRx.id}</span></div>
                          <div className="flex justify-between"><span>Order Type</span><span className="text-slate-800">Prescription</span></div>
                          <div className="flex justify-between"><span>Prescription Date</span><span className="text-slate-800">{selectedRx.date}</span></div>
                          <div className="flex justify-between"><span>Doctor</span><span className="text-slate-800">{selectedRx.doctor}</span></div>
                          <div className="flex justify-between"><span>Appointment ID</span><span className="text-slate-800">{selectedRx.appointmentId}</span></div>
                          <div className="flex justify-between items-center">
                            <span>Payment Status</span>
                            <span className="bg-red-50 text-red-600 text-[8px] font-extrabold px-2 py-0.5 rounded-full border border-red-100 uppercase">Unpaid</span>
                          </div>
                        </div>
                      </div>

                      {/* Patient Prescription History (Old Prescriptions) */}
                      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Patient History &amp; Old Rx</h4>
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            {prescriptions.filter(p => (selectedRx.phone && p.phone === selectedRx.phone) || (p.patientName && p.patientName === selectedRx.patientName)).length} Total
                          </span>
                        </div>
                        <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                          {prescriptions.filter(p => (selectedRx.phone && p.phone === selectedRx.phone) || (p.patientName && p.patientName === selectedRx.patientName)).length === 0 ? (
                            <p className="text-[10px] text-slate-400 text-center py-2 font-semibold">No prescription history found.</p>
                          ) : (
                            prescriptions
                              .filter(p => (selectedRx.phone && p.phone === selectedRx.phone) || (p.patientName && p.patientName === selectedRx.patientName))
                              .map(rxItem => {
                                const isSelected = selectedRx?.id === rxItem.id;
                                return (
                                  <div
                                    key={rxItem.id}
                                    onClick={() => {
                                      setSelectedRx(rxItem);
                                      const newCart = rxItem.medicines.map(m => {
                                        const matchedInv = inventory.find(i => 
                                          (i.brandName || i.brand || '').toLowerCase().includes(m.brand.toLowerCase()) || 
                                          (i.genericName || i.name || '').toLowerCase() === m.name.toLowerCase()
                                        );
                                        const stripSize = matchedInv?.stripSize || matchedInv?.globalMedicineId?.stripSize || 10;
                                        const suggestions = calculateRequiredStrips(m.dosage, m.duration, stripSize);
                                        return {
                                          id: Math.random().toString(),
                                          itemId: matchedInv?._id || matchedInv?.id || '1',
                                          brand: m.brand,
                                          name: m.name,
                                          strips: suggestions.stripsSuggested || 1,
                                          tablets: suggestions.tabsRemainder || 0,
                                          mrp: matchedInv?.sellingPrice || 40,
                                          unitPrice: (matchedInv?.sellingPrice || 40) / stripSize,
                                          stripSize: stripSize,
                                          batchId: 'b1',
                                          batchNo: 'Default Batch',
                                          expiry: 'N/A'
                                        };
                                      });
                                      setCart(newCart);
                                      toast.success(`Selected prescription ${rxItem.id}`);
                                    }}
                                    className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                                      isSelected
                                        ? 'border-blue-500 bg-blue-50/30 shadow-xs'
                                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 bg-white'
                                    }`}
                                  >
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="font-black text-blue-600">{rxItem.id}</span>
                                      <span className="text-[9px] text-slate-400 font-bold">{rxItem.date}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-700 mt-1">{rxItem.doctor}</p>
                                    <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-50">
                                      <span className="text-[9px] text-slate-400">{rxItem.medicines?.length || 0} medicines</span>
                                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                        isSelected ? 'bg-blue-600 text-white' : (rxItem.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600')
                                      }`}>
                                        {isSelected ? 'Active' : rxItem.status}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>

                      {/* Rx Notes */}
                      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">Rx Notes</h4>
                        <textarea
                          placeholder="Add notes about this order..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-150 rounded-xl p-3 text-[10px] text-slate-700 resize-none focus:outline-none focus:bg-white focus:border-blue-200 transition duration-150"
                          rows={3}
                        />
                        <p className="text-[8px] text-slate-300 text-right">0/200</p>
                      </div>

                      {/* Order Timeline */}
                      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-3">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">Order Timeline</h4>
                        <div className="space-y-4">
                          {[
                            { step: 'Order Created', time: '10:30 AM', active: true },
                            { step: 'Payment Pending', time: null, active: false },
                            { step: 'Preparing', time: null, active: false },
                            { step: 'Ready for Pickup', time: null, active: false },
                            { step: 'Handed Over', time: null, active: false },
                            { step: 'Completed', time: null, active: false },
                          ].map((t, index) => (
                            <div key={index} className="flex items-start gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full mt-0.5 shrink-0 ${t.active ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-slate-200'}`} />
                              <div>
                                <p className={`text-[10px] font-bold ${t.active ? 'text-slate-800' : 'text-slate-400'}`}>{t.step}</p>
                                {t.time && <p className="text-[8px] text-slate-400 font-semibold mt-0.5">{t.time}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 text-center text-slate-400 font-bold text-xs py-8">
                      No prescription selected.
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

          {/* ================= TAB 3: WALK-IN SALES (POS WORKSPACE) ================= */}
          {tab === 'walk-in' && (
            <div className="space-y-6">
              
              {/* HEADER WITH ACTION BUTTONS */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-emerald-600">⚡</span> Walk-in Sales (POS)
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    Search medicines, scan barcodes, and complete walk-in sales in under 60 seconds
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
                  <button onClick={() => toast.success('Cart saved to held memory.')} className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                    <span>Hold Sale</span>
                  </button>
                  <button onClick={() => toast.success('List of held carts loaded.')} className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                    <span>Resume Sale</span>
                  </button>
                  <button onClick={() => { setCart([]); setWalkinCustomer({ name: '', phone: '' }); toast.success('New sale cart initialized.'); }} className="px-3.5 py-2 bg-emerald-50 text-emerald-650 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                    <span>+ New Sale</span>
                  </button>
                  <button onClick={() => toast.success('Search invoice console opened.')} className="px-3.5 py-2 bg-blue-50 text-blue-650 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                    <span>Search Invoice</span>
                  </button>
                </div>
              </div>

              {/* THREE COLUMN POS WORKSPACE */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* ── COLUMN 1: MEDICINE DISCOVERY (30% / lg:col-span-4) ── */}
                <div className="lg:col-span-4 bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                    <h3 className="text-sm font-black text-slate-905">Medicine Discovery</h3>
                    <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full">Keyboard: F2</span>
                  </div>

                  {/* Discovery Search Tab Controls */}
                  <div className="flex gap-1.5 p-1 bg-slate-50 border border-slate-200/60 rounded-xl">
                    <button className="flex-1 py-1.5 text-[10px] font-extrabold text-blue-600 bg-white rounded-lg shadow-xs">
                      Search Medicine
                    </button>
                    <button onClick={() => handleBarcodeScan()} className="flex-1 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 rounded-lg">
                      Scan Barcode
                    </button>
                    <button onClick={() => setShowFloatingSearch(true)} className="flex-1 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 rounded-lg">
                      Search Patient
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search medicine brand, salt, barcode, SKU..."
                      value={walkinSearchTerm}
                      onChange={(e) => setWalkinSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs focus:outline-none focus:bg-white transition-all"
                    />
                    <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
                  </div>

                  {/* Fast Category Filter Ribbon */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar scrollbar-thin">
                    {['All', 'Frequently Sold', 'Pain Relief', 'Antibiotics', 'Vitamins', 'OTC'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => {
                          if (cat !== 'All') {
                            setWalkinSearchTerm(cat);
                          } else {
                            setWalkinSearchTerm('');
                          }
                        }}
                        className={`text-[9px] font-bold px-2.5 py-1 rounded-full border shrink-0 transition-all ${
                          walkinSearchTerm === cat || (cat === 'All' && !walkinSearchTerm)
                            ? 'bg-blue-600 border-blue-600 text-white font-extrabold'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-350 hover:text-slate-805'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Discovery List */}
                  <div className="space-y-3.5 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                    {filteredLocalInventory.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs py-8 font-bold">No matching stock found.</div>
                    ) : (
                      filteredLocalInventory.map(item => {
                        const isLowStock = item.totalStock <= (item.reorderLevel || 10);
                        const brand = item.brandName || item.brand || item.name;
                        const name = item.genericName || item.name;
                        const strength = item.strength || item.globalMedicineId?.strength || '—';
                        const rack = item.rackNumber || item.rack || '—';
                        const price = item.sellingPrice || 40;
                        const stripSize = item.stripSize || item.globalMedicineId?.stripSize || 10;
                        return (
                          <div 
                            key={item._id || item.id}
                            className="p-4 bg-white border border-slate-100 hover:border-slate-250 hover:bg-slate-50/20 rounded-2xl flex flex-col justify-between gap-3 shadow-xs hover:shadow-sm transition-all"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h4 className="font-extrabold text-slate-905 text-xs">{brand}</h4>
                                <p className="text-[10px] text-slate-405 font-bold mt-0.5">{name} · {strength}</p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">Rack: {rack}</span>
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                    isLowStock ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                                  }`}>
                                    {isLowStock ? `Low Stock: ${item.totalStock}` : `In Stock: ${item.totalStock}`}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-black text-slate-900">₹{price}</p>
                                <p className="text-[8px] text-slate-400 font-semibold mt-0.5">Strip of {stripSize}</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 border-t border-slate-50 pt-2.5">
                              <button
                                onClick={() => handleAddToCart(item, false, 1)}
                                className="flex-1 text-center py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-650 rounded-xl text-[10px] font-extrabold transition-all"
                              >
                                + Add Strip
                              </button>
                              <button
                                onClick={() => handleAddToCart(item, true, 1)}
                                className="flex-1 text-center py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] font-extrabold transition-all"
                              >
                                + Add Tablet
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ── COLUMN 2: SHOPPING CART (45% / lg:col-span-5) ── */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                    
                    {/* Cart Header */}
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <h3 className="text-sm font-black text-slate-905">Shopping Cart ({cart.length} items)</h3>
                      {cart.length > 0 && (
                        <button 
                          onClick={() => { setCart([]); toast.success('Cart cleared.'); }}
                          className="text-[10px] text-red-500 font-bold hover:underline"
                        >
                          Clear Cart
                        </button>
                      )}
                    </div>

                    {/* Cart Rows */}
                    {cart.length === 0 ? (
                      <div className="p-10 text-center text-slate-400 font-bold text-xs space-y-2">
                        <Pill size={32} className="mx-auto text-slate-200" />
                        <p>Your shopping cart is empty.</p>
                        <p className="text-[10px] text-slate-300 font-semibold">Search medicines on the left column or scan a barcode to add items.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-50 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                        {cart.map(item => {
                          const itemTotal = (item.strips * item.mrp) + (item.tablets * item.unitPrice);
                          return (
                            <div key={item.id} className="py-3.5 flex justify-between items-center gap-4 text-xs">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-extrabold text-slate-905 truncate">{item.brand}</h4>
                                <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Batch: {item.batchNo} | Exp: {item.expiry}</p>
                              </div>
                              <div className="flex items-center gap-4 shrink-0">
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleUpdateCartQty(item.id, 'strips', -1)} className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-bold text-slate-655">-</button>
                                  <span className="text-[10px] font-black w-6 text-center">{item.strips} str</span>
                                  <button onClick={() => handleUpdateCartQty(item.id, 'strips', 1)} className="w-5 h-5 bg-blue-50 hover:bg-blue-100 rounded flex items-center justify-center font-bold text-blue-600">+</button>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleUpdateCartQty(item.id, 'tablets', -1)} className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-bold text-slate-655">-</button>
                                  <span className="text-[10px] font-black w-6 text-center">{item.tablets} tab</span>
                                  <button onClick={() => handleUpdateCartQty(item.id, 'tablets', 1)} className="w-5 h-5 bg-blue-50 hover:bg-blue-100 rounded flex items-center justify-center font-bold text-blue-600">+</button>
                                </div>
                                <span className="font-black text-slate-900 w-16 text-right">₹{itemTotal.toFixed(2)}</span>
                                <button 
                                  onClick={() => {
                                    setCart(cart.filter(c => c.id !== item.id));
                                    toast.success(`${item.brand} removed from cart.`);
                                  }}
                                  className="p-1 hover:bg-red-50 text-slate-350 hover:text-red-500 rounded-lg transition"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add Medicine Manually (Quick Row for Keyboard input) */}
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Quick Entry Row</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Medicine Name (E.g. Dolo)"
                          id="manual-name"
                          className="flex-[2] bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Qty"
                          id="manual-qty"
                          className="w-16 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:bg-white text-center"
                        />
                        <button
                          onClick={() => {
                            const nameVal = document.getElementById('manual-name')?.value;
                            const qtyVal = parseInt(document.getElementById('manual-qty')?.value) || 1;
                            const matched = globalCatalog.find(c => c.brand.toLowerCase().includes(nameVal.toLowerCase()) || c.name.toLowerCase().includes(nameVal.toLowerCase()));
                            if (matched) {
                              handleAddToCart(matched, false, qtyVal);
                              document.getElementById('manual-name').value = '';
                              document.getElementById('manual-qty').value = '';
                            } else {
                              toast.error(`"${nameVal || 'Input'}" not found in pharmacy catalog.`);
                            }
                          }}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Recommended products carousel */}
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Recommended Products</p>
                      <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
                        {[
                          { brand: 'ORS Electral', desc: 'Electrolytes Powder', mrp: 12, id: 'c5' },
                          { brand: 'Cetirizine 10mg', desc: 'Anti-allergy Tablet', mrp: 25, id: 'c4' },
                          { brand: 'Digene Antacid', desc: 'Acidity relief syrup', mrp: 85, id: 'c6' },
                          { brand: 'Vicks Vaporub', desc: 'Inhalation ointment', mrp: 90, id: 'c7' },
                        ].map((rec, idx) => (
                          <div key={idx} className="bg-slate-50 border border-slate-150 rounded-2xl p-3 min-w-[130px] flex flex-col justify-between shrink-0 space-y-2">
                            <div>
                              <p className="font-extrabold text-[10px] text-slate-805 truncate">{rec.brand}</p>
                              <p className="text-[8px] text-slate-400 truncate">{rec.desc}</p>
                            </div>
                            <div className="flex justify-between items-center border-t border-slate-200/50 pt-1.5">
                              <span className="text-[10px] font-black text-slate-900">₹{rec.mrp}</span>
                              <button
                                onClick={() => {
                                  const matched = globalCatalog.find(c => c.brand.toLowerCase().includes(rec.brand.toLowerCase()) || c.id === rec.id);
                                  if (matched) {
                                    handleAddToCart(matched, false, 1);
                                  } else {
                                    toast.success(`${rec.brand} added.`);
                                  }
                                }}
                                className="px-2 py-0.5 bg-blue-50 text-blue-650 hover:bg-blue-100 rounded text-[9px] font-bold"
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

                {/* ── COLUMN 3: CHECKOUT & PAYMENT (25% / lg:col-span-3) ── */}
                <div className="lg:col-span-3 space-y-6">
                  
                  {/* Customer Card */}
                  <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Customer Registry</h4>
                      <button onClick={() => toast.success('New patient profile registration wizard.')} className="text-[10px] text-blue-600 font-bold hover:underline">Add Customer</button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">Customer Phone</label>
                        <input
                          type="text"
                          value={walkinCustomer.phone}
                          onChange={(e) => setWalkinCustomer({ ...walkinCustomer, phone: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:bg-white"
                          placeholder="Phone number (optional)"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">Customer Name</label>
                        <input
                          type="text"
                          value={walkinCustomer.name}
                          onChange={(e) => setWalkinCustomer({ ...walkinCustomer, name: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:bg-white"
                          placeholder="Name (optional)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">Order Summary</h4>
                    <div className="space-y-2 text-[10px] text-slate-500 font-bold">
                      <div className="flex justify-between">
                        <span>Total Items</span>
                        <span className="text-slate-800">{cart.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Qty</span>
                        <span className="text-slate-800">
                          {cart.reduce((acc, curr) => acc + (curr.strips * curr.stripSize) + curr.tablets, 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>MRP Total</span>
                        <span className="text-slate-800">
                          ₹{cart.reduce((acc, curr) => acc + (curr.strips * curr.mrp) + (curr.tablets * curr.unitPrice), 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount</span>
                        <span className="text-emerald-600">₹0.00</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-50 pb-2">
                        <span>GST (12%)</span>
                        <span className="text-slate-800">
                          ₹{(cart.reduce((acc, curr) => acc + (curr.strips * curr.mrp) + (curr.tablets * curr.unitPrice), 0) * 0.12).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-slate-800 font-black text-xs">Grand Total</span>
                        <span className="text-base font-black text-emerald-600">
                          ₹{(cart.reduce((acc, curr) => acc + (curr.strips * curr.mrp) + (curr.tablets * curr.unitPrice), 0) * 1.12).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Panel */}
                  <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">Payment Processing</h4>
                    
                    <div className="grid grid-cols-3 gap-2">
                      {['Cash', 'UPI', 'Card'].map(mode => (
                        <button
                          key={mode}
                          onClick={() => toast.success(`Selected payment method: ${mode}`)}
                          className="py-2 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 text-slate-700 font-extrabold rounded-xl text-[10px] transition text-center"
                        >
                          {mode}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2.5 pt-2">
                      <div>
                        <label className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mb-1">Received Cash Amount</label>
                        <input
                          type="text"
                          placeholder="Enter tendered amount..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-right font-bold text-slate-800"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 font-extrabold">
                        <span>Balance Change:</span>
                        <span className="text-emerald-600">₹0.00</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCheckout('Cash')}
                      disabled={cart.length === 0}
                      className={`w-full py-3 rounded-2xl text-xs font-black text-white text-center transition shadow-md ${
                        cart.length > 0
                          ? 'bg-emerald-650 hover:bg-emerald-700 shadow-emerald-100'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                      }`}
                    >
                      Complete Checkout (F5) →
                    </button>
                  </div>

                </div>

              </div>

              {/* RECENT SALES REGISTRY */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-slate-905">Recent Walk-in Sales</h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Logs of recently completed walk-in billing transactions</p>
                  </div>
                  <button onClick={() => toast.success('Full sales report loaded.')} className="text-[10px] text-blue-600 font-bold hover:underline">View All</button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-2">Invoice No</th>
                        <th className="py-2.5 px-2">Customer</th>
                        <th className="py-2.5 px-2">Items</th>
                        <th className="py-2.5 px-2">Amount</th>
                        <th className="py-2.5 px-2">Payment Mode</th>
                        <th className="py-2.5 px-2">Time</th>
                        <th className="py-2.5 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold text-slate-655">
                      {sales.filter(s => s.type === 'Walk-in').slice(0, 4).map(sale => (
                        <tr key={sale.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 px-2 text-slate-905 font-black">{sale.id}</td>
                          <td className="py-3 px-2">{sale.patientName}</td>
                          <td className="py-3 px-2">3 items</td>
                          <td className="py-3 px-2 text-slate-905">₹{sale.amount}</td>
                          <td className="py-3 px-2">
                            <span className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded-full">{sale.paymentMode}</span>
                          </td>
                          <td className="py-3 px-2 font-semibold text-slate-400">{sale.estFinish}</td>
                          <td className="py-3 px-2">
                            <span className="bg-emerald-50 text-emerald-600 text-[9px] px-2 py-0.5 rounded-full">Completed</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* ================= TAB 5: PATIENT PRESCRIPTION CONSOLE ================= */}
          {tab === 'patients' && (() => {
            // Group prescriptions by patient to get unique patient list
            const uniquePatients = [];
            prescriptions.forEach(p => {
              if (!uniquePatients.find(up => up.phone === p.phone)) {
                uniquePatients.push({
                  name: p.patientName,
                  phone: p.phone,
                  id: `PT-${p.id.replace('RX-', '')}`,
                  age: '32 Yrs',
                  gender: 'Male',
                  status: 'Frequent Buyer',
                  lastVisit: p.date,
                  prescriptionsCount: prescriptions.filter(rx => rx.phone === p.phone).length
                });
              }
            });

            // Filter patient list based on search term
            const query = patientConsoleSearch.trim().toLowerCase();
            let matchedPatients = uniquePatients;
            let directAptMatch = null;

            if (query) {
              // Check if query is an Appointment ID
              const aptMatch = prescriptions.find(p => p.appointmentId?.toLowerCase() === query);
              if (aptMatch) {
                directAptMatch = aptMatch;
              }

              matchedPatients = uniquePatients.filter(p => 
                p.name.toLowerCase().includes(query) ||
                p.phone.includes(query) ||
                p.id.toLowerCase().includes(query)
              );
            }

            // Auto-load logic if direct Appointment ID match is found
            if (directAptMatch && (!selectedConsolePatient || selectedConsolePatient.name !== directAptMatch.patientName)) {
              const matchedP = uniquePatients.find(up => up.phone === directAptMatch.phone);
              if (matchedP) {
                // Set immediately inside render frame to avoid infinite loops, check condition first
                setTimeout(() => {
                  setSelectedConsolePatient(matchedP);
                  setActiveConsoleRx(directAptMatch);
                }, 0);
              }
            }

            // Fallback default: load first patient if none selected
            if (!selectedConsolePatient && uniquePatients.length > 0) {
              const firstP = uniquePatients[0];
              const firstRx = prescriptions.find(rx => rx.phone === firstP.phone);
              setTimeout(() => {
                setSelectedConsolePatient(firstP);
                setActiveConsoleRx(firstRx);
              }, 0);
            }

            // Get active patient's prescriptions (History)
            const patientHistory = selectedConsolePatient 
              ? prescriptions.filter(rx => rx.phone === selectedConsolePatient.phone)
              : [];

            return (
              <div className="space-y-6">
                
                {/* PAGE HEADER */}
                <div className="flex justify-between items-center px-1">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-blue-600">👤</span> Patient Prescription Console
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Access history, track clinical instructions, and reorder previous patient medications
                    </p>
                  </div>
                </div>

                {/* THREE COLUMN WORKSPACE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                  {/* ── COLUMN 1: PATIENT SEARCH (30% / lg:col-span-4) ── */}
                  <div className="lg:col-span-4 bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                      <h3 className="text-sm font-black text-slate-905">Patient Search</h3>
                      <span className="text-[10px] text-slate-400 font-bold">F3</span>
                    </div>

                    {/* Search Field */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by phone, patient ID, appointment ID..."
                        value={patientConsoleSearch}
                        onChange={(e) => setPatientConsoleSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs focus:outline-none focus:bg-white transition-all"
                      />
                      <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
                    </div>

                    {/* Search Results list */}
                    <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar pr-1">
                      {matchedPatients.length === 0 ? (
                        <div className="text-center text-slate-400 text-xs py-8 font-bold">No patients found.</div>
                      ) : (
                        matchedPatients.map(p => {
                          const isSelected = selectedConsolePatient?.phone === p.phone;
                          return (
                            <div
                              key={p.phone}
                              onClick={() => {
                                setSelectedConsolePatient(p);
                                const latestRx = prescriptions.find(rx => rx.phone === p.phone);
                                setActiveConsoleRx(latestRx);
                              }}
                              className={`p-4 rounded-2xl border cursor-pointer transition-all flex justify-between items-center ${
                                isSelected
                                  ? 'border-blue-500 bg-blue-50/20 shadow-sm'
                                  : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 bg-white'
                              }`}
                            >
                              <div>
                                <h4 className="font-extrabold text-slate-905 text-xs">{p.name}</h4>
                                <p className="text-[10px] text-slate-405 font-bold mt-0.5">{p.gender}, {p.age} · ID: {p.id}</p>
                                <p className="text-[9px] text-slate-400 mt-1">Phone: {p.phone}</p>
                                <div className="flex gap-1.5 mt-2">
                                  <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">Visits: {p.prescriptionsCount}</span>
                                  <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-black">{p.status}</span>
                                </div>
                              </div>
                              <ChevronRight size={14} className={isSelected ? 'text-blue-500' : 'text-slate-300'} />
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* ── COLUMN 2: ACTIVE PRESCRIPTION WORKSPACE (45% / lg:col-span-5) ── */}
                  <div className="lg:col-span-5 space-y-6">
                    {activeConsoleRx ? (
                      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
                        
                        {/* Prescription Metadata */}
                        <div className="border-b border-slate-100 pb-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{activeConsoleRx.id}</span>
                                <span className="text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">
                                  Active Prescription
                                </span>
                              </div>
                              <h3 className="font-extrabold text-slate-900 mt-2">Doctor: {activeConsoleRx.doctor}</h3>
                              <p className="text-[10px] text-slate-400 font-semibold">Appointment ID: {activeConsoleRx.appointmentId} · Clinic Visit</p>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold">{activeConsoleRx.date}</span>
                          </div>
                          
                          <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100 text-[10px] text-slate-600 font-semibold space-y-1">
                            <p>Diagnosis: <span className="text-slate-805 font-bold">Viral Fever with Sore Throat</span></p>
                            <p>Clinical Instructions: <span className="text-slate-805">Drink warm water, avoid cold items. Review in 5 days.</span></p>
                          </div>
                        </div>

                        {/* Prescription Medicines List */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Prescribed Medicines</h4>

                          <div className="divide-y divide-slate-100">
                            {activeConsoleRx.medicines.map((med, idx) => {
                              const matchedInv = inventory.find(i => 
                                (i.brandName || i.brand || '').toLowerCase().includes(med.brand.toLowerCase()) || 
                                (i.genericName || i.name || '').toLowerCase() === med.name.toLowerCase()
                              );
                              const stock = matchedInv ? (matchedInv.totalStock ?? 0) : 0;
                              const price = matchedInv?.sellingPrice || 40;

                              return (
                                <div key={idx} className="py-4 flex justify-between items-start gap-4 text-xs">
                                  <div>
                                    <h4 className="font-extrabold text-slate-905">{med.brand}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">{med.name} · {med.dosage}</p>
                                    <p className="text-[9px] text-slate-500 font-semibold mt-1">Instructions: {med.dosage} for {med.duration}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                        stock === 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                                      }`}>
                                        {stock === 0 ? 'Out of Stock' : `Available: ${stock} tabs`}
                                      </span>
                                      {stock === 0 && (
                                        <span className="text-[8px] text-blue-600 font-bold underline cursor-pointer" onClick={() => { setWalkinSearchTerm(med.name); setActiveTab('walk-in'); toast.success('Search alternatives loaded.'); }}>
                                          Alternatives Available
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right flex flex-col items-end gap-1.5">
                                    <span className="font-black text-slate-900">₹{price}</span>
                                    <button
                                      onClick={() => {
                                        if (matchedInv) {
                                          handleAddToCart(matchedInv, false, 1);
                                          toast.success(`${med.brand} added to Order Cart.`);
                                        } else {
                                          toast.error('Item inventory record unavailable.');
                                        }
                                      }}
                                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-650 rounded-lg text-[9px] font-black"
                                    >
                                      + Add to Order
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Prescription Actions Summary */}
                        <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold">Estimated Prescribed Cost</p>
                            <p className="text-lg font-black text-slate-900">
                              ₹{activeConsoleRx.medicines.reduce((acc, med) => {
                                const matchedCat = globalCatalog.find(c => c.brand.toLowerCase().includes(med.brand.toLowerCase()));
                                return acc + (matchedCat?.stripPrice || 40);
                              }, 0).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                // Load all medicines into current dispensing cart
                                const newCart = activeConsoleRx.medicines.map(m => {
                                  const matchedCat = globalCatalog.find(c => c.brand.toLowerCase().includes(m.brand.toLowerCase()) || c.name.toLowerCase() === m.name.toLowerCase());
                                  const stripSize = matchedCat?.stripSize || 10;
                                  const suggestions = calculateRequiredStrips(m.dosage, m.duration, stripSize);
                                  return {
                                    id: Math.random().toString(),
                                    itemId: matchedCat?.id || '1',
                                    brand: m.brand,
                                    name: m.name,
                                    strips: suggestions.stripsSuggested || 1,
                                    tablets: suggestions.tabsRemainder || 0,
                                    mrp: matchedCat?.stripPrice || 40,
                                    unitPrice: matchedCat?.unitPrice || 4,
                                    stripSize: stripSize,
                                    batchId: 'b1',
                                    batchNo: 'B-PR2026',
                                    expiry: '2027-08-31'
                                  };
                                });
                                setCart(newCart);
                                setSelectedRx(activeConsoleRx);
                                setActiveTab('orders');
                                toast.success('Loaded active prescription medicines into filling console.');
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-100"
                            >
                              Proceed to Dispense →
                            </button>
                          </div>
                        </div>

                      </div>
                    ) : (
                      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-16 text-center text-slate-400 font-bold space-y-2">
                        <FileText size={36} className="mx-auto text-slate-300" />
                        <p>No active prescription loaded.</p>
                      </div>
                    )}
                  </div>

                  {/* ── COLUMN 3: PRESCRIPTION HISTORY (25% / lg:col-span-3) ── */}
                  <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">Prescription History</h4>
                      
                      <div className="space-y-3.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
                        {patientHistory.length === 0 ? (
                          <div className="text-center text-slate-405 text-xs py-4 font-bold">No history records.</div>
                        ) : (
                          patientHistory.map(rx => {
                            const isActive = activeConsoleRx?.id === rx.id;
                            return (
                              <div
                                key={rx.id}
                                onClick={() => setActiveConsoleRx(rx)}
                                className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-3 ${
                                  isActive
                                    ? 'border-blue-500 bg-blue-50/10 shadow-xs font-extrabold'
                                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 bg-white'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{rx.id}</span>
                                  <span className="text-[8px] font-bold text-slate-400">{rx.date}</span>
                                </div>
                                <div className="text-[10px] text-slate-600 space-y-1">
                                  <p>Doctor: <span className="text-slate-805">{rx.doctor}</span></p>
                                  <p>Medicines: <span className="text-slate-805">{rx.medicines.length} items</span></p>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-50 pt-2.5">
                                  <span className="text-[8px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-black">Completed</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Reorder medication sequence
                                      const reorderCart = rx.medicines.map(m => {
                                        const matchedCat = globalCatalog.find(c => c.brand.toLowerCase().includes(m.brand.toLowerCase()) || c.name.toLowerCase() === m.name.toLowerCase());
                                        const stripSize = matchedCat?.stripSize || 10;
                                        const suggestions = calculateRequiredStrips(m.dosage, m.duration, stripSize);
                                        return {
                                          id: Math.random().toString(),
                                          itemId: matchedCat?.id || '1',
                                          brand: m.brand,
                                          name: m.name,
                                          strips: suggestions.stripsSuggested || 1,
                                          tablets: suggestions.tabsRemainder || 0,
                                          mrp: matchedCat?.stripPrice || 40,
                                          unitPrice: matchedCat?.unitPrice || 4,
                                          stripSize: stripSize,
                                          batchId: 'b1',
                                          batchNo: 'B-PR2026',
                                          expiry: '2027-08-31'
                                        };
                                      });
                                      setCart(reorderCart);
                                      setSelectedRx(rx);
                                      setActiveTab('orders');
                                      toast.success(`Reordering all medicines from prescription ${rx.id}.`);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-650 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black shadow-xs transition"
                                  >
                                    Reorder
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                </div>

              </div>
            );
          })()}

          {/* ================= TAB 4: MASTER CATALOGUE ================= */}
          {tab === 'catalogue' && (
            <div className="space-y-6">
              
              {/* PAGE HEADER */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <span className="text-blue-600">🌐</span> Global Medicine Catalogue
                  </h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    Search, browse and add medicines from the Global Medicine Master reference database
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
                  <button onClick={() => toast.success('Advanced filter builder console.')} className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                    <span>Advanced Filters</span>
                  </button>
                  <button onClick={() => handleBarcodeScan()} className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                    <span>Scan Barcode</span>
                  </button>
                  <button onClick={() => toast.success('Catalogue master repository sync complete.')} className="px-3.5 py-2 bg-blue-50 text-blue-650 rounded-xl text-xs font-bold transition flex items-center gap-1.5">
                    <span>Refresh Catalogue</span>
                  </button>
                </div>
              </div>

              {/* LIVE SUMMARY KPI CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Total Medicines', count: '128,456', desc: '+ 245 this week', color: 'text-blue-600 bg-blue-50/50', icon: '💊' },
                  { label: 'Active Medicines', count: '112,589', desc: '87.6% of total', color: 'text-emerald-600 bg-emerald-50/50', icon: '✅' },
                  { label: 'Manufacturers', count: '2,356', desc: 'Global active', color: 'text-purple-600 bg-purple-50/50', icon: '🏢' },
                  { label: 'Therapeutic Categories', count: '24', desc: 'Major categories', color: 'text-amber-600 bg-amber-50/50', icon: '🧬' },
                  { label: 'Recently Added', count: '245', desc: 'This week', color: 'text-rose-600 bg-rose-50/50', icon: '✨' },
                  { label: 'Price Updated', count: '1,245', desc: 'This week', color: 'text-slate-600 bg-slate-100/50', icon: '📈' },
                ].map((k, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[100px]">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{k.icon}</span>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{k.label}</p>
                    </div>
                    <div className="mt-2.5">
                      <h3 className="text-lg font-black text-slate-900 leading-tight">{k.count}</h3>
                      <p className="text-[8px] text-slate-400 font-semibold mt-0.5">{k.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* THREE COLUMN GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* ── LEFT & CENTER PANEL: RESULTS (9 COLUMNS) ── */}
                <div className="lg:col-span-9 space-y-6">
                  
                  {/* Discovery Search Panel */}
                  <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                    <div className="flex gap-1.5 p-1 bg-slate-50 border border-slate-200/60 rounded-xl max-w-md">
                      <button className="flex-1 py-1.5 text-[10px] font-extrabold text-blue-600 bg-white rounded-lg shadow-xs">Search Medicine</button>
                      <button onClick={() => handleBarcodeScan()} className="flex-1 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 rounded-lg">Scan Barcode</button>
                      <button onClick={() => toast.success('Advanced search criteria builder loaded.')} className="flex-1 py-1.5 text-[10px] font-bold text-slate-500 hover:text-slate-800 rounded-lg">Advanced Search</button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search global masters by name, salt composition, manufacturer, barcode..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2.5 text-xs focus:outline-none focus:bg-white transition-all"
                      />
                      <Search size={14} className="absolute left-2.5 top-3.5 text-slate-400" />
                    </div>

                    {/* Quick filter chips */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                      {['All', 'Pain Relief', 'Antibiotics', 'Diabetes', 'Cardiac', 'Vitamins & Supplements', 'OTC'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => {
                            if (cat !== 'All') {
                              setSearchTerm(cat);
                            } else {
                              setSearchTerm('');
                            }
                          }}
                          className={`text-[9px] font-bold px-3 py-1 rounded-full border shrink-0 transition-all ${
                            searchTerm === cat || (cat === 'All' && !searchTerm)
                              ? 'bg-blue-600 border-blue-600 text-white font-black'
                              : 'bg-white border-slate-200 text-slate-505 hover:border-slate-350 hover:text-slate-800'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Results Table */}
                  <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Search Results ({filteredCatalog.length})</span>
                    </div>

                    {filteredCatalog.length === 0 ? (
                      <div className="text-center py-16 space-y-4">
                        <FileText size={44} className="mx-auto text-slate-350 animate-pulse" />
                        <div>
                          <h3 className="font-extrabold text-slate-905 text-sm">Medicine not found in the Global Catalogue</h3>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1">Submit a request to authorize adding this medication master.</p>
                        </div>
                        <button
                          onClick={() => setShowRequestNewMedicineModal(true)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-blue-100"
                        >
                          + Request New Medicine
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                              <th className="py-2.5 px-2">Medicine Details</th>
                              <th className="py-2.5 px-2">Salt / Generic Name</th>
                              <th className="py-2.5 px-2">Strength</th>
                              <th className="py-2.5 px-2">Form</th>
                              <th className="py-2.5 px-2">Manufacturer</th>
                              <th className="py-2.5 px-2">MRP (₹)</th>
                              <th className="py-2.5 px-2">Status</th>
                              <th className="py-2.5 px-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 font-semibold text-slate-655">
                            {filteredCatalog.map(item => (
                              <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                <td className="py-3 px-2">
                                  <p className="font-extrabold text-slate-905">{item.brand}</p>
                                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{item.name}</p>
                                </td>
                                <td className="py-3 px-2 text-[10px] text-slate-500 font-bold">{item.salt}</td>
                                <td className="py-3 px-2 font-bold text-slate-700">{item.strength || '650 mg'}</td>
                                <td className="py-3 px-2 font-bold text-slate-500">{item.form || 'Tablet'}</td>
                                <td className="py-3 px-2">{item.manufacturer}</td>
                                <td className="py-3 px-2 font-black text-slate-900">₹{item.stripPrice}</td>
                                <td className="py-3 px-2">
                                  <span className="bg-emerald-50 text-emerald-600 text-[9px] px-2 py-0.5 rounded-full font-black border border-emerald-100">
                                    Active
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => setSelectedDetailCatalogItem(item)}
                                      className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-[9px] font-black transition flex items-center gap-0.5"
                                    >
                                      <Eye size={11} /> Details
                                    </button>
                                    <button
                                      onClick={() => {
                                        const existing = inventory.find(inv => inv.globalMedicineId === item.id || inv.catalogId === item.id || inv._id === item.id || inv.id === item.id);
                                        if (existing) {
                                          toast.error('This medicine already exists in your pharmacy. You can create a new stock batch instead.');
                                          setSelectedCatalogItem(existing);
                                          setShowAddBatchModal(true);
                                          return;
                                        }

                                        setOnboardingGlobalItem(item);
                                        setOnboardingMasterDetails({
                                          brand: item.brand || '',
                                          name: item.name || '',
                                          salt: item.salt || '',
                                          strength: item.strength || '',
                                          form: item.form || '',
                                          manufacturer: item.manufacturer || '',
                                          stripSize: item.stripSize || 10,
                                          stripPrice: item.stripPrice || 100
                                        });
                                        setOnboardingLocalDetails({
                                          displayName: item.brand || item.name || '',
                                          brandName: item.brand || '',
                                          supplier: 'Zydus Corp',
                                          supplierSku: `SKU-${item.id}`,
                                          internalCode: `INT-${item.id}`,
                                          rack: 'Rack A-3',
                                          shelf: 'Shelf B-1',
                                          bin: 'Drawer C-2',
                                          minStock: 20,
                                          reorderLevel: 50,
                                          sellingEnabled: true,
                                          purchaseEnabled: true
                                        });
                                        setOnboardingStep(1);
                                        setShowOnboardingWizard(true);
                                      }}
                                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[9px] font-black transition"
                                    >
                                      + Add to Pharmacy
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Bottom Analytics Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Card 1: Top Selling */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Top Selling</h4>
                        <button onClick={() => toast.success('Top sales analytics.')} className="text-[9px] text-blue-600 font-bold hover:underline">View All</button>
                      </div>
                      <div className="space-y-3">
                        {globalCatalog.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <div>
                              <p className="font-extrabold text-slate-905">{item.brand}</p>
                              <p className="text-[8px] text-slate-400 font-semibold">{item.name}</p>
                            </div>
                            <span className="text-[9px] bg-slate-50 text-slate-600 font-bold px-2 py-0.5 rounded">
                              {1200 - (idx * 200)} units
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Card 2: Recently Added */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Recently Added</h4>
                        <button onClick={() => toast.success('New catalog items.')} className="text-[9px] text-blue-600 font-bold hover:underline">View All</button>
                      </div>
                      <div className="space-y-3">
                        {globalCatalog.slice(2, 5).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <div>
                              <p className="font-extrabold text-slate-905">{item.brand}</p>
                              <p className="text-[8px] text-slate-400 font-semibold">{item.name}</p>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold">Today</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Card 3: Top Manufacturers */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Top Manufacturers</h4>
                        <button onClick={() => toast.success('Manufacturers directory.')} className="text-[9px] text-blue-600 font-bold hover:underline">View All</button>
                      </div>
                      <div className="space-y-3 text-xs font-bold text-slate-655">
                        <div className="flex justify-between"><span>GSK Pharma</span><span className="text-slate-400">12,456 meds</span></div>
                        <div className="flex justify-between"><span>Micro Labs Ltd.</span><span className="text-slate-400">8,745 meds</span></div>
                        <div className="flex justify-between"><span>Cipla Ltd.</span><span className="text-slate-400">6,521 meds</span></div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* ── RIGHT PANEL (3 COLUMNS) ── */}
                <div className="lg:col-span-3 space-y-6">
                  
                  {/* Card 1: Medicine Categories */}
                  <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">Medicine Categories</h4>
                    <div className="space-y-2.5 text-xs font-bold text-slate-655">
                      <div className="flex justify-between items-center"><span>Pain Relief</span><span className="text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">12,584</span></div>
                      <div className="flex justify-between items-center"><span>Antibiotics</span><span className="text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">8,652</span></div>
                      <div className="flex justify-between items-center"><span>Diabetes</span><span className="text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">6,245</span></div>
                      <div className="flex justify-between items-center"><span>Cardiac</span><span className="text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">4,856</span></div>
                      <div className="flex justify-between items-center"><span>Skin Care</span><span className="text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">2,854</span></div>
                    </div>
                  </div>

                  {/* Card 2: Quick Actions */}
                  <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setShowNewMedicineModal(true)} className="p-3 bg-slate-50 border border-slate-100 hover:bg-blue-50/30 rounded-2xl flex flex-col gap-2 items-start transition text-left cursor-pointer">
                        <span className="text-[10px] font-black text-slate-700 leading-tight">Create Medicine</span>
                      </button>
                      <button onClick={() => setShowRequestNewMedicineModal(true)} className="p-3 bg-slate-50 border border-slate-100 hover:bg-emerald-50/30 rounded-2xl flex flex-col gap-2 items-start transition text-left cursor-pointer">
                        <span className="text-[10px] font-black text-slate-700 leading-tight">Request Medicine</span>
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Medicine Alerts */}
                  <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-5 space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-2">Medicine Alerts</h4>
                    <div className="space-y-3 text-[10px] text-slate-500 font-bold">
                      <div className="p-2.5 bg-red-50 text-red-700 rounded-xl">Low Stock: 142 medicines are low in stock.</div>
                      <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">Near Expiry: 86 batches expire within 30 days.</div>
                      <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">Price Change: 124 medicines updated today.</div>
                    </div>
                  </div>

                </div>

              </div>

              {/* SLIDE-OVER DETAIL PANEL */}
              {selectedDetailCatalogItem && (
                <div className="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl border-l border-slate-200 z-50 p-6 flex flex-col justify-between animate-slide-in">
                  <div className="space-y-6 overflow-y-auto custom-scrollbar pr-1 flex-1 pb-4">
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{selectedDetailCatalogItem.barcode || 'MASTER'}</span>
                        <h3 className="text-base font-black text-slate-905 mt-2">{selectedDetailCatalogItem.brand}</h3>
                        <p className="text-xs text-slate-405 font-bold">{selectedDetailCatalogItem.name}</p>
                      </div>
                      <button onClick={() => setSelectedDetailCatalogItem(null)} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-150 rounded-xl"><X size={20} /></button>
                    </div>

                    <div className="space-y-4 text-xs font-bold text-slate-655">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Salt Composition</span>
                        <p className="text-slate-805 mt-0.5">{selectedDetailCatalogItem.salt}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Manufacturer</span>
                        <p className="text-slate-805 mt-0.5">{selectedDetailCatalogItem.manufacturer}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] text-slate-400 block">MRP Price</span>
                          <p className="text-slate-805 mt-0.5">₹{selectedDetailCatalogItem.stripPrice}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Package Size</span>
                          <p className="text-slate-805 mt-0.5">{selectedDetailCatalogItem.stripSize || 10} tabs / strip</p>
                        </div>
                      </div>
                      <div className="p-3 bg-red-50 text-red-700 border border-red-100 rounded-xl text-[10px]">
                        <strong>Schedule Type:</strong> Schedule H Prescribed Drug - Requires active doctor prescription before dispensing.
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Common Side Effects</span>
                        <p className="text-slate-805 font-medium mt-0.5">Nausea, dizziness, mild headache, drowsiness.</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 flex gap-2 shrink-0">
                    <button
                      onClick={() => {
                        handleAddToCart(selectedDetailCatalogItem, false, 1);
                        setSelectedDetailCatalogItem(null);
                        setActiveTab('walk-in');
                        toast.success(`${selectedDetailCatalogItem.brand} added to Walk-in Cart.`);
                      }}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black text-center shadow-md shadow-blue-100"
                    >
                      Add to Walk-in
                    </button>
                    <button
                      onClick={() => {
                        const item = selectedDetailCatalogItem;
                        const existing = inventory.find(inv => inv.globalMedicineId === item.id || inv.catalogId === item.id || inv._id === item.id || inv.id === item.id);
                        if (existing) {
                          toast.error('This medicine already exists in your pharmacy. You can create a new stock batch instead.');
                          setSelectedCatalogItem(existing);
                          setSelectedDetailCatalogItem(null);
                          setShowAddBatchModal(true);
                          return;
                        }

                        setOnboardingGlobalItem(item);
                        setOnboardingMasterDetails({
                          brand: item.brand || '',
                          name: item.name || '',
                          salt: item.salt || '',
                          strength: item.strength || '',
                          form: item.form || '',
                          manufacturer: item.manufacturer || '',
                          stripSize: item.stripSize || 10,
                          stripPrice: item.stripPrice || 100
                        });
                        setOnboardingLocalDetails({
                          displayName: item.brand || item.name || '',
                          brandName: item.brand || '',
                          supplier: 'Zydus Corp',
                          supplierSku: `SKU-${item.id}`,
                          internalCode: `INT-${item.id}`,
                          rack: 'Rack A-3',
                          shelf: 'Shelf B-1',
                          bin: 'Drawer C-2',
                          minStock: 20,
                          reorderLevel: 50,
                          sellingEnabled: true,
                          purchaseEnabled: true
                        });
                        setSelectedDetailCatalogItem(null);
                        setOnboardingStep(1);
                        setShowOnboardingWizard(true);
                      }}
                      className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black text-center"
                    >
                      + Add to Pharmacy
                    </button>
                  </div>
                </div>
              )}

              {/* REQUEST NEW MEDICINE FORM MODAL */}
              {showRequestNewMedicineModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-md w-full p-6 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h3 className="font-black text-slate-905 flex items-center gap-2">
                        <span>📝</span> Request New Medicine
                      </h3>
                      <button onClick={() => setShowRequestNewMedicineModal(false)} className="text-slate-400 hover:text-slate-655"><X size={18} /></button>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">Medicine Name</label>
                        <input type="text" placeholder="E.g. Paracetamol 500mg" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">Brand Name</label>
                        <input type="text" placeholder="E.g. Crocin" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">Manufacturer</label>
                        <input type="text" placeholder="E.g. GSK Pharma" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">Salt Composition</label>
                        <input type="text" placeholder="E.g. Paracetamol" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                      <button onClick={() => setShowRequestNewMedicineModal(false)} className="px-4 py-2 border border-slate-200 text-slate-655 rounded-xl font-bold">Cancel</button>
                      <button
                        onClick={() => {
                          setShowRequestNewMedicineModal(false);
                          toast.success('Your medicine request has been sent to Clinic Admin for approval. Status: Pending.');
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-md shadow-blue-100"
                      >
                        Submit Request
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ADD TO PHARMACY ONBOARDING WIZARD MODAL */}
              {showOnboardingWizard && onboardingGlobalItem && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-slate-805">
                  <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-2xl w-full p-6 space-y-6 flex flex-col max-h-[90vh]">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
                      <div>
                        <span className="text-[9px] text-blue-600 font-extrabold uppercase bg-blue-50 px-2 py-0.5 rounded">
                          Ingestion Wizard ({onboardingGlobalItem.medicineType || 'Generic'})
                        </span>
                        <h3 className="text-base font-black text-slate-905 mt-1.5 flex items-center gap-2">
                          Add Standardized Medicine: <span className="text-blue-600">{onboardingMasterDetails.brand || onboardingMasterDetails.name}</span>
                        </h3>
                      </div>
                      <button 
                        onClick={() => { setShowOnboardingWizard(false); setOnboardingStep(1); }} 
                        className="text-slate-400 hover:text-slate-655"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Step Indicators */}
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border border-slate-200/50 rounded-2xl shrink-0">
                      {[
                        { step: 1, label: 'Standard Master' },
                        { step: 2, label: 'Pharmacy Profile' },
                        { step: 3, label: 'First Batch Stock' }
                      ].map(s => (
                        <div key={s.step} className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                            onboardingStep >= s.step ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-550'
                          }`}>
                            {s.step}
                          </span>
                          <span className={`text-[10px] font-black ${
                            onboardingStep === s.step ? 'text-slate-805' : 'text-slate-400'
                          }`}>
                            {s.label}
                          </span>
                          {s.step < 3 && <span className="text-slate-300 font-bold mx-2">→</span>}
                        </div>
                      ))}
                    </div>

                    {/* Step Body (Scrollable content) */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
                      
                      {/* STEP 1: VERIFY/EDIT MASTER DETAILS */}
                      {onboardingStep === 1 && (
                        <div className="space-y-6 text-xs font-bold text-slate-655">
                          {/* Visual Header / Card Distinction */}
                          <div className="p-4 bg-blue-50/40 border border-blue-100 rounded-2xl flex flex-col gap-1">
                            <h4 className="text-xs font-black text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                              🌐 Standard Details from Master
                            </h4>
                            <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                              These details map this medicine to the central Healthcare Catalogue. Fields maintained by the Global master are locked to enforce standardization, while missing parameters are editable.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            {/* Brand Name */}
                            {isFieldEditable('brand') ? (
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Medicine Brand Name *</label>
                                <input
                                  type="text"
                                  placeholder="Enter Brand Name"
                                  value={onboardingMasterDetails.brand}
                                  onChange={(e) => setOnboardingMasterDetails({ ...onboardingMasterDetails, brand: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white"
                                />
                              </div>
                            ) : (
                              <div className="relative group">
                                <span className="text-[10px] text-slate-400 block mb-1">
                                  Medicine Brand Name <Lock size={10} className="inline text-slate-400 ml-1 cursor-help" title="This information is maintained by the Global Medicine Catalogue and cannot be modified." />
                                </span>
                                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-medium select-none flex items-center justify-between">
                                  <span>{onboardingMasterDetails.brand}</span>
                                </div>
                              </div>
                            )}

                            {/* Generic Name */}
                            {isFieldEditable('name') ? (
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Generic / Salt Name *</label>
                                <input
                                  type="text"
                                  placeholder="Enter Generic Name"
                                  value={onboardingMasterDetails.name}
                                  onChange={(e) => setOnboardingMasterDetails({ ...onboardingMasterDetails, name: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white"
                                />
                              </div>
                            ) : (
                              <div className="relative group">
                                <span className="text-[10px] text-slate-400 block mb-1">
                                  Generic / Salt Name <Lock size={10} className="inline text-slate-400 ml-1 cursor-help" title="This information is maintained by the Global Medicine Catalogue and cannot be modified." />
                                </span>
                                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-medium select-none flex items-center justify-between">
                                  <span>{onboardingMasterDetails.name}</span>
                                </div>
                              </div>
                            )}

                            {/* Salt Composition */}
                            {isFieldEditable('salt') ? (
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Salt Composition</label>
                                <input
                                  type="text"
                                  placeholder="Enter Salt Composition"
                                  value={onboardingMasterDetails.salt}
                                  onChange={(e) => setOnboardingMasterDetails({ ...onboardingMasterDetails, salt: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white"
                                />
                              </div>
                            ) : (
                              <div className="relative group">
                                <span className="text-[10px] text-slate-400 block mb-1">
                                  Salt Composition <Lock size={10} className="inline text-slate-400 ml-1 cursor-help" title="This information is maintained by the Global Medicine Catalogue and cannot be modified." />
                                </span>
                                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-medium select-none flex items-center justify-between">
                                  <span>{onboardingMasterDetails.salt}</span>
                                </div>
                              </div>
                            )}

                            {/* Strength */}
                            {isFieldEditable('strength') ? (
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Strength *</label>
                                <input
                                  type="text"
                                  placeholder="E.g. 500mg"
                                  value={onboardingMasterDetails.strength}
                                  onChange={(e) => setOnboardingMasterDetails({ ...onboardingMasterDetails, strength: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white"
                                />
                              </div>
                            ) : (
                              <div className="relative group">
                                <span className="text-[10px] text-slate-400 block mb-1">
                                  Strength <Lock size={10} className="inline text-slate-400 ml-1 cursor-help" title="This information is maintained by the Global Medicine Catalogue and cannot be modified." />
                                </span>
                                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-medium select-none flex items-center justify-between">
                                  <span>{onboardingMasterDetails.strength}</span>
                                </div>
                              </div>
                            )}

                            {/* Dosage Form */}
                            {isFieldEditable('form') ? (
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Dosage Form *</label>
                                <input
                                  type="text"
                                  placeholder="E.g. Tablet"
                                  value={onboardingMasterDetails.form}
                                  onChange={(e) => setOnboardingMasterDetails({ ...onboardingMasterDetails, form: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white"
                                />
                              </div>
                            ) : (
                              <div className="relative group">
                                <span className="text-[10px] text-slate-400 block mb-1">
                                  Dosage Form <Lock size={10} className="inline text-slate-400 ml-1 cursor-help" title="This information is maintained by the Global Medicine Catalogue and cannot be modified." />
                                </span>
                                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-medium select-none flex items-center justify-between">
                                  <span>{onboardingMasterDetails.form}</span>
                                </div>
                              </div>
                            )}

                            {/* Manufacturer */}
                            {isFieldEditable('manufacturer') ? (
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Manufacturer</label>
                                <input
                                  type="text"
                                  placeholder="Enter Manufacturer"
                                  value={onboardingMasterDetails.manufacturer}
                                  onChange={(e) => setOnboardingMasterDetails({ ...onboardingMasterDetails, manufacturer: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white"
                                />
                              </div>
                            ) : (
                              <div className="relative group">
                                <span className="text-[10px] text-slate-400 block mb-1">
                                  Manufacturer <Lock size={10} className="inline text-slate-400 ml-1 cursor-help" title="This information is maintained by the Global Medicine Catalogue and cannot be modified." />
                                </span>
                                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-medium select-none flex items-center justify-between">
                                  <span>{onboardingMasterDetails.manufacturer}</span>
                                </div>
                              </div>
                            )}

                            {/* Tablets per Strip */}
                            {isFieldEditable('stripSize') ? (
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Tablets per Strip *</label>
                                <input
                                  type="number"
                                  value={onboardingMasterDetails.stripSize}
                                  onChange={(e) => setOnboardingMasterDetails({ ...onboardingMasterDetails, stripSize: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-center"
                                />
                              </div>
                            ) : (
                              <div className="relative group">
                                <span className="text-[10px] text-slate-400 block mb-1">
                                  Tablets per Strip <Lock size={10} className="inline text-slate-400 ml-1 cursor-help" title="This information is maintained by the Global Medicine Catalogue and cannot be modified." />
                                </span>
                                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-medium select-none flex items-center justify-between">
                                  <span>{onboardingMasterDetails.stripSize} Tablets</span>
                                </div>
                              </div>
                            )}

                            {/* Standard Master Price */}
                            {isFieldEditable('stripPrice') ? (
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Standard Master Price (MRP) *</label>
                                <input
                                  type="number"
                                  value={onboardingMasterDetails.stripPrice}
                                  onChange={(e) => setOnboardingMasterDetails({ ...onboardingMasterDetails, stripPrice: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-center"
                                />
                              </div>
                            ) : (
                              <div className="relative group">
                                <span className="text-[10px] text-slate-400 block mb-1">
                                  Standard Master Price (MRP) <Lock size={10} className="inline text-slate-400 ml-1 cursor-help" title="This information is maintained by the Global Medicine Catalogue and cannot be modified." />
                                </span>
                                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-medium select-none flex items-center justify-between">
                                  <span>₹{onboardingMasterDetails.stripPrice} / Strip</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* STEP 2: CREATE PHARMACY MEDICINE */}
                      {onboardingStep === 2 && (
                        <div className="space-y-6 text-xs font-bold text-slate-655">
                          {/* Visual Header / Card Distinction */}
                          <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl flex flex-col gap-1">
                            <h4 className="text-xs font-black text-emerald-700 uppercase tracking-wider">
                              📦 Pharmacy-Specific Details (Local Inventory Config)
                            </h4>
                            <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                              These details configure how this medicine is stored and reordered at this pharmacy location. Changes here are private and do not affect the Global master.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <label className="text-[10px] text-slate-400 block mb-1">Local Display Name *</label>
                              <input
                                type="text"
                                value={onboardingLocalDetails.displayName}
                                onChange={(e) => setOnboardingLocalDetails({ ...onboardingLocalDetails, displayName: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Default Supplier</label>
                              <input
                                type="text"
                                value={onboardingLocalDetails.supplier}
                                onChange={(e) => setOnboardingLocalDetails({ ...onboardingLocalDetails, supplier: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white"
                                placeholder="Search or enter supplier"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Supplier SKU (Optional)</label>
                              <input
                                type="text"
                                value={onboardingLocalDetails.supplierSku}
                                onChange={(e) => setOnboardingLocalDetails({ ...onboardingLocalDetails, supplierSku: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Internal Medicine Code (Optional)</label>
                              <input
                                type="text"
                                value={onboardingLocalDetails.internalCode}
                                onChange={(e) => setOnboardingLocalDetails({ ...onboardingLocalDetails, internalCode: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Rack Location</label>
                              <input
                                type="text"
                                value={onboardingLocalDetails.rack}
                                onChange={(e) => setOnboardingLocalDetails({ ...onboardingLocalDetails, rack: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Shelf / Bin</label>
                              <input
                                type="text"
                                value={onboardingLocalDetails.shelf}
                                onChange={(e) => setOnboardingLocalDetails({ ...onboardingLocalDetails, shelf: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Minimum Stock Level (Strips)</label>
                              <input
                                type="number"
                                value={onboardingLocalDetails.minStock}
                                onChange={(e) => setOnboardingLocalDetails({ ...onboardingLocalDetails, minStock: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-center"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Reorder Threshold Level (Strips)</label>
                              <input
                                type="number"
                                value={onboardingLocalDetails.reorderLevel}
                                onChange={(e) => setOnboardingLocalDetails({ ...onboardingLocalDetails, reorderLevel: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white text-center"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* STEP 3: CREATE FIRST STOCK BATCH */}
                      {onboardingStep === 3 && (
                        <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-655">
                          
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Batch Number *</label>
                            <input
                              type="text"
                              value={onboardingBatchDetails.batchNo}
                              onChange={(e) => setOnboardingBatchDetails({ ...onboardingBatchDetails, batchNo: e.target.value.toUpperCase() })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:bg-white"
                              placeholder="E.g. B-AZ50"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Mfg Date</label>
                              <input
                                type="text"
                                value={onboardingBatchDetails.mfgDate}
                                onChange={(e) => setOnboardingBatchDetails({ ...onboardingBatchDetails, mfgDate: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none focus:bg-white text-center"
                                placeholder="MM-YYYY"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Expiry Date *</label>
                              <input
                                type="text"
                                value={onboardingBatchDetails.expiryDate}
                                onChange={(e) => setOnboardingBatchDetails({ ...onboardingBatchDetails, expiryDate: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none focus:bg-white text-center"
                                placeholder="MM-YYYY"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Invoice Number</label>
                            <input
                              type="text"
                              value={onboardingBatchDetails.purchaseInvoice}
                              onChange={(e) => setOnboardingBatchDetails({ ...onboardingBatchDetails, purchaseInvoice: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Purchase Price *</label>
                              <input
                                type="number"
                                value={onboardingBatchDetails.purchaseRate}
                                onChange={(e) => setOnboardingBatchDetails({ ...onboardingBatchDetails, purchaseRate: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none text-center"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Pharmacy MRP Price *</label>
                              <input
                                type="number"
                                value={onboardingBatchDetails.mrpPrice}
                                onChange={(e) => setOnboardingBatchDetails({ ...onboardingBatchDetails, mrpPrice: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none text-center"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[9px] text-slate-400 block mb-1">Purchased Qty (Strips)</label>
                              <input
                                type="number"
                                value={onboardingBatchDetails.qtyPurchasedStrips}
                                onChange={(e) => setOnboardingBatchDetails({ ...onboardingBatchDetails, qtyPurchasedStrips: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none text-center"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 block mb-1">GST %</label>
                              <input
                                type="number"
                                value={onboardingBatchDetails.gstRate}
                                onChange={(e) => setOnboardingBatchDetails({ ...onboardingBatchDetails, gstRate: parseInt(e.target.value) || 12 })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none text-center"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 block mb-1">Discount %</label>
                              <input
                                type="number"
                                value={onboardingBatchDetails.discountRate}
                                onChange={(e) => setOnboardingBatchDetails({ ...onboardingBatchDetails, discountRate: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none text-center"
                              />
                            </div>
                          </div>

                          <div className="p-3.5 bg-slate-50 border border-slate-200/50 rounded-2xl flex flex-col justify-center">
                            <span className="text-[10px] text-slate-400 block">Total Tablets Calculated</span>
                            <p className="text-lg font-black text-blue-600 mt-1">
                              {onboardingBatchDetails.qtyPurchasedStrips * (onboardingMasterDetails.stripSize || 10)} Tablets
                            </p>
                          </div>

                          <div className="col-span-2">
                            <label className="text-[10px] text-slate-400 block mb-1">Remarks</label>
                            <input
                              type="text"
                              value={onboardingBatchDetails.remarks}
                              onChange={(e) => setOnboardingBatchDetails({ ...onboardingBatchDetails, remarks: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                    </div>

                    {/* Footer buttons */}
                    <div className="border-t border-slate-100 pt-4 flex justify-between shrink-0">
                      {onboardingStep > 1 ? (
                        <button
                          onClick={() => setOnboardingStep(prev => prev - 1)}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
                        >
                          ← Back
                        </button>
                      ) : (
                        <div />
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowOnboardingWizard(false); setOnboardingStep(1); }}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-655 rounded-xl text-xs font-bold transition"
                        >
                          Cancel
                        </button>

                        {onboardingStep < 3 ? (
                          <button
                            onClick={() => {
                              if (onboardingStep === 1) {
                                // Basic validations for Master step
                                if (!onboardingMasterDetails.brand.trim()) {
                                  toast.error('Brand Name is required.');
                                  return;
                                }
                                if (!onboardingMasterDetails.name.trim()) {
                                  toast.error('Generic Name is required.');
                                  return;
                                }
                                if (!onboardingMasterDetails.strength.trim()) {
                                  toast.error('Strength is required.');
                                  return;
                                }
                                if (!onboardingMasterDetails.form.trim()) {
                                  toast.error('Dosage Form is required.');
                                  return;
                                }
                              }
                              setOnboardingStep(prev => prev + 1);
                            }}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition"
                          >
                            Next Step →
                          </button>
                        ) : (
                          <button
                            onClick={async () => {
                              // Validations
                              if (!onboardingBatchDetails.batchNo.trim()) {
                                toast.error('Batch Number is mandatory.');
                                return;
                              }
                              if (!onboardingBatchDetails.expiryDate.trim()) {
                                toast.error('Expiry date is mandatory.');
                                return;
                              }
                              if (onboardingBatchDetails.mrpPrice < onboardingBatchDetails.purchaseRate) {
                                toast.error('MRP Price cannot be less than Purchase Rate.');
                                return;
                              }

                              // Normalize expiryDate from MM-YYYY or MM/YYYY to YYYY-MM-01
                              const rawExpiry = onboardingBatchDetails.expiryDate.trim();
                              let normalizedExpiry = rawExpiry;
                              const mmYearMatch = rawExpiry.match(/^(\d{2})[-\/](\d{4})$/);
                              if (mmYearMatch) {
                                normalizedExpiry = `${mmYearMatch[2]}-${mmYearMatch[1]}-01`;
                              }

                              const totalTabs = onboardingBatchDetails.qtyPurchasedStrips * (onboardingMasterDetails.stripSize || 10);
                              
                              try {
                                const payload = {
                                  globalMedicineId: onboardingGlobalItem.id,
                                  globalMasterType: onboardingGlobalItem.medicineType,
                                  genericMedicineId: onboardingGlobalItem.id,
                                  brandMedicineId: onboardingGlobalItem.medicineType === 'Brand-First' ? onboardingGlobalItem.id : undefined,
                                  globalVersion: onboardingGlobalItem.version || 1,
                                  code: onboardingLocalDetails.internalCode || '',
                                  name: onboardingLocalDetails.displayName || onboardingMasterDetails.brand || onboardingMasterDetails.name,
                                  brandName: onboardingMasterDetails.brand,
                                  genericName: onboardingMasterDetails.name,
                                  category: onboardingGlobalItem.categoryName || 'General',
                                  form: onboardingMasterDetails.form,
                                  strength: onboardingMasterDetails.strength,
                                  manufacturer: onboardingMasterDetails.manufacturer,
                                  distributor: onboardingLocalDetails.supplier,
                                  purchasePrice: onboardingBatchDetails.purchaseRate,
                                  sellingPrice: onboardingBatchDetails.mrpPrice,
                                  unitPrice: onboardingBatchDetails.mrpPrice / (onboardingMasterDetails.stripSize || 10),
                                  gst: onboardingBatchDetails.gstRate,
                                  discount: onboardingBatchDetails.discountRate,
                                  minimumStock: onboardingLocalDetails.minStock,
                                  reorderLevel: onboardingLocalDetails.reorderLevel,
                                  rackNumber: onboardingLocalDetails.rack,
                                  storageLocation: onboardingLocalDetails.shelf,
                                  batches: [
                                    {
                                      batchNumber: onboardingBatchDetails.batchNo,
                                      quantity: totalTabs,
                                      expiryDate: normalizedExpiry,
                                      purchasePrice: onboardingBatchDetails.purchaseRate,
                                      sellingPrice: onboardingBatchDetails.mrpPrice,
                                      receivedAt: onboardingBatchDetails.mfgDate ? new Date(onboardingBatchDetails.mfgDate.split('-').reverse().join('-')) : new Date()
                                    }
                                  ]
                                };

                                // Save via API
                                await pharmacyApi.createMedicine(payload);
                                
                                // Reload local inventory list (API returns { medicines, pagination })
                                const updatedInvData = await pharmacyApi.listMedicines();
                                const updatedItems = updatedInvData?.medicines || updatedInvData?.data?.medicines || (Array.isArray(updatedInvData) ? updatedInvData : []);
                                setInventory(updatedItems);

                                setShowOnboardingWizard(false);
                                setOnboardingStep(1);
                                toast.success(`"${payload.name}" onboarded into store inventory successfully.`);
                              } catch (err) {
                                setOnboardingLocalDetails({
                                  displayName: '', brandName: '', supplier: 'Zydus Corp', supplierSku: '', internalCode: '', rack: 'Rack A-3', shelf: 'Shelf B-1', bin: 'Drawer C-2', minStock: 20, reorderLevel: 50, sellingEnabled: true, purchaseEnabled: true
                                });
                                setOnboardingBatchDetails({
                                  batchNo: '', mfgDate: '', expiryDate: '', purchaseInvoice: '', purchaseRate: 28, mrpPrice: 40, gstRate: 12, discountRate: 0, qtyPurchasedStrips: 50, remarks: ''
                                });
                                toast.error(err.response?.data?.message || 'Failed to onboard medicine.');
                              }
                            }}
                            className="px-5 py-2 bg-emerald-655 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-emerald-100"
                          >
                            Save &amp; Onboard Batch
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* ================= TAB 4.5: SUPPLIERS MANAGEMENT ================= */}
          {tab === 'suppliers' && (() => {
            // Filter suppliers based on selected tab and search term
            const filteredSuppliers = suppliersList.filter(s => {
              // 1. Status Filter Tab
              if (selectedSupplierFilter === 'ACTIVE' && s.status !== 'Active') return false;
              if (selectedSupplierFilter === 'PREFERRED' && !s.isPreferred) return false;
              if (selectedSupplierFilter === 'BLOCKED' && s.status !== 'Blocked') return false;
              
              // 2. Text Search
              if (supplierSearchQuery.trim()) {
                const q = supplierSearchQuery.toLowerCase();
                const nameMatch = (s.name || '').toLowerCase().includes(q);
                const codeMatch = (s.supplierCode || '').toLowerCase().includes(q);
                const personMatch = (s.contactPerson || '').toLowerCase().includes(q);
                const phoneMatch = (s.phone || '').toLowerCase().includes(q);
                const emailMatch = (s.email || '').toLowerCase().includes(q);
                const cityMatch = (s.city || '').toLowerCase().includes(q);
                const gstinMatch = (s.gstin || '').toLowerCase().includes(q);
                
                if (!nameMatch && !codeMatch && !personMatch && !phoneMatch && !emailMatch && !cityMatch && !gstinMatch) {
                  return false;
                }
              }

              // 3. Advanced Filters
              if (supplierAdvFilters.city && (s.city || '').toLowerCase() !== supplierAdvFilters.city.toLowerCase()) return false;
              if (supplierAdvFilters.state && (s.state || '').toLowerCase() !== supplierAdvFilters.state.toLowerCase()) return false;
              if (supplierAdvFilters.status && s.status !== supplierAdvFilters.status) return false;
              if (supplierAdvFilters.preferred === 'yes' && !s.isPreferred) return false;
              if (supplierAdvFilters.preferred === 'no' && s.isPreferred) return false;

              return true;
            });

            // Calculate KPIs
            const totalSuppliersCount = suppliersList.length;
            const activeSuppliersCount = suppliersList.filter(s => s.status === 'Active').length;
            const preferredSuppliersCount = suppliersList.filter(s => s.isPreferred).length;
            const totalOutstandingAmount = suppliersList.reduce((acc, s) => acc + (s.outstandingAmount || 0), 0);

            // Handle add supplier save
            const handleSaveSupplier = async () => {
              if (!newSupplierData.name.trim()) {
                toast.error('Supplier Name is required.');
                return;
              }
              if (!newSupplierData.contactPerson.trim()) {
                toast.error('Contact Person is required.');
                return;
              }
              if (!newSupplierData.phone.trim()) {
                toast.error('Mobile Number is required.');
                return;
              }

              try {
                // Pre-generate code if missing
                const payload = {
                  ...newSupplierData,
                  supplierCode: newSupplierData.supplierCode || `SUP-${Math.floor(1000 + Math.random() * 9000)}`
                };
                await pharmacyApi.createSupplier(payload);
                toast.success(`Supplier "${payload.name}" added successfully.`);
                setShowAddSupplierModal(false);
                setAddSupplierStep(1);
                fetchSuppliers(); // Reload
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to create supplier.');
              }
            };

            return (
              <div className="space-y-6">
                
                {/* ── PAGE HEADER ── */}
                <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-blue-600">👥</span> Suppliers
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Manage medicine suppliers, distributors, purchase history and outstanding payments.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
                    <button 
                      onClick={() => {
                        setNewSupplierData({
                          name: '',
                          companyName: '',
                          supplierCode: `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
                          supplierType: 'Distributor',
                          gstin: '',
                          pan: '',
                          drugLicense: '',
                          website: '',
                          contactPerson: '',
                          designation: '',
                          phone: '',
                          alternatePhone: '',
                          email: '',
                          address: '',
                          landmark: '',
                          city: '',
                          state: '',
                          country: 'India',
                          pincode: '',
                          paymentTerms: 'Net 30',
                          creditLimit: 50000,
                          creditDays: 30,
                          isPreferred: false,
                          defaultGst: 12,
                          leadTimeDays: 3,
                          status: 'Active'
                        });
                        setAddSupplierStep(1);
                        setShowAddSupplierModal(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-blue-100"
                    >
                      <Plus size={13} />
                      Add New Supplier
                    </button>
                    <button onClick={() => toast.success('Supplier import wizard opened.')} className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition">
                      Import Suppliers
                    </button>
                    <button onClick={() => toast.success('Supplier list exported to Excel.')} className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition">
                      Export
                    </button>
                  </div>
                </div>

                {/* ── KPI STATISTICS ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  {[
                    { label: 'Total Suppliers', value: totalSuppliersCount, desc: 'All time registered', icon: <Users size={16} />, trend: '+4%', trendColor: 'text-emerald-500', color: 'bg-blue-50/20 border-blue-100' },
                    { label: 'Active Suppliers', value: activeSuppliersCount, desc: `${((activeSuppliersCount/Math.max(1, totalSuppliersCount))*100).toFixed(0)}% of total`, icon: <Check size={16} />, trend: 'Stable', trendColor: 'text-slate-400', color: 'bg-emerald-50/20 border-emerald-100' },
                    { label: 'Preferred Wholesalers', value: preferredSuppliersCount, desc: 'Top tier partners', icon: <Star size={16} />, trend: '+12%', trendColor: 'text-emerald-500', color: 'bg-amber-50/20 border-amber-100' },
                    { label: 'Outstanding Amount', value: `₹${totalOutstandingAmount.toLocaleString()}`, desc: 'Outstanding payables', icon: <DollarSign size={16} />, trend: '-2.4%', trendColor: 'text-emerald-500', color: 'bg-rose-50/20 border-rose-100' },
                    { label: 'Monthly Purchase', value: '₹18,45,230', desc: 'Current month total', icon: <Truck size={16} />, trend: '+8.2%', trendColor: 'text-emerald-500', color: 'bg-purple-50/20 border-purple-100' },
                    { label: 'On-Time Delivery', value: '92.4%', desc: 'SLA target: 90%', icon: <Clock size={16} />, trend: '+1.5%', trendColor: 'text-emerald-500', color: 'bg-indigo-50/20 border-indigo-100' },
                    { label: 'Pending POs', value: '12 orders', desc: 'Awaiting fulfillment', icon: <Package size={16} />, trend: '12 active', trendColor: 'text-blue-500', color: 'bg-sky-50/20 border-sky-100' },
                    { label: 'Avg Delivery Time', value: '3.2 Days', desc: 'Lead time average', icon: <Clock size={16} />, trend: '-0.4d', trendColor: 'text-emerald-500', color: 'bg-slate-50/20 border-slate-100' }
                  ].map((kpi, idx) => (
                    <div key={idx} className={`bg-white border rounded-3xl p-4 flex flex-col justify-between min-h-[105px] hover:shadow-md transition-all duration-200`}>
                      <div className="flex justify-between items-center">
                        <div className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-xs">
                          {kpi.icon}
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-wider ${kpi.trendColor}`}>
                          {kpi.trend}
                        </span>
                      </div>
                      <div className="mt-3">
                        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">{kpi.label}</h4>
                        <p className="text-sm font-black text-slate-900 mt-1.5 leading-none">{kpi.value}</p>
                        <p className="text-[8px] text-slate-400 font-semibold mt-1 leading-none">{kpi.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── SEARCH & FILTER CONTROLS ── */}
                <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-50 pb-4">
                    {/* Tabs switcher */}
                    <div className="flex gap-1.5 p-1 bg-slate-50 border border-slate-200/60 rounded-2xl overflow-x-auto w-full lg:w-auto">
                      {[
                        { id: 'ALL', label: 'All Suppliers' },
                        { id: 'ACTIVE', label: 'Active Suppliers' },
                        { id: 'PREFERRED', label: 'Preferred Suppliers' },
                        { id: 'BLOCKED', label: 'Blocked Suppliers' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setSelectedSupplierFilter(tab.id)}
                          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
                            selectedSupplierFilter === tab.id
                              ? 'bg-blue-600 text-white font-black shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Simple search bar & advanced button */}
                    <div className="flex gap-2 w-full lg:w-auto shrink-0">
                      <div className="relative flex-1 lg:w-80">
                        <input
                          type="text"
                          placeholder="Search supplier, contact, code, GSTIN..."
                          value={supplierSearchQuery}
                          onChange={(e) => setSupplierSearchQuery(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs focus:outline-none focus:bg-white focus:border-blue-300 transition-all font-semibold"
                        />
                        <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
                      </div>
                      <button 
                        onClick={() => setShowSupplierAdvancedFilters(!showSupplierAdvancedFilters)}
                        className={`px-3 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          showSupplierAdvancedFilters ? 'bg-blue-50 border-blue-200 text-blue-650' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        Filters
                      </button>
                    </div>
                  </div>

                  {/* Advanced Filters Ribbon */}
                  {showSupplierAdvancedFilters && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <label className="text-[9px] text-slate-400 font-bold block mb-1">City</label>
                        <input 
                          type="text"
                          placeholder="E.g. Mumbai"
                          value={supplierAdvFilters.city}
                          onChange={e => setSupplierAdvFilters({ ...supplierAdvFilters, city: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 font-bold block mb-1">State</label>
                        <input 
                          type="text"
                          placeholder="E.g. MH"
                          value={supplierAdvFilters.state}
                          onChange={e => setSupplierAdvFilters({ ...supplierAdvFilters, state: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 font-bold block mb-1">Company Type</label>
                        <select
                          value={supplierAdvFilters.company}
                          onChange={e => setSupplierAdvFilters({ ...supplierAdvFilters, company: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none"
                        >
                          <option value="">All Types</option>
                          <option value="Manufacturer">Manufacturer</option>
                          <option value="Distributor">Distributor</option>
                          <option value="Wholesaler">Wholesaler</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 font-bold block mb-1">Status</label>
                        <select
                          value={supplierAdvFilters.status}
                          onChange={e => setSupplierAdvFilters({ ...supplierAdvFilters, status: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none"
                        >
                          <option value="">All Statuses</option>
                          <option value="Active">Active</option>
                          <option value="Blocked">Blocked</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-400 font-bold block mb-1">Preferred Supplier</label>
                        <select
                          value={supplierAdvFilters.preferred}
                          onChange={e => setSupplierAdvFilters({ ...supplierAdvFilters, preferred: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none"
                        >
                          <option value="">All</option>
                          <option value="yes">Yes Only</option>
                          <option value="no">No Only</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button 
                          onClick={() => {
                            setSupplierAdvFilters({ city: '', state: '', company: '', minOutstanding: '', status: '', preferred: '' });
                            toast.success('Filters cleared.');
                          }}
                          className="w-full py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition text-center"
                        >
                          Reset Filters
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── ENTERPRISE DATA TABLE ── */}
                  <div className="overflow-x-auto">
                    {loadingSuppliers ? (
                      <div className="py-20 text-center text-slate-400 font-bold flex flex-col justify-center items-center gap-3">
                        <RefreshCw className="animate-spin text-blue-500" size={32} />
                        <p className="text-xs">Fetching registered suppliers...</p>
                      </div>
                    ) : filteredSuppliers.length === 0 ? (
                      <div className="py-20 text-center text-slate-400 font-bold flex flex-col justify-center items-center gap-2">
                        <Users size={36} className="text-slate-300" />
                        <p className="text-sm">No suppliers found matching your query.</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Click "Add New Supplier" to create your first partner profile.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-2">Supplier Details</th>
                            <th className="py-3 px-2">Contact Person</th>
                            <th className="py-3 px-2">Phone / Email</th>
                            <th className="py-3 px-2">City</th>
                            <th className="py-3 px-2">Outstanding Payables</th>
                            <th className="py-3 px-2">Payment Terms</th>
                            <th className="py-3 px-2">Status</th>
                            <th className="py-3 px-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredSuppliers.map(s => {
                            const logoChar = (s.name || 'S').charAt(0).toUpperCase();
                            const isPref = s.isPreferred;
                            const outstanding = s.outstandingAmount || 0;
                            const statusColor = s.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600';

                            return (
                              <tr key={s._id || s.id} className="hover:bg-slate-50/30 transition-colors group">
                                <td className="py-3.5 px-2">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shadow-xs shrink-0 ${
                                      isPref ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                    }`}>
                                      {logoChar}
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold text-slate-905 flex items-center gap-1.5">
                                        {s.name}
                                        {isPref && <span className="text-[8px] bg-amber-50 text-amber-600 px-1 py-0.2 rounded font-black">Preferred</span>}
                                      </h4>
                                      <p className="text-[9px] text-slate-400 font-semibold">{s.supplierCode || 'SUP-XXXX'}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-2 font-bold text-slate-700">
                                  <p>{s.contactPerson}</p>
                                  <span className="text-[9px] text-slate-400 font-semibold">{s.designation || 'Representative'}</span>
                                </td>
                                <td className="py-3.5 px-2 font-semibold text-slate-600">
                                  <p>{s.phone}</p>
                                  <p className="text-[9px] text-slate-400">{s.email || 'No email'}</p>
                                </td>
                                <td className="py-3.5 px-2 font-semibold text-slate-600">
                                  {s.city || '—'}
                                </td>
                                <td className="py-3.5 px-2">
                                  <p className={`font-extrabold ${outstanding > 0 ? 'text-rose-600' : 'text-slate-655'}`}>
                                    ₹{outstanding.toLocaleString()}
                                  </p>
                                  {outstanding > 0 && <span className="text-[8px] text-rose-400 font-bold block">Credit limit: ₹{(s.creditLimit || 50000).toLocaleString()}</span>}
                                </td>
                                <td className="py-3.5 px-2 font-semibold text-slate-600">
                                  {s.paymentTerms || 'Net 30'}
                                </td>
                                <td className="py-3.5 px-2">
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${statusColor}`}>
                                    {s.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-2 text-right">
                                  <div className="flex justify-end gap-1.5">
                                    <button 
                                      onClick={() => setSelectedSupplierDetail(s)}
                                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
                                    >
                                      <Eye size={10} /> View Details
                                    </button>
                                    <button 
                                      onClick={() => {
                                        toast.success(`Started Purchase Order workflow for ${s.name}`);
                                      }}
                                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-650 rounded-lg text-[9px] font-black transition"
                                    >
                                      + PO
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* ── SUPPLIER DETAILS SLIDE-OVER PANEL ── */}
                {selectedSupplierDetail && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex justify-end z-50">
                    <div className="w-full max-w-xl bg-white h-screen shadow-2xl flex flex-col justify-between animate-slide-in">
                      
                      {/* Panel Header */}
                      <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-sm shrink-0">
                            {(selectedSupplierDetail.name || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                              {selectedSupplierDetail.name}
                              {selectedSupplierDetail.isPreferred && <span className="text-[8px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-black">Preferred</span>}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-semibold">{selectedSupplierDetail.supplierCode || 'SUP-000'}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setSelectedSupplierDetail(null)}
                          className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Panel Content (Scrollable) */}
                      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                        
                        {/* Info Sections */}
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-2">Company Information</h4>
                            <div className="space-y-1.5 text-slate-655 font-bold leading-relaxed">
                              <p>GSTIN: <span className="text-slate-805">{selectedSupplierDetail.gstin || 'N/A'}</span></p>
                              <p>PAN: <span className="text-slate-805">{selectedSupplierDetail.pan || 'N/A'}</span></p>
                              <p>Drug License: <span className="text-slate-805">{selectedSupplierDetail.drugLicense || 'N/A'}</span></p>
                              <p>Type: <span className="text-slate-805">{selectedSupplierDetail.supplierType || 'Distributor'}</span></p>
                            </div>
                          </div>

                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                            <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-2">Contact Details</h4>
                            <div className="space-y-1.5 text-slate-655 font-bold leading-relaxed">
                              <p>Contact Person: <span className="text-slate-855 font-extrabold">{selectedSupplierDetail.contactPerson}</span></p>
                              <p>Designation: <span className="text-slate-805">{selectedSupplierDetail.designation || 'Representative'}</span></p>
                              <p>Phone: <span className="text-slate-855 font-extrabold">{selectedSupplierDetail.phone}</span></p>
                              <p>Email: <span className="text-slate-805">{selectedSupplierDetail.email || 'N/A'}</span></p>
                            </div>
                          </div>
                        </div>

                        {/* Address Block */}
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
                          <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-2">Address</h4>
                          <div className="text-slate-700 font-semibold space-y-1">
                            <p>{selectedSupplierDetail.address}</p>
                            {selectedSupplierDetail.landmark && <p className="text-[10px] text-slate-400 font-bold">Landmark: {selectedSupplierDetail.landmark}</p>}
                            <p>{selectedSupplierDetail.city}, {selectedSupplierDetail.state} - {selectedSupplierDetail.pincode}</p>
                            <p className="text-[9px] uppercase tracking-wider text-slate-455 font-black mt-1.5">{selectedSupplierDetail.country || 'India'}</p>
                          </div>
                        </div>

                        {/* Business Summary stats */}
                        <div className="border border-slate-100 rounded-2xl p-4 space-y-3.5">
                          <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Procurement & Account Summary</h4>
                          <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="bg-slate-50/50 p-2.5 rounded-xl">
                              <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Outstanding</p>
                              <p className="text-sm font-black text-rose-600 mt-1">₹{(selectedSupplierDetail.outstandingAmount || 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-50/50 p-2.5 rounded-xl">
                              <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Lead Time</p>
                              <p className="text-sm font-black text-slate-900 mt-1">{selectedSupplierDetail.leadTimeDays || 3} Days</p>
                            </div>
                            <div className="bg-slate-50/50 p-2.5 rounded-xl">
                              <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Credit Days</p>
                              <p className="text-sm font-black text-blue-600 mt-1">{selectedSupplierDetail.creditDays || 30} Days</p>
                            </div>
                          </div>
                        </div>

                        {/* Recent History Tab Block placeholder */}
                        <div className="space-y-3">
                          <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Medicines Supplied</h4>
                          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 text-[10px] text-slate-400 font-bold text-center">
                            No supplied medicines mapped in database yet. Map medicines during Stock Inward.
                          </div>
                        </div>

                      </div>

                      {/* Panel Footer Actions */}
                      <div className="p-6 border-t border-slate-100 flex flex-wrap gap-2 shrink-0 bg-slate-50">
                        <button 
                          onClick={() => {
                            toast.success(`Mail composition client launched for ${selectedSupplierDetail.email || 'partner'}`);
                          }}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1"
                        >
                          Email Partner
                        </button>
                        <button 
                          onClick={() => {
                            toast.success(`Dialer connection initialized for ${selectedSupplierDetail.phone}`);
                          }}
                          className="flex-1 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                        >
                          Call Wholesaler
                        </button>
                        <button 
                          onClick={() => {
                            window.print();
                          }}
                          className="py-2 px-3.5 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center"
                        >
                          <Printer size={13} />
                        </button>
                      </div>

                    </div>
                  </div>
                )}

                {/* ── ADD NEW SUPPLIER MULTI-STEP MODAL ── */}
                {showAddSupplierModal && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl flex flex-col justify-between max-h-[90vh] overflow-hidden animate-zoom-in">
                      
                      {/* Modal Header */}
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900">Add New Partner Supplier</h3>
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">Step {addSupplierStep} of 4: {
                            addSupplierStep === 1 ? 'Business details' : addSupplierStep === 2 ? 'Contact details' : addSupplierStep === 3 ? 'Address details' : 'Business configuration'
                          }</p>
                        </div>
                        <button 
                          onClick={() => { setShowAddSupplierModal(false); setAddSupplierStep(1); }}
                          className="w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Modal Form Content */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs font-bold text-slate-655">
                        
                        {/* STEP 1: BUSINESS DETAILS */}
                        {addSupplierStep === 1 && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <label className="text-[10px] text-slate-400 block mb-1">Supplier Name *</label>
                              <input 
                                type="text"
                                value={newSupplierData.name}
                                onChange={e => setNewSupplierData({ ...newSupplierData, name: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                                placeholder="E.g. Zydus Healthcare Ltd"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Supplier Code (Auto Generated)</label>
                              <input 
                                type="text"
                                value={newSupplierData.supplierCode}
                                disabled
                                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-400 cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Supplier Type</label>
                              <select
                                value={newSupplierData.supplierType}
                                onChange={e => setNewSupplierData({ ...newSupplierData, supplierType: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                              >
                                <option value="Manufacturer">Manufacturer</option>
                                <option value="Distributor">Distributor</option>
                                <option value="Wholesaler">Wholesaler</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">GSTIN Number</label>
                              <input 
                                type="text"
                                value={newSupplierData.gstin}
                                onChange={e => setNewSupplierData({ ...newSupplierData, gstin: e.target.value.toUpperCase() })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                                placeholder="E.g. 24AABCCZ1234B1ZS"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">PAN Number</label>
                              <input 
                                type="text"
                                value={newSupplierData.pan}
                                onChange={e => setNewSupplierData({ ...newSupplierData, pan: e.target.value.toUpperCase() })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                                placeholder="E.g. AABCC1234Z"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-[10px] text-slate-400 block mb-1">Drug License Number</label>
                              <input 
                                type="text"
                                value={newSupplierData.drugLicense}
                                onChange={e => setNewSupplierData({ ...newSupplierData, drugLicense: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                                placeholder="E.g. DL-12345/MZ"
                              />
                            </div>
                          </div>
                        )}

                        {/* STEP 2: CONTACT DETAILS */}
                        {addSupplierStep === 2 && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <label className="text-[10px] text-slate-400 block mb-1">Contact Person Name *</label>
                              <input 
                                type="text"
                                value={newSupplierData.contactPerson}
                                onChange={e => setNewSupplierData({ ...newSupplierData, contactPerson: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                                placeholder="E.g. Rajesh Mehta"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Designation</label>
                              <input 
                                type="text"
                                value={newSupplierData.designation}
                                onChange={e => setNewSupplierData({ ...newSupplierData, designation: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                                placeholder="E.g. Sales Manager"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Mobile Number *</label>
                              <input 
                                type="text"
                                value={newSupplierData.phone}
                                onChange={e => setNewSupplierData({ ...newSupplierData, phone: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                                placeholder="E.g. 9876543210"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="text-[10px] text-slate-400 block mb-1">Email Address</label>
                              <input 
                                type="email"
                                value={newSupplierData.email}
                                onChange={e => setNewSupplierData({ ...newSupplierData, email: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                                placeholder="sales@partner.com"
                              />
                            </div>
                          </div>
                        )}

                        {/* STEP 3: ADDRESS */}
                        {addSupplierStep === 3 && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                              <label className="text-[10px] text-slate-400 block mb-1">Address *</label>
                              <input 
                                type="text"
                                value={newSupplierData.address}
                                onChange={e => setNewSupplierData({ ...newSupplierData, address: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                                placeholder="Street, Building No"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">City *</label>
                              <input 
                                type="text"
                                value={newSupplierData.city}
                                onChange={e => setNewSupplierData({ ...newSupplierData, city: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                                placeholder="E.g. Ahmedabad"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">State *</label>
                              <input 
                                type="text"
                                value={newSupplierData.state}
                                onChange={e => setNewSupplierData({ ...newSupplierData, state: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                                placeholder="E.g. Gujarat"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Country</label>
                              <input 
                                type="text"
                                value={newSupplierData.country}
                                onChange={e => setNewSupplierData({ ...newSupplierData, country: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Pincode *</label>
                              <input 
                                type="text"
                                value={newSupplierData.pincode}
                                onChange={e => setNewSupplierData({ ...newSupplierData, pincode: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                                placeholder="380015"
                              />
                            </div>
                          </div>
                        )}

                        {/* STEP 4: CONFIGURATION */}
                        {addSupplierStep === 4 && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Payment Terms</label>
                              <select
                                value={newSupplierData.paymentTerms}
                                onChange={e => setNewSupplierData({ ...newSupplierData, paymentTerms: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                              >
                                <option value="COD">Cash On Delivery (COD)</option>
                                <option value="Net 15">Net 15 Days</option>
                                <option value="Net 30">Net 30 Days</option>
                                <option value="Net 45">Net 45 Days</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Credit Limit (₹)</label>
                              <input 
                                type="number"
                                value={newSupplierData.creditLimit}
                                onChange={e => setNewSupplierData({ ...newSupplierData, creditLimit: parseInt(e.target.value) || 0 })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none text-center"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Delivery Lead Time (Days)</label>
                              <input 
                                type="number"
                                value={newSupplierData.leadTimeDays}
                                onChange={e => setNewSupplierData({ ...newSupplierData, leadTimeDays: parseInt(e.target.value) || 3 })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none text-center"
                              />
                            </div>
                            <div className="flex items-center gap-3 pt-6 pl-2 col-span-2">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={newSupplierData.isPreferred}
                                  onChange={e => setNewSupplierData({ ...newSupplierData, isPreferred: e.target.checked })}
                                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                                />
                                Mark as Preferred Wholesale Partner
                              </label>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Modal Footer Controls */}
                      <div className="p-6 border-t border-slate-100 flex justify-between shrink-0 bg-slate-50">
                        {addSupplierStep > 1 ? (
                          <button 
                            onClick={() => setAddSupplierStep(prev => prev - 1)}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition"
                          >
                            ← Back
                          </button>
                        ) : (
                          <div />
                        )}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => { setShowAddSupplierModal(false); setAddSupplierStep(1); }}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition"
                          >
                            Cancel
                          </button>
                          {addSupplierStep < 4 ? (
                            <button 
                              onClick={() => {
                                // Validation checks before advancing
                                if (addSupplierStep === 1 && !newSupplierData.name.trim()) {
                                  toast.error('Supplier Name is required.');
                                  return;
                                }
                                if (addSupplierStep === 2 && (!newSupplierData.contactPerson.trim() || !newSupplierData.phone.trim())) {
                                  toast.error('Contact Person Name and Mobile are required.');
                                  return;
                                }
                                if (addSupplierStep === 3 && (!newSupplierData.address.trim() || !newSupplierData.city.trim() || !newSupplierData.state.trim() || !newSupplierData.pincode.trim())) {
                                  toast.error('Complete address details are required.');
                                  return;
                                }
                                setAddSupplierStep(prev => prev + 1);
                              }}
                              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-blue-100"
                            >
                              Next Step →
                            </button>
                          ) : (
                            <button 
                              onClick={handleSaveSupplier}
                              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-emerald-100"
                            >
                              Save Partner Supplier
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            );
          })()}

          {/* ================= TAB 4.6: EXPIRY & BATCH MANAGEMENT ================= */}
          {tab === 'expiry' && (() => {
            const today = new Date();

            // Extract all batches from local inventory database
            const allBatches = [];
            inventory.forEach(item => {
              (item.batches || []).forEach(batch => {
                const expiryDateObj = batch.expiryDate ? new Date(batch.expiryDate) : null;
                const daysRemaining = expiryDateObj ? Math.ceil((expiryDateObj - today) / (1000 * 60 * 60 * 24)) : 9999;
                
                // Determine health / status of this batch
                let calculatedStatus = 'Healthy';
                if (batch.status === 'Quarantined') {
                  calculatedStatus = 'Quarantined';
                } else if (batch.status === 'Recalled') {
                  calculatedStatus = 'Recalled';
                } else if (daysRemaining <= 0) {
                  calculatedStatus = 'Expired';
                } else if (daysRemaining <= 30) {
                  calculatedStatus = 'Expiring Soon';
                } else if (daysRemaining <= 90) {
                  calculatedStatus = 'Near Expiry';
                }

                allBatches.push({
                  ...batch,
                  medicine: item,
                  id: batch._id || batch.id,
                  medicineName: item.brandName || item.brand || item.name,
                  genericName: item.genericName || item.name,
                  brand: item.brandName || item.brand || item.name,
                  categoryName: item.category || 'General',
                  rackNumber: item.rackNumber || item.rack || '—',
                  storageLocation: item.storageLocation || '—',
                  daysRemaining,
                  calculatedStatus
                });
              });
            });

            // Filter Batches
            const filteredBatches = allBatches.filter(b => {
              // 1. Status Tabs
              if (selectedBatchFilter === 'EXPIRED' && b.calculatedStatus !== 'Expired') return false;
              if (selectedBatchFilter === 'NEAR_EXPIRY' && b.calculatedStatus !== 'Near Expiry' && b.calculatedStatus !== 'Expiring Soon') return false;
              if (selectedBatchFilter === 'QUARANTINED' && b.calculatedStatus !== 'Quarantined') return false;
              if (selectedBatchFilter === 'RECALLED' && b.calculatedStatus !== 'Recalled') return false;

              // 2. Calendar Specific Day Filter
              if (selectedCalendarDay) {
                const bExpiryStr = b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-CA') : '';
                if (bExpiryStr !== selectedCalendarDay) return false;
              }

              // 3. Search input
              if (batchSearchQuery.trim()) {
                const q = batchSearchQuery.toLowerCase();
                const nameMatch = b.medicineName.toLowerCase().includes(q);
                const genMatch = b.genericName.toLowerCase().includes(q);
                const batchMatch = (b.batchNumber || b.batchNo || '').toLowerCase().includes(q);
                const supMatch = (b.supplier || '').toLowerCase().includes(q);
                const rackMatch = b.rackNumber.toLowerCase().includes(q);
                if (!nameMatch && !genMatch && !batchMatch && !supMatch && !rackMatch) return false;
              }

              // 4. Advanced filters
              if (batchAdvFilters.expiryRange === 'today' && b.daysRemaining !== 0) return false;
              if (batchAdvFilters.expiryRange === '7days' && (b.daysRemaining < 0 || b.daysRemaining > 7)) return false;
              if (batchAdvFilters.expiryRange === '30days' && (b.daysRemaining < 0 || b.daysRemaining > 30)) return false;
              if (batchAdvFilters.expiryRange === 'expired' && b.daysRemaining > 0) return false;
              if (batchAdvFilters.supplier && (b.supplier || '').toLowerCase() !== batchAdvFilters.supplier.toLowerCase()) return false;
              if (batchAdvFilters.rack && b.rackNumber !== batchAdvFilters.rack) return false;
              if (batchAdvFilters.category && b.categoryName !== batchAdvFilters.category) return false;

              return true;
            });

            // Sorting
            filteredBatches.sort((a, b) => {
              return new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0);
            });

            // Count Statistics
            const activeCount = allBatches.filter(b => b.calculatedStatus !== 'Expired' && b.calculatedStatus !== 'Quarantined' && b.calculatedStatus !== 'Recalled').length;
            const expiring30Count = allBatches.filter(b => b.daysRemaining > 0 && b.daysRemaining <= 30).length;
            const expiringTodayCount = allBatches.filter(b => b.daysRemaining === 0).length;
            const expiredCount = allBatches.filter(b => b.daysRemaining < 0).length;
            const quarantinedCount = allBatches.filter(b => b.calculatedStatus === 'Quarantined').length;
            const valueAtRisk = allBatches
              .filter(b => b.daysRemaining > 0 && b.daysRemaining <= 90)
              .reduce((acc, b) => acc + ((b.availableStock || b.quantity || 0) * (b.purchasePrice / (b.medicine?.stripSize || 10))), 0);

            // Handle quarantine toggle
            const handleQuarantineAction = async (batch, reason) => {
              try {
                // Find parent medicine
                const parentMed = inventory.find(item => item.batches.some(b => b._id === batch.id || b.id === batch.id));
                if (!parentMed) {
                  toast.error('Parent medicine record not found.');
                  return;
                }

                // Update status of target batch in state
                const updatedBatches = parentMed.batches.map(b => {
                  if (b._id === batch.id || b.id === batch.id) {
                    return { ...b, status: 'Quarantined', quarantineReason: reason };
                  }
                  return b;
                });

                await pharmacyApi.createMedicine({
                  ...parentMed,
                  batches: updatedBatches
                });

                toast.success(`Batch ${batch.batchNumber || batch.batchNo} is now quarantined under: ${reason}`);
                fetchLocalInventory(); // Reload
                setSelectedBatchDetail(null);
                setShowQuarantineModal(false);
              } catch (err) {
                toast.error('Failed to quarantine batch.');
              }
            };

            // Handle release quarantine
            const handleReleaseQuarantine = async (batch) => {
              try {
                const parentMed = inventory.find(item => item.batches.some(b => b._id === batch.id || b.id === batch.id));
                if (!parentMed) return;

                const updatedBatches = parentMed.batches.map(b => {
                  if (b._id === batch.id || b.id === batch.id) {
                    return { ...b, status: 'Active', quarantineReason: undefined };
                  }
                  return b;
                });

                await pharmacyApi.createMedicine({
                  ...parentMed,
                  batches: updatedBatches
                });

                toast.success(`Batch ${batch.batchNumber || batch.batchNo} released from quarantine.`);
                fetchLocalInventory();
                setSelectedBatchDetail(null);
              } catch (err) {
                toast.error('Failed to release batch.');
              }
            };

            // Days calculation helper
            const getExpiryProgressColor = (days) => {
              if (days < 0) return 'bg-red-800'; // Dark Red
              if (days <= 30) return 'bg-red-500'; // Red
              if (days <= 90) return 'bg-amber-500'; // Orange
              if (days <= 180) return 'bg-yellow-400'; // Yellow
              return 'bg-emerald-500'; // Green
            };

            return (
              <div className="space-y-6">
                
                {/* ── PAGE HEADER ── */}
                <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-rose-600">⚠️</span> Expiry &amp; Batch Management
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Monitor medicine batches, expiry dates, stock health and inventory quality.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
                    <button 
                      onClick={() => {
                        setActiveTab('inventory');
                        setInventorySubTab('stock-inward');
                        toast.success('Inward procurement workspace loaded.');
                      }} 
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-blue-100"
                    >
                      <Plus size={13} />
                      New Stock Batch
                    </button>
                    <button onClick={() => toast.success('Stock adjustment module launched.')} className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition">
                      Stock Adjustment
                    </button>
                    <button onClick={() => toast.success('Expiry forecast exported.')} className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition">
                      Export Report
                    </button>
                  </div>
                </div>

                {/* ── SUMMARY KPI CARDS ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  {[
                    { label: 'Active Batches', value: activeCount, desc: 'Healthy status', icon: <Package size={16} />, trend: 'Stable', trendColor: 'text-slate-400' },
                    { label: 'Near Expiry (30d)', value: expiring30Count, desc: `Worth ₹${valueAtRisk.toFixed(0)}`, icon: <AlertTriangle size={16} />, trend: '+4', trendColor: 'text-amber-500' },
                    { label: 'Expiring Today', value: expiringTodayCount, desc: 'Requires action', icon: <Clock size={16} />, trend: `${expiringTodayCount} critical`, trendColor: 'text-rose-500' },
                    { label: 'Expired Batches', value: expiredCount, desc: 'Non-dispensable', icon: <Ban size={16} />, trend: 'Expired', trendColor: 'text-red-600' },
                    { label: 'Quarantined', value: quarantinedCount, desc: 'Locked inventory', icon: <Lock size={16} />, trend: 'Locked', trendColor: 'text-slate-400' },
                    { label: 'Value At Risk', value: `₹${valueAtRisk.toLocaleString(undefined, {maximumFractionDigits:0})}`, desc: 'Next 90 days', icon: <DollarSign size={16} />, trend: '+8.2%', trendColor: 'text-amber-500' },
                    { label: 'Recalls Pending', value: recallNotices.filter(n => n.status === 'Pending Quarantine').length, desc: 'Requires quarantine', icon: <AlertTriangle size={16} />, trend: 'Pending', trendColor: 'text-rose-500' },
                    { label: 'Avg Batch Age', value: '142 Days', desc: 'Average storage age', icon: <Activity size={16} />, trend: 'Stable', trendColor: 'text-slate-400' }
                  ].map((kpi, idx) => (
                    <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-4 flex flex-col justify-between min-h-[105px] hover:shadow-md transition-all duration-200">
                      <div className="flex justify-between items-center">
                        <div className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-xs">
                          {kpi.icon}
                        </div>
                        <span className={`text-[8px] font-black uppercase tracking-wider ${kpi.trendColor}`}>
                          {kpi.trend}
                        </span>
                      </div>
                      <div className="mt-3">
                        <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">{kpi.label}</h4>
                        <p className="text-sm font-black text-slate-900 mt-1.5 leading-none">{kpi.value}</p>
                        <p className="text-[8px] text-slate-400 font-semibold mt-1 leading-none">{kpi.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── FILTERS AND BATCH LIST GRID ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Smart filters & Batch table (8 cols) */}
                  <div className="lg:col-span-8 bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                    
                    {/* Header tabs & simple filter */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-50 pb-4">
                      <div className="flex gap-1.5 p-1 bg-slate-50 border border-slate-200/60 rounded-2xl overflow-x-auto w-full lg:w-auto">
                        {[
                          { id: 'ALL', label: 'All Batches' },
                          { id: 'NEAR_EXPIRY', label: 'Near Expiry' },
                          { id: 'EXPIRED', label: 'Expired' },
                          { id: 'QUARANTINED', label: 'Quarantined' }
                        ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => { setSelectedBatchFilter(t.id); setSelectedCalendarDay(null); }}
                            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
                              selectedBatchFilter === t.id && !selectedCalendarDay
                                ? 'bg-blue-600 text-white font-black shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                        {selectedCalendarDay && (
                          <span className="bg-amber-100 text-amber-800 px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5">
                            Calendar: {selectedCalendarDay}
                            <button onClick={() => setSelectedCalendarDay(null)} className="hover:text-red-650 font-black">×</button>
                          </span>
                        )}
                      </div>

                      <div className="flex gap-2 w-full lg:w-auto shrink-0">
                        <div className="relative flex-1 lg:w-64">
                          <input
                            type="text"
                            placeholder="Search medicine, batch, rack..."
                            value={batchSearchQuery}
                            onChange={(e) => setBatchSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs focus:outline-none focus:bg-white focus:border-blue-300 transition-all font-semibold"
                          />
                          <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
                        </div>
                        <button 
                          onClick={() => setShowBatchAdvancedFilters(!showBatchAdvancedFilters)}
                          className={`px-3 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            showBatchAdvancedFilters ? 'bg-blue-50 border-blue-200 text-blue-650' : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          Filters
                        </button>
                      </div>
                    </div>

                    {/* Advanced filter ribbon */}
                    {showBatchAdvancedFilters && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-bold">
                        <div>
                          <label className="text-[9px] text-slate-450 block mb-1">Expiry Forecast</label>
                          <select 
                            value={batchAdvFilters.expiryRange}
                            onChange={e => setBatchAdvFilters({ ...batchAdvFilters, expiryRange: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none"
                          >
                            <option value="">All Periods</option>
                            <option value="today">Expiring Today</option>
                            <option value="7days">Expiring in 7 Days</option>
                            <option value="30days">Expiring in 30 Days</option>
                            <option value="expired">Already Expired</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-450 block mb-1">Rack Location</label>
                          <input 
                            type="text"
                            placeholder="E.g. Rack A-3"
                            value={batchAdvFilters.rack}
                            onChange={e => setBatchAdvFilters({ ...batchAdvFilters, rack: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-450 block mb-1">Supplier</label>
                          <input 
                            type="text"
                            placeholder="E.g. Zydus"
                            value={batchAdvFilters.supplier}
                            onChange={e => setBatchAdvFilters({ ...batchAdvFilters, supplier: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-450 block mb-1">Category</label>
                          <input 
                            type="text"
                            placeholder="E.g. Antibiotics"
                            value={batchAdvFilters.category}
                            onChange={e => setBatchAdvFilters({ ...batchAdvFilters, category: e.target.value })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs focus:outline-none font-semibold"
                          />
                        </div>
                        <div className="flex items-end">
                          <button 
                            onClick={() => {
                              setBatchAdvFilters({ expiryRange: '', status: '', supplier: '', rack: '', category: '' });
                              toast.success('Filters reset.');
                            }}
                            className="w-full py-1.5 bg-slate-200 hover:bg-slate-350 text-slate-700 rounded-xl text-[10px] font-black transition text-center"
                          >
                            Reset
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Batch rows table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-2">Medicine Details</th>
                            <th className="py-3 px-2">Batch No</th>
                            <th className="py-3 px-2">Expiry Date</th>
                            <th className="py-3 px-2">Expiry Progress</th>
                            <th className="py-3 px-2">Qty Available</th>
                            <th className="py-3 px-2">Supplier</th>
                            <th className="py-3 px-2">Status</th>
                            <th className="py-3 px-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {filteredBatches.map(b => {
                            const days = b.daysRemaining;
                            const qty = b.availableStock ?? b.quantity ?? 0;
                            const isQuarantined = b.calculatedStatus === 'Quarantined';
                            const isRecalled = b.calculatedStatus === 'Recalled';

                            let statusBadge = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                            if (isQuarantined) statusBadge = 'bg-slate-100 text-slate-655 border border-slate-250';
                            else if (isRecalled) statusBadge = 'bg-blue-50 text-blue-650 border border-blue-100';
                            else if (days < 0) statusBadge = 'bg-red-50 text-red-600 border border-red-150';
                            else if (days <= 30) statusBadge = 'bg-red-50 text-red-500 border border-red-100';
                            else if (days <= 90) statusBadge = 'bg-amber-50 text-amber-600 border border-amber-100';

                            return (
                              <tr key={b.id} className="hover:bg-slate-50/20 transition-colors">
                                <td className="py-3 px-2">
                                  <div className="font-extrabold text-slate-905">{b.medicineName}</div>
                                  <div className="text-[9px] text-slate-400 font-semibold">{b.genericName}</div>
                                </td>
                                <td className="py-3 px-2 font-bold text-slate-700">{b.batchNumber || b.batchNo || 'N/A'}</td>
                                <td className="py-3 px-2 font-semibold text-slate-600">
                                  {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '—'}
                                </td>
                                <td className="py-3 px-2 min-w-[120px]">
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                      <div 
                                        className={`h-full ${getExpiryProgressColor(days)}`}
                                        style={{ width: `${Math.min(100, Math.max(0, (days / 365) * 100))}%` }}
                                      />
                                    </div>
                                    <span className="text-[9px] text-slate-500 font-bold whitespace-nowrap">
                                      {days < 0 ? 'Expired' : `${days} days`}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-2 font-extrabold text-slate-800">{qty} tabs</td>
                                <td className="py-3 px-2 font-semibold text-slate-500">{b.supplier || '—'}</td>
                                <td className="py-3 px-2">
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${statusBadge}`}>
                                    {b.calculatedStatus}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-right">
                                  <div className="flex justify-end gap-1">
                                    <button 
                                      onClick={() => setSelectedBatchDetail(b)}
                                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9px] font-black transition"
                                    >
                                      View
                                    </button>
                                    {isQuarantined ? (
                                      <button 
                                        onClick={() => handleReleaseQuarantine(b)}
                                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-650 rounded-lg text-[9px] font-black transition"
                                      >
                                        Release
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => {
                                          setBatchToQuarantine(b);
                                          setQuarantineReason('Manual Hold');
                                          setShowQuarantineModal(true);
                                        }}
                                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-650 rounded-lg text-[9px] font-black transition"
                                      >
                                        Quarantine
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Expiry Calendar & Recall notices (4 cols) */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* Expiry Calendar Widget */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider">Expiry Calendar</h3>
                        <span className="text-[10px] text-blue-600 font-extrabold uppercase">July 2026</span>
                      </div>
                      
                      {/* Simple Grid Calendar representation */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                          <div key={d} className="py-1 text-[9px] uppercase tracking-wider text-slate-400 font-bold">{d}</div>
                        ))}
                        {Array.from({ length: 31 }).map((_, i) => {
                          const dayNum = i + 1;
                          const dateStr = `2026-07-${String(dayNum).padStart(2, '0')}`;
                          
                          // Check if any batches expire on this date
                          const expiringBatchesOnDay = allBatches.filter(b => b.expiryDate && new Date(b.expiryDate).toLocaleDateString('en-CA') === dateStr);
                          const hasExpiry = expiringBatchesOnDay.length > 0;

                          return (
                            <button
                              key={i}
                              onClick={() => {
                                if (hasExpiry) {
                                  setSelectedCalendarDay(dateStr);
                                  setSelectedBatchFilter('ALL');
                                } else {
                                  toast.error(`No batches expiring on 2026-07-${dayNum}`);
                                }
                              }}
                              className={`py-2 rounded-xl transition relative flex flex-col items-center justify-center ${
                                hasExpiry 
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 font-black cursor-pointer' 
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              {dayNum}
                              {hasExpiry && <span className="absolute bottom-1 w-1 h-1 bg-rose-500 rounded-full" />}
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-3 text-center">
                        <button onClick={() => setSelectedCalendarDay(null)} className="text-[9px] text-blue-600 font-bold hover:underline">
                          View All Dates
                        </button>
                      </div>
                    </div>

                    {/* Recall Notices Panel */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                        <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider">Manufacturer Recalls</h3>
                        <span className="text-[9px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-black">Active Alerts</span>
                      </div>

                      <div className="space-y-3.5">
                        {recallNotices.map(notice => {
                          const isQuarantined = notice.status === 'Quarantined';
                          return (
                            <div key={notice.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2.5 text-xs font-bold">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="text-[8px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black">{notice.riskLevel}</span>
                                  <h4 className="font-extrabold text-slate-900 mt-1.5">{notice.medicineName}</h4>
                                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Batch: {notice.batchNo} · Manufacturer: {notice.manufacturer}</p>
                                </div>
                                <span className="text-[8px] text-slate-400 font-bold">{notice.recallDate}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                                {notice.reason}
                              </p>
                              <div className="flex gap-2 pt-1 border-t border-slate-200/60">
                                {isQuarantined ? (
                                  <span className="w-full text-center py-1.5 bg-slate-200 text-slate-500 rounded-xl text-[9px] font-black block">
                                    ✓ Quarantined
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      // Search for matching batch in inventory to quarantine
                                      const match = allBatches.find(b => (b.batchNumber || b.batchNo) === notice.batchNo);
                                      if (match) {
                                        handleQuarantineAction(match, `Manufacturer Recall Notice: ${notice.id}`);
                                        setRecallNotices(prev => prev.map(n => n.id === notice.id ? { ...n, status: 'Quarantined' } : n));
                                      } else {
                                        toast.error(`Target batch ${notice.batchNo} not found in inventory.`);
                                      }
                                    }}
                                    className="w-full text-center py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[9px] font-black transition"
                                  >
                                    Quarantine Batch
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>

                {/* ── BATCH DETAIL RIGHT PANEL SLIDE-OVER ── */}
                {selectedBatchDetail && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex justify-end z-50 animate-fade-in">
                    <div className="w-full max-w-md bg-white h-screen shadow-2xl flex flex-col justify-between animate-slide-in">
                      
                      {/* Header */}
                      <div className="p-6 bg-slate-900 text-white flex justify-between items-start shrink-0">
                        <div>
                          <span className="text-[8px] uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded font-black">Batch Detail</span>
                          <h3 className="font-extrabold text-sm mt-1">{selectedBatchDetail.medicineName}</h3>
                          <p className="text-[10px] text-slate-400 font-bold">{selectedBatchDetail.genericName}</p>
                        </div>
                        <button 
                          onClick={() => setSelectedBatchDetail(null)}
                          className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-bold text-slate-655">
                        
                        {/* Status card */}
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center">
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider leading-none">Days to Expiry</p>
                            <p className={`text-base font-black mt-2 leading-none ${selectedBatchDetail.daysRemaining < 0 ? 'text-red-700' : 'text-slate-900'}`}>
                              {selectedBatchDetail.daysRemaining < 0 ? 'Expired' : `${selectedBatchDetail.daysRemaining} Days`}
                            </p>
                          </div>
                          <span className="text-[10px] bg-white border border-slate-200 px-3 py-1 rounded-xl text-slate-700 font-extrabold">
                            Status: <span className="font-black text-blue-600">{selectedBatchDetail.calculatedStatus}</span>
                          </span>
                        </div>

                        {/* Batch metrics grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                            <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold mb-1">Batch Number</p>
                            <p className="text-slate-800 font-black">{selectedBatchDetail.batchNumber || selectedBatchDetail.batchNo || 'N/A'}</p>
                          </div>
                          <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                            <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold mb-1">Expiry Date</p>
                            <p className="text-slate-800 font-black">
                              {selectedBatchDetail.expiryDate ? new Date(selectedBatchDetail.expiryDate).toLocaleDateString('en-GB') : 'N/A'}
                            </p>
                          </div>
                          <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                            <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold mb-1">Rack Location</p>
                            <p className="text-slate-800 font-black">{selectedBatchDetail.rackNumber}</p>
                          </div>
                          <div className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                            <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold mb-1">Bin/Shelf</p>
                            <p className="text-slate-800 font-black">{selectedBatchDetail.storageLocation || 'Shelf 1'}</p>
                          </div>
                        </div>

                        {/* Financials details */}
                        <div className="p-4 border border-slate-100 rounded-2xl space-y-2">
                          <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-1">Financial Summary</h4>
                          <div className="flex justify-between items-center text-slate-655 font-bold">
                            <span>Purchase Price (per Strip):</span>
                            <span className="text-slate-800">₹{selectedBatchDetail.purchasePrice || 40}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-655 font-bold">
                            <span>MRP (per Strip):</span>
                            <span className="text-slate-855 font-extrabold text-blue-650">₹{selectedBatchDetail.sellingPrice || selectedBatchDetail.mrp || 60}</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-655 font-bold">
                            <span>Supplier Source:</span>
                            <span className="text-slate-800">{selectedBatchDetail.supplier || 'General Supplier'}</span>
                          </div>
                        </div>

                        {/* Stock metrics */}
                        <div className="p-4 border border-slate-100 rounded-2xl space-y-2">
                          <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold mb-1">Inventory Metrics</h4>
                          <div className="flex justify-between items-center text-slate-655 font-bold">
                            <span>Total Inward Quantity:</span>
                            <span className="text-slate-800">{selectedBatchDetail.quantity} tabs</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-655 font-bold">
                            <span>Current Available Stock:</span>
                            <span className="text-slate-855 font-extrabold text-emerald-600">{selectedBatchDetail.availableStock ?? selectedBatchDetail.quantity} tabs</span>
                          </div>
                        </div>

                      </div>

                      {/* Actions */}
                      <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0">
                        {selectedBatchDetail.calculatedStatus === 'Quarantined' ? (
                          <button 
                            onClick={() => handleReleaseQuarantine(selectedBatchDetail)}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition text-center"
                          >
                            Release Quarantine
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              setBatchToQuarantine(selectedBatchDetail);
                              setQuarantineReason('Manual Hold');
                              setShowQuarantineModal(true);
                            }}
                            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition text-center"
                          >
                            Quarantine Batch
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            toast.success(`Disposal logs created for Batch ${selectedBatchDetail.batchNo || selectedBatchDetail.batchNumber}`);
                            setSelectedBatchDetail(null);
                          }}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition text-center"
                        >
                          Dispose Batch
                        </button>
                      </div>

                    </div>
                  </div>
                )}

                {/* ── QUARANTINE MODAL ── */}
                {showQuarantineModal && batchToQuarantine && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4 animate-zoom-in text-xs font-bold text-slate-655">
                      <div className="flex justify-between items-center">
                        <h3 className="font-extrabold text-sm text-slate-900">Quarantine Inventory Batch</h3>
                        <button onClick={() => setShowQuarantineModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">×</button>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-slate-500 font-semibold">Are you sure you want to quarantine batch <span className="text-slate-800 font-extrabold">{batchToQuarantine.batchNumber || batchToQuarantine.batchNo}</span> of <span className="text-slate-800 font-extrabold">{batchToQuarantine.medicineName}</span>?</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">This will lock the batch stock and prevent it from appearing in Walk-in Sales, Prescriptions checkout, or active dispensing flows.</p>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Select Quarantine Reason</label>
                        <select
                          value={quarantineReason}
                          onChange={e => setQuarantineReason(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                        >
                          <option value="Damaged">Damaged / Seal Broken</option>
                          <option value="Recall">Manufacturer Recall</option>
                          <option value="Suspicious Quality">Suspicious Quality / Color Alteration</option>
                          <option value="Storage Failure">Storage Temperature Failure</option>
                          <option value="Expired">Expired Stock</option>
                          <option value="Manual Hold">Manual Manager Hold</option>
                        </select>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button 
                          onClick={() => setShowQuarantineModal(false)}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleQuarantineAction(batchToQuarantine, quarantineReason)}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-rose-100"
                        >
                          Confirm Lock
                        </button>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            );
          })()}

          {/* ================= TAB 4.7: STOCK TRANSFER MANAGEMENT ================= */}
          {tab === 'transfer' && (() => {
            // Filter transfers based on search term
            const filteredTransfers = transfersList.filter(t => {
              if (transferSearchQuery.trim()) {
                const q = transferSearchQuery.toLowerCase();
                return (
                  t.transferNumber.toLowerCase().includes(q) ||
                  t.type.toLowerCase().includes(q) ||
                  t.fromLocation.toLowerCase().includes(q) ||
                  t.toLocation.toLowerCase().includes(q) ||
                  t.status.toLowerCase().includes(q)
                );
              }
              return true;
            });

            // Calculate new transfer totals
            const transferTotalMRPVal = newTransferData.medicines.reduce((acc, m) => acc + (m.qty * m.sellingPrice), 0);
            const transferTotalPurVal = newTransferData.medicines.reduce((acc, m) => acc + (m.qty * m.purchasePrice), 0);
            const transferTotalUnits = newTransferData.medicines.reduce((acc, m) => acc + m.qty, 0);

            // Handle submit new transfer
            const handleSubmitTransfer = () => {
              if (newTransferData.medicines.length === 0) {
                toast.error('Please add at least one medicine to transfer.');
                return;
              }

              const newRef = `TRF-${Math.floor(10000 + Math.random() * 90000)}`;
              const submission = {
                id: newRef,
                transferNumber: newRef,
                type: newTransferData.transferType,
                fromLocation: newTransferData.fromLocation,
                toLocation: newTransferData.toLocation,
                createdBy: user?.name || 'Pharmacy Staff',
                createdDate: new Date().toLocaleDateString('en-CA'),
                medicineCount: newTransferData.medicines.length,
                batchCount: newTransferData.medicines.length,
                transferValue: transferTotalMRPVal,
                status: 'Pending Approval',
                expectedArrival: newTransferData.expectedDelivery,
                priority: newTransferData.priority,
                reason: newTransferData.reason,
                medicines: [...newTransferData.medicines]
              };

              setTransfersList(prev => [submission, ...prev]);
              toast.success(`Stock Transfer Request "${newRef}" submitted for Approval.`);
              setShowNewTransferWizard(false);
              setNewTransferStep(1);
              setNewTransferData({
                transferType: 'Branch Transfer',
                fromLocation: 'Ram\'s Dental Clinic (Indirapuram)',
                toLocation: 'Ram\'s Dental Clinic (Vaishali)',
                transferDate: '2026-07-19',
                expectedDelivery: '2026-07-22',
                referenceNo: '',
                reason: 'Routine Replenishment',
                priority: 'Medium',
                remarks: '',
                medicines: []
              });
            };

            // Handle Accept incoming transfer
            const handleAcceptTransfer = (transfer) => {
              setTransfersList(prev => prev.map(t => {
                if (t.id === transfer.id) {
                  return { ...t, status: 'Completed' };
                }
                return t;
              }));
              toast.success(`Transfer ${transfer.transferNumber} received and completed. Inventory updated!`);
              setSelectedTransferDetail(null);
            };

            return (
              <div className="space-y-6">
                
                {/* ── PAGE HEADER ── */}
                <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-blue-600">🔄</span> Stock Transfer
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Transfer medicines and inventory batches between branches, stores or locations.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
                    {showNewTransferWizard ? (
                      <button 
                        onClick={() => setShowNewTransferWizard(false)}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        Transfer History
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setNewTransferStep(1);
                          setShowNewTransferWizard(true);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-blue-100"
                      >
                        <Plus size={13} />
                        New Stock Transfer
                      </button>
                    )}
                  </div>
                </div>

                {/* ── MAIN WORKSPACE ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Workspace Block (8 cols) */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    {/* WIZARD FLOW */}
                    {showNewTransferWizard ? (
                      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
                        
                        {/* Step Indicators */}
                        <div className="flex items-center justify-between border-b border-slate-50 pb-5 text-xs font-bold">
                          {[
                            { step: 1, label: 'Transfer Details', desc: 'Initiate transfer' },
                            { step: 2, label: 'Select Medicines', desc: 'Add medicines & batches' },
                            { step: 3, label: 'Review & Confirm', desc: 'Verify & submit transfer' }
                          ].map(s => (
                            <div key={s.step} className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                                newTransferStep === s.step
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : newTransferStep > s.step
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-50 border border-slate-200 text-slate-400'
                              }`}>
                                {s.step}
                              </div>
                              <div>
                                <h4 className={newTransferStep === s.step ? 'text-slate-905 font-black' : 'text-slate-400 font-semibold'}>{s.label}</h4>
                                <p className="text-[9px] text-slate-400 font-semibold mt-0.5">{s.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Step 1 Form */}
                        {newTransferStep === 1 && (
                          <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-655">
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Transfer Type</label>
                              <select 
                                value={newTransferData.transferType}
                                onChange={e => setNewTransferData({ ...newTransferData, transferType: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                              >
                                <option value="Branch Transfer">Branch Transfer</option>
                                <option value="Pharmacy -> Warehouse">Pharmacy → Warehouse</option>
                                <option value="Warehouse -> Pharmacy">Warehouse → Pharmacy</option>
                                <option value="Emergency Stock Transfer">Emergency Stock Transfer</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Reference / Transfer Note (Optional)</label>
                              <input 
                                type="text"
                                placeholder="Enter reference number or note..."
                                value={newTransferData.referenceNo}
                                onChange={e => setNewTransferData({ ...newTransferData, referenceNo: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">From Location (Source)</label>
                              <select
                                value={newTransferData.fromLocation}
                                onChange={e => setNewTransferData({ ...newTransferData, fromLocation: e.target.value })}
                                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none text-slate-500 cursor-not-allowed"
                                disabled
                              >
                                <option value="Ram's Dental Clinic (Indirapuram)">Ram's Dental Clinic (Indirapuram)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">To Location (Destination)</label>
                              <select
                                value={newTransferData.toLocation}
                                onChange={e => setNewTransferData({ ...newTransferData, toLocation: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                              >
                                <option value="Ram's Dental Clinic (Vaishali)">Ram's Dental Clinic (Vaishali)</option>
                                <option value="Central Warehouse (Noida)">Central Warehouse (Noida)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Transfer Date</label>
                              <input 
                                type="date"
                                value={newTransferData.transferDate}
                                onChange={e => setNewTransferData({ ...newTransferData, transferDate: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Expected Delivery Date</label>
                              <input 
                                type="date"
                                value={newTransferData.expectedDelivery}
                                onChange={e => setNewTransferData({ ...newTransferData, expectedDelivery: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Transfer Reason</label>
                              <select
                                value={newTransferData.reason}
                                onChange={e => setNewTransferData({ ...newTransferData, reason: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                              >
                                <option value="Routine Replenishment">Routine Replenishment</option>
                                <option value="Low Stock">Low Stock replenishment</option>
                                <option value="Emergency">Emergency medical requirement</option>
                                <option value="Stock Balancing">Stock Balancing</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Priority</label>
                              <select
                                value={newTransferData.priority}
                                onChange={e => setNewTransferData({ ...newTransferData, priority: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                              >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical Emergency</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Step 2 Form (Selected Medicines List) */}
                        {newTransferStep === 2 && (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h3 className="text-xs font-black text-slate-805 uppercase tracking-wider">Select Medicines &amp; Batches</h3>
                              <button 
                                onClick={() => {
                                  setSelectedMedForTransfer(null);
                                  setSelectedBatchForTransfer(null);
                                  setTransferQty(1);
                                  setTransferUnit('Strips');
                                  setShowAddMedicineToTransferModal(true);
                                }}
                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                              >
                                <Plus size={13} /> Add Medicine
                              </button>
                            </div>

                            {/* Added Medicines Table */}
                            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                    <th className="py-2.5 px-3">Medicine Details</th>
                                    <th className="py-2.5 px-3">Batch No</th>
                                    <th className="py-2.5 px-3">Expiry Date</th>
                                    <th className="py-2.5 px-3">Source Stock</th>
                                    <th className="py-2.5 px-3">Transfer Qty</th>
                                    <th className="py-2.5 px-3">Unit</th>
                                    <th className="py-2.5 px-3 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {newTransferData.medicines.length === 0 ? (
                                    <tr>
                                      <td colSpan="7" className="py-8 text-center text-slate-400 font-bold">
                                        No medicines added to transfer list. Click "+ Add Medicine" above.
                                      </td>
                                    </tr>
                                  ) : (
                                    newTransferData.medicines.map((m, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50/20 font-bold text-slate-700">
                                        <td className="py-3 px-3">
                                          <p>{m.medicineName}</p>
                                          <span className="text-[9px] text-slate-400 font-semibold">{m.brand}</span>
                                        </td>
                                        <td className="py-3 px-3">{m.batchNumber}</td>
                                        <td className="py-3 px-3 font-semibold text-slate-655">{m.expiry}</td>
                                        <td className="py-3 px-3 text-slate-500">{m.maxStock} tabs available</td>
                                        <td className="py-3 px-3">
                                          <input 
                                            type="number"
                                            value={m.qty}
                                            onChange={e => {
                                              const val = Math.min(m.maxStock, Math.max(1, parseInt(e.target.value) || 1));
                                              setNewTransferData({
                                                ...newTransferData,
                                                medicines: newTransferData.medicines.map((med, i) => i === idx ? { ...med, qty: val } : med)
                                              });
                                            }}
                                            className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center focus:outline-none"
                                          />
                                        </td>
                                        <td className="py-3 px-3 text-slate-600 font-semibold">{m.unit}</td>
                                        <td className="py-3 px-3 text-right">
                                          <button 
                                            onClick={() => {
                                              setNewTransferData({
                                                ...newTransferData,
                                                medicines: newTransferData.medicines.filter((_, i) => i !== idx)
                                              });
                                            }}
                                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Step 3 Form (Review) */}
                        {newTransferStep === 3 && (
                          <div className="space-y-6 text-xs font-bold text-slate-655">
                            
                            {/* Summary Stats grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Total Medicines</p>
                                <p className="text-sm font-black text-slate-900 mt-1">{newTransferData.medicines.length}</p>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Total Quantity</p>
                                <p className="text-sm font-black text-slate-900 mt-1">{transferTotalUnits} Units</p>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Total Purchase Value</p>
                                <p className="text-sm font-black text-emerald-600 mt-1">₹{transferTotalPurVal.toLocaleString()}</p>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Total MRP Value</p>
                                <p className="text-sm font-black text-blue-650 mt-1">₹{transferTotalMRPVal.toLocaleString()}</p>
                              </div>
                            </div>

                            {/* Details Summary Block */}
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                              <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Transfer Summary Information</h4>
                              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-slate-655 font-bold">
                                <p>From Location: <span className="text-slate-805">{newTransferData.fromLocation}</span></p>
                                <p>To Location: <span className="text-slate-805">{newTransferData.toLocation}</span></p>
                                <p>Transfer Reason: <span className="text-slate-805">{newTransferData.reason}</span></p>
                                <p>Transfer Priority: <span className="text-slate-805">{newTransferData.priority}</span></p>
                                <p>Fulfillment Date: <span className="text-slate-805">{newTransferData.expectedDelivery}</span></p>
                              </div>
                            </div>

                            {/* Review Items list */}
                            <div className="space-y-3">
                              <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Items Review</h4>
                              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-4 bg-white space-y-2">
                                {newTransferData.medicines.map((m, idx) => (
                                  <div key={idx} className="py-2 flex justify-between items-center text-xs">
                                    <div>
                                      <p className="font-extrabold text-slate-905">{m.medicineName}</p>
                                      <span className="text-[9px] text-slate-405 font-bold">Batch: {m.batchNumber} · Expiry: {m.expiry}</span>
                                    </div>
                                    <span className="font-black text-slate-900">{m.qty} {m.unit}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        )}

                        {/* Step Buttons */}
                        <div className="flex justify-between items-center border-t border-slate-50 pt-5">
                          <button 
                            onClick={() => {
                              if (newTransferStep > 1) setNewTransferStep(prev => prev - 1);
                              else setShowNewTransferWizard(false);
                            }}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
                          >
                            {newTransferStep > 1 ? '← Back' : 'Cancel'}
                          </button>

                          <div className="flex gap-2">
                            {newTransferStep < 3 ? (
                              <button 
                                onClick={() => {
                                  if (newTransferStep === 2 && newTransferData.medicines.length === 0) {
                                    toast.error('Add at least one medicine.');
                                    return;
                                  }
                                  setNewTransferStep(prev => prev + 1);
                                }}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-blue-100"
                              >
                                Next Step →
                              </button>
                            ) : (
                              <button 
                                onClick={handleSubmitTransfer}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-emerald-100"
                              >
                                Submit Transfer Request
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    ) : (
                      
                      // TRANSFERS HISTORY TABLE LIST
                      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                        
                        <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                          <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider">Transfer History ({filteredTransfers.length})</h3>
                          <div className="relative w-64">
                            <input 
                              type="text"
                              placeholder="Search transfers..."
                              value={transferSearchQuery}
                              onChange={e => setTransferSearchQuery(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-1.5 text-xs focus:outline-none focus:bg-white font-semibold"
                            />
                            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                          </div>
                        </div>

                        {/* History table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                <th className="py-3 px-2">Transfer No</th>
                                <th className="py-3 px-2">Route Details</th>
                                <th className="py-3 px-2">Created By</th>
                                <th className="py-3 px-2">Medicine/Batch Count</th>
                                <th className="py-3 px-2">Transfer Value</th>
                                <th className="py-3 px-2">Status</th>
                                <th className="py-3 px-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {filteredTransfers.map(t => {
                                let statusClass = 'bg-slate-50 text-slate-500 border border-slate-200';
                                if (t.status === 'Completed') statusClass = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                                else if (t.status === 'In Transit') statusClass = 'bg-blue-50 text-blue-600 border border-blue-100';
                                else if (t.status === 'Pending Approval') statusClass = 'bg-amber-50 text-amber-600 border border-amber-100';
                                else if (t.status === 'Cancelled') statusClass = 'bg-red-50 text-red-500 border border-red-100';

                                return (
                                  <tr key={t.id} className="hover:bg-slate-50/20 font-semibold text-slate-700">
                                    <td className="py-3.5 px-2">
                                      <p className="font-extrabold text-slate-905">{t.transferNumber}</p>
                                      <span className="text-[8px] text-slate-400 uppercase tracking-wider">{t.type}</span>
                                    </td>
                                    <td className="py-3.5 px-2">
                                      <p className="text-[10px] text-slate-500">From: <span className="text-slate-700">{t.fromLocation}</span></p>
                                      <p className="text-[10px] text-slate-500">To: <span className="text-slate-700">{t.toLocation}</span></p>
                                    </td>
                                    <td className="py-3.5 px-2 text-slate-500">{t.createdBy}</td>
                                    <td className="py-3.5 px-2 font-bold">{t.medicineCount} Meds / {t.batchCount} Batches</td>
                                    <td className="py-3.5 px-2 font-extrabold text-blue-650">₹{t.transferValue.toLocaleString()}</td>
                                    <td className="py-3.5 px-2">
                                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${statusClass}`}>
                                        {t.status}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-2 text-right">
                                      <button 
                                        onClick={() => setSelectedTransferDetail(t)}
                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9px] font-black transition"
                                      >
                                        View Details
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                      </div>
                    )}

                  </div>

                  {/* Right Column Summary Sidebar (4 cols) */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* Transfer Summary Widget */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4 text-xs font-bold text-slate-655">
                      <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider border-b border-slate-50 pb-3">Transfer Summary</h3>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs shrink-0">
                            F
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider leading-none">From Location</p>
                            <p className="text-slate-800 mt-1 leading-tight">{newTransferData.fromLocation}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xs shrink-0">
                            T
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase tracking-wider leading-none">To Location</p>
                            <p className="text-slate-800 mt-1 leading-tight">{newTransferData.toLocation}</p>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-slate-655">
                          <span>Transfer Date:</span>
                          <span className="text-slate-805">{newTransferData.transferDate}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-655">
                          <span>Expected Delivery:</span>
                          <span className="text-slate-805">{newTransferData.expectedDelivery}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-655">
                          <span>Status:</span>
                          <span className="text-blue-600 font-extrabold">Draft</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick actions panel */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                      <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider border-b border-slate-50 pb-3">Quick Actions</h3>
                      <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold text-slate-700">
                        <button onClick={() => toast.success('Discrepancy logs loaded.')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-150 transition">
                          Discrepancy Reports
                        </button>
                        <button onClick={() => toast.success('Transfer notes PDF generated.')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-150 transition">
                          Print Note
                        </button>
                        <button onClick={() => toast.success('Vehicle shipment assignment loaded.')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-150 transition">
                          Shipment Dispatch
                        </button>
                        <button onClick={() => toast.success('Stock adjustment history loaded.')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-150 transition">
                          Stock Adjustment
                        </button>
                      </div>
                    </div>

                  </div>
                </div>

                {/* ── TRANSFER DETAILS RIGHT PANEL SLIDE-OVER ── */}
                {selectedTransferDetail && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex justify-end z-50 animate-fade-in">
                    <div className="w-full max-w-lg bg-white h-screen shadow-2xl flex flex-col justify-between animate-slide-in">
                      
                      {/* Header */}
                      <div className="p-6 bg-slate-900 text-white flex justify-between items-start shrink-0">
                        <div>
                          <span className="text-[8px] uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded font-black">Transfer Details</span>
                          <h3 className="font-extrabold text-sm mt-1">{selectedTransferDetail.transferNumber}</h3>
                          <p className="text-[10px] text-slate-400 font-bold">{selectedTransferDetail.type} · Priority: {selectedTransferDetail.priority}</p>
                        </div>
                        <button 
                          onClick={() => setSelectedTransferDetail(null)}
                          className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-bold text-slate-655">
                        
                        {/* Locations grid */}
                        <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-655 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Source (From)</p>
                            <p className="text-slate-800 mt-1 leading-normal">{selectedTransferDetail.fromLocation}</p>
                          </div>
                          <div>
                            <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Destination (To)</p>
                            <p className="text-slate-800 mt-1 leading-normal">{selectedTransferDetail.toLocation}</p>
                          </div>
                        </div>

                        {/* Status history timeline */}
                        <div className="space-y-3.5">
                          <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Fulfillment Timeline</h4>
                          <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4">
                            <div className="relative">
                              <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                              <p className="text-slate-800 font-bold leading-none">Request Created</p>
                              <span className="text-[9px] text-slate-400 mt-1 block">Created on {selectedTransferDetail.createdDate} by {selectedTransferDetail.createdBy}</span>
                            </div>
                            {selectedTransferDetail.status !== 'Pending Approval' && (
                              <div className="relative">
                                <span className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                  selectedTransferDetail.status === 'Cancelled' ? 'bg-red-500' : 'bg-emerald-500'
                                }`} />
                                <p className="text-slate-800 font-bold leading-none">Approval Status</p>
                                <span className="text-[9px] text-slate-400 mt-1 block">
                                  {selectedTransferDetail.status === 'Cancelled' ? 'Request Rejected / Cancelled' : 'Approved by Store Manager'}
                                </span>
                              </div>
                            )}
                            <div className="relative">
                              <span className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                selectedTransferDetail.status === 'Completed' ? 'bg-emerald-500' : 'bg-slate-300'
                              }`} />
                              <p className="text-slate-800 font-bold leading-none">Dispatch &amp; Receiving</p>
                              <span className="text-[9px] text-slate-400 mt-1 block">
                                {selectedTransferDetail.status === 'Completed' ? `Delivered & Confirmed on ${selectedTransferDetail.expectedArrival}` : 'Awaiting dispatch confirmation'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Medicines list */}
                        <div className="space-y-3">
                          <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Medicines Transferred</h4>
                          {(!selectedTransferDetail.medicines || selectedTransferDetail.medicines.length === 0) ? (
                            <div className="text-center text-slate-400 font-bold py-6 bg-slate-50 border border-slate-100 rounded-2xl">
                              No item details mapped to this historical record.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-4 bg-white space-y-2">
                              {selectedTransferDetail.medicines.map((m, idx) => (
                                <div key={idx} className="py-2 flex justify-between items-center text-xs">
                                  <div>
                                    <p className="font-extrabold text-slate-905">{m.medicineName}</p>
                                    <span className="text-[9px] text-slate-405 font-bold">Batch: {m.batchNumber}</span>
                                  </div>
                                  <span className="font-black text-slate-900">{m.qty} {m.unit}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Footer Actions */}
                      <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0">
                        {selectedTransferDetail.status === 'Pending Approval' && (
                          <>
                            <button 
                              onClick={() => {
                                setTransfersList(prev => prev.map(t => t.id === selectedTransferDetail.id ? { ...t, status: 'In Transit' } : t));
                                toast.success(`Approved transfer ${selectedTransferDetail.transferNumber}. Dispatched!`);
                                setSelectedTransferDetail(null);
                              }}
                              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition text-center"
                            >
                              Approve &amp; Dispatch
                            </button>
                            <button 
                              onClick={() => {
                                setTransfersList(prev => prev.map(t => t.id === selectedTransferDetail.id ? { ...t, status: 'Cancelled' } : t));
                                toast.error(`Rejected transfer request ${selectedTransferDetail.transferNumber}.`);
                                setSelectedTransferDetail(null);
                              }}
                              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition text-center"
                            >
                              Reject Request
                            </button>
                          </>
                        )}
                        {selectedTransferDetail.status === 'In Transit' && (
                          <button 
                            onClick={() => handleAcceptTransfer(selectedTransferDetail)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition text-center"
                          >
                            Confirm Goods Received
                          </button>
                        )}
                        {selectedTransferDetail.status === 'Completed' && (
                          <button 
                            onClick={() => {
                              toast.success('Transfer note sent to printer.');
                            }}
                            className="w-full py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition text-center"
                          >
                            Print Transfer Note Receipt
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* ── ADD MEDICINE TO TRANSFER MODAL ── */}
                {showAddMedicineToTransferModal && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-zoom-in text-xs font-bold text-slate-655">
                      <div className="flex justify-between items-center">
                        <h3 className="font-extrabold text-sm text-slate-900">Add Medicine to Transfer</h3>
                        <button onClick={() => setShowAddMedicineToTransferModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">×</button>
                      </div>

                      {/* Medicine Select Dropdown */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Select Medicine from Source Stock</label>
                          <select
                            onChange={e => {
                              const med = inventory.find(item => item._id === e.target.value || item.id === e.target.value);
                              setSelectedMedForTransfer(med);
                              setSelectedBatchForTransfer(med?.batches?.[0] || null);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                          >
                            <option value="">-- Choose Medicine --</option>
                            {inventory.map(med => (
                              <option key={med._id || med.id} value={med._id || med.id}>{med.brandName || med.brand || med.name} ({med.genericName || med.name})</option>
                            ))}
                          </select>
                        </div>

                        {selectedMedForTransfer && (
                          <>
                            {/* Batch Selection */}
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Select Active Batch</label>
                              <select
                                onChange={e => {
                                  const batch = selectedMedForTransfer.batches.find(b => b._id === e.target.value || b.id === e.target.value);
                                  setSelectedBatchForTransfer(batch);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                              >
                                {selectedMedForTransfer.batches.map(b => (
                                  <option key={b._id || b.id} value={b._id || b.id}>Batch: {b.batchNumber || b.batchNo || 'N/A'} (Available: {b.availableStock ?? b.quantity} tabs)</option>
                                ))}
                              </select>
                            </div>

                            {/* Qty & Unit */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Transfer Qty (in tabs)</label>
                                <input 
                                  type="number"
                                  value={transferQty}
                                  onChange={e => {
                                    const max = selectedBatchForTransfer ? (selectedBatchForTransfer.availableStock ?? selectedBatchForTransfer.quantity) : 10;
                                    setTransferQty(Math.min(max, Math.max(1, parseInt(e.target.value) || 1)));
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none text-center"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Unit</label>
                                <select
                                  value={transferUnit}
                                  onChange={e => setTransferUnit(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                                >
                                  <option value="Strips">Strips</option>
                                  <option value="Vials">Vials</option>
                                  <option value="Tablets">Tablets</option>
                                </select>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Modal Footer */}
                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button 
                          onClick={() => setShowAddMedicineToTransferModal(false)}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            if (!selectedMedForTransfer || !selectedBatchForTransfer) {
                              toast.error('Please select both medicine and batch.');
                              return;
                            }
                            
                            const itemToAdd = {
                              medicineName: selectedMedForTransfer.brandName || selectedMedForTransfer.brand || selectedMedForTransfer.name,
                              brand: selectedMedForTransfer.brandName || selectedMedForTransfer.brand || selectedMedForTransfer.name,
                              batchNumber: selectedBatchForTransfer.batchNumber || selectedBatchForTransfer.batchNo || 'N/A',
                              expiry: selectedBatchForTransfer.expiryDate || 'N/A',
                              qty: transferQty,
                              unit: transferUnit,
                              maxStock: selectedBatchForTransfer.availableStock ?? selectedBatchForTransfer.quantity,
                              sellingPrice: selectedMedForTransfer.sellingPrice || 50,
                              purchasePrice: selectedMedForTransfer.purchasePrice || 35
                            };

                            setNewTransferData(prev => ({
                              ...prev,
                              medicines: [...prev.medicines, itemToAdd]
                            }));

                            toast.success(`Added ${itemToAdd.medicineName} to transfer list.`);
                            setShowAddMedicineToTransferModal(false);
                          }}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-blue-100"
                        >
                          Add to Transfer
                        </button>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            );
          })()}

          {/* ================= TAB 4.8: RETURNS MANAGEMENT ================= */}
          {tab === 'returns' && (() => {
            const today = new Date();

            // Filter returns based on search term and active tab
            const filteredReturns = returnsList.filter(r => {
              // 1. Tab filters
              if (selectedReturnTabFilter === 'SUPPLIER' && r.type !== 'Return to Supplier') return false;
              if (selectedReturnTabFilter === 'CUSTOMER' && r.type !== 'Customer Return') return false;
              if (selectedReturnTabFilter === 'PENDING' && r.status !== 'Pending Approval') return false;
              if (selectedReturnTabFilter === 'COMPLETED' && r.status !== 'Completed') return false;
              if (selectedReturnTabFilter === 'REJECTED' && r.status !== 'Rejected') return false;

              // 2. Search query
              if (returnSearchQuery.trim()) {
                const q = returnSearchQuery.toLowerCase();
                return (
                  r.returnNumber.toLowerCase().includes(q) ||
                  r.type.toLowerCase().includes(q) ||
                  r.supplierOrCustomer.toLowerCase().includes(q) ||
                  r.reference.toLowerCase().includes(q) ||
                  r.status.toLowerCase().includes(q)
                );
              }
              return true;
            });

            // Calculate wizard financial summaries
            const wizardTotalMRPVal = newReturnData.medicines.reduce((acc, m) => acc + (m.qty * m.sellingPrice), 0);
            const wizardTotalPurVal = newReturnData.medicines.reduce((acc, m) => acc + (m.qty * m.purchasePrice), 0);
            const wizardTotalQty = newReturnData.medicines.reduce((acc, m) => acc + m.qty, 0);

            // Handle submit new return
            const handleSubmitReturn = () => {
              if (newReturnData.medicines.length === 0) {
                toast.error('Please add at least one medicine to return.');
                return;
              }

              const newRef = `RET-${Math.floor(10000 + Math.random() * 90000)}`;
              const submission = {
                id: newRef,
                returnNumber: newRef,
                type: newReturnData.returnType,
                supplierOrCustomer: newReturnData.source === 'Supplier' 
                  ? `${newReturnData.supplierId} (SUP-${Math.floor(1000 + Math.random() * 9000)})` 
                  : `${newReturnData.customerName || 'Walk-in Customer'} (CUST-${Math.floor(1000 + Math.random() * 9000)})`,
                reference: newReturnData.invoiceNo || `REF-${Math.floor(10000 + Math.random() * 90000)}`,
                returnDate: new Date().toLocaleDateString('en-CA'),
                medicineCount: newReturnData.medicines.length,
                batchCount: newReturnData.medicines.length,
                amount: wizardTotalMRPVal,
                status: 'Pending Approval',
                createdBy: user?.name || 'Pharmacy Staff',
                medicines: [...newReturnData.medicines]
              };

              setReturnsList(prev => [submission, ...prev]);
              toast.success(`Return Request "${newRef}" submitted successfully.`);
              setShowNewReturnWizard(false);
              setNewReturnStep(1);
              setNewReturnData({
                returnType: 'Return to Supplier',
                source: 'Supplier',
                supplierId: 'Zydus Healthcare Ltd.',
                invoiceNo: '',
                customerPhone: '',
                customerName: '',
                compensationType: 'Refund',
                reason: 'Wrong Supply',
                remarks: '',
                medicines: []
              });
            };

            return (
              <div className="space-y-6">
                
                {/* ── PAGE HEADER ── */}
                <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-blue-600">↩️</span> Returns Management
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Manage returns to suppliers, customer returns, recalls, and expired medicine disposals.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0">
                    {showNewReturnWizard ? (
                      <button 
                        onClick={() => setShowNewReturnWizard(false)}
                        className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        Return History
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setNewReturnStep(1);
                          setShowNewReturnWizard(true);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-blue-100"
                      >
                        <Plus size={13} />
                        New Return
                      </button>
                    )}
                  </div>
                </div>

                {/* ── SUMMARY KPI CARDS ── */}
                {!showNewReturnWizard && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    {[
                      { label: 'Total Returns', value: returnsList.length, desc: 'All time', icon: <RotateCcw size={16} />, trend: 'Stable', trendColor: 'text-slate-400' },
                      { label: 'To Suppliers', value: returnsList.filter(r => r.type === 'Return to Supplier').length, desc: 'Wholesaler stock', icon: <Package size={16} />, trend: '32 this month', trendColor: 'text-blue-600' },
                      { label: 'Customer Returns', value: returnsList.filter(r => r.type === 'Customer Return').length, desc: 'Patient sales', icon: <Users size={16} />, trend: '24 this month', trendColor: 'text-emerald-500' },
                      { label: 'Pending Approval', value: returnsList.filter(r => r.status === 'Pending Approval').length, desc: 'Requires action', icon: <Clock size={16} />, trend: '8 active', trendColor: 'text-amber-500' },
                      { label: 'Completed', value: returnsList.filter(r => r.status === 'Completed').length, desc: 'Disposed & returned', icon: <Check size={16} />, trend: '42 closed', trendColor: 'text-emerald-600' },
                      { label: 'Refund Amount', value: '₹48,560', desc: 'To customers', icon: <DollarSign size={16} />, trend: 'Reconciled', trendColor: 'text-slate-400' },
                      { label: 'Credit Issued', value: '₹32,450', desc: 'Supplier notes', icon: <FileText size={16} />, trend: 'Outstanding', trendColor: 'text-blue-500' },
                      { label: 'Rejected', value: returnsList.filter(r => r.status === 'Rejected').length, desc: 'Failed verification', icon: <Ban size={16} />, trend: '4 entries', trendColor: 'text-rose-500' }
                    ].map((kpi, idx) => (
                      <div key={idx} className="bg-white border border-slate-100 rounded-3xl p-4 flex flex-col justify-between min-h-[105px] hover:shadow-md transition-all duration-200">
                        <div className="flex justify-between items-center">
                          <div className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shadow-xs">
                            {kpi.icon}
                          </div>
                          <span className={`text-[8px] font-black uppercase tracking-wider ${kpi.trendColor}`}>
                            {kpi.trend}
                          </span>
                        </div>
                        <div className="mt-3">
                          <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">{kpi.label}</h4>
                          <p className="text-sm font-black text-slate-900 mt-1.5 leading-none">{kpi.value}</p>
                          <p className="text-[8px] text-slate-400 font-semibold mt-1 leading-none">{kpi.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── MAIN WORKSPACE ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column (8 cols) */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    {/* WIZARD FLOW */}
                    {showNewReturnWizard ? (
                      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
                        
                        {/* Step Indicators */}
                        <div className="flex items-center justify-between border-b border-slate-50 pb-5 text-xs font-bold overflow-x-auto gap-4">
                          {[
                            { step: 1, label: 'Return Type' },
                            { step: 2, label: 'Select Source' },
                            { step: 3, label: 'Select Medicines' },
                            { step: 4, label: 'Financials' },
                            { step: 5, label: 'Review' }
                          ].map(s => (
                            <div key={s.step} className="flex items-center gap-2 shrink-0">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] ${
                                newReturnStep === s.step
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : newReturnStep > s.step
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-50 border border-slate-200 text-slate-400'
                              }`}>
                                {s.step}
                              </div>
                              <span className={newReturnStep === s.step ? 'text-slate-905 font-black' : 'text-slate-400 font-semibold'}>{s.label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Step 1: Return Type selection */}
                        {newReturnStep === 1 && (
                          <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-805 uppercase tracking-wider">Choose Return Category</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center text-xs font-bold">
                              {[
                                { type: 'Return to Supplier', label: 'Return to Supplier', desc: 'Return medicines to wholesalers for credit or replacement.', icon: '📦' },
                                { type: 'Customer Return', label: 'Customer Return', desc: 'Process returns from patients/walk-in buyers.', icon: '👤' },
                                { type: 'Expired Medicine', label: 'Expired Stock Disposal', desc: 'Dispose and write off expired medicines.', icon: '⚠️' },
                                { type: 'Recall', label: 'Batch Recall Return', desc: 'Process regulatory and manufacturer recalls.', icon: '🚫' },
                                { type: 'Damaged Stock', label: 'Internal Damage Return', desc: 'Report storage or water temperature damage.', icon: '💥' },
                                { type: 'Wrong Dispensing', label: 'Wrong Dispensed Correction', desc: 'Reconcile wrong medicine dispensed at checkout.', icon: '💊' },
                                { type: 'Purchase Return', label: 'Purchase Return Check', desc: 'Return direct purchases to vendor.', icon: '📑' },
                                { type: 'Internal Adjustment', label: 'Internal Rack Transfer', desc: 'Reconcile shelf and internal locations.', icon: '🔄' }
                              ].map(cat => (
                                <button
                                  key={cat.type}
                                  onClick={() => {
                                    setNewReturnData({
                                      ...newReturnData,
                                      returnType: cat.type,
                                      source: (cat.type === 'Customer Return' || cat.type === 'Wrong Dispensing') ? 'Customer' : 'Supplier'
                                    });
                                    setNewReturnStep(2);
                                  }}
                                  className={`p-4 border rounded-2xl flex flex-col items-center justify-between text-center min-h-[140px] transition-all duration-200 hover:shadow-md ${
                                    newReturnData.returnType === cat.type
                                      ? 'border-blue-500 bg-blue-500/5 text-blue-900 shadow-sm'
                                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <span className="text-2xl mb-2">{cat.icon}</span>
                                  <div>
                                    <h4 className="font-extrabold text-xs leading-snug">{cat.label}</h4>
                                    <p className="text-[9px] text-slate-400 font-semibold mt-1 leading-normal">{cat.desc}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Step 2: Select Source details */}
                        {newReturnStep === 2 && (
                          <div className="space-y-4 text-xs font-bold text-slate-655">
                            <h3 className="text-xs font-black text-slate-805 uppercase tracking-wider">Select Source Reference</h3>
                            
                            {newReturnData.source === 'Supplier' ? (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-1">Search Supplier</label>
                                  <select
                                    value={newReturnData.supplierId}
                                    onChange={e => setNewReturnData({ ...newReturnData, supplierId: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                                  >
                                    <option value="Zydus Healthcare Ltd.">Zydus Healthcare Ltd.</option>
                                    <option value="Sun Pharmaceutical Ind.">Sun Pharmaceutical Ind.</option>
                                    <option value="Cipla Ltd.">Cipla Ltd.</option>
                                    <option value="Alkem Laboratories Ltd.">Alkem Laboratories Ltd.</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-1">Original Invoice Number (Optional)</label>
                                  <input 
                                    type="text"
                                    placeholder="E.g. INV-95820"
                                    value={newReturnData.invoiceNo}
                                    onChange={e => setNewReturnData({ ...newReturnData, invoiceNo: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none font-semibold"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-1">Customer Phone Number</label>
                                  <input 
                                    type="text"
                                    placeholder="E.g. +91 98765 43210"
                                    value={newReturnData.customerPhone}
                                    onChange={e => setNewReturnData({ ...newReturnData, customerPhone: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none font-semibold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-1">Customer Name</label>
                                  <input 
                                    type="text"
                                    placeholder="E.g. Rahul Sharma"
                                    value={newReturnData.customerName}
                                    onChange={e => setNewReturnData({ ...newReturnData, customerName: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none font-semibold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-400 block mb-1">Sales Receipt / Bill Number</label>
                                  <input 
                                    type="text"
                                    placeholder="E.g. BILL-8591"
                                    value={newReturnData.invoiceNo}
                                    onChange={e => setNewReturnData({ ...newReturnData, invoiceNo: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none font-semibold"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Step 3: Select Medicines to Return */}
                        {newReturnStep === 3 && (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h3 className="text-xs font-black text-slate-805 uppercase tracking-wider">Returned Medicines List</h3>
                              <button 
                                onClick={() => {
                                  setSelectedMedForReturn(null);
                                  setSelectedBatchForReturn(null);
                                  setReturnQty(1);
                                  setReturnUnit('Strips');
                                  setShowAddMedicineToReturnModal(true);
                                }}
                                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                              >
                                <Plus size={13} /> Add Medicine
                              </button>
                            </div>

                            {/* Medicines Table */}
                            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                    <th className="py-2.5 px-3">Medicine Details</th>
                                    <th className="py-2.5 px-3">Batch Number</th>
                                    <th className="py-2.5 px-3">Expiry Date</th>
                                    <th className="py-2.5 px-3">Available Stock</th>
                                    <th className="py-2.5 px-3">Return Qty</th>
                                    <th className="py-2.5 px-3">Unit</th>
                                    <th className="py-2.5 px-3">Return Reason</th>
                                    <th className="py-2.5 px-3 text-right">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {newReturnData.medicines.length === 0 ? (
                                    <tr>
                                      <td colSpan="8" className="py-8 text-center text-slate-400 font-bold">
                                        No medicines added to return list. Click "+ Add Medicine" above.
                                      </td>
                                    </tr>
                                  ) : (
                                    newReturnData.medicines.map((m, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50/20 font-bold text-slate-700">
                                        <td className="py-3 px-3">
                                          <p>{m.medicineName}</p>
                                          <span className="text-[9px] text-slate-400 font-semibold">{m.brand}</span>
                                        </td>
                                        <td className="py-3 px-3">{m.batchNumber}</td>
                                        <td className="py-3 px-3 font-semibold text-slate-655">{m.expiry}</td>
                                        <td className="py-3 px-3 text-slate-500">{m.maxStock} available</td>
                                        <td className="py-3 px-3">
                                          <input 
                                            type="number"
                                            value={m.qty}
                                            onChange={e => {
                                              const val = Math.min(m.maxStock, Math.max(1, parseInt(e.target.value) || 1));
                                              setNewReturnData({
                                                ...newReturnData,
                                                medicines: newReturnData.medicines.map((med, i) => i === idx ? { ...med, qty: val } : med)
                                              });
                                            }}
                                            className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center focus:outline-none"
                                          />
                                        </td>
                                        <td className="py-3 px-3 text-slate-600 font-semibold">{m.unit}</td>
                                        <td className="py-3 px-3 text-slate-500 font-semibold">{m.reason}</td>
                                        <td className="py-3 px-3 text-right">
                                          <button 
                                            onClick={() => {
                                              setNewReturnData({
                                                ...newReturnData,
                                                medicines: newReturnData.medicines.filter((_, i) => i !== idx)
                                              });
                                            }}
                                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Step 4: Financial details configuration */}
                        {newReturnStep === 4 && (
                          <div className="space-y-4 text-xs font-bold text-slate-655">
                            <h3 className="text-xs font-black text-slate-805 uppercase tracking-wider">Compensation &amp; Settlement Details</h3>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Total Refund Amount</p>
                                <p className="text-sm font-black text-emerald-600 mt-1">₹{wizardTotalMRPVal.toLocaleString()}</p>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Total Cost Value</p>
                                <p className="text-sm font-black text-slate-800 mt-1">₹{wizardTotalPurVal.toLocaleString()}</p>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">GST Impact</p>
                                <p className="text-sm font-black text-slate-500 mt-1">₹{(wizardTotalMRPVal * 0.12).toFixed(0)} (12% Avg)</p>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-[8px] text-slate-400 uppercase tracking-wider font-bold">Total Quantities</p>
                                <p className="text-sm font-black text-slate-900 mt-1">{wizardTotalQty} units</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Choose Settlement Mode</label>
                                <select
                                  value={newReturnData.compensationType}
                                  onChange={e => setNewReturnData({ ...newReturnData, compensationType: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                                >
                                  <option value="Refund">Cash / Bank Refund</option>
                                  <option value="Replacement">Replacement Products</option>
                                  <option value="Credit Note">Generate Credit Note / Store Credit</option>
                                  <option value="Exchange">Exchange Products</option>
                                  <option value="No Compensation">No Compensation (Write-off)</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Additional Remarks</label>
                                <input 
                                  type="text"
                                  placeholder="Enter payment notes, reason details..."
                                  value={newReturnData.remarks}
                                  onChange={e => setNewReturnData({ ...newReturnData, remarks: e.target.value })}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none font-semibold"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Step 5: Review & Confirm */}
                        {newReturnStep === 5 && (
                          <div className="space-y-6 text-xs font-bold text-slate-655">
                            
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                              <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Return Metadata Overview</h4>
                              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-slate-655 font-bold">
                                <p>Return Type: <span className="text-slate-805">{newReturnData.returnType}</span></p>
                                <p>Source entity: <span className="text-slate-805">{newReturnData.source === 'Supplier' ? newReturnData.supplierId : newReturnData.customerName}</span></p>
                                <p>Compensation Type: <span className="text-slate-805">{newReturnData.compensationType}</span></p>
                                <p>Total Return Value: <span className="text-emerald-600 font-extrabold">₹{wizardTotalMRPVal.toLocaleString()}</span></p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h4 className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Items Review</h4>
                              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-4 bg-white space-y-2">
                                {newReturnData.medicines.map((m, idx) => (
                                  <div key={idx} className="py-2 flex justify-between items-center text-xs">
                                    <div>
                                      <p className="font-extrabold text-slate-905">{m.medicineName}</p>
                                      <span className="text-[9px] text-slate-405 font-bold">Batch: {m.batchNumber} · Reason: {m.reason}</span>
                                    </div>
                                    <span className="font-black text-slate-900">{m.qty} {m.unit}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                          </div>
                        )}

                        {/* Step Buttons */}
                        <div className="flex justify-between items-center border-t border-slate-50 pt-5">
                          <button 
                            onClick={() => {
                              if (newReturnStep > 1) setNewReturnStep(prev => prev - 1);
                              else setShowNewReturnWizard(false);
                            }}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
                          >
                            {newReturnStep > 1 ? '← Back' : 'Cancel'}
                          </button>

                          <div className="flex gap-2">
                            {newReturnStep < 5 ? (
                              <button 
                                onClick={() => {
                                  if (newReturnStep === 3 && newReturnData.medicines.length === 0) {
                                    toast.error('Add at least one medicine.');
                                    return;
                                  }
                                  setNewReturnStep(prev => prev + 1);
                                }}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-blue-100"
                              >
                                Next Step →
                              </button>
                            ) : (
                              <button 
                                onClick={handleSubmitReturn}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-emerald-100"
                              >
                                Submit Return Request
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    ) : (
                      
                      // RETURN HISTORY LIST VIEW
                      <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4 animate-fade-in">
                        
                        {/* Tab filters */}
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-50 pb-4">
                          <div className="flex gap-1.5 p-1 bg-slate-50 border border-slate-200/60 rounded-2xl overflow-x-auto w-full lg:w-auto">
                            {[
                              { id: 'ALL', label: 'All Returns' },
                              { id: 'SUPPLIER', label: 'To Suppliers' },
                              { id: 'CUSTOMER', label: 'Customer Returns' },
                              { id: 'PENDING', label: 'Pending Approval' }
                            ].map(tab => (
                              <button
                                key={tab.id}
                                onClick={() => setSelectedReturnTabFilter(tab.id)}
                                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition shrink-0 whitespace-nowrap ${
                                  selectedReturnTabFilter === tab.id
                                    ? 'bg-blue-600 text-white font-black shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>

                          <div className="flex gap-2 w-full lg:w-auto shrink-0">
                            <div className="relative flex-1 lg:w-64">
                              <input 
                                type="text"
                                placeholder="Search return, supplier, customer..."
                                value={returnSearchQuery}
                                onChange={e => setReturnSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-1.5 text-xs focus:outline-none focus:bg-white font-semibold"
                              />
                              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
                            </div>
                            <button onClick={() => toast.success('Return logs exported.')} className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition">
                              Export
                            </button>
                          </div>
                        </div>

                        {/* History Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                <th className="py-3 px-2">Return No</th>
                                <th className="py-3 px-2">Type</th>
                                <th className="py-3 px-2">To / From</th>
                                <th className="py-3 px-2">Reference</th>
                                <th className="py-3 px-2">Return Date</th>
                                <th className="py-3 px-2">Items Count</th>
                                <th className="py-3 px-2">Amount</th>
                                <th className="py-3 px-2">Status</th>
                                <th className="py-3 px-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {filteredReturns.map(r => {
                                let typeBadge = 'bg-blue-50 text-blue-600 border border-blue-100';
                                if (r.type === 'Customer Return') typeBadge = 'bg-emerald-50 text-emerald-600 border border-emerald-100';

                                let statusBadge = 'bg-slate-50 text-slate-500 border border-slate-200';
                                if (r.status === 'Completed') statusBadge = 'bg-emerald-50 text-emerald-600 border border-emerald-100';
                                else if (r.status === 'Approved') statusBadge = 'bg-blue-50 text-blue-600 border border-blue-100';
                                else if (r.status === 'Pending Approval') statusBadge = 'bg-amber-50 text-amber-600 border border-amber-100';
                                else if (r.status === 'Rejected') statusBadge = 'bg-rose-50 text-rose-600 border border-rose-100';

                                return (
                                  <tr key={r.id} className="hover:bg-slate-50/20 font-semibold text-slate-700">
                                    <td className="py-3.5 px-2 font-extrabold text-blue-650">{r.returnNumber}</td>
                                    <td className="py-3.5 px-2">
                                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${typeBadge}`}>
                                        {r.type}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-2">
                                      <p className="text-slate-805 leading-none">{r.supplierOrCustomer}</p>
                                    </td>
                                    <td className="py-3.5 px-2 text-slate-500 font-bold">{r.reference}</td>
                                    <td className="py-3.5 px-2 text-slate-550">{r.returnDate}</td>
                                    <td className="py-3.5 px-2 text-slate-500">{r.medicineCount} items</td>
                                    <td className="py-3.5 px-2 font-extrabold text-slate-855">₹{r.amount.toLocaleString()}</td>
                                    <td className="py-3.5 px-2">
                                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${statusBadge}`}>
                                        {r.status}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-2 text-right">
                                      <button 
                                        onClick={() => setSelectedReturnDetail(r)}
                                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[9px] font-black transition"
                                      >
                                        View Details
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                      </div>
                    )}

                  </div>

                  {/* Right Sidebar Column (4 cols) */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* Return reasons summary */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4 text-xs font-bold text-slate-655">
                      <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                        <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider">Return Reasons</h3>
                        <span className="text-[10px] text-slate-400 font-bold">This Month</span>
                      </div>

                      <div className="space-y-2.5 font-bold">
                        {[
                          { label: 'Expired / Near Expiry', count: 34, pct: '60.5%', color: 'bg-rose-500' },
                          { label: 'Damaged in Transit', count: 12, pct: '21.4%', color: 'bg-amber-500' },
                          { label: 'Quality / Recall Issue', count: 5, pct: '8.9%', color: 'bg-blue-600' },
                          { label: 'Unused / Wrong Dispensing', count: 5, pct: '8.9%', color: 'bg-emerald-500' }
                        ].map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between text-[10px] text-slate-655">
                              <span>{item.label}</span>
                              <span className="font-black text-slate-805">{item.count} ({item.pct})</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${item.color}`} style={{ width: item.pct }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recent activity timeline */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                      <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider border-b border-slate-50 pb-3">Recent Activity</h3>
                      <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4 text-xs">
                        <div className="relative">
                          <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white" />
                          <p className="text-slate-800 font-extrabold leading-none">Return RET-00056 completed</p>
                          <span className="text-[9px] text-slate-400 mt-1 block">19 July 2026 · Credit Note Issued</span>
                        </div>
                        <div className="relative">
                          <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white" />
                          <p className="text-slate-800 font-extrabold leading-none">Return RET-00054 submitted</p>
                          <span className="text-[9px] text-slate-400 mt-1 block">16 July 2026 · Pending Manager Review</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* ── RETURN DETAILS RIGHT PANEL SLIDE-OVER ── */}
                {selectedReturnDetail && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex justify-end z-50 animate-fade-in">
                    <div className="w-full max-w-lg bg-white h-screen shadow-2xl flex flex-col justify-between animate-slide-in">
                      
                      {/* Header */}
                      <div className="p-6 bg-slate-900 text-white flex justify-between items-start shrink-0">
                        <div>
                          <span className="text-[8px] uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded font-black">Return details</span>
                          <h3 className="font-extrabold text-sm mt-1">{selectedReturnDetail.returnNumber}</h3>
                          <p className="text-[10px] text-slate-400 font-bold">{selectedReturnDetail.type} · Ref: {selectedReturnDetail.reference}</p>
                        </div>
                        <button 
                          onClick={() => setSelectedReturnDetail(null)}
                          className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-bold text-slate-655">
                        
                        {/* Info details */}
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-2">
                          <p>Source / Destination: <span className="text-slate-855 font-black">{selectedReturnDetail.supplierOrCustomer}</span></p>
                          <p>Created By: <span className="text-slate-805">{selectedReturnDetail.createdBy}</span></p>
                          <p>Return Date: <span className="text-slate-805">{selectedReturnDetail.returnDate}</span></p>
                          <p>Refund / Return Value: <span className="text-emerald-600 font-black">₹{selectedReturnDetail.amount.toLocaleString()}</span></p>
                        </div>

                        {/* Status history timeline */}
                        <div className="space-y-3.5">
                          <h4 className="text-[9px] text-slate-405 uppercase tracking-wider font-bold">Fulfillment Steps</h4>
                          <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-4">
                            <div className="relative">
                              <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                              <p className="text-slate-800 font-bold leading-none">Return Created</p>
                              <span className="text-[9px] text-slate-400 mt-1 block">Created on {selectedReturnDetail.returnDate} by {selectedReturnDetail.createdBy}</span>
                            </div>
                            <div className="relative">
                              <span className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                selectedReturnDetail.status === 'Pending Approval' ? 'bg-amber-500' : 'bg-emerald-500'
                              }`} />
                              <p className="text-slate-800 font-bold leading-none">Approval Status</p>
                              <span className="text-[9px] text-slate-400 mt-1 block">
                                {selectedReturnDetail.status === 'Pending Approval' ? 'Awaiting review' : 'Approved by Store Manager'}
                              </span>
                            </div>
                            <div className="relative">
                              <span className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                                selectedReturnDetail.status === 'Completed' ? 'bg-emerald-500' : 'bg-slate-350'
                              }`} />
                              <p className="text-slate-800 font-bold leading-none">Goods Reconciled</p>
                              <span className="text-[9px] text-slate-400 mt-1 block">
                                {selectedReturnDetail.status === 'Completed' ? 'Compensation completed & inventory written off' : 'Awaiting final verification'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Item list */}
                        <div className="space-y-3">
                          <h4 className="text-[9px] text-slate-405 uppercase tracking-wider font-bold">Items Returned</h4>
                          {(!selectedReturnDetail.medicines || selectedReturnDetail.medicines.length === 0) ? (
                            <div className="text-center text-slate-400 font-bold py-6 bg-slate-50 border border-slate-100 rounded-2xl">
                              No item details mapped to this historical record.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl p-4 bg-white space-y-2">
                              {selectedReturnDetail.medicines.map((m, idx) => (
                                <div key={idx} className="py-2 flex justify-between items-center text-xs">
                                  <div>
                                    <p className="font-extrabold text-slate-905">{m.medicineName}</p>
                                    <span className="text-[9px] text-slate-405 font-bold">Batch: {m.batchNumber} · Reason: {m.reason}</span>
                                  </div>
                                  <span className="font-black text-slate-900">{m.qty} {m.unit}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Footer Actions */}
                      <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-2 shrink-0">
                        {selectedReturnDetail.status === 'Pending Approval' && (
                          <>
                            <button 
                              onClick={() => {
                                setReturnsList(prev => prev.map(r => r.id === selectedReturnDetail.id ? { ...r, status: 'Completed' } : r));
                                toast.success(`Approved Return ${selectedReturnDetail.returnNumber}. Inventory impact updated!`);
                                setSelectedReturnDetail(null);
                              }}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition text-center"
                            >
                              Approve &amp; Reconcile
                            </button>
                            <button 
                              onClick={() => {
                                setReturnsList(prev => prev.map(r => r.id === selectedReturnDetail.id ? { ...r, status: 'Rejected' } : r));
                                toast.error(`Rejected Return Request ${selectedReturnDetail.returnNumber}.`);
                                setSelectedReturnDetail(null);
                              }}
                              className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition text-center"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {selectedReturnDetail.status === 'Completed' && (
                          <button 
                            onClick={() => {
                              toast.success('Credit Note printed.');
                            }}
                            className="w-full py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition text-center"
                          >
                            Print Credit Note Note
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* ── ADD MEDICINE TO RETURN MODAL ── */}
                {showAddMedicineToReturnModal && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-zoom-in text-xs font-bold text-slate-655 font-semibold">
                      <div className="flex justify-between items-center">
                        <h3 className="font-extrabold text-sm text-slate-900">Add Medicine to Return</h3>
                        <button onClick={() => setShowAddMedicineToReturnModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">×</button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Select Medicine</label>
                          <select
                            onChange={e => {
                              const med = inventory.find(item => item._id === e.target.value || item.id === e.target.value);
                              setSelectedMedForReturn(med);
                              setSelectedBatchForReturn(med?.batches?.[0] || null);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                          >
                            <option value="">-- Choose Medicine --</option>
                            {inventory.map(med => (
                              <option key={med._id || med.id} value={med._id || med.id}>{med.brandName || med.brand || med.name} ({med.genericName || med.name})</option>
                            ))}
                          </select>
                        </div>

                        {selectedMedForReturn && (
                          <>
                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Select Batch</label>
                              <select
                                onChange={e => {
                                  const batch = selectedMedForReturn.batches.find(b => b._id === e.target.value || b.id === e.target.value);
                                  setSelectedBatchForReturn(batch);
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                              >
                                {selectedMedForReturn.batches.map(b => (
                                  <option key={b._id || b.id} value={b._id || b.id}>Batch: {b.batchNumber || b.batchNo || 'N/A'} (Available: {b.availableStock ?? b.quantity} tabs)</option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Return Qty (in tabs)</label>
                                <input 
                                  type="number"
                                  value={returnQty}
                                  onChange={e => {
                                    const max = selectedBatchForReturn ? (selectedBatchForReturn.availableStock ?? selectedBatchForReturn.quantity) : 10;
                                    setReturnQty(Math.min(max, Math.max(1, parseInt(e.target.value) || 1)));
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none text-center"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1">Unit</label>
                                <select
                                  value={returnUnit}
                                  onChange={e => setReturnUnit(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                                >
                                  <option value="Strips">Strips</option>
                                  <option value="Tablets">Tablets</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 block mb-1">Reason for Return</label>
                              <select
                                value={returnMedReason}
                                onChange={e => setReturnMedReason(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                              >
                                <option value="Wrong Supply">Wrong Supply</option>
                                <option value="Damaged Delivery">Damaged During Delivery</option>
                                <option value="Near Expiry">Near Expiry</option>
                                <option value="Expired">Expired medicine</option>
                                <option value="Wrong Medicine">Wrong Medicine Dispensed</option>
                                <option value="Broken Bottle">Broken bottle / damage</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button 
                          onClick={() => setShowAddMedicineToReturnModal(false)}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            if (!selectedMedForReturn || !selectedBatchForReturn) {
                              toast.error('Select both medicine and batch.');
                              return;
                            }
                            
                            const itemToAdd = {
                              medicineName: selectedMedForReturn.brandName || selectedMedForReturn.brand || selectedMedForReturn.name,
                              brand: selectedMedForReturn.brandName || selectedMedForReturn.brand || selectedMedForReturn.name,
                              batchNumber: selectedBatchForReturn.batchNumber || selectedBatchForReturn.batchNo || 'N/A',
                              expiry: selectedBatchForReturn.expiryDate || 'N/A',
                              qty: returnQty,
                              unit: returnUnit,
                              maxStock: selectedBatchForReturn.availableStock ?? selectedBatchForReturn.quantity,
                              sellingPrice: selectedMedForReturn.sellingPrice || 50,
                              purchasePrice: selectedMedForReturn.purchasePrice || 35,
                              reason: returnMedReason
                            };

                            setNewReturnData(prev => ({
                              ...prev,
                              medicines: [...prev.medicines, itemToAdd]
                            }));

                            toast.success(`Added ${itemToAdd.medicineName} to return list.`);
                            setShowAddMedicineToReturnModal(false);
                          }}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-blue-100"
                        >
                          Add to Return
                        </button>
                      </div>

                    </div>
                  </div>
                )}

              </div>
            );
          })()}

          {/* ================= TAB 4.9: SETTINGS MODULE ================= */}
          {tab === 'settings' && (() => {
            // Helper function for N/A fallback
            const fallback = (val) => {
              if (val === undefined || val === null || String(val).trim() === '' || val === 0) {
                return 'N/A';
              }
              return val;
            };

            // Handlers
            const handleSave = () => {
              toast.success('Configuration saved successfully.');
              setIsDirty(false);
              setActiveSubPage(null);
            };

            const handleCancel = () => {
              if (isDirty) {
                setShowConfirmModal(true);
              } else {
                setActiveSubPage(null);
              }
            };

            const handleReset = (type) => {
              if (type === 'medicine') {
                setMedSettings({
                  allowSubstitution: true,
                  dispensingUnit: 'Strips',
                  barcodeRequired: false,
                  autoInternalCode: true,
                  brandMapping: true,
                  imageRequired: false,
                  defaultTax: 12,
                  storageCondition: 'Cool & Dry',
                  searchPriority: 'Brand First'
                });
              } else if (type === 'batch') {
                setBatchSettings({
                  rule: 'FIFO',
                  warningDays: 90,
                  nearExpiryThreshold: 180,
                  autoBatchNo: true,
                  batchPrefix: 'BAT-',
                  allowExpiredSale: false,
                  quarantineExpired: true,
                  autoLockExpired: true,
                  disposeApproval: true
                });
              }
              toast.success('Settings reset to defaults.');
              setIsDirty(true);
            };

            // Settings cards data structure
            const categories = [
              {
                title: 'General Settings',
                items: [
                  { id: 'profile', name: 'Clinic Profile', desc: 'Manage clinic details, contact information and logo', icon: '🏢', keywords: 'clinic profile logo address phone' },
                  { id: 'business', name: 'Business Information', desc: 'Business details, GST, PAN, FSSAI and other documents', icon: '📝', keywords: 'gst pan business license fssai' },
                  { id: 'pharmacy', name: 'Pharmacy Settings', desc: 'Pharmacy details, license, regulatory and preferences', icon: '💊', keywords: 'pharmacy license timings storage' },
                  { id: 'features', name: 'Features & Modules', desc: 'Manage modules, feature access and plan details', icon: '⚙️', keywords: 'modules plan features activation' },
                  { id: 'users', name: 'User Management', desc: 'Add, manage and control access for staff and roles', icon: '👥', keywords: 'staff users permission employees' },
                  { id: 'roles', name: 'Roles & Permissions', desc: 'Configure roles and set permission for modules', icon: '🛡️', keywords: 'roles security rules rights matrix' },
                  { id: 'doctors', name: 'Doctor & Staff Management', desc: 'Manage doctors, staff and their working preferences', icon: '👨‍⚕️', keywords: 'doctors timings commissions working days' },
                  { id: 'branches', name: 'Branches & Locations', desc: 'Manage branches, stores and operational locations', icon: '📍', keywords: 'branches warehouses bin location stores' }
                ]
              },
              {
                title: 'Inventory Settings',
                items: [
                  { id: 'medicine', name: 'Medicine Settings', desc: 'Units, categories, dosage forms, brands and medicine rules', icon: '🧴', keywords: 'generic substitution tax default unit brand mapping' },
                  { id: 'general-inv', name: 'General Settings', desc: 'Inventory preferences, barcode, HSN, tax and other options', icon: '🎛️', keywords: 'barcode hsn options valuation stock' },
                  { id: 'batch', name: 'Batch & Expiry Settings', desc: 'Batch numbering, expiry alerts, FIFO and FEFO rules', icon: '📅', keywords: 'expiry warning batch prefix fifo fefo lock disposal' },
                  { id: 'rack', name: 'Rack & Shelf Settings', desc: 'Manage racks, shelves, bins and storage locations', icon: '🗄️', keywords: 'rack shelf bin barcode labels storage' }
                ]
              },
              {
                title: 'Billing & Finance Settings',
                items: [
                  { id: 'billing', name: 'Billing Settings', desc: 'Invoice settings, formats, numbering and templates', icon: '🧾', keywords: 'invoice print format billing prefix' },
                  { id: 'payment', name: 'Payment Settings', desc: 'Payment modes, gateways, UPI, cards and wallets', icon: '💳', keywords: 'upi payments modes gate card' },
                  { id: 'tax', name: 'Tax Settings', desc: 'GST, tax slabs, HSN/SAC and tax preferences', icon: '％', keywords: 'gst tax slabs sac hsn percentages' },
                  { id: 'discount', name: 'Discount & Pricing', desc: 'Discount rules, pricing levels, rounding and margins', icon: '🏷️', keywords: 'discount pricing levels round margins markup' }
                ]
              },
              {
                title: 'System & Preferences',
                items: [
                  { id: 'notifications', name: 'Notifications', desc: 'Email, SMS, WhatsApp and in-app notification settings', icon: '🔔', keywords: 'email sms whatsapp notification alerts' },
                  { id: 'reminders', name: 'Reminders', desc: 'Appointment, refill, expiry and follow-up reminders', icon: '⏰', keywords: 'appointment refill follow-up reminders alerts' },
                  { id: 'backup', name: 'Backup & Data', desc: 'Automated backup, restore and data management', icon: '☁️', keywords: 'backup restore export db storage data' },
                  { id: 'system-pref', name: 'System Preferences', desc: 'Date & time, language, format and other preferences', icon: '⚙️', keywords: 'date time zone currency language theme' }
                ]
              },
              {
                title: 'Integrations & Communication',
                items: [
                  { id: 'integrations', name: 'Integrations', desc: 'Third-party integrations, APIs and connected services', icon: '🔗', keywords: 'api integration hook third party' },
                  { id: 'email-config', name: 'Email Settings', desc: 'Email configuration, sender identity and templates', icon: '📧', keywords: 'email smtp host templates sender' },
                  { id: 'sms-config', name: 'SMS & WhatsApp', desc: 'SMS gateway, WhatsApp API and templates', icon: '💬', keywords: 'sms gateway whatsapp api template' },
                  { id: 'print-config', name: 'Print Settings', desc: 'Printer configuration, invoice and label printing', icon: '🖨️', keywords: 'printer thermal label barcode print format' }
                ]
              }
            ];

            return (
              <div className="space-y-6">
                
                {/* ── PAGE HEADER ── */}
                <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <span className="text-blue-600">⚙️</span> Settings
                    </h2>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Manage your pharmacy, users, preferences and system configurations.
                    </p>
                  </div>
                  <div className="relative w-full md:w-84 shrink-0">
                    <input 
                      type="text" 
                      placeholder="Search settings..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs focus:outline-none focus:bg-white focus:border-blue-300 font-semibold"
                    />
                    <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
                  </div>
                </div>

                {/* ── SETTINGS CORE WORKSPACE ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column Settings Categories (8 cols) */}
                  <div className="lg:col-span-8 space-y-6">
                    {categories.map((cat, catIdx) => {
                      // Filter items based on search query
                      const filteredItems = cat.items.filter(item => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          item.name.toLowerCase().includes(q) ||
                          item.desc.toLowerCase().includes(q) ||
                          item.keywords.toLowerCase().includes(q)
                        );
                      });

                      if (filteredItems.length === 0) return null;

                      return (
                        <div key={catIdx} className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                          <h3 className="text-xs font-black text-slate-805 uppercase tracking-wider">{cat.title}</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredItems.map(item => (
                              <button
                                key={item.id}
                                onClick={() => setActiveSubPage(item.id)}
                                className="flex items-start gap-4 p-4 border border-slate-100 rounded-2xl text-left hover:bg-slate-50/50 hover:shadow-xs transition-all duration-200 w-full"
                              >
                                <span className="text-2xl w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                                  {item.icon}
                                </span>
                                <div className="space-y-1">
                                  <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                                    {item.name}
                                    <ChevronRight size={12} className="text-slate-400" />
                                  </h4>
                                  <p className="text-[10px] text-slate-400 font-semibold leading-normal">{item.desc}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Right Column Database Information Sidebar (4 cols) */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* Database-driven profile sidebar */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4 text-xs font-bold text-slate-655">
                      <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                        <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider">Clinic Information</h3>
                        <button onClick={() => toast.success('Profile edit mode launched.')} className="text-[10px] text-blue-600 hover:underline">Edit</button>
                      </div>

                      {/* Clinic Card Profile info */}
                      <div className="flex items-center gap-4 border border-slate-100 rounded-2xl p-4 bg-slate-50/30">
                        <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-base font-black shrink-0">
                          {fallback(profileData?.clinic?.name?.[0])}
                        </div>
                        <div>
                          <h4 className="font-black text-slate-905">{fallback(profileData?.clinic?.name)}</h4>
                          <p className="text-[9px] text-slate-405 font-bold mt-0.5">Clinic Code: {fallback(profileData?.clinic?.code)}</p>
                          <span className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-black mt-1 inline-block">
                            {fallback(profileData?.clinic?.approvalStatus === 'approved' ? 'Active' : profileData?.clinic?.approvalStatus)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center text-slate-655 font-bold">
                          <span>GSTIN Registration:</span>
                          <span className="text-slate-805">{fallback(profileData?.clinic?.clinicDetails?.registrationNumber)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-655 font-bold">
                          <span>Phone Number:</span>
                          <span className="text-slate-805">{fallback(profileData?.clinic?.phone)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-655 font-bold">
                          <span>Email Address:</span>
                          <span className="text-slate-805">{fallback(profileData?.email)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-655 font-bold">
                          <span>Subscription Plan:</span>
                          <span className="text-slate-805">{fallback(profileData?.clinic?.subscription?.status)}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-655 font-bold">
                          <span>Renewal Date:</span>
                          <span className="text-slate-805">
                            {profileData?.clinic?.subscription?.expiryDate 
                              ? new Date(profileData?.clinic?.subscription?.expiryDate).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) 
                              : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                      <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider border-b border-slate-50 pb-3">Quick Actions</h3>
                      <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold text-slate-700">
                        <button onClick={() => toast.success('Database backup completed successfully!')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-150 transition">
                          Backup Now
                        </button>
                        <button onClick={() => toast.success('Import wizard ready.')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-150 transition">
                          Import Data
                        </button>
                        <button onClick={() => toast.success('Export completed.')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-150 transition">
                          Export Data
                        </button>
                        <button onClick={() => toast.success('Cache cleared.')} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-150 transition">
                          Clear Cache
                        </button>
                      </div>
                    </div>

                    {/* System Status Preferences */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4 text-xs font-bold text-slate-655">
                      <h3 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider border-b border-slate-50 pb-3">System Status</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span>Database Server:</span>
                          <span className="text-emerald-600 font-extrabold">Online</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Storage Utilized:</span>
                          <span className="text-slate-805">68% (Available: 3.2 GB)</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>SMTP Email Gateway:</span>
                          <span className="text-emerald-600 font-extrabold">Connected</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>SMS Gateway:</span>
                          <span className="text-emerald-600 font-extrabold">Active</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* ── SUB PAGE CONFIG DRAWERS / MODALS ── */}
                
                {/* 1. Medicine Settings Page */}
                {activeSubPage === 'medicine' && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-zoom-in text-xs font-bold text-slate-655">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[8px] uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded font-black">Config Page</span>
                          <h3 className="font-extrabold text-sm mt-1 text-slate-900">Medicine Dispensing Settings</h3>
                        </div>
                        <button onClick={handleCancel} className="text-slate-400 hover:text-slate-700 font-bold text-base">×</button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span>Allow Generic Substitution</span>
                          <input 
                            type="checkbox"
                            checked={medSettings.allowSubstitution}
                            onChange={e => { setMedSettings({ ...medSettings, allowSubstitution: e.target.checked }); setIsDirty(true); }}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Dispensing Barcode Required</span>
                          <input 
                            type="checkbox"
                            checked={medSettings.barcodeRequired}
                            onChange={e => { setMedSettings({ ...medSettings, barcodeRequired: e.target.checked }); setIsDirty(true); }}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Auto Generate Internal Code</span>
                          <input 
                            type="checkbox"
                            checked={medSettings.autoInternalCode}
                            onChange={e => { setMedSettings({ ...medSettings, autoInternalCode: e.target.checked }); setIsDirty(true); }}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Dispensing Search Priority</label>
                          <select 
                            value={medSettings.searchPriority}
                            onChange={e => { setMedSettings({ ...medSettings, searchPriority: e.target.value }); setIsDirty(true); }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                          >
                            <option value="Brand First">Brand Name First</option>
                            <option value="Generic First">Generic Chemical Name First</option>
                            <option value="Combination First">Combination Search</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <button 
                          onClick={() => handleReset('medicine')}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
                        >
                          Reset Defaults
                        </button>
                        <div className="flex gap-2">
                          <button 
                            onClick={handleCancel}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleSave}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-blue-100"
                          >
                            Save Configuration
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* 2. Batch & Expiry Settings Page */}
                {activeSubPage === 'batch' && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-zoom-in text-xs font-bold text-slate-655">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[8px] uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded font-black">Config Page</span>
                          <h3 className="font-extrabold text-sm mt-1 text-slate-900">Batch &amp; Expiry Rule Settings</h3>
                        </div>
                        <button onClick={handleCancel} className="text-slate-400 hover:text-slate-700 font-bold text-base">×</button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Dispensing Inventory Rules</label>
                          <select 
                            value={batchSettings.rule}
                            onChange={e => { setBatchSettings({ ...batchSettings, rule: e.target.value }); setIsDirty(true); }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none"
                          >
                            <option value="FIFO">FIFO (First In First Out)</option>
                            <option value="FEFO">FEFO (First Expired First Out)</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Near Expiry Threshold (days)</label>
                            <input 
                              type="number"
                              value={batchSettings.nearExpiryThreshold}
                              onChange={e => { setBatchSettings({ ...batchSettings, nearExpiryThreshold: parseInt(e.target.value) || 180 }); setIsDirty(true); }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-center focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Warning Alert Days</label>
                            <input 
                              type="number"
                              value={batchSettings.warningDays}
                              onChange={e => { setBatchSettings({ ...batchSettings, warningDays: parseInt(e.target.value) || 90 }); setIsDirty(true); }}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-center focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Quarantine Expired Medicines</span>
                          <input 
                            type="checkbox"
                            checked={batchSettings.quarantineExpired}
                            onChange={e => { setBatchSettings({ ...batchSettings, quarantineExpired: e.target.checked }); setIsDirty(true); }}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Auto Lock Expired Stock</span>
                          <input 
                            type="checkbox"
                            checked={batchSettings.autoLockExpired}
                            onChange={e => { setBatchSettings({ ...batchSettings, autoLockExpired: e.target.checked }); setIsDirty(true); }}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                        <button 
                          onClick={() => handleReset('batch')}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
                        >
                          Reset Defaults
                        </button>
                        <div className="flex gap-2">
                          <button 
                            onClick={handleCancel}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleSave}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-blue-100"
                          >
                            Save Configuration
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* 3. Notifications Settings Page */}
                {activeSubPage === 'notifications' && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-zoom-in text-xs font-bold text-slate-655">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[8px] uppercase tracking-wider bg-blue-600 text-white px-2 py-0.5 rounded font-black">Config Page</span>
                          <h3 className="font-extrabold text-sm mt-1 text-slate-900">Notification Preferences</h3>
                        </div>
                        <button onClick={() => setActiveSubPage(null)} className="text-slate-400 hover:text-slate-700 font-bold text-base">×</button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="text-[10px] text-slate-450 uppercase tracking-wider font-black">Enable Channels</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <label className="flex items-center gap-2">
                              <input type="checkbox" checked={notificationPreferences.desktop} onChange={e => setNotificationPreferences({...notificationPreferences, desktop: e.target.checked})} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                              <span>Desktop App</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input type="checkbox" checked={notificationPreferences.email} onChange={e => setNotificationPreferences({...notificationPreferences, email: e.target.checked})} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                              <span>Email Alerts</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input type="checkbox" checked={notificationPreferences.sms} onChange={e => setNotificationPreferences({...notificationPreferences, sms: e.target.checked})} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                              <span>SMS Alerts</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input type="checkbox" checked={notificationPreferences.whatsapp} onChange={e => setNotificationPreferences({...notificationPreferences, whatsapp: e.target.checked})} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300" />
                              <span>WhatsApp</span>
                            </label>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-[10px] text-slate-450 uppercase tracking-wider font-black">Retention Policy</h4>
                          <div>
                            <label className="text-[9px] text-slate-400 block mb-1">Keep notifications for</label>
                            <select
                              value={notificationPreferences.retention}
                              onChange={e => setNotificationPreferences({...notificationPreferences, retention: parseInt(e.target.value)})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 text-xs focus:outline-none font-bold text-slate-805"
                            >
                              <option value={7}>7 Days</option>
                              <option value={15}>15 Days</option>
                              <option value={30}>30 Days (Default)</option>
                              <option value={60}>60 Days</option>
                              <option value={90}>90 Days</option>
                              <option value={180}>180 Days</option>
                              <option value={365}>365 Days</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                        <button onClick={() => setActiveSubPage(null)} className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition">Cancel</button>
                        <button onClick={() => { setActiveSubPage(null); toast.success('Notification preferences updated successfully.'); }} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-blue-100">Save preferences</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* General Mock Config Page Modal for other setting links */}
                {activeSubPage && activeSubPage !== 'medicine' && activeSubPage !== 'batch' && activeSubPage !== 'notifications' && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 space-y-4 animate-zoom-in text-xs font-bold text-slate-655 text-center">
                      <div className="text-2xl">⚙️</div>
                      <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">Sub-Settings Config Page</h3>
                      <p className="text-slate-400 font-semibold leading-relaxed">
                        The configuration layout for <span className="text-slate-805">"{activeSubPage}"</span> has been initialized. Real settings will be connected to the database later.
                      </p>
                      <div className="flex justify-center gap-2 pt-2">
                        <button 
                          onClick={() => setActiveSubPage(null)}
                          className="px-6 py-2 bg-blue-605 hover:bg-blue-700 text-white font-black rounded-xl transition"
                        >
                          Okay
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── UNSAVED CHANGES CONFIRMATION MODAL ── */}
                {showConfirmModal && (
                  <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-3xl w-full max-w-xs shadow-2xl p-6 space-y-4 animate-zoom-in text-xs font-bold text-slate-655 text-center">
                      <div className="text-xl text-rose-500">⚠️</div>
                      <h3 className="font-extrabold text-slate-900">Unsaved Changes Detected</h3>
                      <p className="text-slate-400 font-semibold">You have unsaved changes in your settings. If you close now, your edits will be discarded.</p>
                      <div className="flex justify-center gap-2 pt-2">
                        <button 
                          onClick={() => setShowConfirmModal(false)}
                          className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-bold transition"
                        >
                          Keep Editing
                        </button>
                        <button 
                          onClick={() => {
                            setShowConfirmModal(false);
                            setIsDirty(false);
                            setActiveSubPage(null);
                          }}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl transition"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })()}

          {/* ================= TAB 5: INVENTORY MODULE ================= */}
          {tab === 'inventory' && (() => {
            // ── Computed helpers for inventory ──────────────────────────────
            const today = new Date();
            const thirtyDays = new Date(); thirtyDays.setDate(thirtyDays.getDate() + 30);

            const getActiveBatches = (med) =>
              (med.batches || []).filter(b => {
                if (!b.expiryDate) return true;
                return new Date(b.expiryDate) >= today;
              });

            const getNearestExpiry = (med) => {
              const active = (med.batches || []).filter(b => b.expiryDate);
              if (!active.length) return null;
              return active.reduce((min, b) =>
                !min || new Date(b.expiryDate) < new Date(min.expiryDate) ? b : min, null
              )?.expiryDate;
            };

            const getAvailableStock = (med) =>
              getActiveBatches(med).reduce((s, b) => s + (b.availableStock ?? b.quantity ?? 0), 0);

            const getStockStatus = (med) => {
              const avail = getAvailableStock(med);
              const nearExp = getNearestExpiry(med);
              if (avail === 0) return 'out-of-stock';
              if (nearExp && new Date(nearExp) < today) return 'expired';
              if (nearExp && new Date(nearExp) <= thirtyDays) return 'near-expiry';
              if (avail <= (med.reorderLevel || med.minimumStock || 10)) return 'low-stock';
              return 'in-stock';
            };

            const statusConfig = {
              'in-stock':    { label: 'In Stock',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
              'low-stock':   { label: 'Low Stock',   cls: 'bg-amber-50 text-amber-700 border-amber-100' },
              'out-of-stock':{ label: 'Out of Stock',cls: 'bg-red-50 text-red-700 border-red-100' },
              'near-expiry': { label: 'Near Expiry', cls: 'bg-orange-50 text-orange-700 border-orange-100' },
              'expired':     { label: 'Expired',     cls: 'bg-slate-100 text-slate-500 border-slate-200' },
            };

            // KPI counts
            const kpiInStock    = inventory.filter(m => getStockStatus(m) === 'in-stock').length;
            const kpiLow        = inventory.filter(m => getStockStatus(m) === 'low-stock').length;
            const kpiOut        = inventory.filter(m => getStockStatus(m) === 'out-of-stock').length;
            const kpiNearExp    = inventory.filter(m => getStockStatus(m) === 'near-expiry').length;
            const kpiExpired    = inventory.filter(m => getStockStatus(m) === 'expired').length;

            // Filtered inward medicine search results
            const inwardFiltered = inventory.filter(m => {
              if (!stockInwardSearch.trim()) return true;
              const q = stockInwardSearch.toLowerCase();
              return (m.name||'').toLowerCase().includes(q)
                || (m.brandName||m.brand||'').toLowerCase().includes(q)
                || (m.genericName||'').toLowerCase().includes(q)
                || (m.code||'').toLowerCase().includes(q)
                || (m.rackNumber||m.rack||'').toLowerCase().includes(q);
            });

            // Flatten all batches for Stock Inward register
            const allBatchRows = inventory.flatMap(med =>
              (med.batches || []).map(b => ({ ...b, medicine: med }))
            ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

            const filteredBatchRows = stockInwardSearch.trim()
              ? allBatchRows.filter(row => {
                  const q = stockInwardSearch.toLowerCase();
                  const med = row.medicine;
                  return (med.name||'').toLowerCase().includes(q)
                    || (med.brandName||med.brand||'').toLowerCase().includes(q)
                    || (med.genericName||'').toLowerCase().includes(q)
                    || (row.batchNumber||row.batchNo||'').toLowerCase().includes(q)
                    || (row.supplier||'').toLowerCase().includes(q)
                    || (row.invoiceNumber||'').toLowerCase().includes(q);
                })
              : allBatchRows;

            const getBatchStatus = (b) => {
              if (!b.expiryDate) return 'active';
              const exp = new Date(b.expiryDate);
              if (exp < today) return 'expired';
              if (exp <= thirtyDays) return 'near-expiry';
              if ((b.availableStock ?? b.quantity ?? 0) === 0) return 'exhausted';
              return 'active';
            };
            const batchStatusConfig = {
              'active':     { label: 'Active',      cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
              'near-expiry':{ label: 'Near Expiry', cls: 'bg-orange-50 text-orange-700 border-orange-100' },
              'expired':    { label: 'Expired',     cls: 'bg-red-50 text-red-500 border-red-100' },
              'exhausted':  { label: 'Exhausted',   cls: 'bg-slate-100 text-slate-400 border-slate-200' },
            };

            // ── Save Add More Stock / Add Stock Inward ───────────────────────
            const handleSaveNewStockBatch = async () => {
              if (!selectedInventoryMedicine) return;
              if (!newStockBatch.batchNumber.trim()) { toast.error('Batch Number is required.'); return; }
              if (!newStockBatch.expiryDate.trim()) { toast.error('Expiry Date is required.'); return; }
              const qty = parseInt(newStockBatch.quantityStrips) || 0;
              const strips = parseInt(newStockBatch.stripSize) || 10;
              if (qty <= 0) { toast.error('Quantity must be greater than 0.'); return; }
              const mrp = parseFloat(newStockBatch.sellingPrice) || 0;
              const ptr = parseFloat(newStockBatch.purchasePrice) || 0;
              if (mrp > 0 && ptr > mrp) { toast.error('MRP cannot be less than Purchase Price.'); return; }

              // Normalize expiry date
              let normalizedExpiry = newStockBatch.expiryDate.trim();
              const mmYY = normalizedExpiry.match(/^(\d{2})[-\/](\d{4})$/);
              if (mmYY) normalizedExpiry = `${mmYY[2]}-${mmYY[1]}-01`;

              setAddMoreStockSaving(true);
              try {
                const payload = {
                  batchNumber: newStockBatch.batchNumber.trim(),
                  quantity: qty * strips,
                  expiryDate: normalizedExpiry,
                  purchasePrice: ptr,
                  sellingPrice: mrp,
                  supplier: newStockBatch.supplier,
                  invoiceNumber: newStockBatch.invoiceNumber,
                };
                const medId = selectedInventoryMedicine._id || selectedInventoryMedicine.id;
                await pharmacyApi.addBatch(medId, payload);
                toast.success(`Batch "${payload.batchNumber}" added successfully.`);
                // Reload inventory
                const fresh = await pharmacyApi.listMedicines();
                const items = fresh?.medicines || fresh?.data?.medicines || (Array.isArray(fresh) ? fresh : []);
                setInventory(items);
                setShowAddMoreStockModal(false);
                setShowInwardBatchModal(false);
                setNewStockBatch({ batchNumber:'',mfgDate:'',expiryDate:'',invoiceNumber:'',supplier:'',purchasePrice:'',sellingPrice:'',gst:'12',discount:'0',quantityStrips:'',stripSize:'10',rack:'',shelf:'' });
                setSelectedInventoryMedicine(null);
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to save batch.');
              } finally {
                setAddMoreStockSaving(false);
              }
            };

            return (
              <div className="space-y-4">

                {/* ── Sub-tab switcher ───────────────────────────────────── */}
                <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-2 flex gap-1">
                  {[
                    { id: 'stock-list',   icon: <Package size={13} />,  label: 'Stock List',   desc: 'Live inventory overview' },
                    { id: 'stock-inward', icon: <Truck size={13} />,    label: 'Stock Inward', desc: 'Purchase & batch register' }
                  ].map(st => (
                    <button
                      key={st.id}
                      onClick={() => setInventorySubTab(st.id)}
                      className={`flex-1 flex items-center gap-3 px-5 py-3 rounded-2xl text-left transition-all ${
                        inventorySubTab === st.id
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <span className={`p-1.5 rounded-lg ${inventorySubTab === st.id ? 'bg-white/15' : 'bg-slate-100'}`}>
                        {st.icon}
                      </span>
                      <span>
                        <p className={`text-xs font-black leading-none ${inventorySubTab === st.id ? 'text-white' : 'text-slate-800'}`}>{st.label}</p>
                        <p className={`text-[10px] mt-0.5 font-medium ${inventorySubTab === st.id ? 'text-white/60' : 'text-slate-400'}`}>{st.desc}</p>
                      </span>
                    </button>
                  ))}
                </div>

                {/* ══════════════════════════════════════════════════════════
                    SUB-PAGE 1: STOCK LIST
                ══════════════════════════════════════════════════════════ */}
                {inventorySubTab === 'stock-list' && (
                  <div className="space-y-4">

                    {/* KPI mini-cards */}
                    <div className="grid grid-cols-5 gap-3">
                      {[
                        { label: 'Total SKUs', value: inventory.length, cls: 'text-slate-900', bg: 'bg-white' },
                        { label: 'In Stock',   value: kpiInStock,       cls: 'text-emerald-700', bg: 'bg-emerald-50' },
                        { label: 'Low Stock',  value: kpiLow,           cls: 'text-amber-700',   bg: 'bg-amber-50' },
                        { label: 'Out of Stock',value: kpiOut,          cls: 'text-red-600',     bg: 'bg-red-50' },
                        { label: 'Near Expiry',value: kpiNearExp,       cls: 'text-orange-700',  bg: 'bg-orange-50' },
                      ].map(k => (
                        <div key={k.label} className={`${k.bg} border border-slate-100 rounded-2xl p-4 shadow-sm`}>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{k.label}</p>
                          <p className={`text-2xl font-black mt-1 ${k.cls}`}>{k.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Stock List Table */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-black text-slate-900">Pharmacy Stock Register</h3>
                          <p className="text-[10px] text-slate-400 mt-0.5">Live inventory — medicines added from Global Catalogue</p>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
                          {inventory.length} SKUs
                        </span>
                      </div>

                      {inventory.length === 0 ? (
                        <div className="py-20 text-center">
                          <Package size={36} className="mx-auto text-slate-200 mb-3" />
                          <p className="text-sm font-black text-slate-400">No medicines in inventory</p>
                          <p className="text-[10px] text-slate-400 mt-1">Add medicines from the Global Catalogue tab first.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50/80 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                <th className="py-3 px-4">Medicine</th>
                                <th className="py-3 px-3">Status</th>
                                <th className="py-3 px-3">Available</th>
                                <th className="py-3 px-3">Reserved</th>
                                <th className="py-3 px-3">Reorder Lvl</th>
                                <th className="py-3 px-3">Rack / Shelf</th>
                                <th className="py-3 px-3">Nearest Expiry</th>
                                <th className="py-3 px-3">Batches</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {inventory.map(med => {
                                const status = getStockStatus(med);
                                const sc = statusConfig[status];
                                const available = getAvailableStock(med);
                                const nearestExp = getNearestExpiry(med);
                                const activeBatches = getActiveBatches(med);
                                const isNearExp = nearestExp && new Date(nearestExp) <= thirtyDays;
                                const medId = med._id || med.id;
                                return (
                                  <tr key={medId} className="hover:bg-blue-50/20 transition group">
                                    <td className="py-3.5 px-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center shrink-0">
                                          <Pill size={16} className="text-blue-500" />
                                        </div>
                                        <div>
                                          <p className="font-extrabold text-slate-900 leading-tight">{med.brandName || med.brand || med.name}</p>
                                          <p className="text-[9px] text-slate-400 font-semibold">{med.genericName || med.name}</p>
                                          {med.strength && <p className="text-[9px] text-slate-400">{med.strength} · {med.form}</p>}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-3">
                                      <span className={`text-[9px] font-black px-2 py-1 rounded-full border ${sc.cls}`}>{sc.label}</span>
                                    </td>
                                    <td className="py-3.5 px-3">
                                      <span className={`font-black text-sm ${available === 0 ? 'text-red-500' : available <= (med.reorderLevel || 10) ? 'text-amber-600' : 'text-slate-900'}`}>
                                        {available}
                                      </span>
                                      <span className="text-[9px] text-slate-400 ml-1">units</span>
                                    </td>
                                    <td className="py-3.5 px-3 text-slate-400 font-bold text-[11px]">0</td>
                                    <td className="py-3.5 px-3 font-bold text-slate-600 text-[11px]">{med.reorderLevel || med.minimumStock || '—'}</td>
                                    <td className="py-3.5 px-3">
                                      <p className="font-bold text-slate-700 text-[11px]">{med.rackNumber || med.rack || '—'}</p>
                                      <p className="text-[9px] text-slate-400">{med.storageLocation || med.shelf || ''}</p>
                                    </td>
                                    <td className="py-3.5 px-3">
                                      {nearestExp ? (
                                        <span className={`text-[10px] font-bold ${isNearExp ? 'text-orange-600' : 'text-slate-700'}`}>
                                          {new Date(nearestExp).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                          {isNearExp && <span className="ml-1 text-[8px] font-black text-orange-600 bg-orange-50 px-1 py-0.5 rounded">!</span>}
                                        </span>
                                      ) : <span className="text-slate-300 text-[10px]">—</span>}
                                    </td>
                                    <td className="py-3.5 px-3">
                                      <span className="text-[11px] font-black text-slate-700">{activeBatches.length}</span>
                                      <span className="text-[9px] text-slate-400 ml-1">active</span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => { setSelectedInventoryMedicine(med); setShowInventoryDetailDrawer(true); }}
                                          title="View Details"
                                          className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-blue-600 transition"
                                        ><Eye size={12} /></button>
                                        <button
                                          onClick={() => {
                                            setSelectedInventoryMedicine(med);
                                            setNewStockBatch({ batchNumber:'',mfgDate:'',expiryDate:'',invoiceNumber:'',supplier:'',purchasePrice:'',sellingPrice:'',gst:'12',discount:'0',quantityStrips:'',stripSize:'10',rack: med.rackNumber||med.rack||'',shelf: med.storageLocation||med.shelf||'' });
                                            setShowAddMoreStockModal(true);
                                          }}
                                          title="Add More Stock"
                                          className="w-7 h-7 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 flex items-center justify-center text-blue-600 transition"
                                        ><Plus size={12} /></button>
                                        <button title="Batch History" className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition">
                                          <Layers size={12} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    SUB-PAGE 2: STOCK INWARD
                ══════════════════════════════════════════════════════════ */}
                {inventorySubTab === 'stock-inward' && (
                  <div className="space-y-4">
                    {/* Header with CTA */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl px-6 py-4 flex justify-between items-center">
                      <div>
                        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <Truck size={15} className="text-blue-600" />
                          Stock Inward Register
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">Record incoming stock batches for pharmacy medicines</p>
                      </div>
                      <button
                        onClick={() => { setShowInwardMedicineSearch(true); setInwardMedicineQuery(''); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-100 transition"
                      >
                        <Plus size={13} />
                        Add Stock Inward
                      </button>
                    </div>

                    {/* Search within inward register */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-2xl px-4 py-3 flex gap-3 items-center">
                      <Search size={14} className="text-slate-400 shrink-0" />
                      <input
                        value={stockInwardSearch}
                        onChange={e => setStockInwardSearch(e.target.value)}
                        placeholder="Search by medicine, brand, batch no, supplier, invoice..."
                        className="flex-1 text-xs font-semibold text-slate-800 placeholder:text-slate-300 bg-transparent outline-none"
                      />
                      {stockInwardSearch && (
                        <button onClick={() => setStockInwardSearch('')} className="text-slate-400 hover:text-slate-600">
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Batch Register Table */}
                    <div className="bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden">
                      {filteredBatchRows.length === 0 ? (
                        <div className="py-20 text-center">
                          <Truck size={36} className="mx-auto text-slate-200 mb-3" />
                          <p className="text-sm font-black text-slate-400">No stock inward records found</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {inventory.length === 0
                              ? 'Add medicines from Global Catalogue first, then create stock batches here.'
                              : 'Click "Add Stock Inward" to record your first purchase batch.'}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50/80 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                <th className="py-3 px-4">Medicine</th>
                                <th className="py-3 px-3">Batch No.</th>
                                <th className="py-3 px-3">Supplier</th>
                                <th className="py-3 px-3">Invoice</th>
                                <th className="py-3 px-3">Purchase Date</th>
                                <th className="py-3 px-3">Expiry</th>
                                <th className="py-3 px-3">Purchased</th>
                                <th className="py-3 px-3">Remaining</th>
                                <th className="py-3 px-3">Purchase ₹</th>
                                <th className="py-3 px-3">MRP ₹</th>
                                <th className="py-3 px-3">Status</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {filteredBatchRows.map((row, idx) => {
                                const bs = getBatchStatus(row);
                                const bsc = batchStatusConfig[bs];
                                const med = row.medicine;
                                return (
                                  <tr key={row._id || row.id || idx} className="hover:bg-slate-50/50 transition group">
                                    <td className="py-3 px-4">
                                      <p className="font-extrabold text-slate-900 leading-tight">{med.brandName || med.brand || med.name}</p>
                                      <p className="text-[9px] text-slate-400 font-semibold">{med.genericName || med.name}</p>
                                    </td>
                                    <td className="py-3 px-3">
                                      <span className="font-black text-slate-800 text-[11px] font-mono">{row.batchNumber || row.batchNo || '—'}</span>
                                    </td>
                                    <td className="py-3 px-3 text-slate-600 font-semibold text-[11px]">{row.supplier || '—'}</td>
                                    <td className="py-3 px-3 text-slate-500 font-semibold text-[11px]">{row.invoiceNumber || '—'}</td>
                                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                                      {row.createdAt ? new Date(row.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'}
                                    </td>
                                    <td className="py-3 px-3">
                                      {row.expiryDate ? (
                                        <span className={`text-[10px] font-bold ${bs === 'expired' ? 'text-red-500' : bs === 'near-expiry' ? 'text-orange-600' : 'text-slate-700'}`}>
                                          {new Date(row.expiryDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                        </span>
                                      ) : '—'}
                                    </td>
                                    <td className="py-3 px-3 font-black text-slate-900 text-[11px]">{row.purchaseQuantity ?? row.quantity ?? '—'}</td>
                                    <td className="py-3 px-3">
                                      <span className={`font-black text-[11px] ${(row.availableStock ?? 0) === 0 ? 'text-red-400' : 'text-emerald-700'}`}>
                                        {row.availableStock ?? row.quantity ?? '—'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-3 font-bold text-slate-700 text-[11px]">₹{row.purchasePrice ?? '—'}</td>
                                    <td className="py-3 px-3 font-bold text-slate-700 text-[11px]">₹{row.mrp || row.sellingPrice || '—'}</td>
                                    <td className="py-3 px-3">
                                      <span className={`text-[9px] font-black px-2 py-1 rounded-full border ${bsc.cls}`}>{bsc.label}</span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button title="View Batch" className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition">
                                          <Eye size={12} />
                                        </button>
                                        <button title="Print Label" className="w-7 h-7 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 transition">
                                          <Printer size={12} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ══════════════════════════════════════════════════════════
                    MODALS & DRAWERS
                ══════════════════════════════════════════════════════════ */}

                {/* ── Add More Stock / Add Stock Inward Batch Drawer ──────── */}
                {(showAddMoreStockModal || showInwardBatchModal) && selectedInventoryMedicine && (
                  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-stretch justify-end z-50">
                    <div className="bg-white w-full max-w-[520px] shadow-2xl flex flex-col overflow-y-auto">
                      {/* Drawer Header */}
                      <div className="px-6 py-5 border-b border-slate-100 shrink-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded tracking-wider">Create New Batch</span>
                            <h3 className="text-base font-black text-slate-900 mt-2">Add Stock Batch</h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">New purchase will be saved as a separate batch</p>
                          </div>
                          <button onClick={() => { setShowAddMoreStockModal(false); setShowInwardBatchModal(false); setSelectedInventoryMedicine(null); }}
                            className="text-slate-400 hover:text-slate-700 mt-1"><X size={18} /></button>
                        </div>
                      </div>

                      {/* Pre-filled medicine info */}
                      <div className="mx-6 mt-5 mb-1 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-wider mb-2">Medicine (Pre-filled from Inventory)</p>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-blue-100 flex items-center justify-center shrink-0">
                            <Pill size={18} className="text-blue-500" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900">{selectedInventoryMedicine.brandName || selectedInventoryMedicine.brand || selectedInventoryMedicine.name}</p>
                            <p className="text-[10px] text-slate-500">{selectedInventoryMedicine.genericName || selectedInventoryMedicine.name}</p>
                            <p className="text-[10px] text-blue-600 font-bold mt-0.5">
                              Current Stock: {getAvailableStock(selectedInventoryMedicine)} units ·{' '}
                              {getActiveBatches(selectedInventoryMedicine).length} active batches
                            </p>
                          </div>
                        </div>
                        {getActiveBatches(selectedInventoryMedicine).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {getActiveBatches(selectedInventoryMedicine).slice(0, 4).map((b, i) => (
                              <span key={i} className="text-[9px] font-bold bg-white border border-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {b.batchNumber || b.batchNo} · {b.availableStock ?? b.quantity} units · Exp: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-IN', {month:'short',year:'2-digit'}) : '—'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Batch Entry Form */}
                      <div className="px-6 py-4 space-y-4 flex-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">New Batch Details</p>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="text-[10px] font-black text-slate-600 block mb-1">Batch Number <span className="text-red-500">*</span></label>
                            <input value={newStockBatch.batchNumber} onChange={e => setNewStockBatch(p=>({...p,batchNumber:e.target.value}))}
                              placeholder="e.g. B-2024-PRX-001"
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-600 block mb-1">Manufacturing Date</label>
                            <input type="date" value={newStockBatch.mfgDate} onChange={e => setNewStockBatch(p=>({...p,mfgDate:e.target.value}))}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-600 block mb-1">Expiry Date <span className="text-red-500">*</span></label>
                            <input type="date" value={newStockBatch.expiryDate} onChange={e => setNewStockBatch(p=>({...p,expiryDate:e.target.value}))}
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-600 block mb-1">Invoice Number</label>
                            <input value={newStockBatch.invoiceNumber} onChange={e => setNewStockBatch(p=>({...p,invoiceNumber:e.target.value}))}
                              placeholder="INV-2024-001"
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-600 block mb-1">Supplier</label>
                            <input value={newStockBatch.supplier} onChange={e => setNewStockBatch(p=>({...p,supplier:e.target.value}))}
                              placeholder="Supplier name"
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-600 block mb-1">Purchase Price (₹)</label>
                            <input type="number" value={newStockBatch.purchasePrice} onChange={e => setNewStockBatch(p=>({...p,purchasePrice:e.target.value}))}
                              placeholder="0.00"
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-600 block mb-1">MRP / Selling Price (₹)</label>
                            <input type="number" value={newStockBatch.sellingPrice} onChange={e => setNewStockBatch(p=>({...p,sellingPrice:e.target.value}))}
                              placeholder="0.00"
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-600 block mb-1">GST %</label>
                            <input type="number" value={newStockBatch.gst} onChange={e => setNewStockBatch(p=>({...p,gst:e.target.value}))}
                              placeholder="12"
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-600 block mb-1">Discount %</label>
                            <input type="number" value={newStockBatch.discount} onChange={e => setNewStockBatch(p=>({...p,discount:e.target.value}))}
                              placeholder="0"
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-600 block mb-1">Qty Purchased (Strips) <span className="text-red-500">*</span></label>
                            <input type="number" value={newStockBatch.quantityStrips} onChange={e => setNewStockBatch(p=>({...p,quantityStrips:e.target.value}))}
                              placeholder="50"
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-600 block mb-1">Tablets per Strip</label>
                            <input type="number" value={newStockBatch.stripSize} onChange={e => setNewStockBatch(p=>({...p,stripSize:e.target.value}))}
                              placeholder="10"
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-600 block mb-1">Rack</label>
                            <input value={newStockBatch.rack} onChange={e => setNewStockBatch(p=>({...p,rack:e.target.value}))}
                              placeholder="Rack A-3"
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-600 block mb-1">Shelf / Bin</label>
                            <input value={newStockBatch.shelf} onChange={e => setNewStockBatch(p=>({...p,shelf:e.target.value}))}
                              placeholder="Shelf B-1"
                              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50" />
                          </div>
                        </div>

                        {/* Total Quantity Preview */}
                        {newStockBatch.quantityStrips && newStockBatch.stripSize && (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-500">Total Units to be Added</span>
                            <span className="text-base font-black text-blue-700">
                              {parseInt(newStockBatch.quantityStrips) * parseInt(newStockBatch.stripSize)} units
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Drawer Footer */}
                      <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
                        <button
                          onClick={() => { setShowAddMoreStockModal(false); setShowInwardBatchModal(false); setSelectedInventoryMedicine(null); }}
                          className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-50 transition"
                        >Cancel</button>
                        <button
                          onClick={handleSaveNewStockBatch}
                          disabled={addMoreStockSaving}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-blue-100 disabled:opacity-60 flex items-center justify-center gap-2"
                        >
                          {addMoreStockSaving ? <><RefreshCw size={12} className="animate-spin" /> Saving...</> : <><Check size={12} /> Save Batch</>}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── View Inventory Details Drawer ─────────────────────── */}
                {showInventoryDetailDrawer && selectedInventoryMedicine && (
                  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-stretch justify-end z-50">
                    <div className="bg-white w-full max-w-[640px] shadow-2xl flex flex-col overflow-y-auto">
                      {/* Header */}
                      <div className="px-6 py-5 border-b border-slate-100 shrink-0 bg-gradient-to-r from-slate-900 to-slate-800">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black text-blue-300 uppercase tracking-wider">Inventory Details</span>
                            <h3 className="text-lg font-black text-white mt-1">
                              {selectedInventoryMedicine.brandName || selectedInventoryMedicine.brand || selectedInventoryMedicine.name}
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {selectedInventoryMedicine.genericName} · {selectedInventoryMedicine.strength} · {selectedInventoryMedicine.form}
                            </p>
                          </div>
                          <button onClick={() => { setShowInventoryDetailDrawer(false); setSelectedInventoryMedicine(null); }}
                            className="text-white/50 hover:text-white mt-1"><X size={20} /></button>
                        </div>
                      </div>

                      <div className="px-6 py-5 space-y-6 flex-1">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-4 gap-3">
                          {[
                            { label: 'Available Stock', value: getAvailableStock(selectedInventoryMedicine), cls: 'text-emerald-700' },
                            { label: 'Reserved',   value: 0, cls: 'text-slate-500' },
                            { label: 'Active Batches', value: getActiveBatches(selectedInventoryMedicine).length, cls: 'text-blue-700' },
                            { label: 'Total Batches',  value: (selectedInventoryMedicine.batches||[]).length, cls: 'text-slate-700' },
                          ].map(k => (
                            <div key={k.label} className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{k.label}</p>
                              <p className={`text-xl font-black mt-1 ${k.cls}`}>{k.value}</p>
                            </div>
                          ))}
                        </div>

                        {/* Medicine Info */}
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Medicine Information</p>
                          <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
                            {[
                              { label: 'Brand Name', value: selectedInventoryMedicine.brandName || selectedInventoryMedicine.brand },
                              { label: 'Generic Name', value: selectedInventoryMedicine.genericName || selectedInventoryMedicine.name },
                              { label: 'Form', value: selectedInventoryMedicine.form },
                              { label: 'Strength', value: selectedInventoryMedicine.strength },
                              { label: 'Manufacturer', value: selectedInventoryMedicine.manufacturer },
                              { label: 'Rack', value: selectedInventoryMedicine.rackNumber || selectedInventoryMedicine.rack },
                              { label: 'Storage Location', value: selectedInventoryMedicine.storageLocation || selectedInventoryMedicine.shelf },
                              { label: 'Reorder Level', value: selectedInventoryMedicine.reorderLevel },
                            ].map(f => (
                              <div key={f.label}>
                                <span className="text-slate-400 font-semibold">{f.label}</span>
                                <p className="font-black text-slate-800 mt-0.5">{f.value || '—'}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Batch-wise Stock Table */}
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Batch-wise Stock</p>
                          {(selectedInventoryMedicine.batches||[]).length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-2xl">No stock batches recorded yet.</p>
                          ) : (
                            <div className="border border-slate-100 rounded-2xl overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                    <th className="py-2.5 px-3">Batch</th>
                                    <th className="py-2.5 px-3">Purchased</th>
                                    <th className="py-2.5 px-3">Remaining</th>
                                    <th className="py-2.5 px-3">Expiry</th>
                                    <th className="py-2.5 px-3">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {(selectedInventoryMedicine.batches||[]).map((b, i) => {
                                    const bs = getBatchStatus(b);
                                    const bsc = batchStatusConfig[bs];
                                    return (
                                      <tr key={b._id || b.id || i} className="hover:bg-slate-50/50">
                                        <td className="py-2.5 px-3 font-black text-slate-800 font-mono text-[10px]">{b.batchNumber || b.batchNo}</td>
                                        <td className="py-2.5 px-3 font-bold text-slate-600">{b.purchaseQuantity ?? b.quantity ?? '—'}</td>
                                        <td className="py-2.5 px-3 font-black text-emerald-700">{b.availableStock ?? b.quantity ?? '—'}</td>
                                        <td className="py-2.5 px-3 text-slate-600">
                                          {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : '—'}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <span className={`text-[9px] font-black px-2 py-1 rounded-full border ${bsc.cls}`}>{bsc.label}</span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Action */}
                      <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
                        <button onClick={() => { setShowInventoryDetailDrawer(false); setSelectedInventoryMedicine(null); }}
                          className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-black hover:bg-slate-50 transition">
                          Close
                        </button>
                        <button
                          onClick={() => {
                            setShowInventoryDetailDrawer(false);
                            setNewStockBatch({ batchNumber:'',mfgDate:'',expiryDate:'',invoiceNumber:'',supplier:'',purchasePrice:'',sellingPrice:'',gst:'12',discount:'0',quantityStrips:'',stripSize:'10',rack: selectedInventoryMedicine.rackNumber||'',shelf: selectedInventoryMedicine.storageLocation||'' });
                            setShowAddMoreStockModal(true);
                          }}
                          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition shadow-md shadow-blue-100 flex items-center justify-center gap-2"
                        >
                          <Plus size={12} /> Add More Stock
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Stock Inward — Select Pharmacy Medicine Popup ────────── */}
                {showInwardMedicineSearch && (
                  <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg flex flex-col max-h-[70vh]">
                      <div className="px-6 py-5 border-b border-slate-100 shrink-0">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-sm font-black text-slate-900">Select Pharmacy Medicine</h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">Choose from medicines already in your pharmacy inventory</p>
                          </div>
                          <button onClick={() => { setShowInwardMedicineSearch(false); setInwardMedicineQuery(''); }}
                            className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
                        </div>
                        {/* Search within popup */}
                        <div className="mt-4 flex gap-2 items-center border border-slate-200 rounded-xl px-3 py-2.5">
                          <Search size={13} className="text-slate-400" />
                          <input
                            autoFocus
                            value={inwardMedicineQuery}
                            onChange={e => setInwardMedicineQuery(e.target.value)}
                            placeholder="Search brand, generic, code..."
                            className="flex-1 text-xs font-semibold text-slate-800 placeholder:text-slate-300 bg-transparent outline-none"
                          />
                        </div>
                      </div>

                      <div className="overflow-y-auto flex-1">
                        {inventory.length === 0 ? (
                          <div className="py-12 text-center">
                            <Package size={32} className="mx-auto text-slate-200 mb-3" />
                            <p className="text-xs font-black text-slate-400">No medicines in pharmacy inventory yet</p>
                            <p className="text-[10px] text-slate-400 mt-1">Add medicines from Global Catalogue first.</p>
                          </div>
                        ) : (
                          inventory
                            .filter(m => {
                              if (!inwardMedicineQuery.trim()) return true;
                              const q = inwardMedicineQuery.toLowerCase();
                              return (m.name||'').toLowerCase().includes(q)
                                || (m.brandName||m.brand||'').toLowerCase().includes(q)
                                || (m.genericName||'').toLowerCase().includes(q)
                                || (m.code||'').toLowerCase().includes(q);
                            })
                            .map(med => {
                              const avail = getAvailableStock(med);
                              const status = getStockStatus(med);
                              const sc = statusConfig[status];
                              return (
                                <button
                                  key={med._id || med.id}
                                  onClick={() => {
                                    setSelectedInventoryMedicine(med);
                                    setNewStockBatch({ batchNumber:'',mfgDate:'',expiryDate:'',invoiceNumber:'',supplier:'',purchasePrice:'',sellingPrice:'',gst:'12',discount:'0',quantityStrips:'',stripSize:'10',rack: med.rackNumber||med.rack||'',shelf: med.storageLocation||med.shelf||'' });
                                    setShowInwardMedicineSearch(false);
                                    setInwardMedicineQuery('');
                                    setShowInwardBatchModal(true);
                                  }}
                                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-blue-50/40 transition border-b border-slate-50 text-left"
                                >
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center shrink-0">
                                    <Pill size={16} className="text-blue-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-extrabold text-slate-900 text-sm truncate">{med.brandName || med.brand || med.name}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{med.genericName || med.name} · {med.strength}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-full border ${sc.cls}`}>{sc.label}</span>
                                    <p className="text-[10px] font-bold text-slate-600 mt-1">{avail} units</p>
                                  </div>
                                  <ChevronRight size={14} className="text-slate-300" />
                                </button>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })()}

          {/* ================= TAB 12: SALES MANAGEMENT MODULE ================= */}
          {tab === 'sales' && (() => {
            const filteredSalesList = sales.filter(sale => {
              if (salesSubTab === 'walk-in' && sale.type !== 'Walk-in') return false;
              if (salesSubTab === 'prescription' && sale.type !== 'Prescription') return false;
              if (salesSubTab === 'cancelled' && sale.status !== 'Cancelled') return false;
              if (salesSubTab === 'refunded' && sale.status !== 'Refunded') return false;

              if (salesSearchQuery.trim()) {
                const q = salesSearchQuery.toLowerCase();
                return (
                  (sale.id || '').toLowerCase().includes(q) ||
                  (sale.token || '').toLowerCase().includes(q) ||
                  (sale.patientName || '').toLowerCase().includes(q) ||
                  (sale.paymentMode || '').toLowerCase().includes(q)
                );
              }
              return true;
            });

            return (
              <div className="p-6 space-y-6">
                {/* PAGE HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <TrendingUp size={22} className="text-blue-600" /> Sales
                    </h2>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      Manage pharmacy sales, invoices, payments and business performance.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => { setActiveTab('walk-in'); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition">
                      <Plus size={14} /> New Sale
                    </button>
                    <button onClick={() => toast.success('Import sales feature coming soon.')} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-black transition">
                      Import Sales
                    </button>
                    <button onClick={() => toast.success('Sales report exported.')} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-black transition">
                      Export Report
                    </button>
                    <button onClick={() => toast.success('GST report downloaded.')} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-black transition">
                      Download GST Report
                    </button>
                  </div>
                </div>

                {/* SALES TABS */}
                <div className="flex overflow-x-auto gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 scrollbar-none">
                  {[
                    { id: 'all', label: 'All Sales' },
                    { id: 'walk-in', label: 'Walk-in Sales' },
                    { id: 'prescription', label: 'Prescription Sales' },
                    { id: 'cancelled', label: 'Cancelled Sales' },
                    { id: 'refunded', label: 'Refunded Sales' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSalesSubTab(t.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${salesSubTab === t.id ? 'bg-white text-blue-600 shadow-sm border border-slate-200/20' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* TOP KPI DASHBOARD */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Today's Sales", val: `₹${(salesStats.dailyAmounts[6]?.amount || 0).toLocaleString('en-IN')}`, pct: "+18.6%", color: "text-blue-600 bg-blue-50 border-blue-100", icon: "💰" },
                    { label: "Monthly Sales", val: `₹${salesStats.grossRevenue.toLocaleString('en-IN')}`, pct: "+14.2%", color: "text-emerald-600 bg-emerald-50 border-emerald-100", icon: "📈" },
                    { label: "Average Order Value", val: `₹${salesStats.avgBasket.toFixed(0)}`, pct: "+11.3%", color: "text-amber-600 bg-amber-50 border-amber-100", icon: "🛒" },
                    { label: "Gross Profit", val: `₹${(salesStats.netProfit).toFixed(0)}`, pct: "30.0% Margin", color: "text-purple-600 bg-purple-50 border-purple-100", icon: "💎" },
                  ].map((card, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[110px] hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{card.label}</p>
                        <span className="text-sm">{card.icon}</span>
                      </div>
                      <div className="mt-2 flex justify-between items-end">
                        <div>
                          <h3 className="text-lg font-black text-slate-905 leading-tight">{card.val}</h3>
                          <p className="text-[9px] text-slate-400 font-semibold mt-0.5">vs previous period</p>
                        </div>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${card.color}`}>{card.pct}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* SEARCH & FILTERS */}
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row gap-3 justify-between">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search by invoice no, patient, payment mode..."
                        value={salesSearchQuery}
                        onChange={e => setSalesSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:bg-white transition-all"
                      />
                      <Search size={14} className="absolute left-3 top-3.5 text-slate-400" />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setShowSalesFilters(!showSalesFilters)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-slate-50 transition">
                        Filters {showSalesFilters ? '▲' : '▼'}
                      </button>
                      <select value={salesSort} onChange={e => setSalesSort(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="highest">Highest Amount</option>
                        <option value="lowest">Lowest Amount</option>
                      </select>
                    </div>
                  </div>

                  {showSalesFilters && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs animate-fade-in">
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">Payment Mode</label>
                        <select value={salesFilters.paymentMode} onChange={e => setSalesFilters({ ...salesFilters, paymentMode: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2">
                          <option value="ALL">All Modes</option>
                          <option value="CASH">Cash</option>
                          <option value="UPI">UPI / Digital</option>
                          <option value="CARD">Credit/Debit Card</option>
                          <option value="ONLINE">Online Wallet</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">Payment Status</label>
                        <select value={salesFilters.status} onChange={e => setSalesFilters({ ...salesFilters, status: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2">
                          <option value="ALL">All Statuses</option>
                          <option value="PAID">Paid</option>
                          <option value="PENDING">Pending</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">Start Date</label>
                        <input type="date" value={salesFilters.startDate} onChange={e => setSalesFilters({ ...salesFilters, startDate: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2" />
                      </div>
                      <div>
                        <label className="text-slate-400 font-bold block mb-1">End Date</label>
                        <input type="date" value={salesFilters.endDate} onChange={e => setSalesFilters({ ...salesFilters, endDate: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2" />
                      </div>
                    </div>
                  )}
                </div>

                {/* SALES LIST TABLE */}
                <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold">
                          <th className="p-4">Invoice No</th>
                          <th className="p-4">Date &amp; Time</th>
                          <th className="p-4">Sale Type</th>
                          <th className="p-4">Customer / Patient</th>
                          <th className="p-4">Total Amount</th>
                          <th className="p-4">Payment</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {filteredSalesList.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="p-8 text-center text-slate-400 font-bold">No sales records found.</td>
                          </tr>
                        ) : (
                          filteredSalesList.map(sale => (
                            <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-4 font-black text-blue-600 cursor-pointer hover:underline" onClick={() => setSelectedSaleDetail(sale)}>
                                {sale.id.slice(0, 10).toUpperCase()}
                              </td>
                              <td className="p-4 whitespace-nowrap">{sale.date}</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${sale.type === 'Prescription' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                  {sale.type}
                                </span>
                              </td>
                              <td className="p-4 font-bold text-slate-800">{sale.patientName}</td>
                              <td className="p-4 font-black text-slate-905">₹{sale.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td className="p-4 font-bold text-slate-600">{sale.paymentMode}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${
                                  sale.status === 'Completed' || sale.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                  sale.status === 'Cancelled' ? 'bg-red-50 text-red-500 border border-red-100' :
                                  'bg-amber-50 text-amber-600 border border-amber-100'
                                }`}>
                                  {sale.status || 'Completed'}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex gap-1.5 justify-center">
                                  <button onClick={() => setSelectedSaleDetail(sale)} title="View Detail" className="p-1.5 border border-slate-100 hover:bg-slate-100 rounded-lg text-slate-500 transition">
                                    <Eye size={12} />
                                  </button>
                                  <button onClick={() => { setSelectedSaleDetail(sale); toast.success('Opening print layout...'); }} title="Print" className="p-1.5 border border-slate-100 hover:bg-slate-100 rounded-lg text-slate-500 transition">
                                    <Printer size={12} />
                                  </button>
                                  <button onClick={() => {
                                    setRefundForm({ ...refundForm, amount: sale.amount, items: [] });
                                    setSelectedSaleDetail(sale);
                                    setShowRefundModal(true);
                                  }} title="Refund" className="p-1.5 border border-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-500 transition">
                                    <RotateCcwIcon size={12} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* BOTTOM ANALYTICS CHARTS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Sales Trend line graph */}
                  <div className="lg:col-span-2 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-905">Sales Trend (Last 7 Days)</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">Dynamic revenue movement tracker</p>
                    </div>
                    <div className="h-44">
                      <svg className="w-full h-full" viewBox="0 0 600 120" preserveAspectRatio="none">
                        {salesStats.fillD && <path d={salesStats.fillD} fill="url(#chart-grad)" />}
                        {salesStats.pathD && <path d={salesStats.pathD} fill="none" stroke="#3b82f6" strokeWidth="3" />}
                        {salesStats.coordinates.map((point, idx) => (
                          <circle key={idx} cx={point.x} cy={point.y} r="4" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                        ))}
                      </svg>
                      <div className="flex justify-between text-[9px] text-slate-400 font-bold pt-2">
                        {salesStats.dailyAmounts.map((d, index) => (
                          <span key={index}>{d.label}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Top Selling Medicines list */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-black text-slate-905">Top Selling Medicines</h3>
                    <div className="space-y-3.5 max-h-[175px] overflow-y-auto custom-scrollbar">
                      {globalCatalog.slice(0, 3).map((med, index) => (
                        <div key={med.id} className="flex justify-between items-center text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-slate-100 rounded-md flex items-center justify-center font-black text-[10px] text-slate-400">{index + 1}</span>
                            <div>
                              <p className="font-extrabold text-slate-800">{med.brand}</p>
                              <p className="text-[9px] text-slate-400 font-bold">{[250, 180, 150][index] || 100} units sold</p>
                            </div>
                          </div>
                          <span className="font-black text-slate-905">₹{['10,000', '7,200', '6,000'][index] || '4,000'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ================= TAB 13: NOTIFICATION CENTER ================= */}
          {tab === 'notifications' && (() => {
            const filteredList = notifications.filter(n => {
              // Search Query
              if (notificationSearch.trim()) {
                const q = notificationSearch.toLowerCase();
                if (!n.title.toLowerCase().includes(q) && !n.message.toLowerCase().includes(q)) return false;
              }

              // Filter by Tab (Read / Unread / Archived / Deleted)
              if (notificationTab === 'unread' && n.status !== 'Unread') return false;
              if (notificationTab === 'read' && n.status !== 'Read') return false;
              if (notificationTab === 'archived' && !n.isArchived) return false;
              if (notificationTab === 'deleted' && !n.isDeleted) return false;

              // Filter out archived/deleted in general tabs
              if (notificationTab !== 'archived' && n.isArchived) return false;
              if (notificationTab !== 'deleted' && n.isDeleted) return false;

              return true;
            });

            return (
              <div className="p-6 space-y-6">
                {/* PAGE HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      🔔 Notification Center
                    </h2>
                    <p className="text-xs text-slate-400 font-bold mt-1">
                      Manage real-time notifications, warnings, system logs, and reminders.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setNotifications(notifications.map(n => ({ ...n, status: 'Read' })));
                        toast.success('All marked as read.');
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md transition"
                    >
                      Mark All Read
                    </button>
                    <button
                      onClick={() => {
                        setNotifications([]);
                        toast.success('Cleared all notifications.');
                      }}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-655 rounded-xl text-xs font-black transition"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* SEARCH & BULK ACTIONS */}
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row gap-3 justify-between">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Search notifications..."
                        value={notificationSearch}
                        onChange={e => setNotificationSearch(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:bg-white transition-all font-bold"
                      />
                      <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                    </div>
                    <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'unread', label: 'Unread' },
                        { id: 'read', label: 'Read' },
                        { id: 'archived', label: 'Archived' }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setNotificationTab(t.id)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                            notificationTab === t.id ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* NOTIFICATIONS TIMELINE */}
                <div className="space-y-3">
                  {filteredList.length === 0 ? (
                    <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center">
                      <span className="text-3xl block mb-2">🎉</span>
                      <h4 className="font-black text-slate-800 text-sm">You're all caught up.</h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-bold">No notifications to display in this tab.</p>
                    </div>
                  ) : (
                    filteredList.map(n => (
                      <div
                        key={n.id}
                        className={`bg-white border rounded-3xl p-4 shadow-xs hover:shadow-sm transition flex gap-4 items-start relative group ${
                          n.status === 'Unread' ? 'border-blue-200 bg-blue-50/10' : 'border-slate-100'
                        }`}
                      >
                        <span className="text-xl w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                          {n.module === 'Inventory' ? '🚨' : n.module === 'Prescription' ? '📝' : '💰'}
                        </span>
                        <div className="flex-1 min-w-0 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide">{n.module}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                              n.priority === 'High' ? 'bg-rose-50 text-rose-600' :
                              n.priority === 'Medium' ? 'bg-amber-50 text-amber-600' :
                              'bg-slate-100 text-slate-500'
                            }`}>{n.priority} Priority</span>
                          </div>
                          <h4 className="font-extrabold text-slate-900 mt-2">{n.title}</h4>
                          <p className="text-slate-500 mt-0.5 leading-relaxed font-bold">{n.message}</p>
                          <span className="text-[9px] text-slate-400 block mt-2">{new Date(n.createdTime).toLocaleTimeString()}</span>
                        </div>
                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setNotifications(notifications.map(item => item.id === n.id ? { ...item, status: item.status === 'Read' ? 'Unread' : 'Read' } : item));
                              toast.success(n.status === 'Read' ? 'Marked as unread.' : 'Marked as read.');
                            }}
                            className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-[10px] font-bold rounded-xl text-slate-600"
                          >
                            {n.status === 'Read' ? 'Mark Unread' : 'Mark Read'}
                          </button>
                          <button
                            onClick={() => {
                              setNotifications(notifications.map(item => item.id === n.id ? { ...item, isArchived: true } : item));
                              toast.success('Notification archived.');
                            }}
                            className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-[10px] font-bold rounded-xl text-slate-600"
                          >
                            Archive
                          </button>
                          <button
                            onClick={() => {
                              setNotifications(notifications.filter(item => item.id !== n.id));
                              toast.success('Notification deleted.');
                            }}
                            className="px-2.5 py-1.5 border border-rose-200 hover:bg-rose-50 text-[10px] font-bold rounded-xl text-rose-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })()}


        </main>
      </div>

      {/* ================= RIGHT PANEL ================= */}
      <div className="relative flex shrink-0">

        {/* Toggle Button — outside aside so it is never hidden or clipped */}
        <button
          onClick={() => setRightSidebarOpen(prev => !prev)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full z-40 w-6 h-14 bg-white border border-r-0 border-slate-200 rounded-l-xl shadow-md flex items-center justify-center text-slate-455 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150"
          title={rightSidebarOpen ? 'Close panel' : 'Open panel'}
        >
          {rightSidebarOpen ? <TfiAngleRight size={11} /> : <TfiAngleLeft size={11} />}
        </button>

        <aside className={`bg-white border-l border-slate-100 flex flex-col shrink-0 overflow-y-auto custom-scrollbar transition-all duration-300 ease-in-out ${rightSidebarOpen ? 'w-[320px] p-6 space-y-6' : 'w-0 p-0 overflow-hidden'}`}>
          {tab === 'sales' ? (
            // Sales specific right sidebar
            <>
              {/* Sales Summary */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Sales Summary</h3>
                <div className="space-y-2 text-xs font-bold text-slate-600">
                  <div className="flex justify-between">
                    <span>Total Sales</span>
                    <span className="font-black text-slate-800">₹{salesStats.grossRevenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Invoices</span>
                    <span className="font-black text-slate-800">{salesStats.totalCount}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Paid Amount</span>
                    <span className="font-black">₹{salesStats.grossRevenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-amber-500">
                    <span>Pending Amount</span>
                    <span className="font-black">₹{salesStats.pendingCount ? (salesStats.pendingCount * 500).toLocaleString() : '0'}</span>
                  </div>
                </div>
              </div>

              {/* Payment Mode Distribution Donut chart */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Payment Summary</h3>
                <div className="flex items-center gap-4">
                  <svg width="80" height="80" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="30" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                    <circle cx="40" cy="40" r="30" fill="transparent" stroke="#3b82f6" strokeWidth="8" strokeDasharray="120 188" strokeDashoffset="0" />
                    <circle cx="40" cy="40" r="30" fill="transparent" stroke="#10b981" strokeWidth="8" strokeDasharray="68 188" strokeDashoffset="-120" />
                  </svg>
                  <div className="text-[10px] space-y-1 font-bold">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-blue-500 rounded-full"></span> UPI ({salesStats.rxPct}%)</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Cash ({salesStats.walkinPct}%)</div>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-black text-slate-700">
                  <button onClick={() => { setActiveTab('walk-in'); }} className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-2xl transition">New Sale</button>
                  <button onClick={() => toast.success('Sale held.')} className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-2xl transition">Hold Sale</button>
                  <button onClick={() => toast.success('Sales Return wizard initiated.')} className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-2xl transition">Sales Return</button>
                  <button onClick={() => toast.success('Invoice print layout opened.')} className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-2xl transition">Print Invoice</button>
                </div>
              </div>
            </>
          ) : (
            // Default Right Sidebar
            <>
              {/* Quick Actions Shortcuts */}
              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setSelectedRx(prescriptions[0]); setActiveTab('orders'); }}
                    className="p-3 bg-slate-50 border border-slate-100 hover:bg-blue-50/30 hover:border-blue-100 rounded-2xl flex flex-col gap-2 items-start transition text-left cursor-pointer group"
                  >
                    <div className="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-100">
                      <FileText size={14} />
                    </div>
                    <span className="text-[10px] font-black text-slate-700 leading-tight">New Order</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('walk-in')}
                    className="p-3 bg-slate-50 border border-slate-100 hover:bg-emerald-50/30 hover:border-emerald-100 rounded-2xl flex flex-col gap-2 items-start transition text-left cursor-pointer group"
                  >
                    <div className="w-7 h-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center group-hover:bg-emerald-100">
                      <CreditCard size={14} />
                    </div>
                    <span className="text-[10px] font-black text-slate-700 leading-tight">Walk-in Sale</span>
                  </button>

                  <button
                    onClick={() => setShowFloatingSearch(true)}
                    className="p-3 bg-slate-50 border border-slate-100 hover:bg-purple-50/30 hover:border-purple-100 rounded-2xl flex flex-col gap-2 items-start transition text-left cursor-pointer group"
                  >
                    <div className="w-7 h-7 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center group-hover:bg-purple-100">
                      <Search size={14} />
                    </div>
                    <span className="text-[10px] font-black text-slate-700 leading-tight">Search Patient</span>
                  </button>

                  <button
                    onClick={handleBarcodeScan}
                    className="p-3 bg-slate-50 border border-slate-100 hover:bg-amber-50/30 hover:border-amber-100 rounded-2xl flex flex-col gap-2 items-start transition text-left cursor-pointer group"
                  >
                    <div className="w-7 h-7 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center group-hover:bg-amber-100">
                      <Barcode size={14} />
                    </div>
                    <span className="text-[10px] font-black text-slate-700 leading-tight">Scan Barcode</span>
                  </button>

                  <button
                    onClick={() => { setSelectedCatalogItem(globalCatalog[0]); setShowAddBatchModal(true); }}
                    className="p-3 bg-slate-50 border border-slate-100 hover:bg-slate-150 rounded-2xl flex flex-col gap-2 items-start transition text-left cursor-pointer group"
                  >
                    <div className="w-7 h-7 bg-slate-100 text-slate-655 rounded-lg flex items-center justify-center group-hover:bg-slate-200">
                      <Plus size={14} />
                    </div>
                    <span className="text-[10px] font-black text-slate-700 leading-tight">Add Medicine</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('catalogue'); toast.success('Purchasing system initialized.'); }}
                    className="p-3 bg-slate-50 border border-slate-100 hover:bg-slate-150 rounded-2xl flex flex-col gap-2 items-start transition text-left cursor-pointer group"
                  >
                    <div className="w-7 h-7 bg-slate-100 text-slate-655 rounded-lg flex items-center justify-center group-hover:bg-slate-200">
                      <ShoppingBag size={14} />
                    </div>
                    <span className="text-[10px] font-black text-slate-700 leading-tight">Purchase Stock</span>
                  </button>
                </div>
              </div>

              {/* Top Selling Medicines */}
              <div className="space-y-3.5">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Top Selling Medicines</h3>
                  <button onClick={() => toast.success('Full sales report loaded.')} className="text-[9px] text-blue-600 font-bold hover:underline">View All</button>
                </div>

                <div className="space-y-3">
                  {globalCatalog.slice(0, 5).map((med, index) => {
                    const units = [1256, 850, 720, 615, 480][index];
                    const revenue = ['18,256', '15,300', '11,520', '9,840', '8,640'][index];
                    return (
                      <div key={med.id} className="flex items-center gap-3 bg-slate-50/50 p-2 border border-slate-100 rounded-2xl hover:bg-slate-50 transition duration-150">
                        <span className="text-xs font-black text-slate-400 w-4 text-center">{index + 1}</span>
                        <img src={med.image} alt={med.brand} className="w-9 h-9 rounded-xl object-cover border border-slate-200/50 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate">{med.brand}</p>
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5">{units} units sold</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-905">₹{revenue}</p>
                          <span className="text-[8px] text-emerald-600 font-bold flex items-center justify-end gap-0.5">
                            <ArrowUpRight size={8} /> Rise
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Activity Timeline */}
              <div className="space-y-3.5 flex-1">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Recent Activity</h3>
                  <button onClick={() => toast.success('Full activity log loaded.')} className="text-[9px] text-blue-600 font-bold hover:underline">View All</button>
                </div>

                <div className="relative border-l border-slate-200 ml-3 pl-7 space-y-5 text-xs">
                  {activities.slice(0, 4).map(act => (
                    <div key={act.id} className="relative group">
                      <span className="absolute -left-10 top-0.5 w-6 h-6 rounded-full bg-white border border-slate-100 shadow-xs flex items-center justify-center text-[10px] z-10">
                        {act.icon === 'check' && '✅'}
                        {act.icon === 'stock' && '📦'}
                        {act.icon === 'rx' && '📝'}
                        {act.icon === 'plus' && '💊'}
                        {act.icon === 'return' && '🔄'}
                      </span>
                      <div>
                        <p className="font-extrabold text-slate-700">{act.type}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{act.desc}</p>
                        <span className="text-[8px] text-slate-400 font-bold block mt-1">{act.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ================= FLOATING PATIENT SEARCH WIDGET ================= */}
      {showFloatingSearch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-905 flex items-center gap-2">
                <Users className="text-blue-600" size={18} /> Search Patient Prescription
              </h3>
              <button onClick={() => setShowFloatingSearch(false)} className="text-slate-400 hover:text-slate-655"><X size={18} /></button>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Enter Phone, Prescription ID, Appointment ID..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:bg-white"
                value={floatingSearchText}
                onChange={(e) => setFloatingSearchText(e.target.value)}
                autoFocus
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
              {prescriptions.filter(p => {
                const search = floatingSearchText.toLowerCase();
                return p.patientName.toLowerCase().includes(search) || p.phone.includes(search) || p.id.toLowerCase().includes(search);
              }).map(p => (
                <div
                  key={p.id}
                  onClick={() => handleFloatingSearchSelect(p)}
                  className="p-3 bg-slate-50 hover:bg-blue-50/20 border border-slate-100 rounded-2xl flex justify-between items-center cursor-pointer transition"
                >
                  <div>
                    <h4 className="font-black text-slate-800 text-xs">{p.patientName}</h4>
                    <p className="text-[9px] text-slate-400 font-bold mt-0.5">Phone: {p.phone} | Doc: {p.doctor}</p>
                  </div>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{p.id}</span>
                </div>
              ))}
              {prescriptions.filter(p => {
                const search = floatingSearchText.toLowerCase();
                return p.patientName.toLowerCase().includes(search) || p.phone.includes(search) || p.id.toLowerCase().includes(search);
              }).length === 0 && (
                  <p className="text-center text-xs text-slate-400 py-4 font-bold">No patient prescriptions match.</p>
                )}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-50">
              <button
                onClick={() => { toast.success('QR/Barcode scanner simulate initialization.'); }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
              >
                <Barcode size={14} /> Scan QR Code
              </button>
              <button
                onClick={() => setShowFloatingSearch(false)}
                className="flex-1 py-2 border border-slate-200 text-slate-655 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= INVOICE DETAILS MODAL ================= */}
      {selectedSaleDetail && !showRefundModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-905">Invoice Details: {selectedSaleDetail.id.slice(0, 10).toUpperCase()}</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Date: {selectedSaleDetail.date} · Type: {selectedSaleDetail.type}</p>
              </div>
              <button onClick={() => setSelectedSaleDetail(null)} className="text-slate-400 hover:text-slate-655"><X size={18} /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Customer / Patient Info</h4>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50 space-y-1 font-bold text-slate-600">
                  <p>Name: <span className="text-slate-800 font-black">{selectedSaleDetail.patientName}</span></p>
                  <p>Customer Type: <span className="text-slate-800 font-black">{selectedSaleDetail.type} Client</span></p>
                  <p>Status: <span className="text-emerald-600 font-black">Verified Verified</span></p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Payment Details</h4>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50 space-y-1 font-bold text-slate-600">
                  <p>Method: <span className="text-slate-800 font-black">{selectedSaleDetail.paymentMode}</span></p>
                  <p>Billing Status: <span className="text-emerald-600 font-black">{selectedSaleDetail.status}</span></p>
                  <p>Amount Charged: <span className="text-slate-800 font-black">₹{selectedSaleDetail.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-black text-slate-800 uppercase tracking-wider text-[10px]">Dispensed Medicine List</h4>
              <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-500">
                      <th className="p-2.5">Medicine</th>
                      <th className="p-2.5">Batch</th>
                      <th className="p-2.5 text-right">Qty</th>
                      <th className="p-2.5 text-right">MRP</th>
                      <th className="p-2.5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-bold text-slate-700">
                      <td className="p-2.5">Dolo 650mg</td>
                      <td className="p-2.5">B-PR2025</td>
                      <td className="p-2.5 text-right">1 Strip</td>
                      <td className="p-2.5 text-right">₹50.00</td>
                      <td className="p-2.5 text-right">₹50.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-100">
              <button onClick={() => toast.success('Invoice print job sent to system.')} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md">Print Invoice</button>
              <button onClick={() => toast.success('PDF download initiated.')} className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black rounded-xl">Download PDF</button>
              <button onClick={() => { setShowRefundModal(true); }} className="flex-1 py-2 border border-rose-250 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-black">Process Refund</button>
              <button onClick={() => setSelectedSaleDetail(null)} className="py-2 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-black rounded-xl">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REFUND MANAGEMENT MODAL ================= */}
      {showRefundModal && selectedSaleDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-905">Process Sales Refund</h3>
              <button onClick={() => setShowRefundModal(false)} className="text-slate-400 hover:text-slate-655"><X size={18} /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50 space-y-1 font-bold text-slate-600">
                <p>Invoice ID: <span className="text-slate-800 font-black">{selectedSaleDetail.id.slice(0, 10).toUpperCase()}</span></p>
                <p>Sale Amount: <span className="text-slate-800 font-black">₹{selectedSaleDetail.amount.toLocaleString()}</span></p>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Refund Type</label>
                <select value={refundForm.type} onChange={e => setRefundForm({ ...refundForm, type: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                  <option value="Full Refund">Full Refund</option>
                  <option value="Partial Refund">Partial Refund</option>
                  <option value="Credit Note">Credit Note</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Refund Amount (₹)</label>
                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={refundForm.amount} onChange={e => setRefundForm({ ...refundForm, amount: e.target.value })} />
              </div>

              <div>
                <label className="text-slate-400 font-bold block mb-1">Reason for Refund</label>
                <textarea rows="3" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 resize-none" value={refundForm.reason} onChange={e => setRefundForm({ ...refundForm, reason: e.target.value })} placeholder="Reason..."></textarea>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-50">
              <button onClick={() => {
                toast.success(`Refund of ₹${refundForm.amount} processed successfully.`);
                setSales(sales.map(s => s.id === selectedSaleDetail.id ? { ...s, status: 'Refunded' } : s));
                setShowRefundModal(false);
                setSelectedSaleDetail(null);
              }} className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md">Confirm Refund</button>
              <button onClick={() => setShowRefundModal(false)} className="flex-1 py-2 border border-slate-250 rounded-xl font-bold text-slate-700 text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ================= ADD BATCH MODAL ================= */}
      {showAddBatchModal && selectedCatalogItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-905">Add Stock Batch: {selectedCatalogItem.brand}</h3>
              <button onClick={() => setShowAddBatchModal(false)} className="text-slate-400 hover:text-slate-655"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateNewBatch} className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Batch Number</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newBatch.batchNo} onChange={e => setNewBatch({ ...newBatch, batchNo: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Expiry Date</label>
                <input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newBatch.expiry} onChange={e => setNewBatch({ ...newBatch, expiry: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">MRP (per strip)</label>
                <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newBatch.mrp} onChange={e => setNewBatch({ ...newBatch, mrp: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Quantity (tablets)</label>
                <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newBatch.quantity} onChange={e => setNewBatch({ ...newBatch, quantity: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Supplier</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newBatch.supplier} onChange={e => setNewBatch({ ...newBatch, supplier: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Rack Location</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newBatch.rack} onChange={e => setNewBatch({ ...newBatch, rack: e.target.value })} />
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-50 flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">Add to Store Stock</button>
                <button type="button" onClick={() => setShowAddBatchModal(false)} className="flex-1 py-2 border border-slate-250 rounded-xl font-bold text-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CREATE NEW MEDICINE MODAL ================= */}
      {showNewMedicineModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-905">Request New Global Medicine</h3>
              <button onClick={() => setShowNewMedicineModal(false)} className="text-slate-400 hover:text-slate-655"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateNewMedicine} className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Brand Name</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newMedicine.brand} onChange={e => setNewMedicine({ ...newMedicine, brand: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Salt Name</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newMedicine.salt} onChange={e => setNewMedicine({ ...newMedicine, salt: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Generic Name</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newMedicine.name} onChange={e => setNewMedicine({ ...newMedicine, name: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Strength (e.g. 500mg)</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newMedicine.strength} onChange={e => setNewMedicine({ ...newMedicine, strength: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Barcode</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newMedicine.barcode} onChange={e => setNewMedicine({ ...newMedicine, barcode: e.target.value })} />
              </div>
              <div>
                <label className="text-slate-400 font-bold block mb-1">Strip Size (e.g. 10)</label>
                <input required type="number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2" value={newMedicine.stripSize} onChange={e => setNewMedicine({ ...newMedicine, stripSize: e.target.value })} />
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-50 flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">Request Master Addition</button>
                <button type="button" onClick={() => setShowNewMedicineModal(false)} className="flex-1 py-2 border border-slate-250 rounded-xl font-bold text-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
           ADD MEDICINE TO ORDER MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showAddMedToOrderModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(6px)', background: 'rgba(15,23,42,0.55)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowAddMedToOrderModal(false); }}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: '90vh', boxShadow: '0 32px 80px -8px rgba(0,0,0,0.28), 0 0 0 1px rgba(139,92,246,0.10)' }}
          >
            {/* ── MODAL HEADER ─────────────────────────────── */}
            <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-[17px] font-black text-slate-800 tracking-tight">Add Medicine to Order</h2>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                  Search and add additional medicines from your pharmacy inventory.
                </p>
              </div>
              <button
                onClick={() => setShowAddMedToOrderModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-slate-500 transition-colors ml-4 flex-shrink-0"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>

            {/* ── STICKY SEARCH BAR ────────────────────────── */}
            <div className="px-6 py-3 bg-white border-b border-slate-100 sticky top-0 z-10">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={addMedSearchQuery}
                  onChange={e => setAddMedSearchQuery(e.target.value)}
                  placeholder="Search by brand name, generic name, salt, barcode, manufacturer…"
                  className="w-full pl-10 pr-4 py-2.5 text-[12.5px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 placeholder-slate-400 transition-all font-medium text-slate-700"
                />
                {addMedSearchQuery && (
                  <button
                    onClick={() => setAddMedSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              {/* Search hint chips */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {['Paracetamol', 'Amoxicillin', 'Azithromycin', 'Pantoprazole', 'Cetirizine'].map(hint => (
                  <button
                    key={hint}
                    onClick={() => setAddMedSearchQuery(hint)}
                    className="px-2 py-0.5 rounded-full bg-violet-50 border border-violet-100 text-[10px] font-bold text-violet-600 hover:bg-violet-100 transition-colors"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            </div>

            {/* ── MEDICINE LIST HEADER ─────────────────────── */}
            <div className="grid grid-cols-[1fr_80px_64px_64px_auto] items-center gap-2 px-6 py-2 bg-slate-50 border-b border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Medicine Name</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Stock</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">MRP</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rack</span>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Actions</span>
            </div>

            {/* ── SCROLLABLE MEDICINE LIST ─────────────────── */}
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              {/* Skeleton loading state */}
              {(isSearchingAddMed || (!addMedInitialLoad && showAddMedToOrderModal)) && (
                <div className="divide-y divide-slate-50">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-6 py-3.5 animate-pulse">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-slate-100 rounded-lg w-40" />
                        <div className="h-2.5 bg-slate-100 rounded-lg w-28" />
                      </div>
                      <div className="w-14 h-3 bg-slate-100 rounded-lg" />
                      <div className="w-10 h-3 bg-slate-100 rounded-lg" />
                      <div className="w-9 h-3 bg-slate-100 rounded-lg" />
                      <div className="flex gap-1.5">
                        <div className="w-20 h-7 bg-violet-50 rounded-lg" />
                        <div className="w-20 h-7 bg-violet-50 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!isSearchingAddMed && addMedInitialLoad && addMedResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
                    <Package size={28} className="text-violet-300" />
                  </div>
                  <p className="text-[13px] font-bold text-slate-700 mb-1">
                    No matching medicines found
                  </p>
                  <p className="text-[11px] text-slate-400 font-medium max-w-xs">
                    No matching medicines found in your pharmacy inventory.
                  </p>
                  <button
                    onClick={() => setAddMedSearchQuery('')}
                    className="mt-4 px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold transition-colors shadow-sm"
                  >
                    Search Again
                  </button>
                </div>
              )}

              {/* Medicine rows */}
              {!isSearchingAddMed && addMedResults.length > 0 && (
                <div className="divide-y divide-slate-50">
                  {addMedResults.map((med, idx) => {
                    const today = new Date();
                    const thirtyDays = new Date(); thirtyDays.setDate(today.getDate() + 30);

                    // Find oldest valid batch (FIFO)
                    const activeBatches = (med.batches || [])
                      .filter(b => {
                        if (b.status === 'Quarantined' || b.status === 'Recalled') return false;
                        const qty = b.availableStock ?? b.quantity ?? 0;
                        if (qty <= 0) return false;
                        if (!b.expiryDate) return true;
                        return new Date(b.expiryDate) >= today;
                      })
                      .sort((a, b) => new Date(a.expiryDate || 0) - new Date(b.expiryDate || 0));

                    const batch = activeBatches[0];
                    const totalStock = med.totalStock ?? activeBatches.reduce((s, b) => s + (b.availableStock ?? b.quantity ?? 0), 0);
                    const stripSize = med.stripSize || med.globalMedicineId?.stripSize || 10;
                    const mrp = batch?.sellingPrice || med.sellingPrice || 0;
                    const rack = med.rack || med.rackLocation || 'N/A';
                    const expiryDate = batch?.expiryDate ? new Date(batch.expiryDate) : null;
                    const isNearExpiry = expiryDate && expiryDate <= thirtyDays;
                    const isLowStock = totalStock > 0 && totalStock < (med.reorderLevel || 20);
                    const isOutOfStock = totalStock === 0;

                    // Medicine image fallback
                    const dosageForm = (med.dosageForm || med.globalMedicineId?.form || 'Tablet').toLowerCase();
                    const medColor = [
                      'bg-violet-100 text-violet-600',
                      'bg-blue-100 text-blue-600',
                      'bg-emerald-100 text-emerald-600',
                      'bg-amber-100 text-amber-600',
                      'bg-rose-100 text-rose-600',
                      'bg-cyan-100 text-cyan-600',
                    ][idx % 6];

                    return (
                      <div
                        key={med._id || med.id || idx}
                        className="flex items-center gap-3 px-6 py-3 hover:bg-violet-50/40 transition-colors group"
                      >
                        {/* Medicine icon */}
                        <div className={`w-10 h-10 rounded-xl ${medColor} flex items-center justify-center flex-shrink-0 font-black text-[11px]`}>
                          <Pill size={16} />
                        </div>

                        {/* Medicine info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[12.5px] font-extrabold text-slate-800 leading-tight truncate">
                              {med.brandName || med.brand || med.name || 'Unknown'}
                            </span>
                            {/* Expiry / Low stock badges */}
                            {isNearExpiry && (
                              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-wide flex-shrink-0">Near Expiry</span>
                            )}
                            {isLowStock && !isNearExpiry && (
                              <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[9px] font-black uppercase tracking-wide flex-shrink-0">Low Stock</span>
                            )}
                          </div>
                          <p className="text-[10.5px] text-slate-500 font-medium truncate mt-0.5">
                            {med.genericName || med.globalMedicineId?.salt || '—'}
                            {(med.strength || med.globalMedicineId?.strength) && (
                              <span className="text-slate-400 ml-1">{med.strength || med.globalMedicineId?.strength}</span>
                            )}
                            {' · '}
                            <span className="capitalize">{dosageForm}</span>
                            {' · Strip of '}{stripSize}
                          </p>
                        </div>

                        {/* Stock */}
                        <div className="w-20 flex-shrink-0 text-center">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-lg bg-red-50 text-red-500 text-[9.5px] font-black uppercase">Out of Stock</span>
                          ) : (
                            <div>
                              <p className="text-[12px] font-black text-slate-800">{totalStock}</p>
                              <p className="text-[9px] text-slate-400 font-medium capitalize">{dosageForm}s</p>
                            </div>
                          )}
                        </div>

                        {/* MRP */}
                        <div className="w-16 flex-shrink-0 text-center">
                          <p className="text-[12px] font-black text-slate-800">₹{mrp}</p>
                          <p className="text-[9px] text-slate-400 font-medium">/{stripSize} tabs</p>
                        </div>

                        {/* Rack */}
                        <div className="w-12 flex-shrink-0 text-center">
                          <span className="inline-block px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">{rack}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            disabled={isOutOfStock}
                            onClick={() => {
                              handleAddToCart(med, false, 1);
                              toast.success(`1 strip of ${med.brandName || med.name} added!`);
                            }}
                            title={`Add 1 strip (${stripSize} tablets)`}
                            className="px-3 py-1.5 rounded-lg border border-violet-300 bg-white hover:bg-violet-600 hover:text-white hover:border-violet-600 text-violet-700 text-[10.5px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-violet-700 whitespace-nowrap shadow-sm"
                          >
                            + Strip
                          </button>
                          <button
                            disabled={isOutOfStock}
                            onClick={() => {
                              handleAddToCart(med, true, 1);
                              toast.success(`1 tablet of ${med.brandName || med.name} added!`);
                            }}
                            title="Add 1 individual tablet"
                            className="px-3 py-1.5 rounded-lg border border-violet-300 bg-white hover:bg-violet-600 hover:text-white hover:border-violet-600 text-violet-700 text-[10.5px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-violet-700 whitespace-nowrap shadow-sm"
                          >
                            + Tablet
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── MODAL FOOTER ─────────────────────────────── */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10.5px] text-slate-400 font-medium">
                {addMedResults.length > 0
                  ? `Showing ${addMedResults.length} medicine${addMedResults.length !== 1 ? 's' : ''} from your inventory`
                  : 'Type to search your pharmacy inventory'}
              </p>
              <button
                onClick={() => setShowAddMedToOrderModal(false)}
                className="px-5 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-[12px] font-bold hover:bg-slate-100 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const RotateCcwIcon = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

export default PharmacyWorkspace;
