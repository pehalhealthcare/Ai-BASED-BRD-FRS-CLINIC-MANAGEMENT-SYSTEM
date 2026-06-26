import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getInvoiceById } from './billing.api';
import LoadingState from '../../components/common/LoadingState';

const PaymentSuccessPage = () => {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id === 'all') {
      setInvoice({
        invoiceNumber: 'ALL-UNPAID-BILLS',
        patientPayableAmount: 'Total Outstanding',
        serviceType: 'Multiple Services'
      });
      setLoading(false);
      return;
    }
    const fetchInvoice = async () => {
      try {
        const res = await getInvoiceById(id);
        setInvoice(res.data.invoice);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl border border-stone-100 text-center space-y-6">
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
        ✓
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-stone-800">Payment Successful!</h1>
        <p className="text-stone-500 text-sm">Your payment has been verified and processed successfully.</p>
      </div>

      <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200/60 text-sm space-y-2 text-left">
        <div className="flex justify-between">
          <span className="text-stone-500">Invoice Number:</span>
          <span className="font-semibold text-stone-800">{invoice?.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Amount Paid:</span>
          <span className="font-semibold text-stone-800">₹{invoice?.patientPayableAmount}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Service:</span>
          <span className="font-semibold text-stone-800">{invoice?.serviceType}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">Status:</span>
          <span className="px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">PAID</span>
        </div>
      </div>

      <div className="pt-4 flex flex-col gap-2">
        <Link
          to="/portal?tab=billing"
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition text-center shadow-lg"
        >
          Go to Billing Dashboard
        </Link>
        <Link
          to="/portal?tab=billing"
          className="text-stone-500 hover:text-stone-800 text-xs font-semibold"
        >
          Go to Billing Dashboard
        </Link>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
