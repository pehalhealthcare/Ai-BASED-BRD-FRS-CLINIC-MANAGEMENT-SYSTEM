const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const dashboardService = require('./dashboard.service');

const getOverview = asyncHandler(async (req, res) => {
  const data = await dashboardService.getOverview({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Dashboard overview fetched successfully', data);
});

const getAppointmentsAnalytics = asyncHandler(async (req, res) => {
  const data = await dashboardService.getAppointmentsAnalytics({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Dashboard appointment analytics fetched successfully', data);
});

const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const data = await dashboardService.getRevenueAnalytics({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Dashboard revenue analytics fetched successfully', data);
});

const getPatientsAnalytics = asyncHandler(async (req, res) => {
  const data = await dashboardService.getPatientsAnalytics({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Dashboard patient analytics fetched successfully', data);
});

const getLabsAnalytics = asyncHandler(async (req, res) => {
  const data = await dashboardService.getLabsAnalytics({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Dashboard lab analytics fetched successfully', data);
});

const getPharmacyAnalytics = asyncHandler(async (req, res) => {
  const data = await dashboardService.getPharmacyAnalytics({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Dashboard pharmacy analytics fetched successfully', data);
});

const getNotificationsAnalytics = asyncHandler(async (req, res) => {
  const data = await dashboardService.getNotificationsAnalytics({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Dashboard notification analytics fetched successfully', data);
});

const getDoctorWorkload = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDoctorWorkload({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Dashboard doctor workload fetched successfully', data);
});

const getNoShowAnalytics = asyncHandler(async (req, res) => {
  const data = await dashboardService.getNoShowAnalytics({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Dashboard no-show analytics fetched successfully', data);
});

const getActivityFeed = asyncHandler(async (req, res) => {
  const data = await dashboardService.getActivityFeed({
    requester: req.user,
    query: req.query,
    requestedClinicId: req.query.clinicId
  });

  return sendSuccess(res, 'Dashboard activity feed fetched successfully', data);
});

const getSuperAdminOverview = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSuperAdminOverview({ requester: req.user });
  return sendSuccess(res, 'Super Admin Dashboard overview fetched successfully', data);
});

module.exports = {
  getOverview,
  getAppointmentsAnalytics,
  getRevenueAnalytics,
  getPatientsAnalytics,
  getLabsAnalytics,
  getPharmacyAnalytics,
  getNotificationsAnalytics,
  getDoctorWorkload,
  getNoShowAnalytics,
  getActivityFeed,
  getSuperAdminOverview
};
