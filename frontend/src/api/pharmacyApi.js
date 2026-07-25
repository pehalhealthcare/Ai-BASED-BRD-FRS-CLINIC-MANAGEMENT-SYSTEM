import { axiosClient, unwrapResponse } from './axiosClient';

export const pharmacyApi = {
  listMedicineMasters: async (params = {}) => unwrapResponse(await axiosClient.get('/pharmacy/masters/medicines', { params })),
  listBrandMasters: async (params = {}) => unwrapResponse(await axiosClient.get('/pharmacy/masters/brands', { params })),
  listMedicines: async (params = {}) => unwrapResponse(await axiosClient.get('/pharmacy/medicines', { params })),
  getMedicineById: async (id) => unwrapResponse(await axiosClient.get(`/pharmacy/medicines/${id}`)),
  createMedicine: async (payload) => unwrapResponse(await axiosClient.post('/pharmacy/medicines', payload)),
  updateMedicine: async (id, payload) => unwrapResponse(await axiosClient.patch(`/pharmacy/medicines/${id}`, payload)),
  addBatch: async (id, payload) => unwrapResponse(await axiosClient.post(`/pharmacy/medicines/${id}/batches`, payload)),
  updateBatch: async (id, payload) => unwrapResponse(await axiosClient.patch(`/pharmacy/batches/${id}`, payload)),
  deleteBatch: async (id) => unwrapResponse(await axiosClient.delete(`/pharmacy/batches/${id}`)),
  dispense: async (payload) => unwrapResponse(await axiosClient.post('/pharmacy/dispense', payload)),
  createWalkinSale: async (payload) => unwrapResponse(await axiosClient.post('/pharmacy/walk-in', payload)),
  listDispensings: async (params = {}) => unwrapResponse(await axiosClient.get('/pharmacy/dispensings', { params })),
  getDashboard: async () => unwrapResponse(await axiosClient.get('/pharmacy/inventory/dashboard')),
  searchAll: async (query) => unwrapResponse(await axiosClient.get('/pharmacy/search-all', { params: { query } })),
  listSuppliers: async (params = {}) => unwrapResponse(await axiosClient.get('/pharmacy/suppliers', { params })),
  createSupplier: async (payload) => unwrapResponse(await axiosClient.post('/pharmacy/suppliers', payload)),
  updateSupplier: async (id, payload) => unwrapResponse(await axiosClient.put(`/pharmacy/suppliers/${id}`, payload)),
  deleteSupplier: async (id) => unwrapResponse(await axiosClient.delete(`/pharmacy/suppliers/${id}`)),
  getSupplierAnalytics: async (id) => unwrapResponse(await axiosClient.get(`/pharmacy/suppliers/${id}/analytics`)),
  getSupplierPurchaseHistory: async (id) => unwrapResponse(await axiosClient.get(`/pharmacy/suppliers/${id}/purchase-history`)),
  listPurchaseOrders: async () => unwrapResponse(await axiosClient.get('/pharmacy/purchase-orders')),
  createPurchaseOrder: async (payload) => unwrapResponse(await axiosClient.post('/pharmacy/purchase-orders', payload)),
  searchGlobalMeds: async (query) => unwrapResponse(await axiosClient.get('/healthcare-catalog/search/medicines', { params: { search: query, limit: 100 } })),
  listPharmacyOrders: async (params = {}) => unwrapResponse(await axiosClient.get('/pharmacy/orders', { params })),
  updateOrderStatus: async (id, payload) => unwrapResponse(await axiosClient.patch(`/pharmacy/orders/${id}/status`, payload))
};

export default pharmacyApi;
