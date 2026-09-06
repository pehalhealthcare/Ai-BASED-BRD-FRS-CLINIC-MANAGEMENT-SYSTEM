/**
 * Centralized Laboratory Status Constants and Lifecycle Transitions
 * Single source of truth for Lab Orders, Samples, and Phlebotomy Queue.
 */

const LAB_ORDER_STATUS = {
  ORDERED: 'ordered',
  CONFIRMED: 'confirmed',
  SCHEDULED: 'scheduled',
  AWAITING_COLLECTION: 'awaiting_collection',
  SAMPLE_COLLECTION_PENDING: 'sample_collection_pending',
  CHECKED_IN: 'checked_in',
  CALLED: 'called',
  COLLECTING: 'collecting',
  SAMPLE_COLLECTED: 'sample_collected',
  PROCESSING: 'processing',
  IN_PROCESSING: 'in_processing',
  IN_ANALYSIS: 'in_analysis',
  RESULTS_ENTRY: 'results_entry',
  READY_FOR_REVIEW: 'ready_for_review',
  COMPLETED: 'completed',
  REPORT_READY: 'report_ready',
  RECOLLECTION_REQUIRED: 'recollection_required',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected'
};

const LAB_ORDER_STATUSES = Object.values(LAB_ORDER_STATUS);

const SAMPLE_STATUS = {
  EXPECTED: 'EXPECTED',
  COLLECTION_PENDING: 'COLLECTION_PENDING',
  COLLECTION_IN_PROGRESS: 'COLLECTION_IN_PROGRESS',
  COLLECTING: 'COLLECTING',
  COLLECTED: 'COLLECTED',
  VERIFIED: 'VERIFIED',
  RECEIVED: 'RECEIVED',
  IN_PROCESSING: 'IN_PROCESSING',
  PROCESSING: 'PROCESSING',
  REJECTED: 'REJECTED',
  RECOLLECTION_REQUIRED: 'RECOLLECTION_REQUIRED',
  COMPLETED: 'COMPLETED',
  DISPOSED: 'DISPOSED'
};

const SAMPLE_STATUSES = Object.values(SAMPLE_STATUS);

const SAMPLE_CONDITION = {
  GOOD: 'GOOD',
  HEMOLYSED: 'HEMOLYSED',
  CLOTTED: 'CLOTTED',
  INSUFFICIENT: 'INSUFFICIENT',
  LEAKING: 'LEAKING',
  DAMAGED: 'DAMAGED',
  OTHER: 'OTHER'
};

const SAMPLE_CONDITIONS = Object.values(SAMPLE_CONDITION);

const ORDER_STATUS_TRANSITIONS = {
  ordered: ['scheduled', 'awaiting_collection', 'checked_in', 'sample_collected', 'cancelled'],
  confirmed: ['scheduled', 'awaiting_collection', 'checked_in', 'sample_collected', 'cancelled'],
  scheduled: ['checked_in', 'awaiting_collection', 'sample_collected', 'cancelled'],
  awaiting_collection: ['checked_in', 'called', 'collecting', 'sample_collected', 'cancelled'],
  sample_collection_pending: ['checked_in', 'called', 'collecting', 'sample_collected', 'cancelled'],
  checked_in: ['called', 'collecting', 'sample_collected', 'cancelled'],
  called: ['collecting', 'sample_collected', 'cancelled'],
  collecting: ['sample_collected', 'cancelled'],
  sample_collected: ['processing', 'in_processing', 'in_analysis', 'recollection_required', 'cancelled'],
  processing: ['results_entry', 'recollection_required', 'cancelled'],
  in_processing: ['results_entry', 'recollection_required', 'cancelled'],
  in_analysis: ['results_entry', 'recollection_required', 'cancelled'],
  results_entry: ['ready_for_review', 'recollection_required', 'cancelled'],
  ready_for_review: ['completed', 'report_ready', 'results_entry', 'cancelled'],
  completed: ['results_entry', 'cancelled'],
  report_ready: ['completed', 'results_entry', 'cancelled'],
  recollection_required: ['scheduled', 'awaiting_collection', 'checked_in', 'collecting', 'sample_collected', 'cancelled'],
  cancelled: [],
  rejected: ['recollection_required', 'scheduled']
};

const ORDER_STATUS_CONFIG = {
  [LAB_ORDER_STATUS.ORDERED]: {
    label: 'Ordered',
    tone: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Order registered in system, awaiting patient arrival/collection scheduling',
    stepNumber: 1
  },
  [LAB_ORDER_STATUS.CONFIRMED]: {
    label: 'Confirmed',
    tone: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Order verified by clinic staff',
    stepNumber: 1
  },
  [LAB_ORDER_STATUS.SCHEDULED]: {
    label: 'Scheduled',
    tone: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Sample collection appointment scheduled',
    stepNumber: 1
  },
  [LAB_ORDER_STATUS.AWAITING_COLLECTION]: {
    label: 'Awaiting Collection',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Patient checked in or scheduled, awaiting sample collection',
    stepNumber: 1
  },
  [LAB_ORDER_STATUS.SAMPLE_COLLECTION_PENDING]: {
    label: 'Collection Pending',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Sample collection pending at desk or home',
    stepNumber: 1
  },
  [LAB_ORDER_STATUS.CHECKED_IN]: {
    label: 'Checked In',
    tone: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Patient arrived at laboratory and token assigned',
    stepNumber: 2
  },
  [LAB_ORDER_STATUS.CALLED]: {
    label: 'Token Called',
    tone: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    description: 'Token called to phlebotomy collection desk',
    stepNumber: 2
  },
  [LAB_ORDER_STATUS.COLLECTING]: {
    label: 'Collecting',
    tone: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Phlebotomist currently drawing specimens',
    stepNumber: 2
  },
  [LAB_ORDER_STATUS.SAMPLE_COLLECTED]: {
    label: 'Sample Collected',
    tone: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Specimens successfully drawn, labeled, and prepared for lab intake',
    stepNumber: 2
  },
  [LAB_ORDER_STATUS.PROCESSING]: {
    label: 'Processing',
    tone: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Specimen in analytical analyzer or lab workstation',
    stepNumber: 3
  },
  [LAB_ORDER_STATUS.IN_PROCESSING]: {
    label: 'Processing',
    tone: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Specimen in analytical analyzer or lab workstation',
    stepNumber: 3
  },
  [LAB_ORDER_STATUS.IN_ANALYSIS]: {
    label: 'In Analysis',
    tone: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Diagnostic analysis actively running',
    stepNumber: 3
  },
  [LAB_ORDER_STATUS.RESULTS_ENTRY]: {
    label: 'Results Entry',
    tone: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Processing finished, technician entering diagnostic parameter values',
    stepNumber: 4
  },
  [LAB_ORDER_STATUS.READY_FOR_REVIEW]: {
    label: 'Ready for Review',
    tone: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'All parameter values recorded, ready for pathologist verification',
    stepNumber: 5
  },
  [LAB_ORDER_STATUS.COMPLETED]: {
    label: 'Completed',
    tone: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Final report verified and published to patient health records',
    stepNumber: 6
  },
  [LAB_ORDER_STATUS.REPORT_READY]: {
    label: 'Report Ready',
    tone: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Final report verified and ready for download',
    stepNumber: 6
  },
  [LAB_ORDER_STATUS.RECOLLECTION_REQUIRED]: {
    label: 'Recollection Required',
    tone: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Previous specimen rejected; new sample draw required',
    stepNumber: 1
  },
  [LAB_ORDER_STATUS.CANCELLED]: {
    label: 'Cancelled',
    tone: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Order cancelled by patient or clinic staff'
  },
  [LAB_ORDER_STATUS.REJECTED]: {
    label: 'Rejected',
    tone: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Specimen rejected due to quality criteria'
  }
};

module.exports = {
  LAB_ORDER_STATUS,
  LAB_ORDER_STATUSES,
  SAMPLE_STATUS,
  SAMPLE_STATUSES,
  SAMPLE_CONDITION,
  SAMPLE_CONDITIONS,
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_CONFIG
};
