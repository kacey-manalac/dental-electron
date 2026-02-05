interface DentalOverviewProps {
  summary: {
    total: number;
    healthy: number;
    cavities: number;
    filled: number;
    crowns: number;
    missing: number;
    implants: number;
    rootCanals: number;
    composites: number;
    amalgams: number;
    golds: number;
    ceramics: number;
    sealants: number;
    veneers: number;
    pontics: number;
    fractures: number;
    impacted: number;
  };
}

export default function DentalOverview({ summary }: DentalOverviewProps) {
  const healthPercentage = Math.round((summary.healthy / summary.total) * 100);

  // Only show stats that have non-zero counts (besides healthy which always shows)
  const allStats = [
    { label: 'Healthy', value: summary.healthy, color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    { label: 'Caries', value: summary.cavities, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    { label: 'Composite', value: summary.composites, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    { label: 'Amalgam', value: summary.amalgams, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    { label: 'Gold', value: summary.golds, color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    { label: 'Ceramic', value: summary.ceramics, color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' },
    { label: 'Sealant', value: summary.sealants, color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' },
    { label: 'Filled', value: summary.filled, color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    { label: 'Root Canal', value: summary.rootCanals, color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
    { label: 'Crowns', value: summary.crowns, color: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300' },
    { label: 'Veneers', value: summary.veneers, color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300' },
    { label: 'Missing', value: summary.missing, color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' },
    { label: 'Implants', value: summary.implants, color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300' },
    { label: 'Pontics', value: summary.pontics, color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
    { label: 'Fractures', value: summary.fractures, color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    { label: 'Impacted', value: summary.impacted, color: 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-300' },
  ];

  // Show healthy always, plus any non-zero conditions
  const stats = allStats.filter((s, i) => i === 0 || s.value > 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Oral Health Overview</h3>
        <div className="flex items-center">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90">
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(healthPercentage / 100) * 176} 176`}
                className="text-green-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-900 dark:text-white">
              {healthPercentage}%
            </span>
          </div>
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Health Score</span>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`p-3 rounded-lg ${stat.color} text-center`}
          >
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
