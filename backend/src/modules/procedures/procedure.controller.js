const { sendSuccess } = require('../../common/utils/apiResponse');
const { asyncHandler } = require('../../common/utils/asyncHandler');
const procedureService = require('./procedure.service');

const getProcedures = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId;
  const { status, patientId, doctorId } = req.query;

  const procedures = await procedureService.listProcedures({
    clinicId,
    status,
    patientId,
    doctorId
  });

  return sendSuccess(res, 'Procedures retrieved successfully', { procedures });
});

const getProcedureById = asyncHandler(async (req, res) => {
  const procedure = await procedureService.getProcedureById(req.params.id);
  return sendSuccess(res, 'Procedure details retrieved successfully', { procedure });
});

const payProcedureInvoice = asyncHandler(async (req, res) => {
  const result = await procedureService.payProcedureInvoice(
    req.params.invoiceId,
    req.body,
    req.user
  );
  return sendSuccess(res, 'Procedure payment recorded successfully', { payment: result });
});

const startProcedure = asyncHandler(async (req, res) => {
  const procedure = await procedureService.startProcedure(
    req.params.id,
    req.body,
    req.user
  );
  return sendSuccess(res, 'Procedure started successfully', { procedure });
});

const completeProcedure = asyncHandler(async (req, res) => {
  const procedure = await procedureService.completeProcedure(
    req.params.id,
    req.body,
    req.user
  );
  return sendSuccess(res, 'Procedure completed successfully', { procedure });
});

const cancelProcedure = asyncHandler(async (req, res) => {
  const procedure = await procedureService.cancelProcedure(
    req.params.id,
    req.body,
    req.user
  );
  return sendSuccess(res, 'Procedure cancelled successfully', { procedure });
});

const approveRefund = asyncHandler(async (req, res) => {
  const procedure = await procedureService.approveRefund(
    req.params.id,
    req.user
  );
  return sendSuccess(res, 'Refund approved and completed successfully', { procedure });
});

const getProcedureReports = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId;
  const reports = await procedureService.getProcedureReports(clinicId);
  return sendSuccess(res, 'Procedure reports retrieved successfully', { reports });
});

module.exports = {
  getProcedures,
  getProcedureById,
  payProcedureInvoice,
  startProcedure,
  completeProcedure,
  cancelProcedure,
  approveRefund,
  getProcedureReports
};
