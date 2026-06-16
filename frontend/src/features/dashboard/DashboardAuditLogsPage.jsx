import { useEffect, useState } from 'react';

import Badge from '../../components/common/Badge';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Table from '../../components/common/Table';
import PageHeader from '../../components/layout/PageHeader';
import { formatDateTime } from '../../utils/formatDate';
import { listAuditLogs } from './dashboardApi';
import SectionCard from './SectionCard';

const badgeTone = {
  SUCCESS: 'success',
  FAILURE: 'danger'
};

const DashboardAuditLogsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const filters = {
        page,
        limit,
        action: actionFilter || undefined,
        entity: entityFilter || undefined,
        status: statusFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      const response = await listAuditLogs(filters);
      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.totalPages || 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page, limit]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadLogs();
  };

  const handleReset = () => {
    setActionFilter('');
    setEntityFilter('');
    setStatusFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    // Reloads logs dynamically due to effect dependencies if page changes,
    // otherwise trigger manual reload.
    setTimeout(() => {
      loadLogs();
    }, 0);
  };

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Security & Operations"
        title="System Audit Logs"
        description="Monitor system-wide activity, authorization updates, clinical data processing, and user login attempts for compliance and auditing."
      />

      {/* Filter Bar */}
      <SectionCard title="Filter Logs" description="Search audit records using parameters below.">
        <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-3 xl:grid-cols-6 items-end">
          <div>
            <label className="text-xs font-semibold text-neutral-400 block mb-1">Action</label>
            <input
              type="text"
              placeholder="e.g. USER_LOGIN_SUCCESS"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-400 block mb-1">Entity</label>
            <input
              type="text"
              placeholder="e.g. Auth, Patient"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-400 block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILURE">FAILURE</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-400 block mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-400 block mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded px-4 py-2 text-sm font-semibold transition"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded px-4 py-2 text-sm font-semibold transition"
            >
              Reset
            </button>
          </div>
        </form>
      </SectionCard>

      {/* Main Table and Detail Sidebar Split */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        <div className={selectedLog ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <SectionCard title="Log Records" description={`Showing ${logs.length} of ${total} events`}>
            {loading ? (
              <LoadingState label="Loading audit records..." />
            ) : error ? (
              <ErrorState title="Audit Log retrieval failure" description={error} />
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-neutral-500">No audit logs found matching the filter criteria.</div>
            ) : (
              <div className="grid gap-4">
                <Table
                  columns={[
                    {
                      key: 'timestamp',
                      label: 'Timestamp',
                      render: (row) => formatDateTime(row.createdAt)
                    },
                    {
                      key: 'actor',
                      label: 'Actor / User',
                      render: (row) => (
                        <div>
                          <div className="font-semibold text-white">{row.actorUserId?.name || 'System / Guest'}</div>
                          {row.actorUserId && (
                            <div className="text-xs text-neutral-400">
                              {row.actorUserId.email} ({row.actorUserId.role})
                            </div>
                          )}
                        </div>
                      )
                    },
                    {
                      key: 'action',
                      label: 'Action',
                      render: (row) => <span className="font-mono text-xs text-neutral-200">{row.action}</span>
                    },
                    {
                      key: 'entity',
                      label: 'Entity',
                      render: (row) => row.entity
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      render: (row) => <Badge tone={badgeTone[row.status] || 'neutral'}>{row.status}</Badge>
                    },
                    {
                      key: 'view',
                      label: 'Details',
                      render: (row) => (
                        <button
                          onClick={() => setSelectedLog(row)}
                          className="text-primary-400 hover:text-primary-300 text-xs font-semibold"
                        >
                          Explore
                        </button>
                      )
                    }
                  ]}
                  data={logs}
                />

                {/* Pagination Controls */}
                <div className="flex items-center justify-between border-t border-neutral-800 pt-4 mt-2">
                  <div className="text-xs text-neutral-400">
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="bg-neutral-800 disabled:opacity-50 hover:bg-neutral-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="bg-neutral-800 disabled:opacity-50 hover:bg-neutral-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Selected Log Sidebar */}
        {selectedLog && (
          <div className="lg:col-span-1">
            <SectionCard
              title="Audit Event Details"
              description="Full operational context and schema metadata."
            >
              <div className="grid gap-4 text-sm text-neutral-200">
                <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                  <span className="text-xs text-neutral-400 font-semibold uppercase">Action Name</span>
                  <span className="font-mono text-xs font-bold text-primary-400">{selectedLog.action}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 border-b border-neutral-800 pb-2 text-xs">
                  <div>
                    <span className="text-neutral-400 font-semibold block uppercase">Entity Type</span>
                    <span>{selectedLog.entity}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 font-semibold block uppercase">Entity ID</span>
                    <span className="font-mono text-neutral-300">{selectedLog.entityId || 'None'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-b border-neutral-800 pb-2 text-xs">
                  <div>
                    <span className="text-neutral-400 font-semibold block uppercase">IP Address</span>
                    <span>{selectedLog.ipAddress || 'Not logged'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-400 font-semibold block uppercase">Status</span>
                    <Badge tone={badgeTone[selectedLog.status] || 'neutral'}>{selectedLog.status}</Badge>
                  </div>
                </div>

                <div className="border-b border-neutral-800 pb-2 text-xs">
                  <span className="text-neutral-400 font-semibold block uppercase">User Agent</span>
                  <span className="text-neutral-300 block break-words">{selectedLog.userAgent || 'Not logged'}</span>
                </div>

                <div>
                  <span className="text-neutral-400 font-semibold text-xs block uppercase mb-1">Metadata payload</span>
                  <pre className="bg-neutral-950 border border-neutral-800 rounded p-3 text-xs font-mono text-green-400 overflow-x-auto max-h-80 select-all">
                    {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                  </pre>
                </div>

                <button
                  onClick={() => setSelectedLog(null)}
                  className="w-full bg-neutral-800 hover:bg-neutral-700 text-white rounded py-2 text-xs font-semibold transition mt-2"
                >
                  Close Details Panel
                </button>
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </section>
  );
};

export default DashboardAuditLogsPage;
