import { createBrowserRouter, Navigate } from 'react-router-dom';

import DashboardLayout from '../components/layout/DashboardLayout';
import { ROLES } from '../constants/roles';
import UsersAdminPage from '../features/admin/UsersAdminPage';
import OrganizationSettingsPage from '../features/admin/OrganizationSettingsPage';
import DoctorReview from '../features/admin/DoctorReview';
import ClinicSettingsPage from '../features/admin/ClinicSettingsPage';
import SpecialitiesAdminPage from '../features/admin/SpecialitiesAdminPage';
import SuperAdminDashboard from '../features/super-admin/SuperAdminDashboard';
import MyDoctorsDashboard from '../features/super-admin/MyDoctorsDashboard';
import OrganizationsPage from '../features/super-admin/OrganizationsPage';
import PatientPortalPage from '../features/patients/PatientPortalPage';
import AppointmentCreatePage from '../features/appointments/AppointmentCreatePage';
import AppointmentDetailsPage from '../features/appointments/AppointmentDetailsPage';
import DoctorAvailabilityEditor from '../features/doctors/DoctorAvailabilityEditor';
import DoctorDetailPage from '../features/doctors/DoctorDetailPage';
import DoctorFormPage from '../features/doctors/DoctorFormPage';
import DoctorListPage from '../features/doctors/DoctorListPage';
import DoctorSettingsPage from '../features/doctors/DoctorSettingsPage';
import DashboardAppointmentsPage from '../features/dashboard/DashboardAppointmentsPage';
import DashboardLabsPage from '../features/dashboard/DashboardLabsPage';
import DashboardBillingAnomaliesPage from '../features/dashboard/DashboardBillingAnomaliesPage';
import DashboardAuditLogsPage from '../features/dashboard/DashboardAuditLogsPage';
import DashboardNotificationsPage from '../features/dashboard/DashboardNotificationsPage';
import DashboardPatientsPage from '../features/dashboard/DashboardPatientsPage';
import DashboardPharmacyPage from '../features/dashboard/DashboardPharmacyPage';
import DashboardRevenuePage from '../features/dashboard/DashboardRevenuePage';
import LabOrderCreatePage from '../features/labs/LabOrderCreatePage';
import LabOrderDetailPage from '../features/labs/LabOrderDetailPage';
import LabOrdersPage from '../features/labs/LabOrdersPage';
import LabReportPage from '../features/labs/LabReportPage';
import LabTestCatalogPage from '../features/labs/LabTestCatalogPage';
import FollowUpTasksPage from '../features/notifications/FollowUpTasksPage';
import NotificationLogsPage from '../features/notifications/NotificationLogsPage';
import NotificationTemplatesPage from '../features/notifications/NotificationTemplatesPage';
import PatientNotificationHistory from '../features/notifications/PatientNotificationHistory';
import SendNotificationPage from '../features/notifications/SendNotificationPage';
import PatientLabHistoryPage from '../features/labs/PatientLabHistoryPage';
import PatientConsultationHistory from '../features/patients/PatientConsultationHistory';
import DispensePage from '../features/pharmacy/DispensePage';
import DispensingDetailPage from '../features/pharmacy/DispensingDetailPage';
import DispensingListPage from '../features/pharmacy/DispensingListPage';
import MedicineCatalogPage from '../features/pharmacy/MedicineCatalogPage';
import MedicineDetailPage from '../features/pharmacy/MedicineDetailPage';
import MedicineFormPage from '../features/pharmacy/MedicineFormPage';
import PatientMedicineHistory from '../features/pharmacy/PatientMedicineHistory';
import CreateInvoicePage from '../features/billing/CreateInvoicePage';
import InvoiceDetailPage from '../features/billing/InvoiceDetailPage';
import PrescriptionCreatePage from '../features/prescriptions/PrescriptionCreatePage';
import PrescriptionDetailPage from '../features/prescriptions/PrescriptionDetailPage';
import ProtectedRoute from './ProtectedRoute';
import RoleHomeRedirect from './RoleHomeRedirect';
import ChatbotPage from '../pages/ai/ChatbotPage';
import LabTestsPage from '../features/patients/LabTestsPage';
import PharmacyStorePage from '../features/patients/PharmacyStorePage';
import useAuth from '../hooks/useAuth';

const LabTestsRoute = () => {
  const { user } = useAuth();
  if (user?.role === ROLES.PATIENT) {
    return <LabTestsPage />;
  }
  return <LabTestCatalogPage />;
};

const PharmacyRoute = () => {
  const { user } = useAuth();
  if (user?.role === ROLES.PATIENT) {
    return <PharmacyStorePage />;
  }
  return <MedicineCatalogPage />;
};
import AppointmentCalendarPage from '../pages/appointments/AppointmentCalendarPage';
import BillingPage from '../pages/billing/BillingPage';
import ConsultationPage from '../pages/consultations/ConsultationPage';
import DashboardPage from '../pages/DashboardPage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import PatientCreatePage from '../pages/patients/PatientCreatePage';
import PatientDetailPage from '../pages/patients/PatientDetailPage';
import PatientListPage from '../pages/patients/PatientListPage';
import PrescriptionBuilderPage from '../pages/prescriptions/PrescriptionBuilderPage';

const protect = (element, allowedRoles = []) => (
  <ProtectedRoute allowedRoles={allowedRoles}>{element}</ProtectedRoute>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/register',
    element: <RegisterPage />
  },
  {
    path: '/',
    element: protect(<DashboardLayout />),
    children: [
      { index: true, element: protect(<RoleHomeRedirect />) },
      {
        path: 'portal',
        element: protect(<PatientPortalPage />, [ROLES.PATIENT])
      },
      {
        path: 'users',
        element: protect(<UsersAdminPage />, [ROLES.ADMIN])
      },
      {
        path: 'super-admin/dashboard',
        element: protect(<OrganizationsPage />, [ROLES.SUPER_ADMIN])
      },
      {
        path: 'admin/clinics-dashboard',
        element: protect(<SuperAdminDashboard />, [ROLES.ADMIN])
      },
      {
        path: 'admin/my-doctors-dashboard',
        element: protect(<MyDoctorsDashboard />, [ROLES.ADMIN])
      },
      {
        path: 'admin/organization-settings',
        element: protect(<OrganizationSettingsPage />, [ROLES.ADMIN])
      },
      {
        path: 'clinic/settings',
        element: protect(<ClinicSettingsPage />, [ROLES.RECEPTIONIST, ROLES.ADMIN])
      },
      {
        path: 'admin/specialities',
        element: protect(<SpecialitiesAdminPage />, [ROLES.ADMIN])
      },
      {
        path: 'dashboard',
        element: protect(<DashboardPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PHARMACIST])
      },
      {
        path: 'dashboard/appointments',
        element: protect(<DashboardAppointmentsPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR])
      },
      {
        path: 'dashboard/revenue',
        element: protect(<DashboardRevenuePage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN])
      },
      {
        path: 'dashboard/patients',
        element: protect(<DashboardPatientsPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST])
      },
      {
        path: 'dashboard/labs',
        element: protect(<DashboardLabsPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR])
      },
      {
        path: 'dashboard/pharmacy',
        element: protect(<DashboardPharmacyPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PHARMACIST])
      },
      {
        path: 'dashboard/billing-fraud',
        element: protect(<DashboardBillingAnomaliesPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN])
      },
      {
        path: 'dashboard/audit-logs',
        element: protect(<DashboardAuditLogsPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN])
      },
      {
        path: 'dashboard/notifications',
        element: protect(<DashboardNotificationsPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR])
      },
      {
        path: 'patients',
        element: protect(<PatientListPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR])
      },
      {
        path: 'patients/new',
        element: protect(<PatientCreatePage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST])
      },
      {
        path: 'patients/:id',
        element: protect(<PatientDetailPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR])
      },
      {
        path: 'patients/:id/edit',
        element: protect(<PatientCreatePage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST])
      },
      {
        path: 'patients/:patientId/history',
        element: protect(<PatientConsultationHistory />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR])
      },
      {
        path: 'patients/:patientId/labs',
        element: protect(<PatientLabHistoryPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR])
      },
      {
        path: 'patients/:patientId/medicines',
        element: protect(<PatientMedicineHistory />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR, ROLES.PHARMACIST])
      },
      {
        path: 'patients/:patientId/notifications',
        element: protect(<PatientNotificationHistory />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR])
      },
      {
        path: 'patients/:patientId/consultations',
        element: protect(<PatientConsultationHistory />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR])
      },
      {
        path: 'appointments',
        element: protect(<AppointmentCalendarPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT])
      },
      {
        path: 'appointments/new',
        element: protect(<AppointmentCreatePage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST])
      },
      {
        path: 'appointments/:id',
        element: protect(<AppointmentDetailsPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT])
      },
      {
        path: 'appointments/:appointmentId/consultation',
        element: protect(<ConsultationPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR])
      },
      {
        path: 'consultations',
        element: protect(<ConsultationPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR])
      },
      {
        path: 'consultations/:consultationId',
        element: protect(<ConsultationPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR])
      },
      {
        path: 'consultations/:consultationId/labs/new',
        element: protect(<LabOrderCreatePage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR])
      },
      {
        path: 'labs/tests',
        element: protect(<LabTestsRoute />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_TECHNICIAN, ROLES.PATIENT])
      },
      {
        path: 'labs/orders',
        element: protect(<LabOrdersPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_TECHNICIAN])
      },
      {
        path: 'labs/orders/:id',
        element: protect(<LabOrderDetailPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.LAB_TECHNICIAN])
      },
      {
        path: 'labs/reports/:id',
        element: protect(<LabReportPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR, ROLES.LAB_TECHNICIAN])
      },
      {
        path: 'pharmacy/medicines',
        element: protect(<PharmacyRoute />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PHARMACIST, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PATIENT])
      },
      {
        path: 'pharmacy/medicines/new',
        element: protect(<MedicineFormPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PHARMACIST])
      },
      {
        path: 'pharmacy/medicines/:id',
        element: protect(<MedicineDetailPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PHARMACIST, ROLES.DOCTOR, ROLES.RECEPTIONIST])
      },
      {
        path: 'prescriptions/:prescriptionId/dispense',
        element: protect(<DispensePage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PHARMACIST])
      },
      {
        path: 'pharmacy/dispensings',
        element: protect(<DispensingListPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PHARMACIST])
      },
      {
        path: 'pharmacy/dispensings/:id',
        element: protect(<DispensingDetailPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PHARMACIST])
      },
      {
        path: 'notifications/templates',
        element: protect(<NotificationTemplatesPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR])
      },
      {
        path: 'notifications/logs',
        element: protect(<NotificationLogsPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR])
      },
      {
        path: 'notifications/send',
        element: protect(<SendNotificationPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR])
      },
      {
        path: 'follow-ups',
        element: protect(<FollowUpTasksPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR])
      },
      {
        path: 'chatbot',
        element: protect(<ChatbotPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR, ROLES.PATIENT])
      },
      {
        path: 'prescriptions',
        element: protect(<PrescriptionBuilderPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR])
      },
      {
        path: 'prescriptions/new',
        element: protect(<PrescriptionCreatePage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR])
      },
      {
        path: 'prescriptions/:id',
        element: protect(<PrescriptionDetailPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PHARMACIST, ROLES.PATIENT])
      },
      {
        path: 'billing',
        element: protect(<BillingPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST])
      },
      {
        path: 'billing/create',
        element: protect(<CreateInvoicePage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST])
      },
      {
        path: 'billing/:id',
        element: protect(<InvoiceDetailPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR, ROLES.PATIENT])
      },
      {
        path: 'doctors',
        element: protect(<DoctorListPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST])
      },
      {
        path: 'doctors/new',
        element: protect(<DoctorFormPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN])
      },
      {
        path: 'doctors/:id',
        element: protect(<DoctorDetailPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST])
      },
      {
        path: 'doctors/:id/edit',
        element: protect(<DoctorFormPage />, [ROLES.ADMIN, ROLES.SUPER_ADMIN])
      },
              { path: 'admin/doctors/:doctorId/review', element: protect(<DoctorReview />, [ROLES.ADMIN]) },
        { path: 'doctors/:id/availability', element: protect(<DoctorAvailabilityEditor />, [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.RECEPTIONIST]) },

      {
        path: 'doctor/settings',
        element: protect(<DoctorSettingsPage />, [ROLES.DOCTOR])
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);
