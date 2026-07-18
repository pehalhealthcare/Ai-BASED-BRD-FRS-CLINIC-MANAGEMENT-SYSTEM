import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, Pill, ShoppingBag, Users, AlertTriangle, 
  Search, Scan, RefreshCw, Barcode, Plus, Minus, Trash2, 
  CreditCard, CheckCircle2, ChevronRight, Ban, Eye, FileText, 
  Printer, ArrowLeftRight, Activity, ArrowUpRight, DollarSign, Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

const PharmacyWorkspace = ({ tab, user }) => {
  // --- MOCK DATABASE STATE ---
  const [globalCatalog, setGlobalCatalog] = useState([
    { id: '1', name: 'Paracetamol', brand: 'Crocin', salt: 'Paracetamol', strength: '650mg', form: 'Tablet', manufacturer: 'GSK', stripSize: 10, stripPrice: 40, unitPrice: 4, barcode: '8901234567890', sku: 'MED-PAR-650' },
    { id: '2', name: 'Amoxicillin', brand: 'Mox 500', salt: 'Amoxicillin', strength: '500mg', form: 'Capsule', manufacturer: 'Sun Pharma', stripSize: 15, stripPrice: 150, unitPrice: 10, barcode: '8901234567891', sku: 'MED-AMO-500' },
    { id: '3', name: 'Atorvastatin', brand: 'Lipvas 10', salt: 'Atorvastatin', strength: '10mg', form: 'Tablet', manufacturer: 'Cipla', stripSize: 10, stripPrice: 120, unitPrice: 12, barcode: '8901234567892', sku: 'MED-ATO-10' },
    { id: '4', name: 'Metformin', brand: 'Glycomet 500', salt: 'Metformin', strength: '500mg', form: 'Tablet', manufacturer: 'USV', stripSize: 15, stripPrice: 45, unitPrice: 3, barcode: '8901234567893', sku: 'MED-MET-500' },
    { id: '5', name: 'Pantoprazole', brand: 'Pan 40', salt: 'Pantoprazole', strength: '40mg', form: 'Tablet', manufacturer: 'Alkem', stripSize: 15, stripPrice: 140, unitPrice: 9.3, barcode: '8901234567894', sku: 'MED-PAN-40' }
  ]);

  const [inventory, setInventory] = useState([
    { id: 'inv_1', catalogId: '1', name: 'Paracetamol', brand: 'Crocin', minStock: 20, reorderLevel: 50, rack: 'Rack A-3', condition: 'Cool & Dry', totalStock: 120, batches: [
      { id: 'b1', batchNo: 'B-PR2026', expiry: '2027-08-31', mfg: '2025-08-01', supplier: 'Zydus Corp', gst: 12, mrp: 40, ptr: 28, purchasePrice: 25, quantity: 80 },
      { id: 'b2', batchNo: 'B-PR2025', expiry: '2026-06-30', mfg: '2024-06-01', supplier: 'Zydus Corp', gst: 12, mrp: 40, ptr: 28, purchasePrice: 25, quantity: 40 }
    ]},
    { id: 'inv_2', catalogId: '2', name: 'Amoxicillin', brand: 'Mox 500', minStock: 10, reorderLevel: 25, rack: 'Rack B-1', condition: 'Below 25°C', totalStock: 15, batches: [
      { id: 'b3', batchNo: 'B-AMX99', expiry: '2026-08-31', mfg: '2024-08-01', supplier: 'Cipla Wholesalers', gst: 12, mrp: 150, ptr: 110, purchasePrice: 100, quantity: 15 }
    ]},
    { id: 'inv_3', catalogId: '3', name: 'Atorvastatin', brand: 'Lipvas 10', minStock: 30, reorderLevel: 60, rack: 'Cabinet 2', condition: 'Cool & Dry', totalStock: 0, batches: [] }
  ]);

  const [prescriptions, setPrescriptions] = useState([
    { id: 'RX-9901', appointmentId: 'APT-1002', patientName: 'Amit Sharma', phone: '9876543210', doctor: 'Dr. Shalini Mehta', diagnosis: 'Acute Fever & Cough', date: '2026-07-19', status: 'Pending', medicines: [
      { name: 'Paracetamol', brand: 'Crocin', dosage: '1 Tablet twice daily', duration: '10 Days', quantityRequired: 20 },
      { name: 'Amoxicillin', brand: 'Mox 500', dosage: '1 Capsule thrice daily', duration: '5 Days', quantityRequired: 15 }
    ]}
  ]);

  const [sales, setSales] = useState([
    { id: 'INV-8821', token: 'T-101', date: '2026-07-19', patientName: 'Karan Johar', type: 'Walk-in', amount: 320, paymentMode: 'UPI', status: 'Completed', handoverStatus: 'Handed Over' },
    { id: 'INV-8822', token: 'T-102', date: '2026-07-19', patientName: 'Amit Sharma', type: 'Prescription', amount: 230, paymentMode: 'Cash', status: 'Completed', handoverStatus: 'Preparing' }
  ]);

  const [suppliers] = useState([
    { id: 's1', name: 'Zydus Corp', contact: 'Zydus Contact', phone: '9988776655', email: 'sales@zydus.com' },
    { id: 's2', name: 'Cipla Wholesalers', contact: 'Cipla Sales Manager', phone: '9988776644', email: 'sales@cipla.com' }
  ]);

  // --- STATE FOR INTERACTIVE FLOWS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [rxSearchTerm, setRxSearchTerm] = useState('');
  const [walkinSearchTerm, setWalkinSearchTerm] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedRx, setSelectedRx] = useState(null);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState(null);
  const [showNewMedicineModal, setShowNewMedicineModal] = useState(false);

  // New batch form state
  const [newBatch, setNewBatch] = useState({
    batchNo: '', expiry: '', mfg: '', supplier: 'Zydus Corp', gst: 12, mrp: 40, ptr: 28, purchasePrice: 25, quantity: 50, minStock: 20, reorderLevel: 50, rack: 'Rack A-3', condition: 'Cool & Dry'
  });

  // Walkin patient state
  const [walkinCustomer, setWalkinCustomer] = useState({ name: '', phone: '' });

  // New medicine form state
  const [newMedicine, setNewMedicine] = useState({ name: '', brand: '', salt: '', strength: '', form: 'Tablet', stripSize: 10, mrp: 50, barcode: '', sku: '' });

  // Scan simulation state
  const [scanning, setScanning] = useState(false);

  // --- KPI COMPUTATION ---
  const kpis = useMemo(() => {
    const todaySalesAmount = sales.reduce((acc, curr) => acc + curr.amount, 0);
    const lowStockCount = inventory.filter(item => item.totalStock <= item.reorderLevel && item.totalStock > 0).length;
    const outOfStockCount = inventory.filter(item => item.totalStock === 0).length;
    
    // expiry alerts counts (e.g. expired vs near-expiry)
    let expiredCount = 0;
    let nearExpiryCount = 0;
    const today = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    inventory.forEach(item => {
      item.batches.forEach(b => {
        const expDate = new Date(b.expiry);
        if (expDate <= today) expiredCount++;
        else if (expDate <= threeMonthsLater) nearExpiryCount++;
      });
    });

    const pendingTokens = sales.filter(s => ['Waiting', 'Preparing', 'Ready'].includes(s.handoverStatus)).length;

    return {
      todaySalesAmount,
      todayOrdersCount: sales.length,
      pendingTokens,
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
    // Basic parser for dosage e.g. "1 Tablet twice daily" -> 2 per day
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
    setTimeout(() => {
      // Simulate scanning Paracetamol
      const matched = globalCatalog.find(m => m.barcode === '8901234567890');
      if (matched) {
        toast.success(`Scanned: ${matched.brand} (${matched.name})`);
        handleAddToCart(matched);
      } else {
        toast.error('Scanned barcode not registered in Global Catalogue.');
      }
      setScanning(false);
    }, 1500);
  };

  const handleAddToCart = (item, isTablet = false, customQty = 1) => {
    const invItem = inventory.find(i => i.catalogId === item.id);
    if (!invItem || invItem.totalStock === 0) {
      toast.error(`${item.brand} is currently Out of Stock in local inventory.`);
      return;
    }

    // FIFO batch selection
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
      // Add batch to existing inventory item
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
      // Create new inventory mapping
      setInventory([...inventory, {
        id: Math.random().toString(),
        catalogId: selectedCatalogItem.id,
        name: selectedCatalogItem.name,
        brand: selectedCatalogItem.brand,
        minStock: parseInt(newBatch.minStock),
        reorderLevel: parseInt(newBatch.reorderLevel),
        rack: newBatch.rack,
        condition: newBatch.condition,
        totalStock: totalQty,
        batches: [newBatchRecord]
      }]);
    }

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
    toast.success(`"${newMedicine.brand}" submitted to Global Catalog. Status: Inactive (Pending Super Admin Approval).`);
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
      handoverStatus: 'Waiting'
    };

    // Deduct local stock using FIFO
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

    setCart([]);
    setSelectedRx(null);
    setWalkinCustomer({ name: '', phone: '' });
    toast.success(`Payment verified successfully! Token ${tokenNo} generated.`);
  };

  const handleUpdateHandover = (token, nextStatus) => {
    setSales(sales.map(s => s.token === token ? { ...s, handoverStatus: nextStatus } : s));
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

  return (
    <div className="space-y-6 bg-slate-50/50 p-1 min-h-screen pb-16">
      
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-905 tracking-tight flex items-center gap-2">
            <Pill className="text-purple-650" size={24} /> Pharmacy Provider Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-1">Operational Unit: Internal Pharmacy Store | Staff: {user?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBarcodeScan}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md ${
              scanning ? 'bg-amber-500 text-white animate-pulse' : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            <Barcode size={16} /> {scanning ? 'Scanning...' : 'Scan Barcode (Simulate)'}
          </button>
        </div>
      </div>

      {/* --- DASHBOARD TAB CONTENT --- */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* Live KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 bg-purple-50 text-purple-650 rounded-xl flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Live</span>
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Sales</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">₹{kpis.todaySalesAmount}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 bg-blue-50 text-blue-650 rounded-xl flex items-center justify-center">
                  <ShoppingBag size={16} />
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                  {kpis.todayOrdersCount} Total
                </span>
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Queue Tokens</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{kpis.pendingTokens}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <AlertTriangle size={16} />
                </div>
                {kpis.lowStockCount > 0 && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full animate-bounce">
                    Needs Purchase
                  </span>
                )}
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Low / Out of Stock</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {kpis.lowStockCount} <span className="text-sm font-semibold text-slate-400">/ {kpis.outOfStockCount} items</span>
                </h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 bg-purple-50 text-indigo-650 rounded-xl flex items-center justify-center">
                  <Activity size={16} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valuation (Cost Price)</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">₹{kpis.totalInventoryVal}</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Live Queue Board */}
            <div className="lg:col-span-2 bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2 flex items-center justify-between">
                <span>Pharmacy Token Dispatch Queue</span>
                <span className="text-xs text-slate-400">Handover Queue Board</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Preparing */}
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 space-y-3">
                  <h4 className="text-xs font-black text-amber-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span> Preparing
                  </h4>
                  <div className="space-y-2">
                    {sales.filter(s => s.handoverStatus === 'Preparing').map(s => (
                      <div key={s.id} className="bg-white p-2.5 rounded-xl shadow-xs border border-amber-100/50 flex justify-between items-center text-xs">
                        <span className="font-extrabold text-slate-900">{s.token}</span>
                        <span className="text-[10px] font-semibold text-slate-500">{s.patientName}</span>
                      </div>
                    ))}
                    {sales.filter(s => s.handoverStatus === 'Preparing').length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center font-bold py-4">No tokens in prep</p>
                    )}
                  </div>
                </div>

                {/* Ready */}
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-3">
                  <h4 className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Ready to Collect
                  </h4>
                  <div className="space-y-2">
                    {sales.filter(s => s.handoverStatus === 'Ready' || s.handoverStatus === 'Waiting').map(s => (
                      <div key={s.id} className="bg-white p-2.5 rounded-xl shadow-xs border border-emerald-100/50 flex justify-between items-center text-xs">
                        <span className="font-extrabold text-emerald-900">{s.token}</span>
                        <button 
                          onClick={() => handleUpdateHandover(s.token, 'Handed Over')}
                          className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-bold"
                        >
                          Handover
                        </button>
                      </div>
                    ))}
                    {sales.filter(s => s.handoverStatus === 'Ready' || s.handoverStatus === 'Waiting').length === 0 && (
                      <p className="text-[10px] text-slate-400 text-center font-bold py-4">No tokens ready</p>
                    )}
                  </div>
                </div>

                {/* Handed Over */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                  <h4 className="text-xs font-black text-slate-700">Handed Over</h4>
                  <div className="space-y-2">
                    {sales.filter(s => s.handoverStatus === 'Handed Over').slice(0, 4).map(s => (
                      <div key={s.id} className="bg-white p-2.5 rounded-xl border border-slate-200/50 flex justify-between items-center text-xs opacity-75">
                        <span className="font-extrabold text-slate-800">{s.token}</span>
                        <span className="text-[9px] text-slate-400">Handed Over</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions / Alerts */}
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Inventory Warnings</h3>
              <div className="space-y-3 text-xs">
                {kpis.expiredCount > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-3">
                    <AlertTriangle size={16} />
                    <div>
                      <p className="font-extrabold">Expired Batches Detected</p>
                      <p className="text-[10px] text-red-500 mt-0.5">{kpis.expiredCount} batches must be removed & quarantined.</p>
                    </div>
                  </div>
                )}

                {kpis.nearExpiryCount > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl flex items-center gap-3">
                    <AlertTriangle size={16} />
                    <div>
                      <p className="font-extrabold">Near Expiry Warning</p>
                      <p className="text-[10px] text-amber-500 mt-0.5">{kpis.nearExpiryCount} batches expiring in 90 days. Run FIFO.</p>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl space-y-2">
                  <p className="font-extrabold">Shortcuts</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => navigate('/provider-workspace/pharmacy?tab=orders')} 
                      className="px-3 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold"
                    >
                      Fill Prescription
                    </button>
                    <button 
                      onClick={() => navigate('/provider-workspace/pharmacy?tab=walk-in')} 
                      className="px-3 py-1 bg-white border border-indigo-200 text-indigo-600 rounded text-[10px] font-bold"
                    >
                      Walk-in Sale
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PRESCRIPTION ORDERS TAB --- */}
      {tab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Orders queue list */}
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Prescription Orders Queue</h3>
            <div className="relative">
              <input 
                type="text"
                placeholder="Search patient, phone, RX ID..."
                value={rxSearchTerm}
                onChange={(e) => setRxSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs focus:outline-none"
              />
              <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
            </div>

            <div className="space-y-3">
              {matchedPrescriptions.map(rx => (
                <div 
                  key={rx.id} 
                  onClick={() => setSelectedRx(rx)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    selectedRx?.id === rx.id ? 'border-purple-600 bg-purple-50/30' : 'border-slate-100 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{rx.id}</span>
                    <span className={`text-[9px] font-bold uppercase ${rx.status === 'Completed' ? 'text-emerald-600' : 'text-amber-600'}`}>{rx.status}</span>
                  </div>
                  <h4 className="font-extrabold text-slate-905 mt-2">{rx.patientName}</h4>
                  <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1.5">
                    <span>{rx.doctor}</span>
                    <span>{rx.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active prescription fill console */}
          <div className="lg:col-span-2 space-y-6">
            {selectedRx ? (
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-6">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-905">Fill Prescription: {selectedRx.patientName}</h3>
                    <p className="text-[10px] text-slate-455 font-bold mt-1">{selectedRx.doctor} | Diagnosis: {selectedRx.diagnosis}</p>
                  </div>
                  <button 
                    onClick={() => { setSelectedRx(null); setCart([]); }}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Prescription medicine analysis & quantities suggestion */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Prescribed Items Analysis</h4>
                  
                  {selectedRx.medicines.map((med, index) => {
                    const matchedCat = globalCatalog.find(c => c.brand.toLowerCase() === med.brand.toLowerCase() || c.name.toLowerCase() === med.name.toLowerCase());
                    const matchedInv = matchedCat ? inventory.find(i => i.catalogId === matchedCat.id) : null;
                    const stock = matchedInv?.totalStock || 0;

                    // Suggest quantity
                    const stripSize = matchedCat?.stripSize || 10;
                    const suggestions = calculateRequiredStrips(med.dosage, med.duration, stripSize);

                    return (
                      <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/50 flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-905">{med.brand}</span>
                            <span className="text-[10px] text-slate-400">({med.name})</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-500">{med.dosage} x {med.duration}</p>
                          <div className="flex items-center gap-2 pt-1">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              stock === 0 ? 'bg-red-50 text-red-600' : stock <= matchedInv.reorderLevel ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                            }`}>
                              {stock === 0 ? 'Out of Stock' : stock <= matchedInv.reorderLevel ? 'Low Stock' : 'Available'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">Local Stock: {stock} tabs</span>
                          </div>
                        </div>

                        {/* Suggestions and add controls */}
                        <div className="flex flex-col md:items-end justify-center gap-2">
                          <div className="text-right text-[11px] font-extrabold text-slate-700">
                            Suggested Qty: <span className="text-purple-650">{suggestions.stripsSuggested} Strips</span>
                            {suggestions.tabsRemainder > 0 && ` + ${suggestions.tabsRemainder} Tablets`}
                            <span className="text-[9px] text-slate-400 block font-normal">(Total: {suggestions.totalRequired} tablets)</span>
                          </div>

                          {matchedCat && stock > 0 ? (
                            <button
                              onClick={() => {
                                handleAddToCart(matchedCat, false, suggestions.stripsSuggested || 1);
                                if (suggestions.tabsRemainder > 0) {
                                  handleAddToCart(matchedCat, true, suggestions.tabsRemainder);
                                }
                              }}
                              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 self-start md:self-auto"
                            >
                              <Plus size={12} /> Apply Suggestion to Cart
                            </button>
                          ) : (
                            <div className="space-y-1">
                              <span className="text-[10px] text-red-500 font-bold block">Alternatives available</span>
                              <button 
                                onClick={() => { setSearchTerm(med.name); toast.success(`Searching alternatives for: ${med.name}`); }}
                                className="px-2.5 py-1 border border-purple-200 text-purple-650 rounded-lg text-[9px] font-bold"
                              >
                                Find Alternatives
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-8 text-center text-slate-400 py-16 font-bold space-y-2">
                <Pill size={36} className="mx-auto text-slate-300" />
                <p>Select a prescription order from the queue to start dispensing.</p>
              </div>
            )}

            {/* Cart Panel & Checkout */}
            {cart.length > 0 && (
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Dispensing Cart (Prescription)</h3>
                
                <div className="divide-y divide-slate-50">
                  {cart.map(item => (
                    <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-extrabold text-slate-905">{item.brand}</p>
                        <p className="text-[10px] text-slate-400">Batch: {item.batchNo} | Exp: {item.expiry}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Strips */}
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleUpdateCartQty(item.id, 'strips', -1)} className="p-0.5 bg-slate-100 rounded"><Minus size={11} /></button>
                          <span className="font-extrabold">{item.strips} strips</span>
                          <button onClick={() => handleUpdateCartQty(item.id, 'strips', 1)} className="p-0.5 bg-slate-100 rounded"><Plus size={11} /></button>
                        </div>
                        {/* Tablets */}
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => handleUpdateCartQty(item.id, 'tablets', -1)} className="p-0.5 bg-slate-100 rounded"><Minus size={11} /></button>
                          <span className="font-extrabold">{item.tablets} tabs</span>
                          <button onClick={() => handleUpdateCartQty(item.id, 'tablets', 1)} className="p-0.5 bg-slate-100 rounded"><Plus size={11} /></button>
                        </div>
                        <span className="font-black text-slate-900 w-16 text-right">₹{(item.strips * item.mrp) + (item.tablets * item.unitPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-4 flex justify-between items-center">
                  <span className="text-xs text-slate-455 font-bold">Total Bill:</span>
                  <span className="text-lg font-black text-purple-650">
                    ₹{cart.reduce((acc, c) => acc + (c.strips * c.mrp) + (c.tablets * c.unitPrice), 0)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => handleCheckout('UPI')} className="flex-1 py-2.5 bg-purple-650 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold transition">Pay via UPI</button>
                  <button onClick={() => handleCheckout('Cash')} className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl text-xs font-bold transition">Pay Cash</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- WALK-IN SALES TAB --- */}
      {tab === 'walk-in' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Catalogue & Inventory */}
          <div className="lg:col-span-2 bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Walk-in Catalogue Search</h3>
            <div className="relative">
              <input 
                type="text"
                placeholder="Search local stock by name, brand, salt..."
                value={walkinSearchTerm}
                onChange={(e) => setWalkinSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs focus:outline-none"
              />
              <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
            </div>

            <div className="divide-y divide-slate-50">
              {filteredLocalInventory.map(item => (
                <div key={item.id} className="py-3.5 flex justify-between items-center text-xs">
                  <div>
                    <h4 className="font-extrabold text-slate-905">{item.brand} <span className="text-[10px] text-slate-400 font-semibold">({item.name})</span></h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Rack: {item.rack} | Stock Available: {item.totalStock} tabs</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        const matchedCat = globalCatalog.find(c => c.id === item.catalogId);
                        if (matchedCat) handleAddToCart(matchedCat, false, 1);
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold"
                    >
                      Add Strip
                    </button>
                    <button 
                      onClick={() => {
                        const matchedCat = globalCatalog.find(c => c.id === item.catalogId);
                        if (matchedCat) handleAddToCart(matchedCat, true, 1);
                      }}
                      className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-bold"
                    >
                      Add Tablet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart & Customer Panel */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Customer Details</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Customer Name</label>
                  <input 
                    type="text"
                    value={walkinCustomer.name}
                    onChange={(e) => setWalkinCustomer({ ...walkinCustomer, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                    placeholder="E.g. Rajesh Kumar"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Phone Number</label>
                  <input 
                    type="text"
                    value={walkinCustomer.phone}
                    onChange={(e) => setWalkinCustomer({ ...walkinCustomer, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none"
                    placeholder="E.g. 98765 43210"
                  />
                </div>
              </div>
            </div>

            {cart.length > 0 && (
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Checkout Cart</h3>
                
                <div className="divide-y divide-slate-50 max-h-60 overflow-y-auto">
                  {cart.map(item => (
                    <div key={item.id} className="py-2.5 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-extrabold text-slate-905">{item.brand}</p>
                        <p className="text-[9px] text-slate-400">Qty: {item.strips} strips / {item.tablets} tabs</p>
                      </div>
                      <span className="font-black text-slate-900">₹{(item.strips * item.mrp) + (item.tablets * item.unitPrice)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                  <span className="text-xs text-slate-455 font-bold">Total Bill:</span>
                  <span className="text-lg font-black text-purple-650">
                    ₹{cart.reduce((acc, c) => acc + (c.strips * c.mrp) + (c.tablets * c.unitPrice), 0)}
                  </span>
                </div>

                <button 
                  onClick={() => handleCheckout('UPI')}
                  className="w-full py-2.5 bg-purple-650 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <CreditCard size={14} /> Collect Payment &amp; Print Bill
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- GLOBAL CATALOGUE SEARCH TAB --- */}
      {tab === 'catalogue' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <h3 className="text-sm font-black text-slate-900">Search Master Catalog</h3>
              <button 
                onClick={() => setShowNewMedicineModal(true)}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1"
              >
                <Plus size={12} /> Create New Medicine
              </button>
            </div>
            
            <div className="relative">
              <input 
                type="text"
                placeholder="Search global masters by name, salt, manufacturer, barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs focus:outline-none"
              />
              <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
            </div>

            {filteredCatalog.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {filteredCatalog.map(item => (
                  <div key={item.id} className="py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                    <div>
                      <h4 className="font-extrabold text-slate-905">{item.brand} <span className="text-[10px] text-slate-400">({item.name})</span></h4>
                      <p className="text-[10px] text-slate-500 mt-1">Salt: {item.salt} | Manufacturer: {item.manufacturer}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Strip size: {item.stripSize} tabs | Barcode: {item.barcode}</p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setSelectedCatalogItem(item); setShowAddBatchModal(true); }}
                        className="px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-650 rounded-xl text-[10px] font-bold flex items-center gap-1"
                      >
                        <Plus size={12} /> Add to Stock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchTerm ? (
              <div className="p-8 text-center text-slate-400 font-bold space-y-2">
                <p>Medicine not found.</p>
                <button 
                  onClick={() => setShowNewMedicineModal(true)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold"
                >
                  Create New Medicine
                </button>
              </div>
            ) : (
              <p className="p-4 text-center text-slate-400 text-xs font-bold">Type to search from the Global Medicine Catalogue.</p>
            )}
          </div>
        </div>
      )}

      {/* --- INVENTORY LIST TAB --- */}
      {tab === 'inventory' && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Active Inventory Store</h3>
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
                    <td className="py-3.5 px-2 font-bold text-slate-500">{item.reorderLevel} tabs</td>
                    <td className="py-3.5 px-2 font-semibold text-slate-600">{item.rack}</td>
                    <td className="py-3.5 px-2 text-slate-500">{item.condition}</td>
                    <td className="py-3.5 px-2">
                      <div className="flex flex-col gap-1">
                        {item.batches.map(b => (
                          <span key={b.id} className="text-[9px] font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50">
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

      {/* --- ADD BATCH MODAL --- */}
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
                <button type="submit" className="flex-1 py-2 bg-purple-650 hover:bg-purple-700 text-white rounded-xl font-bold">Add to Store Stock</button>
                <button type="button" onClick={() => setShowAddBatchModal(false)} className="flex-1 py-2 border border-slate-250 rounded-xl font-bold text-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CREATE NEW MEDICINE MODAL --- */}
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
                <button type="submit" className="flex-1 py-2 bg-purple-650 hover:bg-purple-700 text-white rounded-xl font-bold">Request Master Addition</button>
                <button type="button" onClick={() => setShowNewMedicineModal(false)} className="flex-1 py-2 border border-slate-250 rounded-xl font-bold text-slate-700">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

const X = ({ size, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default PharmacyWorkspace;
