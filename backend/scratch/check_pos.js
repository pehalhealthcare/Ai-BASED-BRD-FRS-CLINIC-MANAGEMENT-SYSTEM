const { connectDB } = require('../src/config/database');
const PurchaseOrder = require('../src/modules/pharmacy/purchaseOrder.model');
require('../src/config/env');

connectDB().then(async () => {
  console.log('Connected to DB');
  const count = await PurchaseOrder.countDocuments();
  console.log('Total purchase orders:', count);
  
  const all = await PurchaseOrder.find({});
  console.log('All Purchase Orders:');
  all.forEach(po => {
    console.log({
      id: po._id,
      poNumber: po.poNumber,
      status: po.status,
      totalAmount: po.totalAmount,
      createdAt: po.createdAt
    });
  });
  
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
