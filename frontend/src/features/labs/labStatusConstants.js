/**
 * Centralized Laboratory Status Constants and Configurations
 * Single source of truth across Sample Collection, Lab Orders, Order Details, and Results Entry.
 */

export const LAB_ORDER_STATUS = {
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

export const LAB_ORDER_STATUSES = Object.values(LAB_ORDER_STATUS);

export const SAMPLE_STATUS = {
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

export const SAMPLE_STATUSES = Object.values(SAMPLE_STATUS);

export const COLLECTION_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  COLLECTED: 'COLLECTED',
  RECOLLECTION_REQUIRED: 'RECOLLECTION_REQUIRED'
};

export const COLLECTION_STATUSES = Object.values(COLLECTION_STATUS);

export const ORDER_STATUS_TRANSITIONS = {
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

export const ORDER_STATUS_CONFIG = {
  [LAB_ORDER_STATUS.ORDERED]: {
    label: 'Ordered',
    tone: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeClasses: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Order registered in system, awaiting patient arrival/collection scheduling',
    stepNumber: 1
  },
  [LAB_ORDER_STATUS.CONFIRMED]: {
    label: 'Confirmed',
    tone: 'bg-slate-100 text-slate-700 border-slate-200',
    badgeClasses: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Order verified by clinic staff',
    stepNumber: 1
  },
  [LAB_ORDER_STATUS.SCHEDULED]: {
    label: 'Scheduled',
    tone: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeClasses: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Sample collection appointment scheduled',
    stepNumber: 1
  },
  [LAB_ORDER_STATUS.AWAITING_COLLECTION]: {
    label: 'Awaiting Collection',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeClasses: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Patient checked in or scheduled, awaiting sample collection',
    stepNumber: 1
  },
  [LAB_ORDER_STATUS.SAMPLE_COLLECTION_PENDING]: {
    label: 'Collection Pending',
    tone: 'bg-amber-50 text-amber-700 border-amber-200',
    badgeClasses: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Sample collection pending at desk or home',
    stepNumber: 1
  },
  [LAB_ORDER_STATUS.CHECKED_IN]: {
    label: 'Checked In',
    tone: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    badgeClasses: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Patient arrived at laboratory and token assigned',
    stepNumber: 2
  },
  [LAB_ORDER_STATUS.CALLED]: {
    label: 'Token Called',
    tone: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    badgeClasses: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    description: 'Token called to phlebotomy collection desk',
    stepNumber: 2
  },
  [LAB_ORDER_STATUS.COLLECTING]: {
    label: 'Collecting',
    tone: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeClasses: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Phlebotomist currently drawing specimens',
    stepNumber: 2
  },
  [LAB_ORDER_STATUS.SAMPLE_COLLECTED]: {
    label: 'Sample Collected',
    tone: 'bg-blue-100 text-blue-800 border-blue-200',
    badgeClasses: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Specimens successfully drawn, labeled, and prepared for lab intake',
    stepNumber: 2
  },
  [LAB_ORDER_STATUS.PROCESSING]: {
    label: 'Processing',
    tone: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeClasses: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Specimen in analytical analyzer or lab workstation',
    stepNumber: 3
  },
  [LAB_ORDER_STATUS.IN_PROCESSING]: {
    label: 'Processing',
    tone: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeClasses: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Specimen in analytical analyzer or lab workstation',
    stepNumber: 3
  },
  [LAB_ORDER_STATUS.IN_ANALYSIS]: {
    label: 'In Analysis',
    tone: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeClasses: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Diagnostic analysis actively running',
    stepNumber: 3
  },
  [LAB_ORDER_STATUS.RESULTS_ENTRY]: {
    label: 'Results Entry',
    tone: 'bg-purple-100 text-purple-800 border-purple-200',
    badgeClasses: 'bg-purple-100 text-purple-800 border-purple-200',
    description: 'Processing finished, technician entering diagnostic parameter values',
    stepNumber: 4
  },
  [LAB_ORDER_STATUS.READY_FOR_REVIEW]: {
    label: 'Ready for Review',
    tone: 'bg-amber-100 text-amber-800 border-amber-200',
    badgeClasses: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'All parameter values recorded, ready for pathologist verification',
    stepNumber: 5
  },
  [LAB_ORDER_STATUS.COMPLETED]: {
    label: 'Completed',
    tone: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeClasses: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Final report verified and published to patient health records',
    stepNumber: 6
  },
  [LAB_ORDER_STATUS.REPORT_READY]: {
    label: 'Report Ready',
    tone: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    badgeClasses: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description: 'Final report verified and ready for download',
    stepNumber: 6
  },
  [LAB_ORDER_STATUS.RECOLLECTION_REQUIRED]: {
    label: 'Recollection Required',
    tone: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeClasses: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Previous specimen rejected; new sample draw required',
    stepNumber: 1
  },
  [LAB_ORDER_STATUS.CANCELLED]: {
    label: 'Cancelled',
    tone: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeClasses: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Order cancelled by patient or clinic staff'
  },
  [LAB_ORDER_STATUS.REJECTED]: {
    label: 'Rejected',
    tone: 'bg-rose-100 text-rose-800 border-rose-200',
    badgeClasses: 'bg-rose-100 text-rose-800 border-rose-200',
    description: 'Specimen rejected due to quality criteria'
  }
};

export const getStatusDisplayLabel = (status = '') => {
  const norm = String(status || '').toLowerCase().trim();
  return ORDER_STATUS_CONFIG[norm]?.label || norm.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Ordered';
};

export const getStatusTone = (status = '') => {
  const norm = String(status || '').toLowerCase().trim();
  return ORDER_STATUS_CONFIG[norm]?.tone || 'bg-slate-100 text-slate-700 border-slate-200';
};

export const isTransitionAllowed = (fromStatus = '', toStatus = '') => {
  const from = String(fromStatus || '').toLowerCase().trim();
  const to = String(toStatus || '').toLowerCase().trim();
  const allowed = ORDER_STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
};

export const getAllowedNextStatuses = (fromStatus = '') => {
  const from = String(fromStatus || '').toLowerCase().trim();
  return ORDER_STATUS_TRANSITIONS[from] || [];
};

export const getSampleStatusTone = (status = '') => {
  const norm = String(status || '').toUpperCase().trim();
  switch (norm) {
    case 'COLLECTED':
    case 'VERIFIED':
    case 'RECEIVED':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'COLLECTING':
    case 'COLLECTION_IN_PROGRESS':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'EXPECTED':
    case 'COLLECTION_PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'REJECTED':
    case 'RECOLLECTION_REQUIRED':
      return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'PROCESSING':
    case 'IN_PROCESSING':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

export const getBadgeTone = (status = '') => {
  const norm = String(status || '').toLowerCase().trim();
  switch (norm) {
    case 'completed':
    case 'finalized':
    case 'report_available':
    case 'report_ready':
      return 'success';
    case 'cancelled':
    case 'rejected':
    case 'recollection_required':
      return 'danger';
    case 'ready_for_review':
    case 'awaiting_collection':
    case 'sample_collection_pending':
      return 'warning';
    case 'results_entry':
    case 'processing':
    case 'in_processing':
    case 'in_analysis':
    case 'sample_collected':
    case 'checked_in':
    case 'called':
    case 'collecting':
    case 'scheduled':
      return 'info';
    case 'ordered':
    case 'confirmed':
    default:
      return 'neutral';
  }
};

/**
 * Standardizes workflow progression step index from 1 to 6
 * 1: ORDERED
 * 2: SAMPLE_COLLECTED
 * 3: PROCESSING
 * 4: RESULTS_ENTRY
 * 5: READY_FOR_REVIEW
 * 6: COMPLETED
 */
export const getWorkflowStepIndex = (status = '') => {
  const norm = String(status || '').toLowerCase().trim();
  switch (norm) {
    case 'ordered':
    case 'order_booked':
    case 'confirmed':
    case 'scheduled':
    case 'awaiting_collection':
    case 'sample_collection_pending':
    case 'recollection_required':
      return 1;
    case 'checked_in':
    case 'called':
    case 'collecting':
    case 'sample_collected':
    case 'collected':
    case 'specimen_collected':
      return 2;
    case 'processing':
    case 'in_processing':
    case 'in_analysis':
    case 'in_lab_testing':
      return 3;
    case 'results_entry':
    case 'results_pending':
    case 'in_entry':
      return 4;
    case 'ready_for_review':
    case 'in_review':
    case 'pending_review':
      return 5;
    case 'completed':
    case 'finalized':
    case 'report_ready':
    case 'report_available':
    case 'report_generated':
      return 6;
    default:
      return 1;
  }
};

/**
 * Generates the unified 6-step timeline for an order
 */
export const getOrderTimelineSteps = (order = {}) => {
  const rawStatus = order?.status || order?.orderStatus || 'ordered';
  const activeStep = getWorkflowStepIndex(rawStatus);

  const isCompleted = (stepNum) => activeStep > stepNum || (activeStep === 6 && stepNum === 6);
  const isActive = (stepNum) => activeStep === stepNum && activeStep < 6;
  const isLocked = (stepNum) => {
    if (activeStep >= stepNum) return false;
    return stepNum >= 4;
  };

  const orderedTime = order?.orderedAt || order?.createdAt;
  const collectedTime = order?.sampleCollectedAt || order?.collectedAt;
  const processingTime = order?.processingStartedAt;
  const resultsTime = order?.resultsCompletedAt || order?.resultsEnteredAt;
  const reviewTime = order?.readyForReviewAt;
  const finalizedTime = order?.finalizedAt;

  return [
    {
      key: 'ordered',
      stepNum: 1,
      label: 'Ordered',
      time: orderedTime ? new Date(orderedTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '08 Sep',
      subTime: orderedTime ? new Date(orderedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      statusText: isCompleted(1) ? 'Completed' : isActive(1) ? 'Active' : 'Pending',
      isDone: isCompleted(1),
      isActive: isActive(1),
      isLocked: false,
      isPending: false
    },
    {
      key: 'sample_collected',
      stepNum: 2,
      label: 'Sample Collected',
      time: collectedTime ? new Date(collectedTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Pending',
      subTime: collectedTime ? new Date(collectedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      statusText: isCompleted(2) ? 'Completed' : isActive(2) ? 'Active' : 'Pending',
      isDone: isCompleted(2),
      isActive: isActive(2),
      isLocked: false,
      isPending: activeStep < 2
    },
    {
      key: 'processing',
      stepNum: 3,
      label: 'Processing',
      time: processingTime ? new Date(processingTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Pending',
      subTime: processingTime ? new Date(processingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      statusText: isCompleted(3) ? 'Completed' : isActive(3) ? 'Active' : 'Pending',
      isDone: isCompleted(3),
      isActive: isActive(3),
      isLocked: false,
      isPending: activeStep < 3
    },
    {
      key: 'results_entry',
      stepNum: 4,
      label: 'Results Entry',
      time: resultsTime ? 'Entered' : 'Pending',
      subTime: '',
      statusText: isCompleted(4) ? 'Completed' : isActive(4) ? 'Active' : isLocked(4) ? 'Locked' : 'Pending',
      isDone: isCompleted(4),
      isActive: isActive(4),
      isLocked: isLocked(4),
      isPending: activeStep < 4 && !isLocked(4)
    },
    {
      key: 'ready_for_review',
      stepNum: 5,
      label: 'Ready for Review',
      time: reviewTime ? 'Submitted' : 'Pending',
      subTime: '',
      statusText: isCompleted(5) ? 'Completed' : isActive(5) ? 'Active' : isLocked(5) ? 'Locked' : 'Pending',
      isDone: isCompleted(5),
      isActive: isActive(5),
      isLocked: isLocked(5),
      isPending: activeStep < 5 && !isLocked(5)
    },
    {
      key: 'completed',
      stepNum: 6,
      label: 'Completed',
      time: finalizedTime ? new Date(finalizedTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Pending',
      subTime: '',
      statusText: isCompleted(6) ? 'Completed' : isLocked(6) ? 'Locked' : 'Pending',
      isDone: isCompleted(6),
      isActive: false,
      isLocked: isLocked(6),
      isPending: activeStep < 6 && !isLocked(6)
    }
  ];
};



