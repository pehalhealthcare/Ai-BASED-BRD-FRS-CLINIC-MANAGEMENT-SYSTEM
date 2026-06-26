import { Pill, ClipboardList } from 'lucide-react';
import Badge from '../../../components/ui/Badge';

export default function Prescriptions({ prescriptions, prescriptionApi }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-navy-800 shadow-card dark:shadow-card-dark overflow-hidden p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Past Prescriptions</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">View prescription history and instructions from your doctors.</p>
        </div>
        <Badge color="accent">{prescriptions.length} Records</Badge>
      </div>

      <div className="space-y-5">
        {prescriptions.length > 0 ? (
          prescriptions.map((rx) => (
            <div key={rx._id} className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-navy-900/50 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Pill size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Prescribed by: {rx.doctorId?.fullName || 'Clinic Physician'}
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      Date: {rx.createdAt ? new Date(rx.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const response = await prescriptionApi.download(rx._id);
                      const blob = new Blob([response.data], { type: 'application/pdf' });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.setAttribute('download', `prescription-${rx._id}.pdf`);
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                    } catch {
                      alert('Failed to download PDF.');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-navy-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
                >
                  Download PDF
                </button>
              </div>

              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 text-slate-400">
                      <th className="py-2 font-semibold">Medicine</th>
                      <th className="py-2 font-semibold">Dosage</th>
                      <th className="py-2 font-semibold">Frequency</th>
                      <th className="py-2 font-semibold">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
                    {rx.medications?.map((med, idx) => (
                      <tr key={idx}>
                        <td className="py-2 font-medium">{med.name}</td>
                        <td className="py-2">{med.dosage || 'As directed'}</td>
                        <td className="py-2">{med.frequency || 'N/A'}</td>
                        <td className="py-2">{med.duration || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Pill size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No past prescriptions found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
