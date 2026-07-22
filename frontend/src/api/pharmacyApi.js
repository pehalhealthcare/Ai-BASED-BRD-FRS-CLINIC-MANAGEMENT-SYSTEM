import { axiosClient, unwrapResponse } from './axiosClient';

export const pharmacyApi = {
  listMedicineMasters: async (params = {}) => unwrapResponse(await axiosClient.get('/pharmacy/masters/medicines', { params })),
  listBrandMasters: async (params = {}) => unwrapResponse(await axiosClient.get('/pharmacy/masters/brands', { params })),
  listMedicines: async (params = {}) => unwrapResponse(await axiosClient.get('/pharmacy/medicines', { params })),
  getMedicineById: async (id) => unwrapResponse(await axiosClient.get(`/pharmacy/medicines/${id}`)),
  createMedicine: async (payload) => unwrapResponse(await axiosClient.post('/pharmacy/medicines', payload)),
  addBatch: async (id, payload) => unwrapResponse(await axiosClient.post(`/pharmacy/medicines/${id}/batches`, payload)),
  dispense: async (payload) => unwrapResponse(await axiosClient.post('/pharmacy/dispense', payload)),
  listDispensings: async (params = {}) => unwrapResponse(await axiosClient.get('/pharmacy/dispensings', { params })),
  getDashboard: async () => unwrapResponse(await axiosClient.get('/pharmacy/inventory/dashboard')),
  searchAll: async (query) => unwrapResponse(await axiosClient.get('/pharmacy/search-all', { params: { query } })),
  listSuppliers: async () => unwrapResponse(await axiosClient.get('/pharmacy/suppliers')),
  createSupplier: async (payload) => unwrapResponse(await axiosClient.post('/pharmacy/suppliers', payload)),
  listPurchaseOrders: async () => unwrapResponse(await axiosClient.get('/pharmacy/purchase-orders')),
  createPurchaseOrder: async (payload) => unwrapResponse(await axiosClient.post('/pharmacy/purchase-orders', payload)),
  searchGlobalMeds: async (query) => unwrapResponse(await axiosClient.get('/healthcare-catalog/search/medicines', { params: { search: query, limit: 100 } }))
};

export default pharmacyApi;
