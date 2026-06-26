import { ROLES } from './roles';

export const ROUTES = {
  login: '/login',
  register: '/register',
  home: '/',
  dashboard: '/dashboard',
  dashboardAppointments: '/dashboard/appointments',
  dashboardRevenue: '/dashboard/revenue',
  dashboardPatients: '/dashboard/patients',
  dashboardLabs: '/dashboard/labs',
  dashboardPharmacy: '/dashboard/pharmacy',
  dashboardBillingFraud: '/dashboard/billing-fraud',
  dashboardAuditLogs: '/dashboard/audit-logs',
  dashboardNotifications: '/dashboard/notifications',
  patients: '/patients',
  patientCreate: '/patients/new',
  appointments: '/appointments',
  consultations: '/consultations',
  labOrders: '/labs/orders',
  labTests: '/labs/tests',
  pharmacyMedicines: '/pharmacy/medicines',
  pharmacyDispensings: '/pharmacy/dispensings',
  notificationTemplates: '/notifications/templates',
  notificationLogs: '/notifications/logs',
  sendNotification: '/notifications/send',
  followUps: '/follow-ups',
  chatbot: '/chatbot',
  portal: '/portal',
  users: '/users',
  prescriptions: '/prescriptions',
  billing: '/billing',
  superAdminDashboard: '/super-admin/dashboard',
  adminClinicsDashboard: '/admin/clinics-dashboard',
  adminDoctorsDashboard: '/admin/my-doctors-dashboard',
  adminReceptionistsDashboard: '/admin/my-receptionists-dashboard',
  organizationSettings: '/admin/organization-settings',
  clinicSettings: '/clinic/settings',
  adminLeavesReview: '/admin/leaves-review',
  adminLeavePolicy: '/admin/leave-policy',
  doctorLeaves: '/doctor/leaves',
  doctorEarnings: '/doctor/earnings',
  patientAppointments: '/patient/appointments'
};

export const NAV_ITEMS = [
  {
    label: 'Organizations',
    path: ROUTES.superAdminDashboard,
    roles: [ROLES.SUPER_ADMIN]
  },
  {
    label: 'Clinics Dashboard',
    path: ROUTES.adminClinicsDashboard,
    roles: [ROLES.ADMIN]
  },
  {
    label: 'My Doctors',
    path: ROUTES.adminDoctorsDashboard,
    roles: [ROLES.ADMIN]
  },
  {
    label: 'My Receptionists',
    path: ROUTES.adminReceptionistsDashboard,
    roles: [ROLES.ADMIN]
  },

  {
    label: 'Dashboard',
    path: ROUTES.dashboard,
    roles: [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR]
  },
  {
    label: 'Dashboard',
    path: ROUTES.dashboardPharmacy,
    roles: [ROLES.PHARMACIST]
  },
  {
    label: 'Earnings',
    path: ROUTES.doctorEarnings,
    roles: [ROLES.DOCTOR]
  },
  { label: 'Patients', path: ROUTES.patients, roles: [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR] },
  { label: 'Appointments', path: ROUTES.appointments, roles: [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR] },
  { label: 'Consultations', path: ROUTES.consultations, roles: [ROLES.ADMIN, ROLES.DOCTOR] },
  {
    label: 'Labs',
    path: ROUTES.labOrders,
    roles: [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN]
  },
  {
    label: 'Pharmacy',
    path: ROUTES.pharmacyMedicines,
    roles: [ROLES.ADMIN, ROLES.PHARMACIST, ROLES.DOCTOR, ROLES.RECEPTIONIST]
  },
  {
    label: 'Billing Risk',
    path: ROUTES.dashboardBillingFraud,
    roles: [ROLES.ADMIN]
  },
  {
    label: 'Audit Logs',
    path: ROUTES.dashboardAuditLogs,
    roles: [ROLES.ADMIN]
  },
  {
    label: 'Notifications',
    path: ROUTES.notificationLogs,
    roles: [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR]
  },
  {
    label: 'Follow-ups',
    path: ROUTES.followUps,
    roles: [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR]
  },
  { label: 'My Portal', path: ROUTES.portal, roles: [ROLES.PATIENT] },
  { label: 'Lab Tests', path: ROUTES.labTests, roles: [ROLES.PATIENT] },
  { label: 'Pharmacy Store', path: ROUTES.pharmacyMedicines, roles: [ROLES.PATIENT] },
  { label: 'Users', path: ROUTES.users, roles: [ROLES.ADMIN] },
  { label: 'Prescriptions', path: ROUTES.prescriptions, roles: [ROLES.ADMIN, ROLES.DOCTOR] },
  { label: 'Billing', path: ROUTES.billing, roles: [ROLES.ADMIN, ROLES.RECEPTIONIST] }
];

export const getDefaultRouteForRole = (role) => {
  if (role === ROLES.SUPER_ADMIN) {
    return ROUTES.superAdminDashboard;
  }

  if (role === ROLES.ADMIN) {
    return ROUTES.adminClinicsDashboard;
  }

  if (role === ROLES.PATIENT) {
    return ROUTES.portal;
  }

  if (role === ROLES.LAB_TECHNICIAN) {
    return ROUTES.labOrders;
  }

  if (role === ROLES.PHARMACIST) {
    return ROUTES.dashboardPharmacy;
  }

  return ROUTES.dashboard;
};
