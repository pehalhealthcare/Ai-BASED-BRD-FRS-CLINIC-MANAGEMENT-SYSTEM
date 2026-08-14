import { useEffect, useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  User, ShieldCheck, Heart, Mail, Phone, Calendar, 
  Clock, DollarSign, Award, ChevronLeft, Edit, AlertCircle,
  ClipboardList 
} from 'lucide-react';
import { doctorApi } from '../../lib/api';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';

const DetailItem = ({ label, value, icon: Icon }) => (
  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4.5 flex items-start gap-3">
    {Icon && <Icon className="text-emerald-600 shrink-0 mt-0.5" size={16} />}
    <div>
      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">{label}</span>
      <p className="mt-1.5 text-xs font-semibold text-slate-800">{value || 'Not provided'}</p>
    </div>
  </div>
);

const DoctorDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Fetch doctor profile data using TanStack Query
  const { data: doctorRes, isLoading, error, refetch } = useQuery({
    queryKey: ['doctor-profile', id],
    queryFn: () => doctorApi.get(id)
  });

  const doctor = useMemo(() => doctorRes?.data?.doctor || doctorRes?.doctor || null, [doctorRes]);

  if (isLoading) return <LoadingState label="Loading doctor profile..." />;
  if (error || !doctor) {
    return <ErrorState title="Doctor unavailable" description={error?.message || 'No doctor profile found.'} action={<button className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => navigate('/doctors')}>Back to Doctors</button>} />;
  }

  return (
    <div className="space-y-6 bg-slate-50/50 p-2 min-h-screen">
      
      {/* Banner & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4.5">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-650 font-black text-xl flex items-center justify-center border border-emerald-100">
            {doctor.fullName?.slice(0, 2).toUpperCase() || 'DR'}
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-1.5">
              {doctor.fullName} <ShieldCheck className="text-emerald-500 fill-emerald-50 rounded-full" size={18} />
            </h1>
            <p className="text-xs text-slate-400 font-semibold">
              Doctor Code: <span className="text-slate-700 font-bold">{doctor.doctorCode || 'N/A'}</span> • {doctor.specialization || 'General Practitioner'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/doctors')}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <button
            onClick={() => navigate(`/doctors/${doctor._id}/edit`)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
          >
            <Edit size={14} /> Edit Doctor
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-start">
        
        {/* Profile Details Block */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-55 pb-2">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <User size={14} className="text-emerald-600" /> Profile Details
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="Specialization" value={doctor.specialization} icon={Heart} />
            <DetailItem label="Qualification" value={doctor.qualification} icon={Award} />
            <DetailItem label="Phone Number" value={doctor.phone} icon={Phone} />
            <DetailItem label="Email Address" value={doctor.email} icon={Mail} />
            <DetailItem label="Experience" value={doctor.experienceYears !== undefined ? `${doctor.experienceYears} Years` : 'Not provided'} icon={Award} />
            <DetailItem label="Consultation Fee" value={doctor.consultationFee ? `₹${doctor.consultationFee}` : 'Not provided'} icon={DollarSign} />
            <DetailItem label="Token Prefix" value={doctor.tokenPrefix} icon={ClipboardList} />
            <DetailItem label="Gender" value={doctor.gender} icon={User} />
            <DetailItem label="Status" value={doctor.isActive ? 'Active' : 'Inactive'} icon={ShieldCheck} />
          </div>
        </div>

        {/* Availability Block */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-55 pb-2">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={14} className="text-emerald-600" /> Availability Slots
            </h3>
            <button
              onClick={() => navigate(`/doctors/${doctor._id}/availability`)}
              className="text-[10px] font-bold text-emerald-650 hover:text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg transition"
            >
              Configure
            </button>
          </div>
          <div className="space-y-3">
            {doctor.availability?.length ? (
              doctor.availability.map((item) => (
                <div key={item.dayOfWeek} className="rounded-2xl border border-slate-100 bg-slate-50 p-4.5 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold capitalize text-slate-800">{item.dayOfWeek}</p>
                    <span className="text-[9px] text-slate-400 block mt-1 font-semibold">Slot Duration: {item.slotDurationMinutes || 30} mins</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                    item.isAvailable ? 'bg-emerald-50 text-emerald-650' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item.isAvailable ? `${item.startTime} - ${item.endTime}` : 'Unavailable'}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 p-4 bg-amber-50 text-amber-800 rounded-2xl border border-amber-100">
                <AlertCircle size={16} />
                <p className="text-[10px] font-bold">No weekly availability slots configured yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default DoctorDetailPage;
