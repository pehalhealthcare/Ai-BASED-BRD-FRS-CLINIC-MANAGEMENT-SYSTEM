import React, { useEffect, useState } from 'react';
import { settlementsApi, doctorApi, paymentApi } from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';

const FinancialDashboard = () => {
  const [activeTab, setActiveTab] = useState('orgRevenue');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Org data
  const [orgEarnings, setOrgEarnings] = useState([]);
  // Doctor data
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [docEarnings, setDocEarnings] = useState([]);
  const [docPayouts, setDocPayouts] = useState([]);
  const [docSettings, setDocSettings] = useState({ paymentMode: 'REVENUE_SHARE', revenuePercentage: 80, monthlySalary: 0, bankDetails: '' });
  // Org Settings
  const [financialSettings, setFinancialSettings] = useState({ automaticSettlement: false, doctorRevenuePercentage: 80, clinicRevenuePercentage: 20, bankDetails: '' });
  // Transactions
  const [transactions, setTransactions] = useState([]);

  // Payout action state
  const [selectedEarning, setSelectedEarning] = useState(null);
  const [payoutForm, setPayoutForm] = useState({ transactionRef: '', remarks: '' });
  const [submittingPayout, setSubmittingPayout] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch organization earnings
      const orgRes = await settlementsApi.getOrganizationEarnings();
      setOrgEarnings(orgRes.data.earnings || []);

      // 2. Fetch doctors
      const docRes = await doctorApi.list();
      const docs = docRes.data.doctors || [];
      setDoctors(docs);
      if (docs.length > 0) {
        setSelectedDoctor(docs[0]._id);
      }

      // 3. Fetch financial settings (assume dummy org id)
      const settingsRes = await settlementsApi.getOrgFinancialSettings('default');
      if (settingsRes?.data?.settings) {
        setFinancialSettings(settingsRes.data.settings);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load financial dashboards.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDoctor) {
      fetchDoctorFinancials(selectedDoctor);
    }
  }, [selectedDoctor]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab]);

  const fetchDoctorFinancials = async (docId) => {
    try {
      const earnRes = await settlementsApi.getDoctorEarnings(docId);
      setDocEarnings(earnRes.data.earnings || []);

      const settingsRes = await settlementsApi.getDoctorPayoutSettings(docId);
      if (settingsRes?.data?.settings) {
        setDocSettings(settingsRes.data.settings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async () => {
    try {
      // Fetch settlement history as transaction logs
      const historyRes = await settlementsApi.getSettlementHistory();
      setTransactions(historyRes.data.history || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOrgSettings = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    try {
      await settlementsApi.updateOrgFinancialSettings('default', financialSettings);
      setSuccess('Organization financial settings updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings.');
    }
  };

  const handleUpdateDocSettings = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    try {
      await settlementsApi.updateDoctorPayoutSettings(selectedDoctor, docSettings);
      setSuccess('Doctor payout settings updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings.');
    }
  };

  const handleMarkPaid = async (e) => {
    e.preventDefault();
    setSubmittingPayout(true);
    setError('');
    try {
      await settlementsApi.markPaid({
        doctorEarningId: selectedEarning._id,
        transactionRef: payoutForm.transactionRef,
        remarks: payoutForm.remarks
      });
      setSelectedEarning(null);
      setPayoutForm({ transactionRef: '', remarks: '' });
      setSuccess('Payout marked as paid successfully.');
      fetchDoctorFinancials(selectedDoctor);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit payout details.');
    } finally {
      setSubmittingPayout(false);
    }
  };

  const handleGenerateSettlements = async () => {
    setSuccess('');
    setError('');
    try {
      await settlementsApi.generateSettlement({});
      setSuccess('Auto settlements processed and ready for payout.');
      fetchInitialData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run settlement engine.');
    }
  };

  const totalOrgRevenue = orgEarnings.reduce((acc, curr) => acc + (curr.netRevenue || 0), 0);
  const totalGrossRevenue = orgEarnings.reduce((acc, curr) => acc + (curr.grossRevenue || 0), 0);
  const totalInsuranceAmount = orgEarnings.reduce((acc, curr) => acc + (curr.insuranceAmount || 0), 0);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-stone-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Financial & Settlement Portal</h1>
          <p className="text-stone-500 text-sm">Manage organization revenues, doctor earnings, payouts, and settlements.</p>
        </div>
        <button
          onClick={handleGenerateSettlements}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-5 rounded-2xl text-sm transition shadow-md"
        >
          ⚙️ Run Settlement Engine
        </button>
      </div>

      {success && <div className="p-4 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100 text-sm font-medium">{success}</div>}
      {error && <div className="p-4 bg-red-50 text-red-800 rounded-2xl border border-red-100 text-sm font-medium">{error}</div>}

      {/* Tabs */}
      <div className="flex border-b border-stone-200 gap-6">
        <button
          onClick={() => setActiveTab('orgRevenue')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'orgRevenue' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          🏥 Org Revenue
        </button>
        <button
          onClick={() => setActiveTab('doctorEarnings')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'doctorEarnings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          🩺 Doctor Earnings & Payouts
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'settings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          ⚙️ Financial Settings
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`pb-3 text-sm font-semibold border-b-2 transition ${
            activeTab === 'transactions' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          📜 Transaction History
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'orgRevenue' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-2">
              <span className="text-stone-400 text-xs font-semibold uppercase tracking-wider">Gross revenue</span>
              <div className="text-3xl font-bold text-stone-800">₹{totalGrossRevenue}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-2">
              <span className="text-stone-400 text-xs font-semibold uppercase tracking-wider">Insurance Covered</span>
              <div className="text-3xl font-bold text-stone-800">₹{totalInsuranceAmount}</div>
            </div>
            <div className="bg-emerald-600 text-white p-6 rounded-3xl shadow-sm space-y-2">
              <span className="opacity-80 text-xs font-semibold uppercase tracking-wider">Net Organization Revenue</span>
              <div className="text-3xl font-bold">₹{totalOrgRevenue}</div>
            </div>
          </div>

          {/* Org Revenue List */}
          <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100">
              <h3 className="font-bold text-stone-800">Revenue Records</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 font-semibold border-b">
                    <th className="p-4">Invoice ID</th>
                    <th className="p-4">Gross Revenue</th>
                    <th className="p-4">Insurance Paid</th>
                    <th className="p-4">Patient Paid</th>
                    <th className="p-4">Org Net Share</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-stone-700">
                  {orgEarnings.map((earn) => (
                    <tr key={earn._id}>
                      <td className="p-4 font-mono text-xs">{earn.invoiceId}</td>
                      <td className="p-4 font-semibold">₹{earn.grossRevenue}</td>
                      <td className="p-4">₹{earn.insuranceAmount}</td>
                      <td className="p-4">₹{earn.patientAmount}</td>
                      <td className="p-4 text-emerald-600 font-bold">₹{earn.netRevenue}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          earn.status === 'SETTLED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {earn.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {orgEarnings.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-stone-400">No revenue records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'doctorEarnings' && (
        <div className="space-y-6">
          {/* Doctor Selector */}
          <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Selected Doctor</label>
              <select
                value={selectedDoctor}
                onChange={(e) => setSelectedDoctor(e.target.value)}
                className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-emerald-500 outline-none w-64"
              >
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>{d.fullName || `${d.firstName} ${d.lastName}`}</option>
                ))}
              </select>
            </div>

            {/* Doctor Payout Settings Summary */}
            <div className="bg-stone-50 p-4 rounded-2xl border flex items-center gap-6">
              <div>
                <span className="text-stone-400 text-xs font-semibold block">Payout Mode</span>
                <span className="font-bold text-stone-800 text-sm">{docSettings.paymentMode}</span>
              </div>
              <div>
                <span className="text-stone-400 text-xs font-semibold block">Rev Share %</span>
                <span className="font-bold text-stone-800 text-sm">{docSettings.revenuePercentage}%</span>
              </div>
              <div>
                <span className="text-stone-400 text-xs font-semibold block">Salary (Monthly)</span>
                <span className="font-bold text-stone-800 text-sm">₹{docSettings.monthlySalary || 0}</span>
              </div>
            </div>
          </div>

          {/* Doctor Earnings list */}
          <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100">
              <h3 className="font-bold text-stone-800">Earnings & Payout Items</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 font-semibold border-b">
                    <th className="p-4">Type</th>
                    <th className="p-4">Invoice Amount</th>
                    <th className="p-4">Doctor Share</th>
                    <th className="p-4">Clinic Commission</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-stone-700">
                  {docEarnings.map((earn) => (
                    <tr key={earn._id}>
                      <td className="p-4 font-semibold text-xs">{earn.earningType}</td>
                      <td className="p-4">₹{earn.grossAmount}</td>
                      <td className="p-4 text-emerald-600 font-bold">₹{earn.doctorShare}</td>
                      <td className="p-4">₹{earn.clinicShare}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          earn.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {earn.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {earn.status !== 'PAID' && (
                          <button
                            onClick={() => setSelectedEarning(earn)}
                            className="bg-emerald-600 text-white text-xs font-bold py-1.5 px-3.5 rounded-xl hover:bg-emerald-700 transition"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {docEarnings.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-stone-400">No earnings recorded for this doctor.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Org Settings */}
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-stone-800 border-b pb-2">Organization Settings</h3>
            <form onSubmit={handleUpdateOrgSettings} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-stone-700">Enable Auto Settlement</span>
                <input
                  type="checkbox"
                  checked={financialSettings.automaticSettlement}
                  onChange={(e) => setFinancialSettings({ ...financialSettings, automaticSettlement: e.target.checked })}
                  className="w-5 h-5 accent-emerald-600"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Doctor Revenue Share %</label>
                <input
                  type="number"
                  value={financialSettings.doctorRevenuePercentage}
                  onChange={(e) => setFinancialSettings({ ...financialSettings, doctorRevenuePercentage: Number(e.target.value) })}
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Org Revenue Share %</label>
                <input
                  type="number"
                  value={financialSettings.clinicRevenuePercentage}
                  onChange={(e) => setFinancialSettings({ ...financialSettings, clinicRevenuePercentage: Number(e.target.value) })}
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Org Bank Details</label>
                <textarea
                  value={financialSettings.bankDetails}
                  onChange={(e) => setFinancialSettings({ ...financialSettings, bankDetails: e.target.value })}
                  rows="3"
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow"
              >
                Save Org Settings
              </button>
            </form>
          </div>

          {/* Selected Doctor Payout Settings */}
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-stone-800 border-b pb-2">Doctor Payout Settings</h3>
            <form onSubmit={handleUpdateDocSettings} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Payment Mode</label>
                <select
                  value={docSettings.paymentMode}
                  onChange={(e) => setDocSettings({ ...docSettings, paymentMode: e.target.value })}
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                >
                  <option value="REVENUE_SHARE">Revenue Share</option>
                  <option value="MONTHLY_SALARY">Monthly Salary</option>
                  <option value="MANUAL">Manual Settlements</option>
                </select>
              </div>
              {docSettings.paymentMode !== 'MONTHLY_SALARY' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Doctor Revenue Share %</label>
                  <input
                    type="number"
                    value={docSettings.revenuePercentage}
                    onChange={(e) => setDocSettings({ ...docSettings, revenuePercentage: Number(e.target.value) })}
                    className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
              )}
              {docSettings.paymentMode === 'MONTHLY_SALARY' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Monthly Salary</label>
                  <input
                    type="number"
                    value={docSettings.monthlySalary}
                    onChange={(e) => setDocSettings({ ...docSettings, monthlySalary: Number(e.target.value) })}
                    className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Bank Details</label>
                <textarea
                  value={docSettings.bankDetails}
                  onChange={(e) => setDocSettings({ ...docSettings, bankDetails: e.target.value })}
                  rows="3"
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 text-sm focus:border-emerald-500 outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow"
              >
                Save Doctor Settings
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-stone-100">
            <h3 className="font-bold text-stone-800">Manual & Auto Settlement History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-stone-50 text-stone-500 font-semibold border-b">
                  <th className="p-4">Settlement Date</th>
                  <th className="p-4">Org ID / Doctor ID</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y text-stone-700">
                {transactions.map((t, index) => (
                  <tr key={index}>
                    <td className="p-4">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 font-mono text-xs">{t.doctorId || t.organizationId}</td>
                    <td className="p-4">{t.earningType || 'ORGANIZATION_REVENUE'}</td>
                    <td className="p-4 font-semibold text-emerald-600">₹{t.doctorShare || t.netRevenue}</td>
                    <td className="p-4 font-mono text-xs">{t.payoutDetails?.transactionRef || 'SYSTEM_AUTO'}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-stone-400">No transaction history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {selectedEarning && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-stone-100 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="font-bold text-stone-800 text-lg">Mark Doctor Payout as Paid</h3>
              <button onClick={() => setSelectedEarning(null)} className="text-stone-400 hover:text-stone-600">✕</button>
            </div>

            <form onSubmit={handleMarkPaid} className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-stone-400 block uppercase">Paying Doctor Share</span>
                <span className="text-2xl font-bold text-stone-800">₹{selectedEarning.doctorShare}</span>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Transaction Reference</label>
                <input
                  type="text"
                  required
                  value={payoutForm.transactionRef}
                  onChange={(e) => setPayoutForm({ ...payoutForm, transactionRef: e.target.value })}
                  placeholder="e.g. TXN-12903810"
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Remarks</label>
                <textarea
                  value={payoutForm.remarks}
                  onChange={(e) => setPayoutForm({ ...payoutForm, remarks: e.target.value })}
                  placeholder="Additional remarks..."
                  rows="3"
                  className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm focus:border-emerald-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submittingPayout}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow disabled:opacity-50"
              >
                {submittingPayout ? 'Submitting...' : 'Confirm Payout'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialDashboard;
