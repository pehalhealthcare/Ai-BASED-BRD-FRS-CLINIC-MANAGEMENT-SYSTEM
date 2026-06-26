import React from 'react';
import { useParams, Link } from 'react-router-dom';

const PaymentFailurePage = () => {
  const { id } = useParams();

  return (
    <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl border border-stone-100 text-center space-y-6">
      <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">
        ✕
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-stone-800">Payment Failed</h1>
        <p className="text-stone-500 text-sm">We could not complete your transaction. Please try again or choose another payment method.</p>
      </div>

      <div className="pt-4 flex flex-col gap-2">
        <Link
          to={`/billing/${id}/checkout`}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition text-center shadow-lg"
        >
          Try Again
        </Link>
        <Link
          to={`/billing/${id}`}
          className="text-stone-500 hover:text-stone-800 text-xs font-semibold"
        >
          View Invoice Details
        </Link>
      </div>
    </div>
  );
};

export default PaymentFailurePage;
