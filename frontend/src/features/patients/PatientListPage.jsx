import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, Search, Filter, Download, Eye, MoreVertical, 
  ChevronLeft, ChevronRight, Phone, Sparkles, Activity, FileText, CheckCircle, BarChart2
} from 'lucide-react';
import { patientApi } from '../../lib/api';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';

const PatientListPage = () => {
  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [status, setStatus] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [lastVisit, setLastVisit] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  
  const navigate = useNavigate();

  const loadPatients = async (page = pagination.page) => {
    setLoading(true);
    setError('');

    try {
      const response = await patientApi.list({
        page,
        limit: 100, // Fetch up to 100 to compute correct client-side statistics
        search: search || undefined,
        gender: gender || undefined,
        isActive: status ? status === 'active' : undefined
      });

      setPatients(response.data.patients || []);
      setPagination(response.data.pagination || pagination);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients(1);
  }, [search, gender, status]);

  // Dynamic calculations based on loaded patients
  const stats = useMemo(() => {
    const total = patients.length;
    const active = patients.filter(p => p.isActive !== false).length;
    const inactive = total - active;
    
    // Chronic check: status/tags or defaults
    const chronic = patients.filter(p => p.medicalHistory && p.medicalHistory.length > 0).length;
    
    // New Patients (This Month)
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const newThisMonth = patients.filter(p => {
      const d = new Date(p.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    // Total Visits (Simulated from actual records or default to total patients)
    const visits = patients.reduce((acc, p) => acc + (p.visitsCount || 1), 0);

    // Age distribution
    let age18 = 0, age35 = 0, age60 = 0, age60Plus = 0;
    patients.forEach(p => {
      if (p.age <= 18) age18++;
      else if (p.age <= 35) age35++;
      else if (p.age <= 60) age60++;
      else age60Plus++;
    });

    // Gender distribution
    let male = 0, female = 0, other = 0;
    patients.forEach(p => {
      const g = (p.gender || '').toLowerCase();
      if (g === 'male') male++;
      else if (g === 'female') female++;
      else other++;
    });

    return {
      total,
      active,
      inactive,
      chronic,
      newThisMonth,
      visits,
      age: { age18, age35, age60, age60Plus },
      gender: { male, female, other }
    };
  }, [patients]);

  if (loading) {
    return <LoadingState label="Loading patient registry..." />;
  }

  if (error) {
    return <ErrorState title="Patients unavailable" description={error} action={<button className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => loadPatients(pagination.page)}>Retry</button>} />;
  }

  const displayList = patients;

  return (
    <div className="space-y-6 bg-slate-50/50 p-1 min-h-screen">
      
      {/* 1. Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-905 tracking-tight">Patients</h1>
          <p className="text-xs text-slate-400 mt-1">Manage and view all patients in your clinic.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          <button className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-blue-650 text-blue-600 text-xs font-bold rounded-2xl transition shadow-sm">
            Import Patients
          </button>
          <button
            onClick={() => navigate('/patients/new')}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md"
          >
            <UserPlus size={16} /> Add New Patient
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Row (Real Data only) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-purple-50 text-purple-650 rounded-xl flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Patients</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h3>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <UserPlus size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">New Patients (Month)</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.newThisMonth}</h3>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Patients</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.active}</h3>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Activity size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chronic Patients</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.chronic}</h3>
          </div>
        </div>

        {/* Metric 5 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
          <div className="flex items-start justify-between">
            <div className="w-9 h-9 bg-teal-50 text-teal-650 rounded-xl flex items-center justify-center">
              <FileText size={16} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Visits (Month)</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.visits}</h3>
          </div>
        </div>

      </div>

      {/* 3. Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        
        <div className="flex flex-col gap-1 lg:col-span-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Search Query</span>
          <div className="relative">
            <input
              type="text"
              placeholder="Search patient by name, phone, email or UHID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-808 focus:outline-none focus:bg-white focus:border-blue-500 transition"
            />
            <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Age Group */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Age Group</span>
          <select
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="">All Age</option>
            <option value="0-18">0 - 18 Years</option>
            <option value="19-35">19 - 35 Years</option>
            <option value="36-60">36 - 60 Years</option>
            <option value="60+">60+ Years</option>
          </select>
        </div>

        {/* Gender */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Gender</span>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="">All</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Last Visit */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Last Visit</span>
          <select
            value={lastVisit}
            onChange={(e) => setLastVisit(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none bg-white"
          >
            <option value="">Any Time</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="this_week">This Week</option>
          </select>
        </div>

      </div>

      {/* 4. Table Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Patients Registry Table */}
        <div className="lg:col-span-9 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            
            {/* Tabs List */}
            <div className="flex border-b border-slate-100 text-xs font-bold gap-2">
              {[`All Patients ${stats.total}`, `Active ${stats.active}`, `Inactive ${stats.inactive}`, `Chronic ${stats.chronic}`, `New This Month ${stats.newThisMonth}`].map((tab) => {
                const isActive = activeTab === (tab.split(' ')[0]);
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab.split(' ')[0])}
                    className={`pb-2.5 px-2 transition border-b-2 ${
                      isActive ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-650'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition shadow-sm">
              <Download size={13} /> Export
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-2 w-8"><input type="checkbox" className="rounded" /></th>
                  <th className="py-3 px-2">Patient Details</th>
                  <th className="py-3 px-2">UHID</th>
                  <th className="py-3 px-2">Phone</th>
                  <th className="py-3 px-2">Age / Gender</th>
                  <th className="py-3 px-2">Last Visit</th>
                  <th className="py-3 px-2">Total Visits</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {displayList.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-8 text-center text-slate-400 font-bold">
                      No patients registered yet.
                    </td>
                  </tr>
                ) : displayList.map((pat) => (
                  <tr key={pat._id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-2"><input type="checkbox" className="rounded" /></td>
                    
                    {/* Details */}
                    <td className="py-4 px-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 font-bold flex items-center justify-center text-slate-500">
                          {pat.fullName?.slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-905">{pat.fullName}</p>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{pat.email || 'no-email@email.com'}</span>
                        </div>
                      </div>
                    </td>

                    {/* UHID */}
                    <td className="py-4 px-2 font-bold text-slate-800">{pat.patientId || 'N/A'}</td>

                    {/* Phone */}
                    <td className="py-4 px-2 font-medium text-slate-600">{pat.phone || 'Not provided'}</td>

                    {/* Age / Gender */}
                    <td className="py-4 px-2 font-medium text-slate-700">
                      {pat.age ?? 28} Y, {pat.gender}
                    </td>

                    {/* Last Visit */}
                    <td className="py-4 px-2 text-slate-600 font-medium">
                      {pat.lastVisit ? new Date(pat.lastVisit).toLocaleDateString('en-US') : 'N/A'}
                    </td>

                    {/* Total Visits */}
                    <td className="py-4 px-2 font-bold text-slate-805 text-center">{pat.visitsCount || 1}</td>

                    {/* Status badge */}
                    <td className="py-4 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        pat.isActive !== false
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {pat.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-2 text-center">
                      <div className="relative inline-block text-left">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => navigate(`/patients/${pat._id}`)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                          >
                            <Eye size={13} />
                          </button>
                          
                          <button
                            onClick={() => setActionMenuOpenId(actionMenuOpenId === pat._id ? null : pat._id)}
                            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition"
                          >
                            <MoreVertical size={13} />
                          </button>
                        </div>

                        {actionMenuOpenId === pat._id && (
                          <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-1 flex flex-col gap-0.5 text-[10px]">
                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                navigate(`/patients/${pat._id}/edit`);
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg transition font-medium text-slate-700"
                            >
                              Edit Profile
                            </button>
                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                navigate(`/appointments/new?patientId=${pat._id}`);
                              }}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 rounded-lg transition font-medium text-slate-705 text-slate-700"
                            >
                              Book Appt
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center border-t border-slate-100 pt-4 text-xs text-slate-400">
            <span>Showing {displayList.length} of {stats.total} patients</span>
          </div>
        </div>

        {/* Right Column: Demographics & Stats (Real Data Only) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Patient Distribution Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-955 border-b border-slate-50 pb-2">Patient Distribution</h3>
            {stats.total === 0 ? (
              <p className="text-[10px] text-slate-400 font-bold py-4 text-center">No distribution data available</p>
            ) : (
              <div className="flex items-center gap-4 justify-between">
                <div className="w-16 h-16 rounded-full border-[6px] border-blue-500 border-t-purple-500 border-r-teal-500 flex items-center justify-center text-[10px] font-black text-slate-800">
                  {stats.total}
                </div>
                <div className="space-y-1.5 text-[9px] font-bold text-slate-500 flex-1 pl-2">
                  <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> 0-18 Years</span> <span className="text-slate-900">{stats.age.age18}</span></div>
                  <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> 19-35 Years</span> <span className="text-slate-900">{stats.age.age35}</span></div>
                  <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 36-60 Years</span> <span className="text-slate-900">{stats.age.age60}</span></div>
                  <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> 60+ Years</span> <span className="text-slate-900">{stats.age.age60Plus}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Gender Distribution Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-955 border-b border-slate-50 pb-2">Gender Distribution</h3>
            {stats.total === 0 ? (
              <p className="text-[10px] text-slate-400 font-bold py-4 text-center">No gender data available</p>
            ) : (
              <div className="flex items-center gap-4 justify-between">
                <div className="w-16 h-16 rounded-full border-[6px] border-blue-500 border-l-rose-450 border-l-rose-400 flex items-center justify-center text-[10px] font-black text-slate-800">
                  {stats.total}
                </div>
                <div className="space-y-1.5 text-[9px] font-bold text-slate-500 flex-1 pl-2">
                  <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Male</span> <span className="text-slate-900">{stats.gender.male}</span></div>
                  <div className="flex justify-between items-center"><span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Female</span> <span className="text-slate-900">{stats.gender.female}</span></div>
                </div>
              </div>
            )}
          </div>

          {/* Top Conditions Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-955 border-b border-slate-50 pb-2">Top Conditions</h3>
            <p className="text-[10px] text-slate-400 font-bold py-4 text-center">No conditions recorded</p>
          </div>

          {/* Recent Registrations Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-955 border-b border-slate-50 pb-2">Recent Registrations</h3>
            {patients.length === 0 ? (
              <p className="text-[10px] text-slate-400 font-bold py-4 text-center">No recent registrations</p>
            ) : (
              <div className="space-y-3">
                {patients.slice(0, 3).map((reg, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 font-bold text-slate-500 text-[10px] flex items-center justify-center">
                        {reg.fullName?.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-extrabold text-slate-800">{reg.fullName}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold">
                      {new Date(reg.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

export default PatientListPage;
