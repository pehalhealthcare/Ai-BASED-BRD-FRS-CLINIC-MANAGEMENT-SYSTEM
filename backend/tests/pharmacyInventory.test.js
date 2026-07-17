const request = require('supertest');
const mongoose = require('mongoose');

const { createUserWithClinic, getAuthHeaders } = require('./helpers/phase3.helper');
const { ROLES } = require('../src/common/constants/roles');

let app;

beforeAll(async () => {
  app = require('../src/app');
});

describe('Pharmacy Inventory Management System', () => {
  test('runs complete inventory workflow', async () => {
    // Dynamically require models inside the test block to compile them after Mongoose connects to in-memory DB
    const MedicineBatch = require('../src/modules/pharmacy/medicineBatch.model');
    const StockMovementLedger = require('../src/modules/pharmacy/stockMovementLedger.model');

    // 1. Initialize clinic and admin user inside the test
    const setup = await createUserWithClinic({ role: ROLES.ADMIN });
    const adminToken = setup.token;

    // 2. Create a medicine via API
    const medRes = await request(app)
      .post('/api/v1/pharmacy/medicines')
      .set(getAuthHeaders(adminToken))
      .send({
        code: 'PCM500',
        name: 'Paracetamol 500',
        genericName: 'Paracetamol',
        brandName: 'PCM',
        category: 'Analgesic',
        form: 'Tablet',
        strength: '500 mg',
        manufacturer: 'ABC Pharma',
        unitPrice: 15,
        reorderLevel: 20,
        requiresPrescription: true
      });

    expect(medRes.statusCode).toBe(201);
    const medicineId = medRes.body.data.medicine._id;

    // 3. Creates a supplier successfully
    const supplierRes = await request(app)
      .post('/api/v1/pharmacy/suppliers')
      .set(getAuthHeaders(adminToken))
      .send({
        name: 'Alpha Pharma Distributors',
        contactPerson: 'John Doe',
        phone: '9876543210',
        email: 'contact@alphapharma.com',
        gstNumber: '07AAAAA1111A1Z1',
        paymentTerms: 'Net 30'
      });

    expect(supplierRes.statusCode).toBe(201);
    const supplierId = supplierRes.body.data.supplier._id;

    // 4. Lists active suppliers
    const listRes = await request(app)
      .get('/api/v1/pharmacy/suppliers')
      .set(getAuthHeaders(adminToken));
    expect(listRes.statusCode).toBe(200);

    // 5. Adds opening stock batch and logs stock ledger movement
    const batchRes = await request(app)
      .post(`/api/v1/pharmacy/medicines/${medicineId}/batches`)
      .set(getAuthHeaders(adminToken))
      .send({
        batchNumber: `BATCH-TST-${Date.now()}`,
        expiryDate: '2028-12-31',
        quantity: 500,
        purchasePrice: 10,
        sellingPrice: 15,
        isOpeningStock: true,
        supplier: 'Alpha Pharma Distributors',
        invoiceNumber: 'INV-1002'
      });

    expect(batchRes.statusCode).toBe(201);
    
    // Check ledger log
    const ledger = await StockMovementLedger.findOne({ medicineId, movementType: 'Initial Opening Stock' });
    expect(ledger).toBeDefined();
    expect(ledger.quantity).toBe(500);
    expect(ledger.updatedStock).toBe(500);

    // 6. Creates a purchase order successfully
    const poRes = await request(app)
      .post('/api/v1/pharmacy/purchase-orders')
      .set(getAuthHeaders(adminToken))
      .send({
        supplierId,
        remarks: 'Bulk restock request',
        items: [
          {
            medicineId,
            quantity: 200,
            unitCost: 10
          }
        ]
      });

    expect(poRes.statusCode).toBe(201);
    expect(poRes.body.data.purchaseOrder.poNumber).toBeDefined();
    const poId = poRes.body.data.purchaseOrder._id;

    // 7. Receives purchase order and increments stock
    const receiveRes = await request(app)
      .post(`/api/v1/pharmacy/purchase-orders/${poId}/receive`)
      .set(getAuthHeaders(adminToken))
      .send({
        invoiceNumber: 'INV-RCV-901',
        items: [
          {
            medicineId,
            quantityReceived: 200,
            batchNumber: `BATCH-PO-${Date.now()}`,
            expiryDate: '2028-10-31',
            purchasePrice: 10,
            sellingPrice: 15
          }
        ]
      });

    expect(receiveRes.statusCode).toBe(200);
    expect(receiveRes.body.data.purchaseOrder.status).toBe('Received');

    // Confirm ledger movement type is 'Stock In'
    const poLedger = await StockMovementLedger.findOne({ medicineId, movementType: 'Stock In' });
    expect(poLedger).toBeDefined();
    expect(poLedger.quantity).toBe(200);

    // 8. Performs a manual stock adjustment
    const batch = await MedicineBatch.findOne({ inventoryId: medicineId });
    const adjustRes = await request(app)
      .post('/api/v1/pharmacy/inventory/adjust')
      .set(getAuthHeaders(adminToken))
      .send({
        medicineId,
        batchId: batch._id,
        quantity: -20,
        adjustmentType: 'Damage',
        reason: 'Vial broken',
        notes: 'Disposed safely'
      });

    expect(adjustRes.statusCode).toBe(200);
    
    // Validate ledger
    const damageLedger = await StockMovementLedger.findOne({ medicineId, movementType: 'Damage' });
    expect(damageLedger).toBeDefined();
    expect(damageLedger.quantity).toBe(-20);

    // 9. Retrieves inventory dashboard metrics
    const statsRes = await request(app)
      .get('/api/v1/pharmacy/inventory/dashboard')
      .set(getAuthHeaders(adminToken));

    expect(statsRes.statusCode).toBe(200);
    expect(statsRes.body.data.totalMedicines).toBeGreaterThan(0);
    expect(statsRes.body.data.totalInventoryValue).toBeGreaterThan(0);
  });
});
