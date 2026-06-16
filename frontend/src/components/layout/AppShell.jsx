import { Outlet } from 'react-router-dom';

const AppShell = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-white to-emerald-50 text-stone-900">
      <header className="border-b border-stone-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">AI Clinic Management System</p>
            <h1 className="mt-2 text-2xl font-semibold text-stone-900">AI-CMS Auth Foundation</h1>
          </div>
          <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">Phase 2</div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
};

export default AppShell;
