import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  DATE_RANGE_OPTIONS,
  resolveDateRange,
  getThisYearRange,
  getThisMonthRange,
  getTodayStr,
  getPreviousDayStr,
  formatDateStr,
  formatDisplayDate
} from '../utils/kpiComparison.js';

describe('Appointment KPI and Table Data Mismatch – Strict Data Consistency Specifications', () => {

  const mockAppointments = [
    {
      _id: 'apt-001',
      clinicId: 'clinic-1',
      doctorId: { _id: 'doc-shyam', fullName: 'Dr Shyam', specialization: { _id: 'spec-cardio', name: 'Cardiology' } },
      patientId: { _id: 'pat-1', fullName: 'Vidya', patientId: 'PT-1001', phone: '9876543210' },
      appointmentDate: '2026-08-11T00:00:00.000Z',
      startTime: '12:15',
      consultationMode: 'WALK_IN',
      status: 'completed',
      paymentStatus: 'paid',
      source: 'reception'
    },
    {
      _id: 'apt-002',
      clinicId: 'clinic-1',
      doctorId: { _id: 'doc-shyam', fullName: 'Dr Shyam', specialization: { _id: 'spec-cardio', name: 'Cardiology' } },
      patientId: { _id: 'pat-2', fullName: 'Abhishek', patientId: 'PT-1002', phone: '9876543211' },
      appointmentDate: '2026-08-14T00:00:00.000Z',
      startTime: '23:15',
      consultationMode: 'WALK_IN',
      status: 'not_attended',
      paymentStatus: 'paid',
      source: 'receptionist'
    },
    {
      _id: 'apt-003',
      clinicId: 'clinic-1',
      doctorId: { _id: 'doc-ram', fullName: 'Dr Shyam Ram', specialization: { _id: 'spec-gen', name: 'General Physician' } },
      patientId: { _id: 'pat-3', fullName: 'Meena', patientId: 'PT-1003', phone: '9876543212' },
      appointmentDate: '2026-08-26T00:00:00.000Z',
      startTime: '10:00',
      consultationMode: 'WALK_IN',
      status: 'not_attended',
      paymentStatus: 'paid',
      source: 'patient_app'
    },
    {
      _id: 'apt-004',
      clinicId: 'clinic-1',
      doctorId: { _id: 'doc-shyam', fullName: 'Dr Shyam', specialization: { _id: 'spec-cardio', name: 'Cardiology' } },
      patientId: { _id: 'pat-1', fullName: 'Vidya', patientId: 'PT-1001', phone: '9876543210' },
      appointmentDate: '2026-08-31T00:00:00.000Z',
      startTime: '14:00',
      consultationMode: 'ONLINE',
      status: 'completed',
      paymentStatus: 'paid',
      source: 'patient_app'
    },
    {
      _id: 'apt-005',
      clinicId: 'clinic-1',
      doctorId: { _id: 'doc-ram', fullName: 'Dr Shyam Ram', specialization: { _id: 'spec-gen', name: 'General Physician' } },
      patientId: { _id: 'pat-3', fullName: 'Meena', patientId: 'PT-1003', phone: '9876543212' },
      appointmentDate: '2026-10-18T00:00:00.000Z',
      startTime: '15:30',
      consultationMode: 'WALK_IN',
      status: 'not_attended',
      paymentStatus: 'paid',
      source: 'reception'
    }
  ];

  const matchesActiveFilters = (apt, { searchQuery = '', selectedBranch = '', selectedDoctor = '', selectedDept = '', selectedConsultType = '', selectedPaymentStatus = '' }) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const pName = (apt.patientId?.fullName || '').toLowerCase();
      const pPhone = (apt.patientId?.phone || '').toLowerCase();
      const pUhid = (apt.patientId?.patientId || '').toLowerCase();
      const dName = (apt.doctorId?.fullName || '').toLowerCase();
      if (!pName.includes(q) && !pPhone.includes(q) && !pUhid.includes(q) && !dName.includes(q)) {
        return false;
      }
    }
    if (selectedBranch && String(apt.clinicId?._id || apt.clinicId) !== selectedBranch) return false;
    if (selectedDoctor && String(apt.doctorId?._id || apt.doctorId) !== selectedDoctor) return false;
    if (selectedDept && (apt.doctorId?.specialization?._id || apt.doctorId?.specialization) !== selectedDept) return false;
    if (selectedConsultType && apt.consultationMode !== selectedConsultType) return false;
    if (selectedPaymentStatus && apt.paymentStatus !== selectedPaymentStatus) return false;
    return true;
  };

  const computeUnifiedDatasetAndStats = (dataset, filters = {}, activeTab = 'All') => {
    const baseFiltered = dataset.filter(a => matchesActiveFilters(a, filters));

    const stats = {
      total: baseFiltered.length,
      booked: baseFiltered.filter(a => a.status === 'booked' || a.status === 'confirmed').length,
      checkedIn: baseFiltered.filter(a => a.status === 'checked_in' || a.status === 'waiting').length,
      inConsult: baseFiltered.filter(a => a.status === 'in_consultation' || a.status === 'consultation_started').length,
      completed: baseFiltered.filter(a => a.status === 'completed').length,
      cancelled: baseFiltered.filter(a => a.status === 'cancelled').length,
      rescheduled: baseFiltered.filter(a => a.status === 'rescheduled').length,
      pendingWaivers: baseFiltered.filter(a => ['waiver_pending', 'fully_waived', 'partially_waived'].includes(a.paymentStatus)).length,
      pendingPayments: baseFiltered.filter(a => a.paymentStatus === 'pending' || a.paymentStatus === 'unpaid').length
    };

    const tableAppointments = baseFiltered.filter(apt => {
      const isUnpaid = apt.paymentStatus === 'pending' || apt.paymentStatus === 'unpaid';
      if (activeTab === 'booked') return apt.status === 'booked' || apt.status === 'confirmed';
      if (activeTab === 'checked_in') return apt.status === 'checked_in' || apt.status === 'waiting';
      if (activeTab === 'in_consultation') return apt.status === 'in_consultation' || apt.status === 'consultation_started';
      if (activeTab === 'completed') return apt.status === 'completed';
      if (activeTab === 'cancelled') return apt.status === 'cancelled';
      if (activeTab === 'rescheduled') return apt.status === 'rescheduled';
      if (activeTab === 'waiver') return ['waiver_pending', 'fully_waived', 'partially_waived'].includes(apt.paymentStatus);
      if (activeTab === 'pending_payment') return isUnpaid;
      return true; // 'All'
    });

    return { baseFiltered, stats, tableAppointments };
  };

  it('1. Strict Data Consistency: When year contains exactly 1 appointment, Total KPI=1, Completed=1, Table=1', () => {
    const singleAppointment = [mockAppointments[0]]; // 1 completed appointment
    const { stats, tableAppointments } = computeUnifiedDatasetAndStats(singleAppointment, {}, 'All');

    assert.equal(stats.total, 1, 'Total KPI must be exactly 1');
    assert.equal(stats.completed, 1, 'Completed KPI must be exactly 1');
    assert.equal(stats.booked, 0, 'Booked KPI must be 0');
    assert.equal(stats.checkedIn, 0, 'Checked-In KPI must be 0');
    assert.equal(stats.cancelled, 0, 'Cancelled KPI must be 0');
    assert.equal(tableAppointments.length, 1, 'Table must render exactly that 1 appointment');
    assert.equal(tableAppointments[0]._id, 'apt-001');
  });

  it('2. Fixes Mismatch: All active filters (Doctor, Dept, Search) apply to both KPI and Table simultaneously', () => {
    // If user filters by Doctor "Dr Shyam Ram"
    const { stats, tableAppointments } = computeUnifiedDatasetAndStats(
      mockAppointments,
      { selectedDoctor: 'doc-ram' },
      'All'
    );

    assert.equal(stats.total, 2, 'KPI total must match the 2 appointments for Dr Shyam Ram');
    assert.equal(tableAppointments.length, 2, 'Table must show exactly 2 appointments');
    assert.equal(tableAppointments[0].doctorId._id, 'doc-ram');
    assert.equal(tableAppointments[1].doctorId._id, 'doc-ram');
  });

  it('3. Tab All Displays All Appointments in the Unified Filtered Dataset without artificial omission', () => {
    const { stats, tableAppointments } = computeUnifiedDatasetAndStats(mockAppointments, {}, 'All');

    assert.equal(stats.total, 5, 'KPI Total must be 5');
    assert.equal(tableAppointments.length, 5, 'Table on Tab All must show all 5 appointments');
    assert.equal(stats.total, tableAppointments.length, 'KPI Total and Tab All length must match 100%');
  });

  it('4. Tab Completed Displays Only Completed Records while Tab Count and Table match exactly', () => {
    const { stats, tableAppointments } = computeUnifiedDatasetAndStats(mockAppointments, {}, 'completed');

    assert.equal(stats.completed, 2, 'Completed KPI count must be 2');
    assert.equal(tableAppointments.length, 2, 'Completed table must have exactly 2 rows');
    tableAppointments.forEach(apt => {
      assert.equal(apt.status, 'completed', 'Every appointment in completed tab must have completed status');
    });
  });

  it('5. Infinite Scrolling Server-Side Pagination Independence: KPI shows full total regardless of page limit', () => {
    const largeDataset = Array.from({ length: 100 }, (_, i) => ({
      _id: `apt-${i + 1}`,
      status: i < 40 ? 'completed' : 'booked',
      paymentStatus: 'paid'
    }));

    const { stats, tableAppointments } = computeUnifiedDatasetAndStats(largeDataset, {}, 'All');
    assert.equal(stats.total, 100, 'KPI must show full 100 records');

    // Initial page limit 20
    let visibleCount = 20;
    let paginated = tableAppointments.slice(0, visibleCount);
    assert.equal(paginated.length, 20, 'Initial table page displays 20 records');
    assert.equal(stats.total, 100, 'KPI remains 100 despite table viewing 20 records');

    // Scroll down to load page 2
    visibleCount += 20;
    paginated = tableAppointments.slice(0, visibleCount);
    assert.equal(paginated.length, 40, 'Second scroll progressively loads 40 records');
    assert.equal(stats.total, 100, 'KPI remains 100 unaffected by scrolling');
  });

  it('6. Deduplication on Append Prevents Duplicate Keys in Progressive Scrolling', () => {
    const existing = [
      { _id: 'apt-1', name: 'A' },
      { _id: 'apt-2', name: 'B' }
    ];
    const incoming = [
      { _id: 'apt-2', name: 'B (duplicate)' },
      { _id: 'apt-3', name: 'C' }
    ];

    const deduplicated = (prev, next) => {
      const seen = new Set(prev.map(p => p._id));
      const filteredNext = next.filter(n => !seen.has(n._id));
      return [...prev, ...filteredNext];
    };

    const result = deduplicated(existing, incoming);
    assert.equal(result.length, 3, 'Duplicate apt-2 must be ignored');
    assert.deepEqual(result.map(r => r._id), ['apt-1', 'apt-2', 'apt-3']);
  });

  it('7. Date Range Boundaries: This Year covers entire calendar year from Jan 01 to Dec 31', () => {
    const testDate = new Date('2026-11-06T12:00:00.000Z');
    const range = resolveDateRange(DATE_RANGE_OPTIONS.THIS_YEAR, {}, testDate);

    assert.equal(range.from, '2026-01-01');
    assert.equal(range.to, '2026-12-31');
    assert.equal(range.comparisonFrom, '2025-01-01');
    assert.equal(range.comparisonTo, '2025-12-31');
    assert.equal(range.kpiTitle, "THIS YEAR'S APPOINTMENTS");
  });

  it('8. Zero Appointments Boundary: When dataset is empty, all KPIs and Table show 0 cleanly', () => {
    const { stats, tableAppointments } = computeUnifiedDatasetAndStats([], {}, 'All');

    assert.equal(stats.total, 0);
    assert.equal(stats.completed, 0);
    assert.equal(stats.booked, 0);
    assert.equal(tableAppointments.length, 0);
  });

  it('9. This Year Table View: formats appointment date using formatDisplayDate without ReferenceError', () => {
    const rawDate = '2026-08-11T00:00:00.000Z';
    const formattedDate = formatDisplayDate(formatDateStr(new Date(rawDate)));
    assert.equal(formattedDate, 'Aug 11, 2026');
  });
});

