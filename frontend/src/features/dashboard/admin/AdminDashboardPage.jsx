import React, { useEffect } from 'react';
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import io from 'socket.io-client';
import useAuth from '../../../hooks/useAuth';
import { dashboardApi, appointmentApi, clinicApi, subscriptionApi } from '../../../lib/api';

import DashboardHeader from './DashboardHeader';
import StatCards from './StatCards';
import AppointmentSection from './AppointmentSection';
import CheckedInQueue from './CheckedInQueue';
import DoctorStatusSection from './DoctorStatusSection';
import BranchOverview from './BranchOverview';
import StaffOverview from './StaffOverview';
import HealthcareProviders from './HealthcareProviders';
import AiAssistantPanel from './AiAssistantPanel';
import QuickActions from './QuickActions';
import SubscriptionWidget from './SubscriptionWidget';
import WalkInPatientModal from '../WalkInPatientModal';

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const navigate = React.useMemo(() => {
    // We use a programmatic redirect if the user is not authorized
    if (user && user.role !== 'ADMIN' && user.role !== 'CLINIC_ADMIN' && user.role !== 'SUPER_ADMIN') {
      window.location.href = '/dashboard';
    }
  }, [user]);

  const [selectedDate, setSelectedDate] = React.useState(getTodayString);
  const [walkInOpen, setWalkInOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const clinicId = user?.clinicId;

  if (user && user.role !== 'ADMIN' && user.role !== 'CLINIC_ADMIN' && user.role !== 'SUPER_ADMIN') {
    return null;
  }

  // Real-time socket integration
  useEffect(() => {
    if (!clinicId) return;

    const token = localStorage.getItem('ai_cms_access_token');
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      auth: { token }
    });

    socket.on('connect', () => {
      socket.emit('join-clinic', clinicId);
      socket.emit('join_clinic', clinicId); // join clinic namespace room
      if (user?.role) {
        socket.emit('join-role', { clinicId, role: user.role });
      }
    });

    const invalidateAll = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const invalidateStaffOnly = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'staff', clinicId] });
    };

    // Live update triggers mapped to react-query invalidation
    const appointmentEvents = [
      'appointment:created', 'appointment:booked', 'appointment:payment-success',
      'appointment:status-updated', 'appointment:checked-in', 'appointment:checked_in',
      'appointment:cancelled', 'appointment:completed', 'consultation:started',
      'consultation:completed', 'token:generated', 'appointment.created',
      'appointment.booked', 'appointment.payment-success', 'appointment.status-updated',
      'appointment.checked-in', 'appointment.checked_in', 'appointment.cancelled',
      'appointment.completed', 'consultation.started', 'consultation.completed',
      'token.generated'
    ];
    appointmentEvents.forEach(evt => {
      socket.on(evt, invalidateAll);
    });
    socket.on('appointment:rescheduled', invalidateAll);
    socket.on('consultation:ended', invalidateAll);
    socket.on('doctor:status_changed', invalidateAll);
    socket.on('staff:online', invalidateStaffOnly);
    socket.on('staff:offline', invalidateStaffOnly);
    socket.on('staff:updated', invalidateStaffOnly);
    socket.on('invoice:paid', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'revenue'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] });
    });
    socket.on('staff:attendance_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'staff'] });
    });
    socket.on('branch:status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'branches'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [clinicId, user?.role, queryClient]);

  // Queries matching isolated architecture requirement
  const overviewQuery = useQuery({
    queryKey: ['dashboard', 'overview', clinicId, selectedDate],
    queryFn: () => dashboardApi.getOverview({ date: selectedDate }),
    enabled: !!clinicId,
  });

  const appointmentsQuery = useQuery({
    queryKey: ['dashboard', 'appointments', clinicId, selectedDate],
    queryFn: () => appointmentApi.getAppointments({ date: selectedDate, limit: 50, page: 1 }),
    enabled: !!clinicId,
  });

  const revenueQuery = useQuery({
    queryKey: ['dashboard', 'revenue', clinicId, selectedDate],
    queryFn: () => dashboardApi.getRevenue({ date: selectedDate }),
    enabled: !!clinicId,
  });

  const doctorStatusQuery = useInfiniteQuery({
    queryKey: ['dashboard', 'doctor-status', clinicId, selectedDate],
    queryFn: ({ pageParam = 1 }) => dashboardApi.getDoctorStatus({ date: selectedDate, page: pageParam, limit: 10 }),
    initialPageParam: 1,
    enabled: !!clinicId,
    getNextPageParam: (lastPage) => {
      const pagObj = lastPage?.data?.pagination || lastPage?.pagination;
      return pagObj?.hasMore ? pagObj.page + 1 : undefined;
    }
  });

  const queueQuery = useQuery({
    queryKey: ['dashboard', 'queue', clinicId, selectedDate],
    queryFn: () => dashboardApi.getCheckedInQueue({ date: selectedDate }),
    enabled: !!clinicId,
  });

  const branchQuery = useQuery({
    queryKey: ['dashboard', 'branches', clinicId, selectedDate],
    queryFn: () => dashboardApi.getBranchOverview({ date: selectedDate }),
    enabled: !!clinicId,
  });

  const staffQuery = useInfiniteQuery({
    queryKey: ['dashboard', 'staff', clinicId, selectedDate],
    queryFn: ({ pageParam = 1 }) => dashboardApi.getStaffOverview({ date: selectedDate, page: pageParam, limit: 10 }),
    initialPageParam: 1,
    enabled: !!clinicId,
    getNextPageParam: (lastPage) => {
      const pagObj = lastPage?.data?.pagination || lastPage?.pagination;
      return pagObj?.hasMore ? pagObj.page + 1 : undefined;
    }
  });

  const pharmacyQuery = useQuery({
    queryKey: ['dashboard', 'pharmacy', clinicId, selectedDate],
    queryFn: () => dashboardApi.getPharmacy({ date: selectedDate }),
    enabled: !!clinicId,
  });

  const labsQuery = useQuery({
    queryKey: ['dashboard', 'labs', clinicId, selectedDate],
    queryFn: () => dashboardApi.getLabs({ date: selectedDate }),
    enabled: !!clinicId,
  });

  const onboardingQuery = useQuery({
    queryKey: ['dashboard', 'onboarding', clinicId],
    queryFn: () => clinicApi.getOnboardingFlow(clinicId),
    enabled: !!clinicId,
  });

  const subscriptionQuery = useQuery({
    queryKey: ['dashboard', 'subscription', clinicId],
    queryFn: () => subscriptionApi.getPublicPlans(),
    enabled: !!clinicId,
  });

  const handleDateChange = (date) => setSelectedDate(date);

  // Response validation & formatting wrappers
  const getOverviewData = () => {
    const res = overviewQuery.data;
    if (!res) return null;
    return res.success ? res.data : res;
  };

  const getAppointmentsList = () => {
    const res = appointmentsQuery.data;
    if (!res) return [];
    const list = res.success ? res.data?.appointments || res.data : res.appointments || res;
    return Array.isArray(list) ? list : [];
  };

  const getRevenueData = () => {
    const res = revenueQuery.data;
    if (!res) return null;
    return res.success ? res.data : res;
  };

  const getDoctorStatusList = () => {
    const pages = doctorStatusQuery.data?.pages || [];
    const list = [];
    for (const pageObj of pages) {
      const dataObj = pageObj.success ? pageObj.data : pageObj;
      const docs = dataObj?.doctors || dataObj || [];
      if (Array.isArray(docs)) {
        list.push(...docs);
      }
    }
    return list;
  };

  const getQueueList = () => {
    const res = queueQuery.data;
    if (!res) return [];
    return res.success ? res.data?.queue || res.data : res.queue || res || [];
  };

  const getBranchList = () => {
    const res = branchQuery.data;
    if (!res) return [];
    return res.success ? res.data?.branches || res.data : res.branches || res || [];
  };

  const getStaffData = () => {
    const pages = staffQuery.data?.pages || [];
    if (pages.length === 0) return null;
    
    // Pick metrics from first page
    const firstPageObj = pages[0];
    const firstPageData = firstPageObj.success ? firstPageObj.data : firstPageObj;
    
    const list = [];
    for (const pageObj of pages) {
      const dataObj = pageObj.success ? pageObj.data : pageObj;
      const staffList = dataObj?.staffList || [];
      if (Array.isArray(staffList)) {
        list.push(...staffList);
      }
    }

    return {
      totalStaff: firstPageData?.totalStaff || 0,
      present: firstPageData?.present || 0,
      onLeave: firstPageData?.onLeave || 0,
      busy: firstPageData?.busy || 0,
      onBreak: firstPageData?.onBreak || 0,
      byRole: firstPageData?.byRole || [],
      staffList: list
    };
  };

  const getPharmacyData = () => {
    const res = pharmacyQuery.data;
    if (!res) return null;
    return res.success ? res.data : res;
  };

  const getLabsData = () => {
    const res = labsQuery.data;
    if (!res) return null;
    return res.success ? res.data : res;
  };

  const getSubscriptionData = () => {
    const res = subscriptionQuery.data;
    if (!res) return null;
    return res.success ? res.data : res;
  };

  const getOnboardingData = () => {
    const res = onboardingQuery.data;
    if (!res) return null;
    return res.success ? res.data : res;
  };

  return (
    <div className="min-h-screen bg-slate-50/50 space-y-5">
      <DashboardHeader
        user={user}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
      />

      <StatCards
        overview={getOverviewData()}
        revenue={getRevenueData()}
        loading={overviewQuery.isLoading || revenueQuery.isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT MAIN */}
        <div className="lg:col-span-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-7">
              <AppointmentSection
                appointments={getAppointmentsList()}
                loading={appointmentsQuery.isLoading}
                selectedDate={selectedDate}
                overview={getOverviewData()}
              />
            </div>
            <div className="md:col-span-5">
              <CheckedInQueue
                queue={getQueueList()}
                loading={queueQuery.isLoading}
              />
            </div>
          </div>

          <DoctorStatusSection
            doctors={getDoctorStatusList()}
            loading={doctorStatusQuery.isLoading}
            fetchNextPage={doctorStatusQuery.fetchNextPage}
            hasNextPage={doctorStatusQuery.hasNextPage}
            isFetchingNextPage={doctorStatusQuery.isFetchingNextPage}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            <BranchOverview
              branches={getBranchList()}
              loading={branchQuery.isLoading}
            />
            <StaffOverview
              staff={getStaffData()}
              loading={staffQuery.isLoading}
              fetchNextPage={staffQuery.fetchNextPage}
              hasNextPage={staffQuery.hasNextPage}
              isFetchingNextPage={staffQuery.isFetchingNextPage}
            />
            <HealthcareProviders
              pharmacy={getPharmacyData()}
              labs={getLabsData()}
              loading={pharmacyQuery.isLoading || labsQuery.isLoading}
            />
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div className="lg:col-span-4 space-y-5">
          <AiAssistantPanel
            overview={getOverviewData()}
            queue={getQueueList()}
            doctorStatus={getDoctorStatusList()}
            notifications={[]}
            loading={overviewQuery.isLoading || queueQuery.isLoading}
          />

          <QuickActions onWalkIn={() => setWalkInOpen(true)} />

          <SubscriptionWidget
            subscription={getSubscriptionData()}
            onboarding={getOnboardingData()}
          />
        </div>
      </div>

      <WalkInPatientModal
        isOpen={walkInOpen}
        onClose={() => setWalkInOpen(false)}
        onSuccess={() => {
          setWalkInOpen(false);
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }}
      />
    </div>
  );
};

export default AdminDashboardPage;
