const request = require('supertest');
const mongoose = require('mongoose');
const { createUserWithClinic } = require('./helpers/phase3.helper');

describe('Diagnostic Work Orders & Laboratory Orders Comprehensive Loading & Filtering Test', () => {
  let app;
  let LabOrder;
  let ROLES;
  let clinicId;
  let labTechToken;
  let labTechUser;

  const matchOrderStatusToTab = (orderStatus, tabKey) => {
    const s = String(orderStatus || '').toLowerCase().trim();
    switch (tabKey) {
      case 'ALL':
        return true;
      case 'ORDERED':
        return ['ordered', 'confirmed', 'scheduled', 'awaiting_collection', 'sample_collection_pending', 'checked_in', 'called', 'collecting'].includes(s);
      case 'SAMPLE_COLLECTED':
      case 'COLLECTED':
        return ['sample_collected', 'collected'].includes(s);
      case 'PROCESSING':
        return ['processing', 'in_processing', 'in_analysis', 'in_lab_testing'].includes(s);
      case 'RESULTS_ENTRY':
      case 'RESULTS':
        return ['results_entry', 'result_entry', 'testing_complete', 'results_in_progress'].includes(s);
      case 'REVIEW':
      case 'READY_FOR_REVIEW':
        return ['ready_for_review', 'review', 'under_review'].includes(s);
      case 'COMPLETED':
        return ['completed', 'finalized', 'report_ready', 'report_generated', 'report_available'].includes(s);
      default:
        return true;
    }
  };

  beforeAll(() => {
    app = require('../src/app');
    LabOrder = require('../src/modules/labs/labOrder.model').LabOrder;
    ROLES = require('../src/common/constants/roles').ROLES;
  });

  beforeEach(async () => {
    const authSetup = await createUserWithClinic({ role: ROLES.LAB_TECHNICIAN });
    clinicId = authSetup.clinic._id;
    labTechUser = authSetup.user;
    labTechToken = authSetup.token;

    // Create 6 orders with diverse statuses and sources
    const ordersData = [
      {
        clinicId,
        orderNumber: 'LAB-20260907-0001',
        tokenNumber: 'TK-001',
        patientType: 'WALK_IN',
        guestPatient: { fullName: 'Vidya Sharma', phone: '9876543210', age: 29, gender: 'Female' },
        tests: [{ name: 'Complete Blood Count', code: 'CBC', price: 350 }],
        status: 'ordered',
        orderStatus: 'ORDERED',
        source: 'WALK_IN',
        bookingSource: 'WALK_IN',
        orderedAt: new Date('2026-09-07T08:00:00Z')
      },
      {
        clinicId,
        orderNumber: 'LAB-20260907-0002',
        tokenNumber: 'TK-002',
        patientType: 'WALK_IN',
        guestPatient: { fullName: 'Amit Patel', phone: '9876543211', age: 45, gender: 'Male' },
        tests: [{ name: 'Lipid Profile', code: 'LIPID', price: 600 }],
        status: 'sample_collected',
        orderStatus: 'SAMPLE_COLLECTED',
        source: 'PATIENT_BOOKED',
        bookingSource: 'PATIENT_PORTAL',
        orderedAt: new Date('2026-09-07T08:30:00Z')
      },
      {
        clinicId,
        orderNumber: 'LAB-20260907-0003',
        tokenNumber: 'TK-003',
        patientType: 'WALK_IN',
        guestPatient: { fullName: 'Rohan Verma', phone: '9876543212', age: 34, gender: 'Male' },
        tests: [{ name: 'Thyroid Profile', code: 'THYROID', price: 500 }],
        status: 'processing',
        orderStatus: 'IN_LAB_TESTING',
        source: 'DOCTOR_BOOKED',
        bookingSource: 'DOCTOR',
        orderedAt: new Date('2026-09-07T09:00:00Z')
      },
      {
        clinicId,
        orderNumber: 'LAB-20260907-0004',
        tokenNumber: 'TK-004',
        patientType: 'WALK_IN',
        guestPatient: { fullName: 'Priya Nair', phone: '9876543213', age: 26, gender: 'Female' },
        tests: [{ name: 'Liver Function Test', code: 'LFT', price: 550 }],
        status: 'results_entry',
        orderStatus: 'RESULTS_ENTRY',
        source: 'LAB_CREATED',
        bookingSource: 'LABORATORY_STAFF',
        orderedAt: new Date('2026-09-07T09:30:00Z')
      },
      {
        clinicId,
        orderNumber: 'LAB-20260907-0005',
        tokenNumber: 'TK-005',
        patientType: 'WALK_IN',
        guestPatient: { fullName: 'Sunil Mehta', phone: '9876543214', age: 52, gender: 'Male' },
        tests: [{ name: 'Kidney Function Test', code: 'KFT', price: 450 }],
        status: 'ready_for_review',
        orderStatus: 'READY_FOR_REVIEW',
        source: 'DOCTOR_BOOKED',
        bookingSource: 'DOCTOR',
        orderedAt: new Date('2026-09-07T10:00:00Z')
      },
      {
        clinicId,
        orderNumber: 'LAB-20260907-0006',
        tokenNumber: 'TK-006',
        patientType: 'WALK_IN',
        guestPatient: { fullName: 'Deepa Rao', phone: '9876543215', age: 31, gender: 'Female' },
        tests: [{ name: 'HbA1c', code: 'HBA1C', price: 400 }],
        status: 'completed',
        orderStatus: 'REPORT_AVAILABLE',
        source: 'PATIENT_BOOKED',
        bookingSource: 'PATIENT_PORTAL',
        orderedAt: new Date('2026-09-07T10:30:00Z')
      }
    ];

    await LabOrder.insertMany(ordersData);
  });

  test('1. Loads ALL valid laboratory orders and returns full count (6 orders)', async () => {
    const res = await request(app)
      .get('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${labTechToken}`)
      .query({ limit: 100 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const orders = res.body.data.labOrders;
    expect(orders.length).toBe(6);
    expect(res.body.data.total).toBe(6);

    // Calculate dynamic tab counts
    const tabCounts = {
      all: orders.length,
      ordered: orders.filter(o => matchOrderStatusToTab(o.status || o.orderStatus, 'ORDERED')).length,
      collected: orders.filter(o => matchOrderStatusToTab(o.status || o.orderStatus, 'SAMPLE_COLLECTED')).length,
      processing: orders.filter(o => matchOrderStatusToTab(o.status || o.orderStatus, 'PROCESSING')).length,
      resultsEntry: orders.filter(o => matchOrderStatusToTab(o.status || o.orderStatus, 'RESULTS_ENTRY')).length,
      review: orders.filter(o => matchOrderStatusToTab(o.status || o.orderStatus, 'REVIEW')).length,
      completed: orders.filter(o => matchOrderStatusToTab(o.status || o.orderStatus, 'COMPLETED')).length
    };

    expect(tabCounts.all).toBe(6);
    expect(tabCounts.ordered).toBe(1);
    expect(tabCounts.collected).toBe(1);
    expect(tabCounts.processing).toBe(1);
    expect(tabCounts.resultsEntry).toBe(1);
    expect(tabCounts.review).toBe(1);
    expect(tabCounts.completed).toBe(1);
  });

  test('2. Filters accurately by status tabs without mutating full dataset', async () => {
    const res = await request(app)
      .get('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${labTechToken}`)
      .query({ limit: 100 });

    const allOrders = res.body.data.labOrders;

    // Filter "Ordered"
    const orderedOrders = allOrders.filter(o => matchOrderStatusToTab(o.status || o.orderStatus, 'ORDERED'));
    expect(orderedOrders.length).toBe(1);
    expect(orderedOrders[0].orderNumber).toBe('LAB-20260907-0001');

    // Filter "Processing"
    const processingOrders = allOrders.filter(o => matchOrderStatusToTab(o.status || o.orderStatus, 'PROCESSING'));
    expect(processingOrders.length).toBe(1);
    expect(processingOrders[0].orderNumber).toBe('LAB-20260907-0003');

    // Filter "Completed"
    const completedOrders = allOrders.filter(o => matchOrderStatusToTab(o.status || o.orderStatus, 'COMPLETED'));
    expect(completedOrders.length).toBe(1);
    expect(completedOrders[0].orderNumber).toBe('LAB-20260907-0006');
  });

  test('3. Search finds patient by name, order number, or test code', async () => {
    const res = await request(app)
      .get('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${labTechToken}`)
      .query({ search: 'Vidya' });

    expect(res.status).toBe(200);
    expect(res.body.data.labOrders.length).toBe(1);
    expect(res.body.data.labOrders[0].orderNumber).toBe('LAB-20260907-0001');

    const res2 = await request(app)
      .get('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${labTechToken}`)
      .query({ search: 'LAB-20260907-0005' });

    expect(res2.status).toBe(200);
    expect(res2.body.data.labOrders.length).toBe(1);
    expect(res2.body.data.labOrders[0].guestPatient.fullName).toBe('Sunil Mehta');
  });

  test('4. Real-time Refresh workflow: Updating status is immediately retrieved on refresh without reload', async () => {
    // 1. Initial list has 1 ordered and 1 collected
    const initialRes = await request(app)
      .get('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${labTechToken}`)
      .query({ limit: 100 });

    const order1 = initialRes.body.data.labOrders.find(o => o.orderNumber === 'LAB-20260907-0001');
    expect(order1.status).toBe('ordered');

    // 2. Sample collection occurs
    await request(app)
      .patch(`/api/v1/labs/orders/${order1._id}/status`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({ status: 'sample_collected' });

    // 3. Lab staff clicks Refresh -> fetches latest orders
    const refreshRes = await request(app)
      .get('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${labTechToken}`)
      .query({ limit: 100 });

    const updatedOrders = refreshRes.body.data.labOrders;
    const refreshedTabCounts = {
      all: updatedOrders.length,
      ordered: updatedOrders.filter(o => matchOrderStatusToTab(o.status || o.orderStatus, 'ORDERED')).length,
      collected: updatedOrders.filter(o => matchOrderStatusToTab(o.status || o.orderStatus, 'SAMPLE_COLLECTED')).length
    };

    expect(refreshedTabCounts.all).toBe(6);
    expect(refreshedTabCounts.ordered).toBe(0); // Decreased from 1 to 0
    expect(refreshedTabCounts.collected).toBe(2); // Increased from 1 to 2
  });
});
