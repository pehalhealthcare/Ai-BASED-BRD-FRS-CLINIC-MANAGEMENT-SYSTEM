const { calculateInvoiceTotals, calculatePaymentStatus } = require('../src/common/utils/billingCalculator');

describe('billingCalculator', () => {
  it('calculates subtotal and gst totals', () => {
    const totals = calculateInvoiceTotals({
      items: [
        { itemType: 'consultation', name: 'Consultation', quantity: 2, unitPrice: 500 }
      ],
      discountType: 'none',
      gstRate: 18,
      payments: []
    });

    expect(totals.subtotal).toBe(1000);
    expect(totals.gstAmount).toBe(180);
    expect(totals.totalAmount).toBe(1180);
    expect(totals.dueAmount).toBe(1180);
  });

  it('applies percentage discount safely', () => {
    const totals = calculateInvoiceTotals({
      items: [{ itemType: 'consultation', name: 'Consultation', quantity: 1, unitPrice: 1000 }],
      discountType: 'percentage',
      discountValue: 10,
      gstRate: 18
    });

    expect(totals.discountAmount).toBe(100);
    expect(totals.taxableAmount).toBe(900);
    expect(totals.totalAmount).toBe(1062);
  });

  it('caps fixed discount at subtotal', () => {
    const totals = calculateInvoiceTotals({
      items: [{ itemType: 'consultation', name: 'Consultation', quantity: 1, unitPrice: 500 }],
      discountType: 'fixed',
      discountValue: 900,
      gstRate: 18
    });

    expect(totals.discountAmount).toBe(500);
    expect(totals.taxableAmount).toBe(0);
    expect(totals.totalAmount).toBe(0);
  });

  it('calculates payment status for unpaid partial and paid', () => {
    expect(calculatePaymentStatus(1000, 0)).toBe('unpaid');
    expect(calculatePaymentStatus(1000, 500)).toBe('partial');
    expect(calculatePaymentStatus(1000, 1000)).toBe('paid');
  });

  it('includes payments in paid and due amounts', () => {
    const totals = calculateInvoiceTotals({
      items: [{ itemType: 'consultation', name: 'Consultation', quantity: 1, unitPrice: 1000 }],
      discountType: 'none',
      gstRate: 18,
      payments: [{ amount: 400 }]
    });

    expect(totals.paidAmount).toBe(400);
    expect(totals.paymentStatus).toBe('partial');
    expect(totals.dueAmount).toBe(780);
  });
});
