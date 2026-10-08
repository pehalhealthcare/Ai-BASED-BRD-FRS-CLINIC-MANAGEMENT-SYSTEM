import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { INITIAL_DEMO_DATA, DEMO_STORAGE_KEY } from './demoData';

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [demoState, setDemoState] = useState(() => {
    try {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.warn('Failed to parse aicms_demo_v1_state from localStorage:', err);
    }
    return INITIAL_DEMO_DATA;
  });

  // Persist to localStorage on state changes
  useEffect(() => {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoState));
    } catch (err) {
      console.error('Failed to write to localStorage for demo state:', err);
    }
  }, [demoState]);

  // 1. DOCTORS MANAGEMENT
  const addDoctor = useCallback((newDoc) => {
    if (!newDoc.name || !newDoc.specialization) {
      toast.error('Doctor name and specialization are required');
      return false;
    }
    setDemoState((prev) => {
      const docRecord = {
        id: `doc-${Date.now()}`,
        avatar: (newDoc.name || 'Dr').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
        status: newDoc.status || 'Active',
        todaySlots: newDoc.todaySlots || ['10:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'],
        fee: Number(newDoc.fee) || 600,
        experience: newDoc.experience || '5 Years',
        phone: newDoc.phone || '+91 98765 00000',
        email: newDoc.email || `${newDoc.name.toLowerCase().replace(/[^a-z]/g, '')}@sunriseclinic.demo`,
        ...newDoc,
      };

      const notif = {
        id: `notif-${Date.now()}`,
        title: 'Doctor Added',
        message: `${docRecord.name} (${docRecord.specialization}) added to demo clinic.`,
        time: 'Just now',
        read: false,
      };

      return {
        ...prev,
        doctors: [docRecord, ...prev.doctors],
        notifications: [notif, ...prev.notifications],
      };
    });
    toast.success(`${newDoc.name} added to demo clinic!`);
    return true;
  }, []);

  const toggleDoctorStatus = useCallback((docId) => {
    setDemoState((prev) => ({
      ...prev,
      doctors: prev.doctors.map((d) => {
        if (d.id === docId) {
          const next = d.status === 'Active' ? 'On Leave' : 'Active';
          toast.success(`${d.name} marked as ${next}`);
          return { ...d, status: next };
        }
        return d;
      }),
    }));
  }, []);

  const deleteDoctor = useCallback((docId) => {
    setDemoState((prev) => {
      const doc = prev.doctors.find((d) => d.id === docId);
      toast.success(`${doc ? doc.name : 'Doctor'} removed from demo clinic.`);
      return {
        ...prev,
        doctors: prev.doctors.filter((d) => d.id !== docId),
      };
    });
  }, []);

  // 2. PATIENTS MANAGEMENT
  const addPatient = useCallback((newPat) => {
    if (!newPat.name) {
      toast.error('Patient name is required');
      return false;
    }
    setDemoState((prev) => {
      const patientRecord = {
        id: `pat-${Date.now()}`,
        age: Number(newPat.age) || 30,
        gender: newPat.gender || 'Male',
        phone: newPat.phone || '+91 98000 00000',
        bloodGroup: newPat.bloodGroup || 'B+',
        vitals: newPat.vitals || { bp: '120/80', pulse: '72 bpm', spo2: '99%', temp: '98.4°F', weight: '65 kg' },
        history: newPat.history || 'New demo patient registered.',
        lastVisit: 'Today',
        ...newPat,
      };

      const notif = {
        id: `notif-${Date.now()}`,
        title: 'New Patient Registered',
        message: `${patientRecord.name} (Age ${patientRecord.age}) enrolled at front desk.`,
        time: 'Just now',
        read: false,
      };

      return {
        ...prev,
        patients: [patientRecord, ...prev.patients],
        notifications: [notif, ...prev.notifications],
      };
    });
    toast.success(`${newPat.name} added to demo patients.`);
    return true;
  }, []);

  const deletePatient = useCallback((patId) => {
    setDemoState((prev) => {
      const pat = prev.patients.find((p) => p.id === patId);
      toast.success(`${pat ? pat.name : 'Patient'} removed from demo records.`);
      return {
        ...prev,
        patients: prev.patients.filter((p) => p.id !== patId),
        appointments: prev.appointments.filter((a) => a.patientId !== patId),
      };
    });
  }, []);

  // 3. APPOINTMENTS MANAGEMENT
  const createAppointment = useCallback((newAppt) => {
    if (!newAppt.patientName || !newAppt.doctorName) {
      toast.error('Please select both a patient and a doctor');
      return false;
    }
    setDemoState((prev) => {
      const tokenNum = `T-0${prev.appointments.length + 1}`;
      const apptRecord = {
        id: `apt-${Date.now()}`,
        token: tokenNum,
        date: newAppt.date || 'Today',
        time: newAppt.time || '10:30 AM',
        status: newAppt.status || 'SCHEDULED',
        type: newAppt.type || 'General Consultation',
        reason: newAppt.reason || 'Checkup & Consultation',
        fee: Number(newAppt.fee) || 500,
        ...newAppt,
      };

      const notif = {
        id: `notif-${Date.now()}`,
        title: 'Appointment Booked',
        message: `${apptRecord.patientName} scheduled with ${apptRecord.doctorName} for ${apptRecord.time}`,
        time: 'Just now',
        read: false,
      };

      return {
        ...prev,
        appointments: [apptRecord, ...prev.appointments],
        notifications: [notif, ...prev.notifications],
      };
    });
    toast.success(`Appointment booked for ${newAppt.patientName}!`);
    return true;
  }, []);

  const updateAppointmentStatus = useCallback((apptId, newStatus) => {
    setDemoState((prev) => {
      let updatedApptName = '';
      const updatedAppointments = prev.appointments.map((a) => {
        if (a.id === apptId) {
          updatedApptName = a.patientName;
          return { ...a, status: newStatus };
        }
        return a;
      });

      const notif = {
        id: `notif-${Date.now()}`,
        title: `Appointment ${newStatus.replace('_', ' ')}`,
        message: `${updatedApptName || 'Patient'} status updated to ${newStatus.replace('_', ' ')}`,
        time: 'Just now',
        read: false,
      };

      return {
        ...prev,
        appointments: updatedAppointments,
        notifications: [notif, ...prev.notifications],
      };
    });
    toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
  }, []);

  const rescheduleAppointment = useCallback((apptId, newTime, newDate = 'Tomorrow') => {
    setDemoState((prev) => ({
      ...prev,
      appointments: prev.appointments.map((a) => (a.id === apptId ? { ...a, time: newTime, date: newDate, status: 'SCHEDULED' } : a)),
    }));
    toast.success(`Appointment rescheduled to ${newDate} at ${newTime}`);
  }, []);

  const cancelAppointment = useCallback((apptId) => {
    setDemoState((prev) => {
      toast.success('Appointment cancelled in demo.');
      return {
        ...prev,
        appointments: prev.appointments.filter((a) => a.id !== apptId),
      };
    });
  }, []);

  // Call Next Waiting Patient (Receptionist)
  const callNextPatient = useCallback(() => {
    setDemoState((prev) => {
      const waiting = prev.appointments.find((a) => a.status === 'WAITING' || a.status === 'SCHEDULED');
      if (!waiting) {
        toast('No waiting patients in queue.', { icon: 'ℹ️' });
        return prev;
      }
      toast.success(`Calling Token ${waiting.token} (${waiting.patientName}) to Consultation Room`);
      return {
        ...prev,
        appointments: prev.appointments.map((a) => (a.id === waiting.id ? { ...a, status: 'CHECKED_IN' } : a)),
      };
    });
  }, []);

  // Add Walk-In Patient (Receptionist)
  const addWalkInPatient = useCallback((walkInData) => {
    const pName = walkInData.name || 'Walk-in Patient';
    const dName = walkInData.doctorName || 'Dr. Priya Sharma';
    
    setDemoState((prev) => {
      const patId = `pat-${Date.now()}`;
      const newPat = {
        id: patId,
        name: pName,
        age: Number(walkInData.age) || 35,
        gender: walkInData.gender || 'Male',
        phone: walkInData.phone || '+91 98000 11111',
        bloodGroup: walkInData.bloodGroup || 'B+',
        vitals: { bp: '122/80', pulse: '74 bpm', spo2: '99%', temp: '98.4°F', weight: '68 kg' },
        history: 'Walk-in front desk emergency registration.',
        lastVisit: 'Today',
      };

      const tokenNum = `T-0${prev.appointments.length + 1}`;
      const newAppt = {
        id: `apt-${Date.now()}`,
        token: tokenNum,
        patientId: patId,
        patientName: pName,
        doctorName: dName,
        specialty: 'General OPD',
        time: 'Just Now',
        date: 'Today',
        type: 'Walk-In OPD',
        reason: walkInData.reason || 'Immediate OPD Consultation',
        status: 'CHECKED_IN',
        fee: 500,
      };

      return {
        ...prev,
        patients: [newPat, ...prev.patients],
        appointments: [newAppt, ...prev.appointments],
        notifications: [
          {
            id: `notif-${Date.now()}`,
            title: 'Walk-in Registered',
            message: `${pName} issued Token ${tokenNum} for ${dName}`,
            time: 'Just now',
            read: false,
          },
          ...prev.notifications,
        ],
      };
    });
    toast.success(`Walk-in patient ${pName} registered and checked in!`);
  }, []);

  // 4. CONSULTATIONS & PRESCRIPTIONS
  const completeConsultation = useCallback((apptId, consultationData) => {
    setDemoState((prev) => {
      const appt = prev.appointments.find((a) => a.id === apptId);
      const patient = prev.patients.find((p) => p.name === (appt?.patientName || consultationData.patientName)) || prev.patients[0];

      // Mark appointment completed
      const updatedAppointments = prev.appointments.map((a) => (a.id === apptId ? { ...a, status: 'COMPLETED' } : a));

      // Prescription
      const rxRecord = {
        id: `rx-${Date.now()}`,
        prescriptionNumber: `RX-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        patientId: patient?.id || 'pat-1',
        patientName: patient?.name || 'Ramesh Kumar',
        doctorName: appt?.doctorName || 'Dr. Priya Sharma',
        date: 'Today',
        diagnosis: consultationData.diagnosis || 'Clinical OPD Assessment',
        notes: consultationData.clinicalNotes || 'Adhere to prescribed dosage with proper rest and hydration.',
        medicines: consultationData.medicines || [
          { name: 'Paracetamol 500mg', dosage: '1 Tab', frequency: 'Twice daily', duration: '3 Days', instruction: 'After food' },
        ],
        labRecommendations: consultationData.labTests || [],
      };

      // Lab orders
      const newLabOrders = (consultationData.labTests || []).map((testName, i) => ({
        id: `lab-${Date.now()}-${i}`,
        patientId: patient?.id || 'pat-1',
        patientName: patient?.name || 'Ramesh Kumar',
        testName,
        orderedBy: appt?.doctorName || 'Dr. Priya Sharma',
        date: 'Today',
        price: 400,
        status: 'Processing',
        sampleType: 'Whole Blood (EDTA)',
        resultSummary: 'Sample accessioned in lab queue.',
        qrVerified: false,
      }));

      // Bill
      const feeAmount = (appt?.fee || 500) + (consultationData.labTests?.length || 0) * 350 + (consultationData.medicines?.length || 0) * 50;
      const newBill = {
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
        patientId: patient?.id || 'pat-1',
        patientName: patient?.name || 'Ramesh Kumar',
        doctorName: appt?.doctorName || 'Dr. Priya Sharma',
        services: [`Consultation (${appt?.doctorName || 'Doctor'})`, ...(consultationData.labTests || [])],
        subtotal: feeAmount,
        discount: 0,
        amount: feeAmount,
        date: 'Today',
        status: 'PENDING',
        mode: 'Pending at Counter',
      };

      const notif = {
        id: `notif-${Date.now()}`,
        title: 'Consultation Completed',
        message: `Prescription & Invoice prepared for ${patient?.name || 'Patient'}`,
        time: 'Just now',
        read: false,
      };

      return {
        ...prev,
        appointments: updatedAppointments,
        prescriptions: [rxRecord, ...prev.prescriptions],
        labOrders: [...newLabOrders, ...prev.labOrders],
        bills: [newBill, ...prev.bills],
        notifications: [notif, ...prev.notifications],
      };
    });
    toast.success('Consultation finished! Digital prescription and bill generated.');
  }, []);

  // 5. PHARMACY & INVENTORY MANAGEMENT
  const addMedicine = useCallback((newMed) => {
    if (!newMed.name) {
      toast.error('Medicine name is required');
      return false;
    }
    setDemoState((prev) => {
      const stockVal = Number(newMed.stock) || 100;
      const minStockVal = Number(newMed.minStock) || 30;
      const medRecord = {
        id: `med-${Date.now()}`,
        batch: newMed.batch || `B${Math.floor(100 + Math.random() * 900)}`,
        category: newMed.category || 'General',
        expiry: newMed.expiry || '12/2026',
        stock: stockVal,
        minStock: minStockVal,
        unitPrice: Number(newMed.unitPrice) || 20,
        status: stockVal <= minStockVal ? (stockVal === 0 ? 'Out of Stock' : 'Low Stock') : 'In Stock',
        ...newMed,
      };

      const notif = {
        id: `notif-${Date.now()}`,
        title: 'Medicine Added',
        message: `${medRecord.name} (${medRecord.stock} units) added to demo pharmacy.`,
        time: 'Just now',
        read: false,
      };

      return {
        ...prev,
        medicines: [medRecord, ...prev.medicines],
        notifications: [notif, ...prev.notifications],
      };
    });
    toast.success(`${newMed.name} added to demo pharmacy!`);
    return true;
  }, []);

  const adjustStock = useCallback((medId, delta) => {
    setDemoState((prev) => {
      const updatedMeds = prev.medicines.map((m) => {
        if (m.id === medId) {
          const newStock = Math.max(0, m.stock + delta);
          const newStatus = newStock === 0 ? 'Out of Stock' : newStock <= m.minStock ? 'Low Stock' : 'In Stock';
          return { ...m, stock: newStock, status: newStatus };
        }
        return m;
      });

      return {
        ...prev,
        medicines: updatedMeds,
      };
    });
    toast.success(delta > 0 ? `Stock increased by ${delta}` : `Stock decreased by ${Math.abs(delta)}`);
  }, []);

  const dispenseMedicine = useCallback((medId, qty = 1) => {
    setDemoState((prev) => {
      const updatedMeds = prev.medicines.map((m) => {
        if (m.id === medId) {
          const newStock = Math.max(0, m.stock - qty);
          const newStatus = newStock === 0 ? 'Out of Stock' : newStock <= m.minStock ? 'Low Stock' : 'In Stock';
          return { ...m, stock: newStock, status: newStatus };
        }
        return m;
      });

      return {
        ...prev,
        medicines: updatedMeds,
      };
    });
    toast.success(`Dispensed ${qty} unit(s). Local pharmacy stock updated!`);
  }, []);

  // 6. LABORATORY MANAGEMENT
  const addLabTest = useCallback((newTest) => {
    if (!newTest.testName || !newTest.patientName) {
      toast.error('Test name and patient are required');
      return false;
    }
    setDemoState((prev) => {
      const testRecord = {
        id: `lab-${Date.now()}`,
        date: 'Today',
        price: Number(newTest.price) || 450,
        status: newTest.status || 'Pending',
        sampleType: newTest.sampleType || 'Whole Blood (EDTA)',
        resultSummary: 'Sample accessioned at diagnostic desk.',
        qrVerified: false,
        ...newTest,
      };

      const notif = {
        id: `notif-${Date.now()}`,
        title: 'Lab Test Ordered',
        message: `${testRecord.testName} ordered for ${testRecord.patientName}`,
        time: 'Just now',
        read: false,
      };

      return {
        ...prev,
        labOrders: [testRecord, ...prev.labOrders],
        notifications: [notif, ...prev.notifications],
      };
    });
    toast.success(`Lab order "${newTest.testName}" placed!`);
    return true;
  }, []);

  const updateLabStatus = useCallback((labId, newStatus, qrVerified = false) => {
    setDemoState((prev) => {
      const updatedOrders = prev.labOrders.map((o) => {
        if (o.id === labId) {
          return {
            ...o,
            status: newStatus,
            qrVerified: qrVerified !== undefined ? qrVerified : o.qrVerified,
            resultSummary: newStatus === 'Completed' ? 'All clinical parameters verified and within normal range.' : o.resultSummary,
          };
        }
        return o;
      });

      return {
        ...prev,
        labOrders: updatedOrders,
      };
    });
    toast.success(`Lab test status updated to ${newStatus}`);
  }, []);

  // 7. BILLING MANAGEMENT
  const createBill = useCallback((newBill) => {
    if (!newBill.patientName || !newBill.amount) {
      toast.error('Patient name and amount are required');
      return false;
    }
    setDemoState((prev) => {
      const billRecord = {
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
        doctorName: newBill.doctorName || 'Dr. Priya Sharma',
        services: newBill.services || ['Consultation', 'Diagnostic Tests'],
        subtotal: Number(newBill.subtotal) || Number(newBill.amount),
        discount: Number(newBill.discount) || 0,
        amount: Number(newBill.amount),
        date: 'Today',
        status: newBill.status || 'PENDING',
        mode: newBill.mode || 'Pending at Counter',
        ...newBill,
      };

      const notif = {
        id: `notif-${Date.now()}`,
        title: 'Demo Invoice Created',
        message: `${billRecord.invoiceNumber} for ₹${billRecord.amount} issued for ${billRecord.patientName}`,
        time: 'Just now',
        read: false,
      };

      return {
        ...prev,
        bills: [billRecord, ...prev.bills],
        notifications: [notif, ...prev.notifications],
      };
    });
    toast.success('Demo bill generated! (No real payment required)');
    return true;
  }, []);

  const markBillPaid = useCallback((billId, paymentMode = 'UPI (Instant)') => {
    setDemoState((prev) => {
      let settledAmt = 0;
      const updatedBills = prev.bills.map((b) => {
        if (b.id === billId) {
          settledAmt = b.amount;
          return { ...b, status: 'PAID', mode: paymentMode };
        }
        return b;
      });

      const notif = {
        id: `notif-${Date.now()}`,
        title: 'Demo Bill Settled',
        message: `₹${settledAmt} received via ${paymentMode}`,
        time: 'Just now',
        read: false,
      };

      return {
        ...prev,
        bills: updatedBills,
        notifications: [notif, ...prev.notifications],
      };
    });
    toast.success(`Demo payment recorded via ${paymentMode}!`);
  }, []);

  // 8. SETTINGS MANAGEMENT
  const updateClinicSettings = useCallback((updatedSettings) => {
    setDemoState((prev) => ({
      ...prev,
      clinic: {
        ...prev.clinic,
        ...updatedSettings,
      },
    }));
    toast.success('Demo clinic settings saved in this browser.');
  }, []);

  // 9. RESET DEMO DATA
  const resetDemoData = useCallback(() => {
    try {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      setDemoState(INITIAL_DEMO_DATA);
      toast.success('AI-CMS Demo reset to original state!');
    } catch (err) {
      console.error('Reset demo error:', err);
    }
  }, []);

  // DERIVED DYNAMIC METRICS
  const metrics = useMemo(() => {
    const totalRevenue = demoState.bills
      .filter((b) => b.status === 'PAID')
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

    const pendingBillsCount = demoState.bills.filter((b) => b.status === 'PENDING').length;
    const pendingBillsAmount = demoState.bills
      .filter((b) => b.status === 'PENDING')
      .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);

    const totalPatients = demoState.patients.length;
    const totalAppointments = demoState.appointments.length;
    const scheduledAppointments = demoState.appointments.filter((a) => a.status === 'SCHEDULED').length;
    const checkedInAppointments = demoState.appointments.filter((a) => a.status === 'CHECKED_IN').length;
    const waitingAppointments = demoState.appointments.filter((a) => a.status === 'WAITING' || a.status === 'SCHEDULED').length;
    const completedAppointments = demoState.appointments.filter((a) => a.status === 'COMPLETED').length;

    const totalDoctors = demoState.doctors.length;
    const activeDoctors = demoState.doctors.filter((d) => d.status === 'Active').length;

    const totalMedicines = demoState.medicines.length;
    const lowStockMedicines = demoState.medicines.filter((m) => m.stock <= m.minStock).length;

    const totalLabTests = demoState.labOrders.length;
    const completedLabTests = demoState.labOrders.filter((l) => l.status === 'Completed').length;
    const pendingLabTests = demoState.labOrders.filter((l) => l.status !== 'Completed').length;

    return {
      totalRevenue,
      pendingBillsCount,
      pendingBillsAmount,
      totalPatients,
      totalAppointments,
      scheduledAppointments,
      checkedInAppointments,
      waitingAppointments,
      completedAppointments,
      totalDoctors,
      activeDoctors,
      totalMedicines,
      lowStockMedicines,
      totalLabTests,
      completedLabTests,
      pendingLabTests,
    };
  }, [demoState]);

  const value = {
    demoState,
    metrics,
    addDoctor,
    toggleDoctorStatus,
    deleteDoctor,
    addPatient,
    deletePatient,
    createAppointment,
    updateAppointmentStatus,
    rescheduleAppointment,
    cancelAppointment,
    callNextPatient,
    addWalkInPatient,
    completeConsultation,
    addMedicine,
    adjustStock,
    dispenseMedicine,
    addLabTest,
    updateLabStatus,
    createBill,
    markBillPaid,
    updateClinicSettings,
    resetDemoData,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}
