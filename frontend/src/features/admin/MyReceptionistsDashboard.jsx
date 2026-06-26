import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingState from '../../components/common/LoadingState';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/layout/PageHeader';
import { adminApi } from '../../lib/api';

const MyReceptionistsDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [receptionists, setReceptionists] = useState([]);
  const [pendingReceptionists, setPendingReceptionists] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await adminApi.getMyReceptionistsDashboard();
      setReceptionists(response.data?.receptionists || []);
      setPendingReceptionists(response.data?.pendingReceptionists || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to load receptionists dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <LoadingState label="Loading receptionists dashboard..." />;
  }

  if (error) {
    return <ErrorState title="Dashboard Offline" description={error} />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <PageHeader 
        title="My Receptionists Dashboard" 
        description="Manage organization receptionist venue assignments, schedules, and pending registration review requests."
      />

      {/* ── Pending Approvals Section ── */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-lg font-black text-stone-900 tracking-tight uppercase">
            Pending Approval Reviews ({pendingReceptionists.length})
          </h2>
          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
        </div>

        {pendingReceptionists.length === 0 ? (
          <div className="bg-stone-50 border border-dashed border-stone-250 p-8 rounded-3xl text-center">
            <p className="text-stone-500 text-xs font-semibold">No pending receptionist applications found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingReceptionists.map((user) => (
              <div 
                key={user._id} 
                className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-stone-950 text-base leading-tight">{user.name}</h3>
                      <p className="text-xs text-stone-500 font-medium mt-0.5">{user.email}</p>
                    </div>
                    <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-250 px-2.5 py-0.5 rounded-full uppercase">
                      {user.approvalStatus?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-stone-700 font-medium border-t pt-3 mt-3">
                    <p>📞 Phone: {user.phone || 'N/A'}</p>
                    <p>🎓 Degree: {user.profile?.qualification || 'Not completed'}</p>
                    <p>💼 Exp: {user.profile?.experienceYears || 0} years</p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t">
                  <button
                    onClick={() => navigate(`/admin/receptionists/${user._id}/review`)}
                    className="w-full py-2.5 bg-stone-900 hover:bg-stone-850 text-white font-bold rounded-xl text-xs shadow-sm transition cursor-pointer"
                  >
                    Review Application & Set Shifts →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Active Approved Receptionists ── */}
      <div>
        <h2 className="text-lg font-black text-stone-900 tracking-tight uppercase mb-6 text-white">
          Appointed Receptionists ({receptionists.length})
        </h2>

        {receptionists.length === 0 ? (
          <div className="bg-stone-50 border border-dashed border-stone-250 p-8 rounded-3xl text-center">
            <p className="text-stone-500 text-xs font-semibold">No approved receptionists found in organization.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {receptionists.map((rec) => (
              <div 
                key={rec._id} 
                className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex gap-4"
              >
                {rec.image ? (
                  <img 
                    src={rec.image} 
                    alt={rec.fullName} 
                    className="w-16 h-16 rounded-2xl object-cover border border-stone-150 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center border text-2xl shrink-0">
                    👤
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-stone-950 text-sm truncate leading-tight">{rec.fullName}</h3>
                    <span className="text-[9px] font-mono bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded uppercase font-black shrink-0 ml-2">
                      {rec.receptionistCode || 'NO-CODE'}
                    </span>
                  </div>

                  <p className="text-xs text-stone-500 font-medium truncate mt-0.5">{rec.email}</p>

                  <div className="mt-3 space-y-1 text-[11px] text-stone-600 font-medium border-t pt-2.5">
                    <p className="truncate">🏢 Venue: <span className="font-bold text-stone-900">{rec.clinicId?.name || 'N/A'}</span></p>
                    <p>📞 Phone: {rec.phone}</p>
                    <p>🎓 Degree: {rec.qualification || 'N/A'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReceptionistsDashboard;
