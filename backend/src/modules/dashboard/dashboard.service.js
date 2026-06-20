const { Types } = require('mongoose');

const { APPOINTMENT_STATUSES } = require('../../common/constants/appointmentStatus');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { ROLES } = require('../../common/constants/roles');
const {
  resolveAnalyticsDateRange,
  formatDateLabel,
  startOfUtcDay,
  endOfUtcDay
} = require('../../common/utils/analyticsDateRange');
const { AppError } = require('../../common/utils/AppError');
const { resolveClinicContext } = require('../../common/utils/clinicContext');
const { getMedicineStockFlags } = require('../pharmacy/pharmacy.utils');
const doctorRepository = require('../doctors/doctor.repository');
const dashboardRepository = require('./dashboard.repository');

const {
  Patient,
  Appointment,
  Consultation,
  Prescription,
  Invoice,
  LabOrder,
  LabReport,
  Medicine,
  DispensingRecord,
  PharmacySale,
  NotificationLog,
  FollowUpTask,
  Doctor
} = dashboardRepository.models;

const PENDING_APPOINTMENT_STATUSES = [
  APPOINTMENT_STATUSES.BOOKED,
  APPOINTMENT_STATUSES.CONFIRMED,
  APPOINTMENT_STATUSES.CHECKED_IN,
  APPOINTMENT_STATUSES.IN_CONSULTATION
];

const pickDateField = (...values) => values.find(Boolean) || null;

const buildRangeFilter = (field, fromDate, toDate) => ({
  [field]: {
    $gte: fromDate,
    $lte: toDate
  }
});

const buildClinicRangeFilter = ({ clinicId, field, fromDate, toDate, extra = {} }) => ({
  clinicId,
  ...extra,
  ...buildRangeFilter(field, fromDate, toDate)
});

const toObjectId = (value) => new Types.ObjectId(String(value));

const roundRate = (value) => Number((value || 0).toFixed(2));

const mergeDistinctIds = (groups = []) =>
  [...new Set(groups.flat().filter(Boolean).map((value) => String(value)))];

const mapDoctorNames = async (doctorIds = [], clinicId) => {
  if (!doctorIds.length) {
    return new Map();
  }

  const doctors = await dashboardRepository.findDocuments(
    Doctor,
    {
      clinicId,
      _id: { $in: doctorIds.map(toObjectId) }
    },
    {
      fullName: 1,
      doctorCode: 1,
      specialization: 1
    }
  );

  return new Map(
    doctors.map((doctor) => [
      String(doctor._id),
      {
        fullName: doctor.fullName || doctor.doctorCode || 'Doctor',
        doctorCode: doctor.doctorCode || '',
        specialization: doctor.specialization || ''
      }
    ])
  );
};

const getDoctorScope = async ({ requester, clinicId, allowDoctorScope = false }) => {
  if (!allowDoctorScope || requester.role !== ROLES.DOCTOR) {
    return null;
  }

  const doctorProfile = await doctorRepository.findDoctorByUserIdAndClinic({
    userId: requester._id,
    clinicId
  });

  if (doctorProfile) {
    return doctorProfile;
  }

  return doctorRepository.findDoctorByUserId({ userId: requester._id });
};

const resolveDashboardContext = async ({
  requester,
  query = {},
  requestedClinicId = null,
  allowDoctorScope = false,
  defaultDays = 30
}) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });
  const range = resolveAnalyticsDateRange({
    from: query.from,
    to: query.to,
    defaultDays
  });
  const doctorProfile = await getDoctorScope({
    requester,
    clinicId,
    allowDoctorScope
  });

  return {
    clinicId,
    range,
    doctorProfile,
    doctorId: doctorProfile?._id || null
  };
};

const getDoctorPatientIds = async ({ clinicId, doctorId, fromDate = null, toDate = null }) => {
  const appointmentFilter = { clinicId, doctorId };
  const consultationFilter = { clinicId, doctorId };
  const prescriptionFilter = { clinicId, doctorId };
  const labOrderFilter = { clinicId, doctorId };
  const followUpFilter = { clinicId, doctorId };

  if (fromDate && toDate) {
    Object.assign(appointmentFilter, buildRangeFilter('appointmentDate', fromDate, toDate));
    Object.assign(consultationFilter, buildRangeFilter('createdAt', fromDate, toDate));
    Object.assign(prescriptionFilter, buildRangeFilter('createdAt', fromDate, toDate));
    Object.assign(labOrderFilter, buildRangeFilter('orderedAt', fromDate, toDate));
    Object.assign(followUpFilter, buildRangeFilter('dueDate', fromDate, toDate));
  }

  const distinctGroups = await Promise.all([
    dashboardRepository.distinctValues(Appointment, 'patientId', appointmentFilter),
    dashboardRepository.distinctValues(Consultation, 'patientId', consultationFilter),
    dashboardRepository.distinctValues(Prescription, 'patientId', prescriptionFilter),
    dashboardRepository.distinctValues(LabOrder, 'patientId', labOrderFilter),
    dashboardRepository.distinctValues(FollowUpTask, 'patientId', followUpFilter)
  ]);

  return mergeDistinctIds(distinctGroups);
};

const getClinicActivePatientIds = async ({ clinicId, fromDate, toDate }) => {
  const distinctGroups = await Promise.all([
    dashboardRepository.distinctValues(
      Appointment,
      'patientId',
      buildClinicRangeFilter({ clinicId, field: 'appointmentDate', fromDate, toDate })
    ),
    dashboardRepository.distinctValues(
      Consultation,
      'patientId',
      buildClinicRangeFilter({ clinicId, field: 'createdAt', fromDate, toDate })
    ),
    dashboardRepository.distinctValues(
      Prescription,
      'patientId',
      buildClinicRangeFilter({ clinicId, field: 'createdAt', fromDate, toDate })
    ),
    dashboardRepository.distinctValues(
      LabOrder,
      'patientId',
      buildClinicRangeFilter({ clinicId, field: 'orderedAt', fromDate, toDate })
    ),
    dashboardRepository.distinctValues(
      DispensingRecord,
      'patientId',
      buildClinicRangeFilter({ clinicId, field: 'createdAt', fromDate, toDate })
    ),
    dashboardRepository.distinctValues(
      NotificationLog,
      'patientId',
      buildClinicRangeFilter({ clinicId, field: 'createdAt', fromDate, toDate })
    )
  ]);

  return mergeDistinctIds(distinctGroups);
};

const aggregateByDate = async ({
  Model,
  clinicId,
  dateField,
  fromDate,
  toDate,
  doctorId = null,
  doctorField = 'doctorId',
  extraMatch = {},
  totalExpression = { $sum: 1 },
  additionalFields = {}
}) =>
  dashboardRepository.aggregateDocuments(Model, [
    {
      $match: {
        clinicId: toObjectId(clinicId),
        ...extraMatch,
        ...(doctorId ? { [doctorField]: toObjectId(doctorId) } : {}),
        [dateField]: {
          $gte: fromDate,
          $lte: toDate
        }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: `$${dateField}`
          }
        },
        total: totalExpression,
        ...additionalFields
      }
    },
    {
      $project: {
        _id: 0,
        date: '$_id',
        total: 1,
        ...Object.fromEntries(Object.keys(additionalFields).map((key) => [key, 1]))
      }
    },
    {
      $sort: { date: 1 }
    }
  ]);

const getOverview = async ({ requester, query = {}, requestedClinicId = null }) => {
  const { clinicId, range, doctorId } = await resolveDashboardContext({
    requester,
    query,
    requestedClinicId,
    allowDoctorScope: true
  });
  const todayFrom = startOfUtcDay(new Date());
  const todayTo = endOfUtcDay(new Date());

  const [
    totalPatients,
    newPatients,
    todayAppointments,
    pendingAppointments,
    completedConsultations,
    activePrescriptions,
    pendingInvoices,
    labOrders,
    medicines,
    pendingFollowUps
  ] = await Promise.all([
    doctorId
      ? getDoctorPatientIds({ clinicId, doctorId }).then((ids) => ids.length)
      : dashboardRepository.countDocuments(Patient, { clinicId }),
    doctorId
      ? getDoctorPatientIds({
          clinicId,
          doctorId,
          fromDate: range.fromDate,
          toDate: range.toDate
        }).then((ids) => ids.length)
      : dashboardRepository.countDocuments(
          Patient,
          buildClinicRangeFilter({
            clinicId,
            field: 'createdAt',
            fromDate: range.fromDate,
            toDate: range.toDate
          })
        ),
    dashboardRepository.countDocuments(Appointment, {
      clinicId,
      ...(doctorId ? { doctorId } : {}),
      appointmentDate: {
        $gte: todayFrom,
        $lte: todayTo
      }
    }),
    dashboardRepository.countDocuments(
      Appointment,
      buildClinicRangeFilter({
        clinicId,
        field: 'appointmentDate',
        fromDate: range.fromDate,
        toDate: range.toDate,
        extra: {
          ...(doctorId ? { doctorId } : {}),
          status: { $in: PENDING_APPOINTMENT_STATUSES }
        }
      })
    ),
    dashboardRepository.countDocuments(
      Consultation,
      buildClinicRangeFilter({
        clinicId,
        field: 'completedAt',
        fromDate: range.fromDate,
        toDate: range.toDate,
        extra: {
          ...(doctorId ? { doctorId } : {}),
          status: 'completed'
        }
      })
    ),
    dashboardRepository.countDocuments(
      Prescription,
      buildClinicRangeFilter({
        clinicId,
        field: 'createdAt',
        fromDate: range.fromDate,
        toDate: range.toDate,
        extra: {
          ...(doctorId ? { doctorId } : {}),
          status: 'finalized'
        }
      })
    ),
    doctorId
      ? Promise.resolve(0)
      : dashboardRepository.countDocuments(
          Invoice,
          buildClinicRangeFilter({
            clinicId,
            field: 'invoiceDate',
            fromDate: range.fromDate,
            toDate: range.toDate,
            extra: {
              invoiceStatus: { $ne: 'cancelled' },
              paymentStatus: { $in: ['unpaid', 'partial'] }
            }
          })
        ),
    dashboardRepository.countDocuments(
      LabOrder,
      buildClinicRangeFilter({
        clinicId,
        field: 'orderedAt',
        fromDate: range.fromDate,
        toDate: range.toDate,
        extra: {
          ...(doctorId ? { doctorId } : {})
        }
      })
    ),
    doctorId
      ? Promise.resolve([])
      : dashboardRepository.findDocuments(Medicine, { clinicId, isActive: true }, { totalStock: 1, reorderLevel: 1, batches: 1 }),
    dashboardRepository.countDocuments(FollowUpTask, {
      clinicId,
      ...(doctorId ? { doctorId } : {}),
      status: 'pending',
      dueDate: {
        $lte: range.toDate
      }
    })
  ]);

  const lowStockMedicines = medicines.filter((medicine) => getMedicineStockFlags(medicine).lowStock).length;

  return {
    cards: {
      totalPatients,
      newPatients,
      todayAppointments,
      pendingAppointments,
      completedConsultations,
      activePrescriptions,
      pendingInvoices,
      labOrders,
      lowStockMedicines,
      pendingFollowUps
    },
    range: {
      from: range.from,
      to: range.to
    }
  };
};

const getAppointmentsAnalytics = async ({ requester, query = {}, requestedClinicId = null }) => {
  const { clinicId, range, doctorId } = await resolveDashboardContext({
    requester,
    query,
    requestedClinicId,
    allowDoctorScope: true
  });
  const match = buildClinicRangeFilter({
    clinicId,
    field: 'appointmentDate',
    fromDate: range.fromDate,
    toDate: range.toDate,
    extra: {
      ...(doctorId ? { doctorId } : {})
    }
  });
  const [statusRows, byDay, byDoctorRaw] = await Promise.all([
    dashboardRepository.aggregateDocuments(Appointment, [
      { $match: { clinicId: toObjectId(clinicId), ...(doctorId ? { doctorId: toObjectId(doctorId) } : {}), appointmentDate: { $gte: range.fromDate, $lte: range.toDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    aggregateByDate({
      Model: Appointment,
      clinicId,
      dateField: 'appointmentDate',
      fromDate: range.fromDate,
      toDate: range.toDate,
      doctorId,
      additionalFields: {
        completed: { $sum: { $cond: [{ $eq: ['$status', APPOINTMENT_STATUSES.COMPLETED] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', APPOINTMENT_STATUSES.CANCELLED] }, 1, 0] } },
        noShow: { $sum: { $cond: [{ $eq: ['$status', APPOINTMENT_STATUSES.NO_SHOW] }, 1, 0] } }
      }
    }),
    dashboardRepository.aggregateDocuments(Appointment, [
      {
        $match: {
          clinicId: toObjectId(clinicId),
          ...(doctorId ? { doctorId: toObjectId(doctorId) } : {}),
          appointmentDate: {
            $gte: range.fromDate,
            $lte: range.toDate
          }
        }
      },
      {
        $group: {
          _id: '$doctorId',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', APPOINTMENT_STATUSES.COMPLETED] }, 1, 0] } },
          noShow: { $sum: { $cond: [{ $eq: ['$status', APPOINTMENT_STATUSES.NO_SHOW] }, 1, 0] } }
        }
      }
    ])
  ]);

  const doctorIds = byDoctorRaw.map((row) => row._id).filter(Boolean);
  const doctorNames = await mapDoctorNames(doctorIds, clinicId);
  const counts = Object.values(APPOINTMENT_STATUSES).reduce(
    (accumulator, status) => ({ ...accumulator, [status]: 0 }),
    {}
  );

  for (const row of statusRows) {
    counts[row._id] = row.count;
  }

  return {
    total: statusRows.reduce((sum, row) => sum + row.count, 0),
    booked: counts.booked || 0,
    confirmed: counts.confirmed || 0,
    completed: counts.completed || 0,
    cancelled: counts.cancelled || 0,
    noShow: counts.no_show || 0,
    walkInCount: await dashboardRepository.countDocuments(Appointment, {
      ...match,
      appointmentType: 'walk_in'
    }),
    byDay,
    byDoctor: byDoctorRaw.map((row) => {
      const doctor = doctorNames.get(String(row._id)) || {};
      return {
        doctorId: row._id,
        doctorName: doctor.fullName || 'Unassigned doctor',
        total: row.total || 0,
        completed: row.completed || 0,
        noShow: row.noShow || 0
      };
    }),
    range: {
      from: range.from,
      to: range.to
    }
  };
};

const getRevenueAnalytics = async ({ requester, query = {}, requestedClinicId = null }) => {
  const { clinicId, range } = await resolveDashboardContext({
    requester,
    query,
    requestedClinicId
  });

  const [invoiceSummaryRows, pharmacySummaryRows, invoiceByDay, pharmacyByDay] = await Promise.all([
    dashboardRepository.aggregateDocuments(Invoice, [
      {
        $match: {
          clinicId: toObjectId(clinicId),
          invoiceStatus: { $ne: 'cancelled' },
          invoiceDate: { $gte: range.fromDate, $lte: range.toDate }
        }
      },
      {
        $group: {
          _id: null,
          invoiceRevenue: { $sum: '$totalAmount' },
          paidAmount: { $sum: '$paidAmount' },
          unpaidAmount: { $sum: '$dueAmount' }
        }
      }
    ]),
    dashboardRepository.aggregateDocuments(PharmacySale, [
      {
        $match: {
          clinicId: toObjectId(clinicId),
          createdAt: { $gte: range.fromDate, $lte: range.toDate }
        }
      },
      {
        $group: {
          _id: null,
          pharmacyRevenue: { $sum: '$amount' },
          pharmacyPaidAmount: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$amount', 0]
            }
          },
          pharmacyOutstandingAmount: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', 'paid'] }, 0, '$amount']
            }
          }
        }
      }
    ]),
    aggregateByDate({
      Model: Invoice,
      clinicId,
      dateField: 'invoiceDate',
      fromDate: range.fromDate,
      toDate: range.toDate,
      extraMatch: { invoiceStatus: { $ne: 'cancelled' } },
      totalExpression: { $sum: '$totalAmount' }
    }),
    aggregateByDate({
      Model: PharmacySale,
      clinicId,
      dateField: 'createdAt',
      fromDate: range.fromDate,
      toDate: range.toDate,
      totalExpression: { $sum: '$amount' }
    })
  ]);

  const invoiceSummary = invoiceSummaryRows[0] || {};
  const pharmacySummary = pharmacySummaryRows[0] || {};
  const dayMap = new Map();

  for (const row of invoiceByDay) {
    dayMap.set(row.date, {
      date: row.date,
      invoiceRevenue: row.total || 0,
      pharmacyRevenue: 0,
      totalRevenue: row.total || 0
    });
  }

  for (const row of pharmacyByDay) {
    const current = dayMap.get(row.date) || {
      date: row.date,
      invoiceRevenue: 0,
      pharmacyRevenue: 0,
      totalRevenue: 0
    };

    current.pharmacyRevenue = row.total || 0;
    current.totalRevenue = (current.invoiceRevenue || 0) + (current.pharmacyRevenue || 0);
    dayMap.set(row.date, current);
  }

  return {
    invoiceRevenue: invoiceSummary.invoiceRevenue || 0,
    pharmacyRevenue: pharmacySummary.pharmacyRevenue || 0,
    totalRevenue: (invoiceSummary.invoiceRevenue || 0) + (pharmacySummary.pharmacyRevenue || 0),
    paidAmount: (invoiceSummary.paidAmount || 0) + (pharmacySummary.pharmacyPaidAmount || 0),
    unpaidAmount: (invoiceSummary.unpaidAmount || 0) + (pharmacySummary.pharmacyOutstandingAmount || 0),
    byDay: [...dayMap.values()].sort((left, right) => left.date.localeCompare(right.date)),
    range: {
      from: range.from,
      to: range.to
    }
  };
};

const getPatientsAnalytics = async ({ requester, query = {}, requestedClinicId = null }) => {
  const { clinicId, range } = await resolveDashboardContext({
    requester,
    query,
    requestedClinicId
  });

  const [totalPatients, newPatients, byDay, byGenderRows, activePatients] = await Promise.all([
    dashboardRepository.countDocuments(Patient, { clinicId }),
    dashboardRepository.countDocuments(
      Patient,
      buildClinicRangeFilter({
        clinicId,
        field: 'createdAt',
        fromDate: range.fromDate,
        toDate: range.toDate
      })
    ),
    aggregateByDate({
      Model: Patient,
      clinicId,
      dateField: 'createdAt',
      fromDate: range.fromDate,
      toDate: range.toDate
    }),
    dashboardRepository.aggregateDocuments(Patient, [
      { $match: { clinicId: toObjectId(clinicId) } },
      { $group: { _id: { $ifNull: ['$gender', 'unspecified'] }, count: { $sum: 1 } } },
      { $project: { _id: 0, gender: '$_id', count: 1 } },
      { $sort: { gender: 1 } }
    ]),
    getClinicActivePatientIds({
      clinicId,
      fromDate: range.fromDate,
      toDate: range.toDate
    }).then((ids) => ids.length)
  ]);

  return {
    totalPatients,
    newPatients,
    activePatients,
    byGender: byGenderRows,
    byDay: byDay.map((row) => ({
      date: row.date,
      newPatients: row.total
    })),
    range: {
      from: range.from,
      to: range.to
    }
  };
};

const getLabsAnalytics = async ({ requester, query = {}, requestedClinicId = null }) => {
  const { clinicId, range, doctorId } = await resolveDashboardContext({
    requester,
    query,
    requestedClinicId,
    allowDoctorScope: true
  });
  const orderMatch = buildClinicRangeFilter({
    clinicId,
    field: 'orderedAt',
    fromDate: range.fromDate,
    toDate: range.toDate,
    extra: {
      ...(doctorId ? { doctorId } : {})
    }
  });

  const [totalOrders, completedOrders, byStatus, byDay, abnormalReports] = await Promise.all([
    dashboardRepository.countDocuments(LabOrder, orderMatch),
    dashboardRepository.countDocuments(LabOrder, {
      ...orderMatch,
      status: 'completed'
    }),
    dashboardRepository.aggregateDocuments(LabOrder, [
      { $match: { clinicId: toObjectId(clinicId), ...(doctorId ? { doctorId: toObjectId(doctorId) } : {}), orderedAt: { $gte: range.fromDate, $lte: range.toDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { _id: 0, status: '$_id', count: 1 } }
    ]),
    aggregateByDate({
      Model: LabOrder,
      clinicId,
      dateField: 'orderedAt',
      fromDate: range.fromDate,
      toDate: range.toDate,
      doctorId,
      additionalFields: {
        completedOrders: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
          }
        }
      }
    }),
    (async () => {
      const reportFilter = buildClinicRangeFilter({
        clinicId,
        field: 'createdAt',
        fromDate: range.fromDate,
        toDate: range.toDate,
        extra: {
          resultEntries: {
            $elemMatch: {
              isAbnormal: true
            }
          }
        }
      });

      if (!doctorId) {
        return dashboardRepository.countDocuments(LabReport, reportFilter);
      }

      const orderIds = await dashboardRepository.distinctValues(LabOrder, '_id', orderMatch);
      if (!orderIds.length) {
        return 0;
      }

      return dashboardRepository.countDocuments(LabReport, {
        ...reportFilter,
        labOrderId: { $in: orderIds }
      });
    })()
  ]);

  return {
    totalOrders,
    completedOrders,
    pendingOrders: Math.max(totalOrders - completedOrders - (byStatus.find((row) => row.status === 'cancelled')?.count || 0), 0),
    abnormalReports,
    byStatus,
    byDay: byDay.map((row) => ({
      date: row.date,
      totalOrders: row.total,
      completedOrders: row.completedOrders || 0
    })),
    range: {
      from: range.from,
      to: range.to
    }
  };
};

const getPharmacyAnalytics = async ({ requester, query = {}, requestedClinicId = null }) => {
  const { clinicId, range } = await resolveDashboardContext({
    requester,
    query,
    requestedClinicId
  });
  const [medicines, totalDispensings, pharmacySalesRows, byCategory] = await Promise.all([
    dashboardRepository.findDocuments(
      Medicine,
      { clinicId, isActive: true },
      { category: 1, totalStock: 1, reorderLevel: 1, batches: 1 }
    ),
    dashboardRepository.countDocuments(
      DispensingRecord,
      buildClinicRangeFilter({
        clinicId,
        field: 'createdAt',
        fromDate: range.fromDate,
        toDate: range.toDate,
        extra: {
          status: 'dispensed'
        }
      })
    ),
    dashboardRepository.aggregateDocuments(PharmacySale, [
      {
        $match: {
          clinicId: toObjectId(clinicId),
          createdAt: { $gte: range.fromDate, $lte: range.toDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPharmacySales: { $sum: '$amount' }
        }
      }
    ]),
    dashboardRepository.aggregateDocuments(Medicine, [
      { $match: { clinicId: toObjectId(clinicId), isActive: true } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ['$category', ''] }, 'Uncategorized', '$category']
          },
          count: { $sum: 1 }
        }
      },
      { $project: { _id: 0, category: '$_id', count: 1 } },
      { $sort: { category: 1 } }
    ])
  ]);

  const stockFlags = medicines.map((medicine) => getMedicineStockFlags(medicine));

  return {
    totalMedicines: medicines.length,
    lowStockMedicines: stockFlags.filter((flags) => flags.lowStock).length,
    nearExpiryMedicines: stockFlags.filter((flags) => flags.nearExpiry).length,
    totalDispensings,
    totalPharmacySales: pharmacySalesRows[0]?.totalPharmacySales || 0,
    byCategory,
    range: {
      from: range.from,
      to: range.to
    }
  };
};

const getNotificationsAnalytics = async ({ requester, query = {}, requestedClinicId = null }) => {
  const { clinicId, range, doctorId } = await resolveDashboardContext({
    requester,
    query,
    requestedClinicId,
    allowDoctorScope: true
  });
  const notificationMatch = buildClinicRangeFilter({
    clinicId,
    field: 'createdAt',
    fromDate: range.fromDate,
    toDate: range.toDate,
    extra: {
      ...(doctorId ? { createdBy: requester._id } : {})
    }
  });
  const [statusRows, byType, byChannel, pendingFollowUps, completedFollowUps] = await Promise.all([
    dashboardRepository.aggregateDocuments(NotificationLog, [
      { $match: { clinicId: toObjectId(clinicId), ...(doctorId ? { createdBy: toObjectId(requester._id) } : {}), createdAt: { $gte: range.fromDate, $lte: range.toDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]),
    dashboardRepository.aggregateDocuments(NotificationLog, [
      { $match: { clinicId: toObjectId(clinicId), ...(doctorId ? { createdBy: toObjectId(requester._id) } : {}), createdAt: { $gte: range.fromDate, $lte: range.toDate } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $project: { _id: 0, type: '$_id', count: 1 } }
    ]),
    dashboardRepository.aggregateDocuments(NotificationLog, [
      { $match: { clinicId: toObjectId(clinicId), ...(doctorId ? { createdBy: toObjectId(requester._id) } : {}), createdAt: { $gte: range.fromDate, $lte: range.toDate } } },
      { $group: { _id: '$channel', count: { $sum: 1 } } },
      { $project: { _id: 0, channel: '$_id', count: 1 } }
    ]),
    dashboardRepository.countDocuments(FollowUpTask, {
      clinicId,
      ...(doctorId ? { doctorId } : {}),
      status: 'pending',
      dueDate: { $gte: range.fromDate, $lte: range.toDate }
    }),
    dashboardRepository.countDocuments(FollowUpTask, {
      clinicId,
      ...(doctorId ? { doctorId } : {}),
      status: 'completed',
      updatedAt: { $gte: range.fromDate, $lte: range.toDate }
    })
  ]);

  const totals = statusRows.reduce((accumulator, row) => ({ ...accumulator, [row._id]: row.count }), {});
  const totalNotifications = statusRows.reduce((sum, row) => sum + row.count, 0);

  return {
    totalNotifications,
    sentNotifications: totals.sent || 0,
    failedNotifications: totals.failed || 0,
    pendingNotifications: totals.pending || 0,
    pendingFollowUps,
    completedFollowUps,
    byType,
    byChannel,
    range: {
      from: range.from,
      to: range.to
    },
    notes: doctorId
      ? ['Doctor-scoped notification metrics use logs created by the requesting doctor and follow-up tasks linked to the doctor profile.']
      : []
  };
};

const getDoctorWorkload = async ({ requester, query = {}, requestedClinicId = null }) => {
  const { clinicId, range } = await resolveDashboardContext({
    requester,
    query,
    requestedClinicId
  });
  const doctors = await dashboardRepository.findDocuments(
    Doctor,
    { clinicId, isActive: true },
    { fullName: 1, doctorCode: 1 }
  );

  const [appointmentRows, consultationRows, followUpRows, prescriptionRows] = await Promise.all([
    dashboardRepository.aggregateDocuments(Appointment, [
      {
        $match: {
          clinicId: toObjectId(clinicId),
          appointmentDate: { $gte: range.fromDate, $lte: range.toDate }
        }
      },
      {
        $group: {
          _id: '$doctorId',
          appointments: { $sum: 1 }
        }
      }
    ]),
    dashboardRepository.aggregateDocuments(Consultation, [
      {
        $match: {
          clinicId: toObjectId(clinicId),
          createdAt: { $gte: range.fromDate, $lte: range.toDate }
        }
      },
      {
        $group: {
          _id: '$doctorId',
          consultations: { $sum: 1 },
          completedConsultations: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      }
    ]),
    dashboardRepository.aggregateDocuments(FollowUpTask, [
      {
        $match: {
          clinicId: toObjectId(clinicId),
          dueDate: { $gte: range.fromDate, $lte: range.toDate }
        }
      },
      {
        $group: {
          _id: '$doctorId',
          pendingFollowUps: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          }
        }
      }
    ]),
    dashboardRepository.aggregateDocuments(Prescription, [
      {
        $match: {
          clinicId: toObjectId(clinicId),
          createdAt: { $gte: range.fromDate, $lte: range.toDate }
        }
      },
      {
        $group: {
          _id: '$doctorId',
          prescriptions: { $sum: 1 }
        }
      }
    ])
  ]);

  const workloadMap = new Map(
    doctors.map((doctor) => [
      String(doctor._id),
      {
        doctorId: doctor._id,
        doctorName: doctor.fullName || doctor.doctorCode || 'Doctor',
        appointments: 0,
        consultations: 0,
        completedConsultations: 0,
        pendingFollowUps: 0,
        prescriptions: 0
      }
    ])
  );

  const mergeCounts = (rows, keys) => {
    for (const row of rows) {
      if (!row._id) {
        continue;
      }

      const current =
        workloadMap.get(String(row._id)) ||
        {
          doctorId: row._id,
          doctorName: 'Unknown doctor',
          appointments: 0,
          consultations: 0,
          completedConsultations: 0,
          pendingFollowUps: 0,
          prescriptions: 0
        };

      for (const key of keys) {
        current[key] = row[key] || 0;
      }

      workloadMap.set(String(row._id), current);
    }
  };

  mergeCounts(appointmentRows, ['appointments']);
  mergeCounts(consultationRows, ['consultations', 'completedConsultations']);
  mergeCounts(followUpRows, ['pendingFollowUps']);
  mergeCounts(prescriptionRows, ['prescriptions']);

  return {
    doctors: [...workloadMap.values()].sort((left, right) => left.doctorName.localeCompare(right.doctorName)),
    range: {
      from: range.from,
      to: range.to
    }
  };
};

const getNoShowAnalytics = async ({ requester, query = {}, requestedClinicId = null }) => {
  const { clinicId, range } = await resolveDashboardContext({
    requester,
    query,
    requestedClinicId
  });

  const [totalAppointments, noShowCount, byDoctorRaw, byDayRaw] = await Promise.all([
    dashboardRepository.countDocuments(
      Appointment,
      buildClinicRangeFilter({
        clinicId,
        field: 'appointmentDate',
        fromDate: range.fromDate,
        toDate: range.toDate
      })
    ),
    dashboardRepository.countDocuments(
      Appointment,
      buildClinicRangeFilter({
        clinicId,
        field: 'appointmentDate',
        fromDate: range.fromDate,
        toDate: range.toDate,
        extra: {
          status: APPOINTMENT_STATUSES.NO_SHOW
        }
      })
    ),
    dashboardRepository.aggregateDocuments(Appointment, [
      {
        $match: {
          clinicId: toObjectId(clinicId),
          appointmentDate: { $gte: range.fromDate, $lte: range.toDate }
        }
      },
      {
        $group: {
          _id: '$doctorId',
          totalAppointments: { $sum: 1 },
          noShowCount: {
            $sum: {
              $cond: [{ $eq: ['$status', APPOINTMENT_STATUSES.NO_SHOW] }, 1, 0]
            }
          }
        }
      }
    ]),
    aggregateByDate({
      Model: Appointment,
      clinicId,
      dateField: 'appointmentDate',
      fromDate: range.fromDate,
      toDate: range.toDate,
      additionalFields: {
        noShowCount: {
          $sum: {
            $cond: [{ $eq: ['$status', APPOINTMENT_STATUSES.NO_SHOW] }, 1, 0]
          }
        }
      }
    })
  ]);

  const doctorIds = byDoctorRaw.map((row) => row._id).filter(Boolean);
  const doctorNames = await mapDoctorNames(doctorIds, clinicId);

  return {
    totalAppointments,
    noShowCount,
    noShowRate: totalAppointments ? roundRate((noShowCount / totalAppointments) * 100) : 0,
    byDoctor: byDoctorRaw.map((row) => {
      const doctor = doctorNames.get(String(row._id)) || {};
      const total = row.totalAppointments || 0;
      const misses = row.noShowCount || 0;
      return {
        doctorId: row._id,
        doctorName: doctor.fullName || 'Unassigned doctor',
        noShowCount: misses,
        totalAppointments: total,
        noShowRate: total ? roundRate((misses / total) * 100) : 0
      };
    }),
    byDay: byDayRaw.map((row) => ({
      date: row.date,
      noShowCount: row.noShowCount || 0,
      totalAppointments: row.total || 0,
      noShowRate: row.total ? roundRate(((row.noShowCount || 0) / row.total) * 100) : 0
    })),
    range: {
      from: range.from,
      to: range.to
    }
  };
};

const buildActivityItem = ({ type, label, entityId, timestamp }) => ({
  type,
  label,
  entityId,
  timestamp
});

const getActivityFeed = async ({ requester, query = {}, requestedClinicId = null }) => {
  const clinicId = resolveClinicContext({
    user: requester,
    requestedClinicId: requestedClinicId || query.clinicId
  });
  const limit = Number(query.limit || 20);
  const recentLimit = Math.max(limit, 10);

  const [appointments, consultations, prescriptions, invoices, labReports, dispensings, notifications] =
    await Promise.all([
      dashboardRepository.findDocuments(
        Appointment,
        { clinicId },
        { createdAt: 1, patientId: 1, status: 1 },
        { sort: { createdAt: -1 }, limit: recentLimit }
      ),
      dashboardRepository.findDocuments(
        Consultation,
        { clinicId, status: 'completed' },
        { completedAt: 1, createdAt: 1, patientId: 1 },
        { sort: { completedAt: -1, createdAt: -1 }, limit: recentLimit }
      ),
      dashboardRepository.findDocuments(
        Prescription,
        { clinicId, status: 'finalized' },
        { createdAt: 1, prescriptionNumber: 1 },
        { sort: { createdAt: -1 }, limit: recentLimit }
      ),
      dashboardRepository.findDocuments(
        Invoice,
        { clinicId, invoiceStatus: { $ne: 'cancelled' } },
        { createdAt: 1, invoiceNumber: 1, paymentStatus: 1 },
        { sort: { createdAt: -1 }, limit: recentLimit }
      ),
      dashboardRepository.findDocuments(
        LabReport,
        { clinicId, status: 'finalized' },
        { reviewedAt: 1, createdAt: 1, labOrderId: 1 },
        { sort: { reviewedAt: -1, createdAt: -1 }, limit: recentLimit }
      ),
      dashboardRepository.findDocuments(
        DispensingRecord,
        { clinicId, status: 'dispensed' },
        { dispensedAt: 1, createdAt: 1, patientId: 1, prescriptionId: 1 },
        { sort: { dispensedAt: -1, createdAt: -1 }, limit: recentLimit }
      ),
      dashboardRepository.findDocuments(
        NotificationLog,
        { clinicId, status: 'sent' },
        { sentAt: 1, createdAt: 1, type: 1, patientId: 1 },
        { sort: { sentAt: -1, createdAt: -1 }, limit: recentLimit }
      )
    ]);

  const items = [
    ...appointments.map((record) =>
      buildActivityItem({
        type: 'appointment_created',
        label: `Appointment booked with status ${record.status || 'booked'}`,
        entityId: record._id,
        timestamp: record.createdAt
      })
    ),
    ...consultations.map((record) =>
      buildActivityItem({
        type: 'consultation_completed',
        label: 'Consultation completed',
        entityId: record._id,
        timestamp: pickDateField(record.completedAt, record.createdAt)
      })
    ),
    ...prescriptions.map((record) =>
      buildActivityItem({
        type: 'prescription_finalized',
        label: `Prescription ${record.prescriptionNumber || ''} finalized`.trim(),
        entityId: record._id,
        timestamp: record.createdAt
      })
    ),
    ...invoices.map((record) =>
      buildActivityItem({
        type: 'invoice_created',
        label: `Invoice ${record.invoiceNumber || ''} recorded (${record.paymentStatus || 'unpaid'})`.trim(),
        entityId: record._id,
        timestamp: record.createdAt
      })
    ),
    ...labReports.map((record) =>
      buildActivityItem({
        type: 'lab_report_finalized',
        label: 'Lab report finalized',
        entityId: record._id,
        timestamp: pickDateField(record.reviewedAt, record.createdAt)
      })
    ),
    ...dispensings.map((record) =>
      buildActivityItem({
        type: 'dispensing_created',
        label: 'Medicine dispensing recorded',
        entityId: record._id,
        timestamp: pickDateField(record.dispensedAt, record.createdAt)
      })
    ),
    ...notifications.map((record) =>
      buildActivityItem({
        type: 'notification_sent',
        label: `${String(record.type || 'notification').replaceAll('_', ' ')} sent`,
        entityId: record._id,
        timestamp: pickDateField(record.sentAt, record.createdAt)
      })
    )
  ];

  return items
    .filter((item) => item.timestamp)
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, limit);
};

const getSuperAdminOverview = async ({ requester } = {}) => {
  const Clinic = require('../clinics/clinic.model');
  const Doctor = require('../doctors/doctor.model');
  const Invoice = require('../billing/invoice.model');
  const PharmacySale = require('../pharmacy/pharmacySale.model');
  const User = require('../users/user.model');
  const { ROLES } = require('../../common/constants/roles');

  const filter = { isActive: true };
  if (requester?.role === ROLES.ADMIN && requester?.organizationId) {
    filter.organizationId = requester.organizationId;
  }

  const clinics = await Clinic.find(filter).lean();
  const clinicIds = clinics.map((c) => c._id);

  const totalDoctors = await Doctor.countDocuments({ clinicId: { $in: clinicIds }, isActive: true });

  const [doctorCounts, invoiceRevenues, pharmacyRevenues, managers] = await Promise.all([
    Doctor.aggregate([
      { $match: { clinicId: { $in: clinicIds }, isActive: true } },
      { $group: { _id: '$clinicId', count: { $sum: 1 } } }
    ]),
    Invoice.aggregate([
      { $match: { clinicId: { $in: clinicIds }, invoiceStatus: { $ne: 'cancelled' } } },
      { $group: { _id: '$clinicId', total: { $sum: '$totalAmount' } } }
    ]),
    PharmacySale.aggregate([
      { $match: { clinicId: { $in: clinicIds } } },
      { $group: { _id: '$clinicId', total: { $sum: '$amount' } } }
    ]),
    User.find({ clinicId: { $in: clinicIds }, role: ROLES.RECEPTIONIST }).lean()
  ]);

  const doctorCountMap = new Map(doctorCounts.map((d) => [String(d._id), d.count]));
  const invoiceRevenueMap = new Map(invoiceRevenues.map((i) => [String(i._id), i.total]));
  const pharmacyRevenueMap = new Map(pharmacyRevenues.map((p) => [String(p._id), p.total]));
  const managerMap = new Map(managers.map((m) => [String(m.clinicId), m.email]));

  let grandTotalRevenue = 0;

  const clinicData = clinics.map((clinic) => {
    const docCount = doctorCountMap.get(String(clinic._id)) || 0;
    const invRev = invoiceRevenueMap.get(String(clinic._id)) || 0;
    const pharmRev = pharmacyRevenueMap.get(String(clinic._id)) || 0;
    const clinicRevenue = invRev + pharmRev;
    grandTotalRevenue += clinicRevenue;

    return {
      ...clinic,
      doctorCount: docCount,
      revenue: clinicRevenue,
      email: managerMap.get(String(clinic._id)) || 'N/A'
    };
  });

  return {
    totalClinics: clinics.length,
    totalDoctors,
    totalRevenue: grandTotalRevenue,
    clinics: clinicData
  };
};

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
