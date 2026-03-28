import { getAdminHeatmapData } from '@/lib/actions/admin';
import { GlobalHeatmap } from '@/components/admin/GlobalHeatmap';

interface Props {
  searchParams: Promise<{ year?: string }>;
}

export default async function AdminHeatmapPage({ searchParams }: Props) {
  const params = await searchParams;
  const currentYear = new Date().getUTCFullYear();
  const year = parseInt(params.year ?? String(currentYear), 10);

  const data = await getAdminHeatmapData(year);
  const totalEvents = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Activity Heatmap</h1>
          <p className="text-sm text-gray-400 mt-1">
            {totalEvents.toLocaleString()} events across all users in {year}
          </p>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-2">
          {[currentYear - 1, currentYear].map((y) => (
            <a
              key={y}
              href={`/admin/heatmap?year=${y}`}
              className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                y === year
                  ? 'bg-violet-700 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              {y}
            </a>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 overflow-x-auto">
        <GlobalHeatmap data={data} year={year} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className="w-3 h-3 rounded-sm"
            style={{
              backgroundColor: level === 0
                ? '#1f2937'
                : `hsl(${258 + level * 10}, ${50 + level * 10}%, ${20 + level * 10}%)`,
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
