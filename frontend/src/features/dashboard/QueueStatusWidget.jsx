import { useEffect, useState } from 'react';
import appointmentApi from '../../api/appointmentApi';
import { doctorApi } from '../../lib/api';
import ErrorState from '../../components/common/ErrorState';

const QueueStatusWidget = () => {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await doctorApi.list();
        const docs = response.data?.doctors || [];
        setDoctors(docs);
        if (docs.length > 0) {
          setSelectedDoctorId(docs[0]._id);
        }
      } catch (err) {
        console.error('Failed to load doctors for queue widget', err);
      }
    };
    fetchDoctors();
  }, []);

  useEffect(() => {
    if (!selectedDoctorId) return;

    const fetchQueue = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await appointmentApi.getQueueStatus(selectedDoctorId);
        setQueueStatus(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load queue status.');
      } finally {
        setLoading(false);
      }
    };

    fetchQueue();
    const intervalId = setInterval(fetchQueue, 30000); // Poll every 30s
    return () => clearInterval(intervalId);
  }, [selectedDoctorId]);

  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Live AI Queue</p>
        <select
          value={selectedDoctorId}
          onChange={(e) => setSelectedDoctorId(e.target.value)}
          className="rounded border border-stone-300 bg-white px-2 py-1 text-sm outline-none"
        >
          {doctors.map(doc => (
            <option key={doc._id} value={doc._id}>Dr. {doc.user?.fullName || doc.specialization}</option>
          ))}
        </select>
      </div>

      {loading && !queueStatus ? (
        <p className="text-sm text-stone-600">Loading queue...</p>
      ) : error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : queueStatus ? (
        <div className="grid gap-2 text-sm text-stone-700">
          <div className="flex justify-between">
            <span>Checked-in Patients:</span>
            <span className="font-semibold">{queueStatus.queue?.totalCheckedIn || 0}</span>
          </div>
          <div className="flex justify-between">
            <span>Est. Wait per Patient:</span>
            <span className="font-semibold">{queueStatus.queue?.estimatedWaitTimeMinutes || 15} mins</span>
          </div>
          <div className="mt-2 rounded bg-white p-2 border border-stone-200">
            <span className="block text-xs font-semibold text-stone-500 uppercase mb-1">In Consultation</span>
            {queueStatus.queue?.inConsultation ? (
              <span className="font-semibold text-emerald-700">Patient #{queueStatus.queue.inConsultation.patientId?.slice(-4)}</span>
            ) : (
              <span className="text-stone-500 italic">None currently</span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-stone-600">No queue data.</p>
      )}
    </div>
  );
};

export default QueueStatusWidget;
