import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { INITIAL_DEMO_DATA } from './demoData';

const DEMO_STORAGE_KEY = 'aicms-demo-v1';

const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [demoState, setDemoState] = useState(() => {
    try {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.warn('Failed to parse aicms-demo-v1 from localStorage, initializing fresh:', err);
    }
    return INITIAL_DEMO_DATA;
  });

  // Persist to localStorage on state changes
  useEffect(() => {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoState));
    } catch (err) {
      console.error('Failed to write to localStorage for aicms-demo-v1:', err);
    }
  }, [demoState]);

  // Create Appointment (used by Receptionist / Patient / Owner)
  const createAppointment = useCallback((newAppt) => {
    setDemoState((prev) => {
      const tokenNum = `A-0${prev.appointments.length + 1}`;
      const apptRecord = {
        id: `apt-${Date.now()}`,
        token: tokenNum,
        date: newAppt.date || 'Today',
        time: newAppt.time || '10:00 AM',
        status: 'SCHEDULED',
        type: newAppt.type || 'General Consultation',
        reason: newAppt.reason || 'Checkup & Consultation',
        ...newAppt,
      };

      const notif = {
        id: `notif-${Date.now()}`,
        title: 'New Appointment Booked',
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
    toast.success('Appointment scheduled successfully in demo!');
  }, []);

  // Update Appointment Status (e.g. SCHEDULED -> CHECKED_IN -> IN_CONSULTATION -> COMPLETED)
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
        title: `Patient Status: ${newStatus.replace('_', ' ')}`,
        message: `${updatedApptName || 'Patient'} marked as ${newStatus.replace('_', ' ')}`,
        time: 'Just now',
        read: false,
      };

      return {
        ...prev,
        appointments: updatedAppointments,
        notifications: [notif, ...prev.notifications],
      };
    });
    toast.success(`Appointment status updated to ${newStatus.replace('_', ' ')}`);
  }, []);

  // Add New Doctor (used by Admin)
  const addDoctor = useCallback((newDoc) => {
    setDemoState((prev) => {
      const docRecord = {
        id: `doc-${Date.now()}`,
        avatar: (newDoc.name || 'Dr').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
        status: 'Available',
        todaySlots: ['10:00 AM', '11:30 AM', '02:00 PM', '04:30 PM'],
        fee: 700,
        experience: '5 Years',
        ...newDoc,
      };

      return {
        ...prev,
        doctors: [...prev.doctors, docRecord],
      };
    });
    toast.success(`Dr. ${newDoc.name} added to clinic roster!`);
  }, []);

  // Toggle Doctor Available / On Leave
  const toggleDoctorStatus = useCallback((docId) => {
    setDemoState((prev) => ({
      ...prev,
      doctors: prev.doctors.map((d) => {
        if (d.id === docId) {
          const next = d.status === 'Available' ? 'On Leave' : 'Available';
          toast.success(`${d.name} marked as ${next}`);
          return { ...d, status: next };
        }
        return d;
      }),
    }));
  }, []);

  // Add Staff (Admin)
  const addStaff = useCallback((newStaff) => {
    setDemoState((prev) => ({
      ...prev,
      staff: [...prev.staff, { id: `st-${Date.now()}`, status: 'Active', ...newStaff }],
    }));
    toast.success(`Staff member ${newStaff.name} onboarded!`);
  }, []);

  // Toggle Staff Status
  const toggleStaffStatus = useCallback((staffId) => {
    setDemoState((prev) => ({
      ...prev,
      staff: prev.staff.map((s) => {
        if (s.id === staffId) {
          const next = s.status === 'Active' ? 'Inactive' : 'Active';
          toast.success(`${s.name} status updated to ${next}`);
          return { ...s, status: next };
        }
        return s;
      }),
    }));
  }, []);

  // Complete Doctor Consultation with Prescription & Lab Tests
  const completeConsultation = useCallback((apptId, consultationData) => {
    setDemoState((prev) => {
      const appt = prev.appointments.find((a) => a.id === apptId);
      const patient = prev.patients.find((p) => p.id === (appt?.patientId || consultationData.patientId)) || prev.patients[0];

      // 1. Mark appointment completed
      const updatedAppointments = prev.appointments.map((a) => (a.id === apptId ? { ...a, status: 'COMPLETED' } : a));

      // 2. Add Prescription record
      const rxRecord = {
        id: `rx-${Date.now()}`,
        patientId: patient.id,
        patientName: patient.name,
        doctorName: appt?.doctorName || 'Dr. Priya Sharma',
        date: 'Today',
        diagnosis: consultationData.diagnosis || 'Clinical Consultation Completed',
        notes: consultationData.clinicalNotes || 'Follow medication schedule and maintain adequate rest.',
        medicines: consultationData.medicines || [
          { name: 'Paracetamol 500mg', dosage: '1 Tab', frequency: 'Twice daily', duration: '3 Days', instruction: 'After food' },
        ],
        labRecommendations: consultationData.labTests || [],
      };

      // 3. If lab tests added, create lab orders
      const newLabOrders = (consultationData.labTests || []).map((testName, i) => ({
        id: `lab-${Date.now()}-${i}`,
        patientId: patient.id,
        patientName: patient.name,
        testName,
        orderedBy: appt?.doctorName || 'Dr. Priya Sharma',
        date: 'Today',
        status: 'In Progress',
        sampleType: 'Routine Sample',
        resultSummary: 'Sample collected, processing analysis.',
        qrVerified: false,
      }));

      // 4. Generate bill for consultation
      const newBill = {
        id: `inv-${Date.now()}`,
        invoiceNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        patientId: patient.id,
        patientName: patient.name,
        services: [`Consultation (${appt?.doctorName || 'Doctor'})`, ...(consultationData.labTests || [])],
        amount: (appt?.fee || 600) + (consultationData.labTests?.length || 0) * 450,
        date: 'Today',
        status: 'PENDING',
        mode: 'Pending Payment',
      };

      const notif = {
        id: `notif-${Date.now()}`,
        title: 'Consultation Completed',
        message: `Prescription & Invoice generated for ${patient.name}`,
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
    toast.success('Consultation completed! Prescription & Invoice created.');
  }, []);

  // Dispense Medicine from Pharmacy
  const dispenseMedicine = useCallback((medicineId, qty = 1) => {
    setDemoState((prev) => {
      let medName = '';
      const updatedMeds = prev.medicines.map((m) => {
        if (m.id === medicineId) {
          medName = m.name;
          return {
            ...m,
            stock: Math.max(0, m.stock - qty),
          };
        }
        return m;
      });

      return {
        ...prev,
        medicines: updatedMeds,
      };
    });
    toast.success(`Dispensed ${qty} unit(s) of medicine. Stock updated!`);
  }, []);

  // Mark Bill as Paid
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
        title: 'Bill Settled',
        message: `₹${settledAmt} collected via ${paymentMode}`,
        time: 'Just now',
        read: false,
      };

      return {
        ...prev,
        bills: updatedBills,
        notifications: [notif, ...prev.notifications],
      };
    });
    toast.success('Bill marked as Paid! Revenue metrics updated.');
  }, []);

  // Order Lab Test directly
  const addLabOrder = useCallback((orderData) => {
    setDemoState((prev) => {
      const newOrder = {
        id: `lab-${Date.now()}`,
        date: 'Today',
        status: 'In Progress',
        qrVerified: false,
        resultSummary: 'Sample accessioned in lab queue.',
        ...orderData,
      };

      return {
        ...prev,
        labOrders: [newOrder, ...prev.labOrders],
      };
    });
    toast.success(`Lab order "${orderData.testName}" placed!`);
  }, []);

  // Reset Demo to Initial State
  const resetDemoData = useCallback(() => {
    try {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      setDemoState(INITIAL_DEMO_DATA);
      toast.success('AICMS Demo data restored to initial state!');
    } catch (err) {
      console.error('Reset demo error:', err);
    }
  }, []);

  // Derived Real Dynamic Metrics calculated from Local Demo Store
  const metrics = useMemo(() => {
    const totalRevenue = demoState.bills
      .filter((b) => b.status === 'PAID')
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    const pendingBillsCount = demoState.bills.filter((b) => b.status === 'PENDING').length;
    const pendingBillsAmount = demoState.bills
      .filter((b) => b.status === 'PENDING')
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    const totalPatients = demoState.patients.length;
    const totalAppointments = demoState.appointments.length;
    const checkedInAppointments = demoState.appointments.filter((a) => a.status === 'CHECKED_IN' || a.status === 'IN_CONSULTATION').length;
    const waitingAppointments = demoState.appointments.filter((a) => a.status === 'WAITING' || a.status === 'SCHEDULED').length;
    const completedAppointments = demoState.appointments.filter((a) => a.status === 'COMPLETED').length;

    const availableDoctors = demoState.doctors.filter((d) => d.status === 'Available').length;
    const totalDoctors = demoState.doctors.length;

    return {
      totalRevenue,
      pendingBillsCount,
      pendingBillsAmount,
      totalPatients,
      totalAppointments,
      checkedInAppointments,
      waitingAppointments,
      completedAppointments,
      availableDoctors,
      totalDoctors,
    };
  }, [demoState]);

  const value = {
    demoState,
    metrics,
    createAppointment,
    updateAppointmentStatus,
    addDoctor,
    toggleDoctorStatus,
    addStaff,
    toggleStaffStatus,
    completeConsultation,
    dispenseMedicine,
    markBillPaid,
    addLabOrder,
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
