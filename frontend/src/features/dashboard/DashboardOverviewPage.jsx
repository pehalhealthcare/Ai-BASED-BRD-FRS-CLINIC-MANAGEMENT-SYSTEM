import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';
import { ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';
import ActivityFeed from './ActivityFeed';
import DateRangeFilter from './DateRangeFilter';
import {
  getDashboardActivityFeed,
  getDashboardDoctorWorkload,
  getDashboardOverview
} from './dashboardApi';
import { doctorApi } from '../../lib/api';
import SectionCard from './SectionCard';
import StatCard from './StatCard';
import QueueStatusWidget from './QueueStatusWidget';

const overviewLinks = [
  { label: 'Appointments', to: '/dashboard/appointments', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR] },
  { label: 'Revenue', to: '/dashboard/revenue', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN] },
  { label: 'Patients', to: '/dashboard/patients', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST] },
  { label: 'Labs', to: '/dashboard/labs', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR] },
  { label: 'Pharmacy', to: '/dashboard/pharmacy', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PHARMACIST] },
  { label: 'Notifications', to: '/dashboard/notifications', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR] }
];

const roleTitles = {
  [ROLES.DOCTOR]: {
    title: 'Doctor dashboard',
    description: 'Your clinic workload at a glance — appointments, consultations, prescriptions, and follow-ups scoped to your practice.'
  },
  [ROLES.RECEPTIONIST]: {
    title: 'Front desk dashboard',
    description: 'Operational KPIs for scheduling, patient intake, billing follow-up, and clinic activity.'
  },
  [ROLES.ADMIN]: {
    title: 'Admin dashboard',
    description: 'Operational KPIs across appointments, patients, billing, labs, pharmacy, and follow-up workflows.'
  },
  [ROLES.SUPER_ADMIN]: {
    title: 'Admin dashboard',
    description: 'Operational KPIs across appointments, patients, billing, labs, pharmacy, and follow-up workflows.'
  }
};

const DashboardOverviewPage = () => {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role);
  const isReceptionist = role === ROLES.RECEPTIONIST;
  const isDoctor = role === ROLES.DOCTOR;
  const canViewActivity = isAdmin || isReceptionist;
  const canViewWorkload = isAdmin;
  const canViewQueue = isAdmin || isReceptionist || isDoctor;

  const visibleLinks = useMemo(
    () => overviewLinks.filter((link) => link.roles.includes(role)),
    [role]
  );

  const headerCopy = roleTitles[role] || {
    title: 'Dashboard overview',
    description: 'Operational KPIs for your clinic role.'
  };

  const [filters, setFilters] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [doctorWorkload, setDoctorWorkload] = useState([]);

  const [showSlotAcceptModal, setShowSlotAcceptModal] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [acceptingSlot, setAcceptingSlot] = useState(false);
  const [acceptError, setAcceptError] = useState('');

  useEffect(() => {
    if (isDoctor && user?.initialSlotAccepted && !user?.hasAcceptedSlot) {
      const fetchProfile = async () => {
        try {
          const res = await doctorApi.getMyProfile();
          setDoctorProfile(res.data?.doctor || res.data || null);
          setShowSlotAcceptModal(true);
        } catch (err) {
          console.error("Failed to load doctor profile/availability:", err);
        }
      };
      fetchProfile();
    }
  }, [isDoctor, user]);

  const handleAcceptSlots = async () => {
    setAcceptError('');
    setAcceptingSlot(true);
    try {
      await doctorApi.acceptMySlot();
      window.location.reload();
    } catch (err) {
      setAcceptError(err.response?.data?.message || 'Failed to accept slots. Please try again.');
    } finally {
      setAcceptingSlot(false);
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      try {
        const overviewResponse = await getDashboardOverview(filters);
        setOverview(overviewResponse.data || {});

        if (canViewActivity) {
          try {
            const activityResponse = await getDashboardActivityFeed({ limit: 12 });
            setActivityFeed(activityResponse.data || []);
          } catch (_activityError) {
            setActivityFeed([]);
          }
        } else {
          setActivityFeed([]);
        }

        if (canViewWorkload) {
          try {
            const workloadResponse = await getDashboardDoctorWorkload(filters);
            setDoctorWorkload(workloadResponse.data?.doctors || []);
          } catch (_workloadError) {
            setDoctorWorkload([]);
          }
        } else {
          setDoctorWorkload([]);
        }
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load dashboard overview.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [canViewActivity, canViewWorkload, filters]);

  if (loading) {
    return <LoadingState label="Loading dashboard overview..." />;
  }

  if (error) {
    return <ErrorState title="Dashboard unavailable" description={error} />;
  }

  const cards = overview?.cards || {};
  const allCardItems = [
    { label: 'Total patients', value: cards.totalPatients ?? 0, hint: 'All patients in this clinic scope.', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST] },
    { label: 'New patients', value: cards.newPatients ?? 0, hint: 'Created inside the selected range.', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST] },
    { label: "Today's appointments", value: cards.todayAppointments ?? 0, hint: 'Counted from live appointment records.', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR] },
    { label: 'Pending appointments', value: cards.pendingAppointments ?? 0, hint: 'Booked, confirmed, checked-in, or in consultation.', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR] },
    { label: 'Completed consultations', value: cards.completedConsultations ?? 0, hint: 'Finished consultations in range.', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR] },
    { label: 'Active prescriptions', value: cards.activePrescriptions ?? 0, hint: 'Finalized prescriptions in range.', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR] },
    { label: 'Pending invoices', value: cards.pendingInvoices ?? 0, hint: 'Unpaid or partial invoices in range.', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST] },
    { label: 'Lab orders', value: cards.labOrders ?? 0, hint: 'Orders created in range.', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR] },
    { label: 'Low-stock medicines', value: cards.lowStockMedicines ?? 0, hint: 'Current inventory snapshot.', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PHARMACIST] },
    { label: 'Pending follow-ups', value: cards.pendingFollowUps ?? 0, hint: 'Tasks still awaiting action.', roles: [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR] }
  ];
  const cardItems = allCardItems.filter((item) => item.roles.includes(role));

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Analytics"
        title={headerCopy.title}
        description={headerCopy.description}
        actions={visibleLinks.map((link) => (
          <Link
            key={link.to}
            className="inline-flex items-center justify-center rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
            to={link.to}
          >
            {link.label}
          </Link>
        ))}
      />

      <DateRangeFilter value={filters} onApply={setFilters} isLoading={loading} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cardItems.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        {canViewActivity ? (
          <SectionCard
            title="Recent activity"
            description="A clinic-wide feed of the latest appointments, consultations, invoices, lab reports, dispensings, and notifications."
          >
            <ActivityFeed items={activityFeed} />
          </SectionCard>
        ) : (
          <SectionCard
            title="Quick actions"
            description="Jump into your day-to-day workflows."
          >
            <div className="grid gap-3">
              {isDoctor ? (
                <>
                  <Link className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-100" to="/appointments">
                    View today&apos;s appointments
                  </Link>
                  <Link className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-100" to="/consultations">
                    Open consultations
                  </Link>
                  <Link className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-800 hover:bg-emerald-100" to="/prescriptions">
                    Manage prescriptions
                  </Link>
                </>
              ) : null}
            </div>
          </SectionCard>
        )}

        <SectionCard
          title="Range summary"
          description={`Range: ${overview?.range?.from || 'Last 30 days'} to ${overview?.range?.to || 'today'}`}
        >
          <div className="grid gap-3">
            {(isReceptionist || isAdmin) ? (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Front desk watchlist</p>
                <p className="mt-2 text-sm text-stone-700">
                  Pending appointments: <span className="font-semibold text-stone-900">{cards.pendingAppointments ?? 0}</span>
                </p>
                <p className="mt-1 text-sm text-stone-700">
                  Pending invoices: <span className="font-semibold text-stone-900">{cards.pendingInvoices ?? 0}</span>
                </p>
              </div>
            ) : null}

            {canViewQueue ? <QueueStatusWidget /> : null}

            {canViewWorkload ? (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Doctor workload snapshot</p>
                {!doctorWorkload.length ? (
                  <p className="mt-2 text-sm text-stone-600">No doctor activity is available for this range.</p>
                ) : (
                  <ul className="mt-2 grid gap-2 text-sm text-stone-700">
                    {doctorWorkload.slice(0, 4).map((doctor) => (
                      <li key={doctor.doctorId} className="flex items-center justify-between gap-3">
                        <span>{doctor.doctorName}</span>
                        <span className="font-semibold text-stone-900">
                          {doctor.appointments} appts / {doctor.consultations} consults
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {isDoctor ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Your workload</p>
                <p className="mt-2 text-sm text-emerald-900">
                  Today: {cards.todayAppointments ?? 0} appointments, {cards.completedConsultations ?? 0} completed consultations, {cards.activePrescriptions ?? 0} active prescriptions.
                </p>
              </div>
            ) : null}

            {isAdmin ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Financial context</p>
                <p className="mt-2 text-sm text-emerald-900">
                  Dashboard revenue detail lives in the backend-backed summary view, with invoice and pharmacy revenue combined safely.
                </p>
                <Link className="mt-3 inline-flex text-sm font-semibold text-emerald-800 hover:text-emerald-900" to="/dashboard/revenue">
                  Open revenue summary
                </Link>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      {showSlotAcceptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white border border-stone-200 shadow-2xl p-6 md:p-8 relative overflow-hidden">
            {/* Top decorative gradient bar */}
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-500"></div>

            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 mb-6 mx-auto">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h3 className="text-2xl font-black text-stone-900 text-center tracking-tight mb-2">Schedule Update</h3>
            <p className="text-sm text-stone-500 text-center mb-6">
              The clinic has updated your weekly practice schedule. Please review and accept the new slots to resume using your workspace.
            </p>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 mb-6">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-2">New Practice Schedule</span>
              <div className="space-y-2 bg-white rounded-xl p-3 border border-stone-150 max-h-48 overflow-y-auto">
                {doctorProfile?.availability?.filter(slot => slot.isAvailable).map((slot) => (
                  <div key={slot.dayOfWeek} className="flex justify-between items-center text-xs py-1.5 border-b border-stone-100 last:border-0">
                    <span className="capitalize font-bold text-stone-700">{slot.dayOfWeek}</span>
                    <span className="text-stone-600 font-semibold">
                      {slot.startTime} - {slot.endTime} <span className="text-stone-400 font-normal">({slot.slotDurationMinutes} min slots)</span>
                    </span>
                  </div>
                ))}
                {(!doctorProfile?.availability || doctorProfile.availability.filter(s => s.isAvailable).length === 0) && (
                  <p className="text-xs text-stone-400 italic text-center py-2">No active slots configured.</p>
                )}
              </div>
            </div>

            {acceptError && (
              <p className="rounded-2xl bg-rose-50 px-4 py-3 text-xs text-rose-700 mb-4 font-semibold border border-rose-100">
                {acceptError}
              </p>
            )}

            <button
              onClick={handleAcceptSlots}
              disabled={acceptingSlot}
              className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {acceptingSlot ? 'Accepting Schedule...' : 'Accept Schedule & Resume'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default DashboardOverviewPage;
