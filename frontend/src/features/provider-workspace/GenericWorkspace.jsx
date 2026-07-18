import React, { useState } from 'react';
import { 
  Building2, Calendar, ClipboardList, TrendingUp, ShieldCheck, 
  Search, ArrowRight, UserCheck, AlertCircle, Sparkles
} from 'lucide-react';

const GenericWorkspace = ({ tab, type, user }) => {
  const [orders, setOrders] = useState([
    { id: 'WO-201', patient: 'Sandeep Sharma', doctor: 'Dr. Shalini Mehta', procedure: 'Cervical Spine Traction', status: 'Pending', date: '2026-07-19' },
    { id: 'WO-202', patient: 'Meena Devi', doctor: 'Dr. Shalini Mehta', procedure: 'Lower Back Ultrasound Therapy', status: 'Completed', date: '2026-07-19' }
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div className="space-y-6 bg-slate-50/50 p-1 min-h-screen pb-16">
      
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-905 tracking-tight flex items-center gap-2">
            <Building2 className="text-purple-650" size={24} /> {capitalizedType} Provider Workspace
          </h1>
          <p className="text-xs text-slate-400 mt-1">Operational Unit: Clinic {capitalizedType} Center | Staff: {user?.name}</p>
        </div>
      </div>

      {/* --- DASHBOARD TAB --- */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 bg-purple-50 text-purple-650 rounded-xl flex items-center justify-center">
                  <ClipboardList size={16} />
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Live</span>
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Workorders</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{orders.length}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 bg-blue-50 text-blue-650 rounded-xl flex items-center justify-center">
                  <Calendar size={16} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scheduled Today</p>
                <h3 className="text-2xl font-black text-slate-905 mt-1">{orders.filter(o => o.status === 'Pending').length}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <UserCheck size={16} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Sessions</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{orders.filter(o => o.status === 'Completed').length}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between min-h-[120px]">
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 bg-purple-50 text-indigo-650 rounded-xl flex items-center justify-center">
                  <TrendingUp size={16} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operational Score</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">98%</h3>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Active Session Queue</h3>
            <div className="divide-y divide-slate-50">
              {orders.map(order => (
                <div key={order.id} className="py-3.5 flex justify-between items-center text-xs">
                  <div>
                    <h4 className="font-extrabold text-slate-905">{order.procedure}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Patient: {order.patient} | Prescribed by: {order.doctor}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                    order.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- ORDERS TAB --- */}
      {tab === 'orders' && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Work Orders</h3>
          <div className="relative">
            <input 
              type="text"
              placeholder="Search workorders by patient name, procedure..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-xs focus:outline-none"
            />
            <Search size={14} className="absolute left-2.5 top-3 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100">
            {orders.map(order => (
              <div key={order.id} className="py-4 flex justify-between items-center text-xs">
                <div>
                  <h4 className="font-extrabold text-slate-905">{order.procedure}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Patient: {order.patient} | ID: {order.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-455 font-semibold">Scheduled: {order.date}</span>
                  <button 
                    onClick={() => {
                      setOrders(orders.map(o => o.id === order.id ? { ...o, status: 'Completed' } : o));
                    }}
                    className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-bold transition"
                  >
                    Mark Complete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- REPORTS TAB --- */}
      {tab === 'reports' && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-8 text-center text-slate-400 py-16 font-bold space-y-2">
          <Sparkles size={36} className="mx-auto text-purple-650" />
          <p>{capitalizedType} operational reports &amp; analytics details.</p>
          <p className="text-xs font-semibold text-slate-400">PDF, Excel, and CSV export capabilities are ready.</p>
        </div>
      )}

      {/* --- SETTINGS TAB --- */}
      {tab === 'settings' && (
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-black text-slate-900 border-b border-slate-50 pb-2">Workspace Configuration</h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-bold block mb-1">Operational Mode</span>
              <span className="text-slate-900 font-extrabold">Internal - Clinic-Internal Operations</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold block mb-1">Assigned Operational Branch</span>
              <span className="text-slate-900 font-extrabold">{user?.clinic?.name || 'Main HQ Branch'}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GenericWorkspace;
