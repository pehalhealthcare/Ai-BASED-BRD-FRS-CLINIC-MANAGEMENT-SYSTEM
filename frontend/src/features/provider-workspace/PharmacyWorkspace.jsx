import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import {
  TrendingUp, Pill, ShoppingBag, Users, AlertTriangle,
  Search, Scan, RefreshCw, Barcode, Plus, Minus, Trash2,
  CreditCard, CheckCircle2, ChevronRight, Ban, Eye, FileText,
  Printer, ArrowLeftRight, Activity, ArrowUpRight, DollarSign, Calendar,
  ChevronDown, Bell, LogOut, MessageSquare, ShieldAlert, Package,
  Layers, Truck, FileBarChart, Settings, HelpCircle, Star, X, Clock, Check, ArrowRight, UserPlus, Menu
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { TfiAngleRight } from "react-icons/tfi";
import { TfiAngleLeft } from "react-icons/tfi";

const PharmacyWorkspace = ({ user }) => {
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

  // --- MOCK DATABASE STATE ---
  const [globalCatalog, setGlobalCatalog] = useState([
    { id: '1', name: 'Paracetamol', brand: 'Crocin 650mg', salt: 'Paracetamol', strength: '650mg', form: 'Tablet', manufacturer: 'GSK', stripSize: 10, stripPrice: 40, unitPrice: 4, barcode: '8901234567890', sku: 'MED-PAR-650', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=120&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { id: '2', name: 'Amoxicillin', brand: 'Azithral 500mg', salt: 'Amoxicillin', strength: '500mg', form: 'Capsule', manufacturer: 'Sun Pharma', stripSize: 15, stripPrice: 150, unitPrice: 10, barcode: '8901234567891', sku: 'MED-AMO-500', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=120&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { id: '3', name: 'Atorvastatin', brand: 'Lipvas 10', salt: 'Atorvastatin', strength: '10mg', form: 'Tablet', manufacturer: 'Cipla', stripSize: 10, stripPrice: 120, unitPrice: 12, barcode: '8901234567892', sku: 'MED-ATO-10', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=120&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { id: '4', name: 'Metformin', brand: 'Glycomet 500', salt: 'Metformin', strength: '500mg', form: 'Tablet', manufacturer: 'USV', stripSize: 15, stripPrice: 45, unitPrice: 3, barcode: '8901234567893', sku: 'MED-MET-500', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=120&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' },
    { id: '5', name: 'Pantoprazole', brand: 'Pan 40', salt: 'Pantoprazole', strength: '40mg', form: 'Tablet', manufacturer: 'Alkem', stripSize: 15, stripPrice: 140, unitPrice: 9.3, barcode: '8901234567894', sku: 'MED-PAN-40', image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=120&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' }
  ]);

  const [inventory, setInventory] = useState([
    {
      id: 'inv_1', catalogId: '1', name: 'Paracetamol', brand: 'Crocin 650mg', minStock: 20, reorderLevel: 50, rack: 'Rack A-3', condition: 'Cool & Dry', totalStock: 120, batches: [
        { id: 'b1', batchNo: 'B-PR2026', expiry: '2027-08-31', mfg: '2025-08-01', supplier: 'Zydus Corp', gst: 12, mrp: 40, ptr: 28, purchasePrice: 25, quantity: 80 },
        { id: 'b2', batchNo: 'B-PR2025', expiry: '2026-06-30', mfg: '2024-06-01', supplier: 'Zydus Corp', gst: 12, mrp: 40, ptr: 28, purchasePrice: 25, quantity: 40 }
      ]
    },
    {
      id: 'inv_2', catalogId: '2', name: 'Amoxicillin', brand: 'Azithral 500mg', minStock: 10, reorderLevel: 25, rack: 'Rack B-1', condition: 'Below 25°C', totalStock: 15, batches: [
        { id: 'b3', batchNo: 'B-AMX99', expiry: '2026-08-31', mfg: '2024-08-01', supplier: 'Cipla Wholesalers', gst: 12, mrp: 150, ptr: 110, purchasePrice: 100, quantity: 15 }
      ]
    },
    { id: 'inv_3', catalogId: '3', name: 'Atorvastatin', brand: 'Lipvas 10', minStock: 30, reorderLevel: 60, rack: 'Cabinet 2', condition: 'Cool & Dry', totalStock: 0, batches: [] }
  ]);

  const [prescriptions, setPrescriptions] = useState([
    {
      id: 'RX-9901', appointmentId: 'APT-1002', patientName: 'Amit Sharma', phone: '9876543210', doctor: 'Dr. Shalini Mehta', diagnosis: 'Acute Fever & Cough', date: '2026-07-19', status: 'Pending', medicines: [
        { name: 'Paracetamol', brand: 'Crocin 650mg', dosage: '1 Tablet twice daily', duration: '10 Days', quantityRequired: 20 },
        { name: 'Amoxicillin', brand: 'Azithral 500mg', dosage: '1 Capsule thrice daily', duration: '5 Days', quantityRequired: 15 }
      ]
    },
    {
      id: 'RX-9902', appointmentId: 'APT-1003', patientName: 'Rohan Sharma', phone: '9888877777', doctor: 'Dr. Sameer Goel', diagnosis: 'Hypertension', date: '2026-07-19', status: 'Pending', medicines: [
        { name: 'Atorvastatin', brand: 'Lipvas 10', dosage: '1 Tablet daily', duration: '30 Days', quantityRequired: 30 }
      ]
    }
  ]);

  const [sales, setSales] = useState([
    { id: 'INV-8821', token: 'T-101', date: '2026-07-19', patientName: 'Karan Johar', type: 'Walk-in', amount: 320, paymentMode: 'UPI', status: 'Completed', handoverStatus: 'Waiting', waitTime: '12 mins', queuePos: 4, estFinish: '14:55' },
    { id: 'INV-8822', token: 'T-102', date: '2026-07-19', patientName: 'Rohan Sharma', type: 'Prescription', amount: 230, paymentMode: 'Cash', status: 'Completed', handoverStatus: 'Preparing', waitTime: '8 mins', queuePos: 2, estFinish: '14:50' },
    { id: 'INV-8823', token: 'T-103', date: '2026-07-19', patientName: 'Neha Verma', type: 'Walk-in', amount: 480, paymentMode: 'UPI', status: 'Completed', handoverStatus: 'Waiting', waitTime: '12 mins', queuePos: 1, estFinish: '14:48' },
    { id: 'INV-8824', token: 'T-104', date: '2026-07-19', patientName: 'Amit Kumar', type: 'Prescription', amount: 690, paymentMode: 'UPI', status: 'Completed', handoverStatus: 'Preparing', waitTime: '15 mins', queuePos: 3, estFinish: '14:52' },
    { id: 'INV-8825', token: 'T-105', date: '2026-07-19', patientName: 'Pooja Singh', type: 'Walk-in', amount: 120, paymentMode: 'Cash', status: 'Completed', handoverStatus: 'Waiting', waitTime: '18 mins', queuePos: 5, estFinish: '15:02' },
    { id: 'INV-8826', token: 'T-106', date: '2026-07-19', patientName: 'Vivek Yadav', type: 'Prescription', amount: 1100, paymentMode: 'Card', status: 'Completed', handoverStatus: 'Ready', waitTime: '20 mins', queuePos: 0, estFinish: '14:42' }
  ]);

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
  const [newMedicine, setNewMedicine] = useState({ name: '', brand: '', salt: '', strength: '', form: 'Tablet', stripSize: 10, mrp: 50, barcode: '', sku: '' });
  const [scanning, setScanning] = useState(false);

  // Floating Patient Search Widget
  const [showFloatingSearch, setShowFloatingSearch] = useState(false);
  const [floatingSearchText, setFloatingSearchText] = useState('');

  // Interactive Chart Toggles
  const [salesTimeframe, setSalesTimeframe] = useState('Monthly');
  const [notes, setNotes] = useState('');
  const [patientConsoleSearch, setPatientConsoleSearch] = useState('');
  const [selectedConsolePatient, setSelectedConsolePatient] = useState(null);
  const [activeConsoleRx, setActiveConsoleRx] = useState(null);
  const [selectedDetailCatalogItem, setSelectedDetailCatalogItem] = useState(null);
  const [showRequestNewMedicineModal, setShowRequestNewMedicineModal] = useState(false);

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

  const handleAddToCart = (item, isTablet = false, customQty = 1) => {
    const invItem = inventory.find(i => i.catalogId === item.id);
    if (!invItem || invItem.totalStock === 0) {
      toast.error(`${item.brand} is currently Out of Stock in local inventory.`);
      return;
    }

    const sortedBatches = [...invItem.batches].sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
    const activeBatch = sortedBatches.find(b => b.quantity > 0);

    if (!activeBatch) {
      toast.error(`No active non-expired batch found for ${item.brand}.`);
      return;
    }

    const existingCartItem = cart.find(c => c.itemId === item.id && c.batchId === activeBatch.id);

    if (existingCartItem) {
      setCart(cart.map(c => {
        if (c.itemId === item.id && c.batchId === activeBatch.id) {
          const nextStrips = isTablet ? c.strips : c.strips + customQty;
          const nextTablets = isTablet ? c.tablets + customQty : c.tablets;
          const totalRequestedQty = (nextStrips * item.stripSize) + nextTablets;

          if (totalRequestedQty > activeBatch.quantity) {
            toast.error(`Cannot add more. Available batch stock: ${activeBatch.quantity} tablets.`);
            return c;
          }
          return { ...c, strips: nextStrips, tablets: nextTablets };
        }
        return c;
      }));
    } else {
      const initStrips = isTablet ? 0 : customQty;
      const initTablets = isTablet ? customQty : 0;
      setCart([...cart, {
        id: Math.random().toString(),
        itemId: item.id,
        name: item.name,
        brand: item.brand,
        stripSize: item.stripSize,
        batchId: activeBatch.id,
        batchNo: activeBatch.batchNo,
        expiry: activeBatch.expiry,
        mrp: activeBatch.mrp,
        unitPrice: item.unitPrice,
        strips: initStrips,
        tablets: initTablets,
        gst: activeBatch.gst
      }]);
    }
    toast.success(`${item.brand} added to checkout cart.`);
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

  const handleCreateNewBatch = (e) => {
    e.preventDefault();
    if (!selectedCatalogItem) return;

    const matchedInv = inventory.find(i => i.catalogId === selectedCatalogItem.id);
    const totalQty = parseInt(newBatch.quantity) || 0;

    const newBatchRecord = {
      id: Math.random().toString(),
      batchNo: newBatch.batchNo,
      expiry: newBatch.expiry,
      mfg: newBatch.mfg,
      supplier: newBatch.supplier,
      gst: parseFloat(newBatch.gst),
      mrp: parseFloat(newBatch.mrp),
      ptr: parseFloat(newBatch.ptr),
      purchasePrice: parseFloat(newBatch.purchasePrice),
      quantity: totalQty
    };

    if (matchedInv) {
      setInventory(inventory.map(item => {
        if (item.catalogId === selectedCatalogItem.id) {
          return {
            ...item,
            totalStock: item.totalStock + totalQty,
            batches: [...item.batches, newBatchRecord]
          };
        }
        return item;
      }));
    } else {
      setInventory([...inventory, {
        id: Math.random().toString(),
        catalogId: selectedCatalogItem.id,
        name: selectedCatalogItem.name,
        brand: selectedCatalogItem.brand,
        minStock: parseInt(newBatch.minStock) || 20,
        reorderLevel: parseInt(newBatch.reorderLevel) || 50,
        rack: newBatch.rack,
        condition: newBatch.condition,
        totalStock: totalQty,
        batches: [newBatchRecord]
      }]);
    }

    setActivities([
      {
        id: Date.now(),
        type: 'Stock Purchase',
        desc: `Stock inward logged for ${selectedCatalogItem.brand} (Qty: ${totalQty})`,
        time: 'Just now',
        icon: 'stock'
      },
      ...activities
    ]);

    toast.success(`Purchase Batch ${newBatch.batchNo} logged successfully.`);
    setShowAddBatchModal(false);
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
      const cartItemsForThisInv = cart.filter(c => c.itemId === invItem.catalogId);
      if (cartItemsForThisInv.length === 0) return invItem;

      let updatedBatches = invItem.batches.map(b => {
        const cartMatch = cartItemsForThisInv.find(c => c.batchId === b.id);
        if (!cartMatch) return b;

        const totalToDeduct = (cartMatch.strips * cartMatch.stripSize) + cartMatch.tablets;
        return {
          ...b,
          quantity: Math.max(0, b.quantity - totalToDeduct)
        };
      });

      return {
        ...invItem,
        batches: updatedBatches,
        totalStock: updatedBatches.reduce((acc, b) => acc + b.quantity, 0)
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
  const filteredCatalog = useMemo(() => {
    if (!searchTerm) return [];
    const q = searchTerm.toLowerCase();
    return globalCatalog.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.brand.toLowerCase().includes(q) ||
      m.salt.toLowerCase().includes(q) ||
      m.barcode.includes(q)
    );
  }, [searchTerm, globalCatalog]);

  const matchedPrescriptions = useMemo(() => {
    if (!rxSearchTerm) return prescriptions;
    const q = rxSearchTerm.toLowerCase();
    return prescriptions.filter(rx =>
      rx.patientName.toLowerCase().includes(q) ||
      rx.phone.includes(q) ||
      rx.id.toLowerCase().includes(q)
    );
  }, [rxSearchTerm, prescriptions]);

  const filteredLocalInventory = useMemo(() => {
    if (!walkinSearchTerm) return inventory;
    const q = walkinSearchTerm.toLowerCase();
    return inventory.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q)
    );
  }, [walkinSearchTerm, inventory]);

  const globalSearchResults = useMemo(() => {
    if (!globalSearchQuery) return null;
    const q = globalSearchQuery.toLowerCase();

    const matchedPats = prescriptions.filter(p => p.patientName.toLowerCase().includes(q) || p.phone.includes(q));
    const matchedMeds = inventory.filter(m => m.brand.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
    const matchedInvs = sales.filter(s => s.id.toLowerCase().includes(q) || s.token.toLowerCase().includes(q) || s.patientName.toLowerCase().includes(q));
    const matchedBatches = [];
    inventory.forEach(i => i.batches.forEach(b => {
      if (b.batchNo.toLowerCase().includes(q)) {
        matchedBatches.push({ ...b, medBrand: i.brand });
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
              <ChevronDown size={14} className={`transition-transform duration-200 ${inventoryCollapsed ? 'rotate-180' : ''}`} />
            </button>

            {!inventoryCollapsed && (
              <div className="pl-6 pr-2 space-y-1.5">
                <button onClick={() => setActiveTab('inventory')} className={`w-full text-left py-1.5 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-2 ${tab === 'inventory' ? 'text-blue-500 bg-blue-500/10' : 'text-slate-500 hover:text-white'}`}>
                  <span>•</span> Stock List
                </button>
                <button onClick={() => { setActiveTab('catalogue'); }} className={`w-full text-left py-1.5 px-3 rounded-lg text-[11px] font-semibold flex items-center gap-2 ${tab === 'catalogue' ? 'text-blue-500 bg-blue-500/10' : 'text-slate-500 hover:text-white'}`}>
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
            onClick={() => { setActiveTab('catalogue'); toast.success('Open stock purchases catalog.'); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 hover:text-white text-slate-400 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Truck size={16} />
              <span>Purchase &amp; Stock Inward</span>
            </div>
          </button>

          <button
            onClick={() => { toast.success('Supplier registry loaded.'); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 hover:text-white text-slate-400 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Users size={16} />
              <span>Suppliers</span>
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('inventory'); toast.success('Expiry list highlighted.'); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 hover:text-white text-slate-400 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <ShieldAlert size={16} />
              <span>Expiry &amp; Batch Management</span>
            </div>
          </button>

          <button
            onClick={() => { toast.success('Stock transfer process loaded.'); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 hover:text-white text-slate-400 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <ArrowLeftRight size={16} />
              <span>Stock Transfer</span>
            </div>
          </button>

          <button
            onClick={() => { toast.success('Returns workflow active.'); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 hover:text-white text-slate-400 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <RotateCcwIcon size={16} />
              <span>Returns</span>
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('dashboard'); toast.success('Sales analysis metrics.'); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 hover:text-white text-slate-400 transition-all"
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
              <ChevronDown size={14} className={`transition-transform duration-200 ${reportsCollapsed ? 'rotate-180' : ''}`} />
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
            onClick={() => { toast.success('No unread system alerts.'); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 hover:text-white text-slate-400 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <Bell size={16} />
              <span>Notifications</span>
            </div>
            <span className="bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">7</span>
          </button>

          <button
            onClick={() => { toast.success('Workspace settings loaded.'); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 hover:text-white text-slate-400 transition-all"
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
            <button className="relative p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-655 transition">
              <Bell size={18} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white"></span>
            </button>

            {/* Profile widget */}
            <div className="flex items-center gap-2.5 pl-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center border border-slate-100">
                PS
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-855 leading-none">Pharmacy Staff</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Pharmacist</p>
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
                        strokeDasharray="251.5 377"
                        strokeDashoffset="0"
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
                        strokeDasharray="78.4 377"
                        strokeDashoffset="-251.5"
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
                        strokeDasharray="47.1 377"
                        strokeDashoffset="-329.9"
                        className="cursor-pointer hover:stroke-[20px] transition-all"
                        onClick={() => { setSelectedQueueFilter('Waiting'); toast.success('Filtering pending waiting tokens.'); }}
                      />
                    </svg>

                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-xl font-black text-slate-900">{sales.length}</span>
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
                      <span className="font-extrabold text-slate-800">32 (66.7%)</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span className="text-slate-600 font-semibold">Walk-in Sales</span>
                      </div>
                      <span className="font-extrabold text-slate-800">10 (20.8%)</span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        <span className="text-slate-600 font-semibold">Pending Orders</span>
                      </div>
                      <span className="font-extrabold text-slate-800">6 (12.5%)</span>
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
                      <h4 className="text-sm font-black text-slate-900 mt-0.5">₹4,50,250.00</h4>
                      <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-full">+22.5% MoM</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Net Profit</p>
                      <h4 className="text-sm font-black text-slate-900 mt-0.5">₹1,32,075.00</h4>
                      <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-full">+18.2%</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Average Basket Value</p>
                      <h4 className="text-sm font-black text-slate-900 mt-0.5">₹345.00</h4>
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

                      <path
                        d="M0,100 C50,85 100,92 150,60 C200,30 250,75 300,50 C350,20 400,65 450,40 C500,20 550,55 600,30 L600,120 L0,120 Z"
                        fill="url(#chart-grad)"
                      />

                      <path
                        d="M0,100 C50,85 100,92 150,60 C200,30 250,75 300,50 C350,20 400,65 450,40 C500,20 550,55 600,30"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />

                      <circle cx="150" cy="60" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" className="cursor-pointer hover:r-7 transition-all" />
                      <circle cx="300" cy="50" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" className="cursor-pointer hover:r-7 transition-all" />
                      <circle cx="450" cy="40" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" className="cursor-pointer hover:r-7 transition-all" />
                      <circle cx="600" cy="30" r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" className="cursor-pointer hover:r-7 transition-all" />
                    </svg>

                    <div className="flex justify-between text-[9px] text-slate-400 font-bold pt-2">
                      <span>1 May</span>
                      <span>5 May</span>
                      <span>10 May</span>
                      <span>15 May</span>
                      <span>20 May</span>
                      <span>25 May</span>
                      <span>30 May</span>
                    </div>

                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-xl px-2.5 py-1.5 text-[10px] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none text-center">
                      <p className="font-bold text-blue-400">15 May Performance</p>
                      <p className="font-black text-xs mt-0.5">₹15,450.00 Sales</p>
                      <p className="text-[8px] text-slate-300">Profit: ₹4,635 | Basket: ₹325</p>
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
                      <h4 className="text-lg font-black text-slate-800 mt-0.5">1,245</h4>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                      <span className="text-[10px] font-bold text-slate-400 block">Reserved Medicines</span>
                      <h4 className="text-lg font-black text-blue-600 mt-0.5">32 strips</h4>
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
                    <span className="text-slate-800 font-black">{inventory.reduce((acc, i) => acc + i.batches.length, 0)} batches</span>
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
                  <span className="text-sm font-black text-slate-800 mt-1 block">1,245</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Batches</span>
                  <span className="text-sm font-black text-slate-800 mt-1 block">568</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Expiring (30 days)</span>
                  <span className="text-sm font-black text-amber-500 mt-1 block">12</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Suppliers</span>
                  <span className="text-sm font-black text-slate-800 mt-1 block">45</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Inventory Value</span>
                  <span className="text-sm font-black text-blue-600 mt-1 block">₹2.45L</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-xs">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Categories</span>
                  <span className="text-sm font-black text-slate-800 mt-1 block">18</span>
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
                              // Auto populate cart with suggestions
                              const newCart = rx.medicines.map(m => {
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
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {selectedRx.medicines.map((med, index) => {
                                const matchedCat = globalCatalog.find(c => c.brand.toLowerCase().includes(med.brand.toLowerCase()) || c.name.toLowerCase() === med.name.toLowerCase());
                                const matchedInv = matchedCat ? inventory.find(i => i.catalogId === matchedCat.id) : null;
                                const stock = matchedInv?.totalStock || 0;

                                const stripSize = matchedCat?.stripSize || 10;
                                const suggestions = calculateRequiredStrips(med.dosage, med.duration, stripSize);
                                const cartItem = cart.find(c => c.brand === med.brand);

                                return (
                                  <tr key={index} className="hover:bg-slate-50/30 transition-colors">
                                    <td className="py-3 px-1 font-extrabold text-slate-905">
                                      <p>{med.brand}</p>
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
                                          className="w-5 h-5 bg-slate-100 hover:bg-slate-200 rounded flex items-center justify-center font-bold text-slate-600"
                                        >
                                          -
                                        </button>
                                        <span className="text-[10px] font-black w-6 text-center">{cartItem?.strips || 0}</span>
                                        <button 
                                          onClick={() => {
                                            if (cartItem) handleUpdateCartQty(cartItem.id, 'strips', 1);
                                          }}
                                          className="w-5 h-5 bg-blue-50 hover:bg-blue-100 rounded flex items-center justify-center font-bold text-blue-600"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </td>
                                    <td className="py-3 px-1 text-right font-black text-slate-900">
                                      ₹{cartItem ? (cartItem.strips * cartItem.mrp) + (cartItem.tablets * cartItem.unitPrice) : 0}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Add extra medicines link */}
                        <div className="pt-2">
                          <button 
                            onClick={() => { setActiveTab('walk-in'); toast.success('Search walk-in inventory to add items.'); }}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            + Add Medicine to Order
                          </button>
                        </div>
                      </div>

                      {/* Pricing Summary Block */}
                      <div className="bg-slate-50/60 border border-slate-100 rounded-3xl p-5 flex justify-between items-center gap-4">
                        <div className="grid grid-cols-3 gap-x-6 gap-y-1.5 text-[10px] font-extrabold text-slate-500">
                          <div>Items: <span className="text-slate-800">{cart.length}</span></div>
                          <div>Total Qty: <span className="text-slate-800">
                            {cart.reduce((acc, curr) => acc + (curr.strips * curr.stripSize) + curr.tablets, 0)}
                          </span></div>
                          <div>MRP Total: <span className="text-slate-800">
                            ₹{cart.reduce((acc, curr) => acc + (curr.strips * curr.mrp), 0).toFixed(2)}
                          </span></div>
                          <div>Discount: <span className="text-emerald-600">₹0.00</span></div>
                          <div>GST (12%): <span className="text-slate-800">
                            ₹{(cart.reduce((acc, curr) => acc + (curr.strips * curr.mrp), 0) * 0.12).toFixed(2)}
                          </span></div>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Payable Amount</p>
                          <p className="text-2xl font-black text-emerald-600">
                            ₹{(cart.reduce((acc, curr) => acc + (curr.strips * curr.mrp), 0) * 1.12).toFixed(2)}
                          </p>
                        </div>
                      </div>

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
                        const matchedCat = globalCatalog.find(c => c.id === item.catalogId);
                        const isLowStock = item.totalStock <= item.reorderLevel;
                        return (
                          <div 
                            key={item.id}
                            className="p-4 bg-white border border-slate-100 hover:border-slate-250 hover:bg-slate-50/20 rounded-2xl flex flex-col justify-between gap-3 shadow-xs hover:shadow-sm transition-all"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h4 className="font-extrabold text-slate-905 text-xs">{item.brand}</h4>
                                <p className="text-[10px] text-slate-405 font-bold mt-0.5">{item.name} · {matchedCat?.strength || '650mg'}</p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <span className="text-[8px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">Rack: {item.rack}</span>
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                    isLowStock ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                                  }`}>
                                    {isLowStock ? `Low Stock: ${item.totalStock}` : `In Stock: ${item.totalStock}`}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-black text-slate-900">₹{matchedCat?.stripPrice || 40}</p>
                                <p className="text-[8px] text-slate-400 font-semibold mt-0.5">Strip of {matchedCat?.stripSize || 10}</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-2 border-t border-slate-50 pt-2.5">
                              <button
                                onClick={() => {
                                  if (matchedCat) handleAddToCart(matchedCat, false, 1);
                                }}
                                className="flex-1 text-center py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-650 rounded-xl text-[10px] font-extrabold transition-all"
                              >
                                + Add Strip
                              </button>
                              <button
                                onClick={() => {
                                  if (matchedCat) handleAddToCart(matchedCat, true, 1);
                                }}
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
                              const matchedCat = globalCatalog.find(c => c.brand.toLowerCase().includes(med.brand.toLowerCase()));
                              const matchedInv = matchedCat ? inventory.find(i => i.catalogId === matchedCat.id) : null;
                              const stock = matchedInv?.totalStock || 0;

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
                                    <span className="font-black text-slate-900">₹{matchedCat?.stripPrice || 40}</span>
                                    <button
                                      onClick={() => {
                                        if (matchedCat) {
                                          handleAddToCart(matchedCat, false, 1);
                                          toast.success(`${med.brand} added to Order Cart.`);
                                        } else {
                                          toast.error('Item master record unavailable.');
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
                                        setSelectedCatalogItem(item);
                                        setShowAddBatchModal(true);
                                      }}
                                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-650 rounded-lg text-[9px] font-black transition"
                                    >
                                      + Add Stock
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
                        setSelectedCatalogItem(selectedDetailCatalogItem);
                        setSelectedDetailCatalogItem(null);
                        setShowAddBatchModal(true);
                      }}
                      className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-black text-center"
                    >
                      + Add to Inventory
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

            </div>
          )}

          {/* ================= TAB 5: ACTIVE INVENTORY LIST ================= */}
          {tab === 'inventory' && (
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-905">Active Inventory Store</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Local pharmacy stock ledger list</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-2">Brand / Name</th>
                      <th className="py-3 px-2">Current Stock</th>
                      <th className="py-3 px-2">Reorder Level</th>
                      <th className="py-3 px-2">Rack Location</th>
                      <th className="py-3 px-2">Storage Condition</th>
                      <th className="py-3 px-2">Active Batches</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {inventory.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-2">
                          <p className="font-extrabold text-slate-905">{item.brand}</p>
                          <p className="text-[10px] text-slate-400">{item.name}</p>
                        </td>
                        <td className="py-3.5 px-2">
                          <span className={`font-black ${item.totalStock <= item.reorderLevel ? 'text-amber-600' : 'text-slate-900'}`}>
                            {item.totalStock} tabs
                          </span>
                        </td>
                        <td className="py-3.5 px-2 font-bold text-slate-505">{item.reorderLevel} tabs</td>
                        <td className="py-3.5 px-2 font-semibold text-slate-600">{item.rack}</td>
                        <td className="py-3.5 px-2 text-slate-505">{item.condition}</td>
                        <td className="py-3.5 px-2">
                          <div className="flex flex-col gap-1">
                            {item.batches.map(b => (
                              <span key={b.id} className="text-[9px] font-bold text-slate-655 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">
                                {b.batchNo} (Exp: {b.expiry}) - {b.quantity} tabs
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
                    <p className="text-xs font-black text-slate-900">₹{revenue}</p>
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
