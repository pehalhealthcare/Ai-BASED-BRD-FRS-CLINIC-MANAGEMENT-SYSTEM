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
  doctors: '/doctors',
  appointments: '/appointments',
  consultations: '/consultations',
  labOrders: '/labs/orders',
  labTests: '/labs/tests',
  labConsumables: '/labs/consumables',
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
  emergency: '/emergency',
  superAdminClinics: '/super-admin/clinics',
  superAdminPlans: '/super-admin/plans',
  superAdminPromoCodes: '/super-admin/promo-codes',
  superAdminLabTests: '/super-admin/healthcare-catalog/labs',
  superAdminMedicines: '/super-admin/healthcare-catalog/medicines',
  adminClinicsDashboard: '/admin/clinics-dashboard',
  adminDoctorsDashboard: '/admin/my-doctors-dashboard',
  adminReceptionistsDashboard: '/admin/my-receptionists-dashboard',
  clinicSettings: '/clinic/settings',
  adminLeavesReview: '/admin/leaves-review',
  adminLeavePolicy: '/admin/leave-policy',
  doctorLeaves: '/doctor/leaves',
  doctorEarnings: '/doctor/earnings',
  patientAppointments: '/patient/appointments',
  adminBranches: '/admin/branches',
  adminSubscription: '/admin/subscription',
  adminDepartments: '/admin/departments',
  adminReports: '/admin/reports',
  adminSettings: '/admin/settings',
  adminProviders: '/admin/providers'
};

export const NAV_ITEMS = [
  {
    label: 'Clinics',
    path: ROUTES.superAdminClinics,
    roles: [ROLES.SUPER_ADMIN]
  },
  {
    label: 'Plans',
    path: ROUTES.superAdminPlans,
    roles: [ROLES.SUPER_ADMIN]
  },
  {
    label: 'Promo Codes',
    path: ROUTES.superAdminPromoCodes,
    roles: [ROLES.SUPER_ADMIN]
  },
  {
    label: 'Global Lab Catalog',
    path: ROUTES.superAdminLabTests,
    roles: [ROLES.SUPER_ADMIN]
  },
  {
    label: 'Global Medicine Catalog',
    path: ROUTES.superAdminMedicines,
    roles: [ROLES.SUPER_ADMIN]
  },
  {
    label: 'Dashboard',
    path: ROUTES.dashboard,
    roles: [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PHARMACIST, ROLES.LAB_TECHNICIAN]
  },
  {
    label: 'Appointments',
    path: ROUTES.appointments,
    roles: [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR]
  },
  { 
    label: 'Patients', 
    path: ROUTES.patients, 
    roles: [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR] 
  },
  {
    label: 'Doctors',
    path: ROUTES.adminDoctorsDashboard,
    roles: [ROLES.ADMIN]
  },
  {
    label: 'Staff',
    path: ROUTES.adminReceptionistsDashboard,
    roles: [ROLES.ADMIN]
  },
  {
    label: 'Departments',
    path: ROUTES.adminDepartments,
    roles: [ROLES.ADMIN]
  },
  {
    label: 'Healthcare Providers',
    path: '/admin/providers',
    roles: [ROLES.ADMIN]
  },
  {
    label: 'Pharmacy',
    path: ROUTES.pharmacyMedicines,
    roles: [ROLES.ADMIN, ROLES.PHARMACIST, ROLES.DOCTOR, ROLES.RECEPTIONIST]
  },
  {
    label: 'Laboratory',
    path: ROUTES.labOrders,
    roles: [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN]
  },
  {
    label: 'Procedures',
    path: '/procedures',
    roles: [ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE, ROLES.LAB_TECHNICIAN, ROLES.RECEPTIONIST]
  },
  {
    label: 'Lab Consumables',
    path: ROUTES.labConsumables,
    roles: [ROLES.ADMIN, ROLES.LAB_TECHNICIAN]
  },
  {
    label: 'Billing & Invoices',
    path: ROUTES.billing,
    roles: [ROLES.ADMIN, ROLES.RECEPTIONIST]
  },
  {
    label: 'Reports & Analytics',
    path: ROUTES.adminReports,
    roles: [ROLES.ADMIN]
  },
  {
    label: 'Subscription & Plan',
    path: ROUTES.adminSubscription,
    roles: [ROLES.ADMIN]
  },
  {
    label: 'Branches',
    path: ROUTES.adminBranches,
    roles: [ROLES.ADMIN]
  },
  {
    label: 'Notifications',
    path: ROUTES.notificationLogs,
    roles: [ROLES.ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR]
  },
  {
    label: 'Settings',
    path: ROUTES.adminSettings,
    roles: [ROLES.ADMIN]
  },
  { label: 'My Portal', path: ROUTES.portal, roles: [ROLES.PATIENT] },
  { label: 'Lab Tests', path: ROUTES.labTests, roles: [ROLES.PATIENT] },
  { label: 'Pharmacy Store', path: ROUTES.pharmacyMedicines, roles: [ROLES.PATIENT] }
];

export const getDefaultRouteForRole = (role) => {
  if (role === ROLES.SUPER_ADMIN) {
    return ROUTES.superAdminClinics;
  }

  if (role === ROLES.ADMIN) {
    return ROUTES.dashboard;
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

  if (role === ROLES.RECEPTIONIST) {
    return ROUTES.appointments;
  }

  if (role === ROLES.NURSE) {
    return '/procedures';
  }

  return ROUTES.dashboard;
};
