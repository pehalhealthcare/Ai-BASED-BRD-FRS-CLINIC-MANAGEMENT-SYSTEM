const fs = require('fs');
const path = require('path');

const { env } = require('../src/config/env');
const { generateInvoicePdf } = require('../src/common/utils/pdfGenerator');

describe('pdfGenerator', () => {
  it('creates a local invoice pdf file in the configured storage directory', async () => {
    const invoiceNumber = `INV-TEST-${Date.now()}`;
    const result = await generateInvoicePdf({
      invoice: {
        invoiceNumber,
        invoiceDate: new Date('2026-04-22T00:00:00.000Z'),
        dueDate: new Date('2026-04-25T00:00:00.000Z'),
        paymentStatus: 'unpaid',
        items: [
          {
            itemType: 'consultation',
            name: 'Consultation fee',
            description: 'Demo PDF verification item',
            quantity: 1,
            unitPrice: 500,
            amount: 500
          }
        ],
        subtotal: 500,
        discountType: 'none',
        discountAmount: 0,
        taxableAmount: 500,
        gstRate: 18,
        gstAmount: 90,
        totalAmount: 590,
        paidAmount: 0,
        dueAmount: 590,
        notes: 'PDF verification'
      },
      clinic: {
        name: 'AI-CMS Demo Clinic',
        address: {
          line1: '123 Demo Street',
          city: 'Pune',
          state: 'MH',
          pincode: '411001'
        }
      },
      patient: {
        fullName: 'Demo Patient',
        phone: '9999999999',
        patientId: 'PAT-TEST-0001'
      }
    });

    expect(result.filePath).toContain(path.join('storage', 'invoices'));
    expect(result.relativePath).toContain(`storage/invoices/${invoiceNumber}.pdf`);
    expect(fs.existsSync(result.filePath)).toBe(true);

    const stats = await fs.promises.stat(result.filePath);
    expect(stats.size).toBeGreaterThan(0);

    await fs.promises.unlink(result.filePath);
  });
});
