import { createFileRoute } from '@tanstack/react-router';

const dashboardUrl =
  import.meta.env.VITE_DASHBOARD_URL || 'https://fast-site-lift.vercel.app';

export const Route = createFileRoute('/dashboard')({
  head: () => ({
    meta: [
      { title: 'Space Call Dashboard' },
      {
        name: 'description',
        content: 'Standalone Space Call admin dashboard embedded in the no-Shopify staging storefront.',
      },
    ],
  }),
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <main className="min-h-screen bg-slate-950">
      <div className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-slate-950 px-4 py-3 text-white">
          <div>
            <p className="text-sm font-semibold">Space Call Dashboard</p>
            <p className="text-xs text-slate-400">No-Shopify staging integration</p>
          </div>
          <a
            href={dashboardUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Open standalone
          </a>
        </div>
        <iframe
          title="Space Call Dashboard"
          src={dashboardUrl}
          className="min-h-[calc(100vh-65px)] w-full flex-1 border-0 bg-white"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </main>
  );
}
