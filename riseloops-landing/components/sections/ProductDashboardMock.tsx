"use client";

import {
  LayoutGrid,
  ShieldCheck,
  FileText,
  Users,
  Database,
  AlertTriangle,
  ClipboardList,
  Settings,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { icon: LayoutGrid, label: "Overview", active: true },
  { icon: Users, label: "Consent" },
  { icon: FileText, label: "Requests" },
  { icon: Database, label: "Data Records" },
  { icon: AlertTriangle, label: "Breach Log" },
  { icon: ClipboardList, label: "Audit Trail" },
  { icon: Settings, label: "Settings" },
];

const STATS = [
  { label: "Active Consents", value: "128,402", trend: "+4.2%" },
  { label: "Open DSRs", value: "37", trend: "-12%" },
  { label: "Compliance Score", value: "96%", trend: "+1.1%" },
];

const CHART_BARS = [38, 52, 46, 64, 58, 72, 66, 80, 74, 90, 84, 96];

const TABLE_ROWS = [
  { name: "Marketing Consent — EU", status: "Active", updated: "2m ago" },
  { name: "Data Subject Request #4471", status: "In Review", updated: "18m ago" },
  { name: "Retention Policy — HR Records", status: "Compliant", updated: "1h ago" },
];

export function ProductDashboardMock() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-ink-900 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.8)]">
      {/* browser chrome */}
      <div className="flex items-center gap-2 border-b border-white/5 bg-ink-950/60 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <div className="ml-3 flex-1 rounded-md bg-white/[0.04] px-3 py-1 text-[11px] text-mist-600">
          app.privora.io/dashboard
        </div>
      </div>

      <div className="flex">
        {/* sidebar */}
        <div className="hidden sm:flex w-40 md:w-48 flex-col gap-1 border-r border-white/5 bg-ink-950/40 p-3">
          <div className="mb-3 flex items-center gap-2 px-2 py-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-400" />
            <span className="text-xs font-semibold text-white">Privora</span>
          </div>
          {SIDEBAR_ITEMS.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[11px] ${
                item.active
                  ? "bg-accent-400/10 text-accent-300"
                  : "text-mist-600"
              }`}
            >
              <item.icon size={13} />
              {item.label}
            </div>
          ))}
        </div>

        {/* main */}
        <div className="flex-1 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-mist-600">Overview</p>
              <p className="text-sm font-semibold text-white">
                Privacy Operations Dashboard
              </p>
            </div>
            <ShieldCheck size={16} className="text-accent-400" />
          </div>

          {/* stat cards */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-white/5 bg-white/[0.03] p-2.5 sm:p-3"
              >
                <p className="text-[9px] sm:text-[10px] text-mist-600 truncate">
                  {stat.label}
                </p>
                <p className="mt-1 text-sm sm:text-lg font-semibold text-white">
                  {stat.value}
                </p>
                <p className="text-[9px] sm:text-[10px] text-accent-400">
                  {stat.trend}
                </p>
              </div>
            ))}
          </div>

          {/* chart */}
          <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.03] p-3 sm:p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] sm:text-xs text-mist-400">
                Consent Activity — 12mo
              </p>
              <span className="text-[9px] sm:text-[10px] text-accent-400">
                Live
              </span>
            </div>
            <div className="flex h-16 sm:h-24 items-end gap-1 sm:gap-1.5">
              {CHART_BARS.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-gradient-to-t from-accent-500/20 to-accent-400/70"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          {/* table */}
          <div className="mt-3 hidden sm:block rounded-xl border border-white/5 bg-white/[0.03] p-3">
            <p className="mb-2 text-[10px] sm:text-xs text-mist-400">
              Recent Activity
            </p>
            <div className="flex flex-col gap-1.5">
              {TABLE_ROWS.map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between rounded-lg bg-white/[0.02] px-2.5 py-2 text-[10px] sm:text-[11px]"
                >
                  <span className="truncate text-mist-300">{row.name}</span>
                  <span className="ml-2 shrink-0 rounded-full bg-accent-400/10 px-2 py-0.5 text-accent-300">
                    {row.status}
                  </span>
                  <span className="ml-2 hidden shrink-0 text-mist-600 md:inline">
                    {row.updated}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
