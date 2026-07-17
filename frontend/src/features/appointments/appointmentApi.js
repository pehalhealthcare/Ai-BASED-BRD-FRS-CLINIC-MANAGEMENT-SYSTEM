import { appointmentApi } from '../../lib/api';

export const createAppointment = (payload) => appointmentApi.createAppointment(payload);
export const getAppointments = (params) => appointmentApi.getAppointments(params);
export const getAppointmentById = (id) => appointmentApi.getAppointmentById(id);
export const getCalendarAppointments = (params) => appointmentApi.getCalendarAppointments(params);
export const getAvailableSlots = (params) => appointmentApi.getAvailableSlots(params);
export const updateAppointmentStatus = (id, payload) => appointmentApi.updateAppointmentStatus(id, payload);
export const cancelAppointment = (id, payload) => appointmentApi.cancelAppointment(id, payload);
export const rescheduleAppointment = (id, payload) => appointmentApi.rescheduleAppointment(id, payload);
export const getDoctorAvailability = (doctorId) => appointmentApi.getDoctorAvailability(doctorId);
export const updateDoctorAvailability = (doctorId, payload) => appointmentApi.updateDoctorAvailability(doctorId, payload);
export const blockDoctorSlot = (doctorId, payload) => appointmentApi.blockDoctorSlot(doctorId, payload);
export const applyWaiver = (id, payload) => appointmentApi.applyWaiver(id, payload);
export const verifyPayment = (id, payload) => appointmentApi.verifyPayment(id, payload);
export const requestRefund = (id) => appointmentApi.requestRefund(id);
export const decideDiscount = (id, payload) => appointmentApi.decideDiscount(id, payload);
export const requestDiscount = (id, payload) => appointmentApi.requestDiscount(id, payload);

export default appointmentApi;
