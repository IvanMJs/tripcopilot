"use client";

interface UserRow {
  userId: string;
  lastSeen: string;
  eventCount: number;
  completedSteps: number;
}

export function UsersTable({ data, totalSteps }: { data: UserRow[]; totalSteps: number }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-600 text-center py-8">
        Sin usuarios todavía.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] text-gray-600 uppercase tracking-wider border-b border-white/[0.05]">
            <th className="pb-3 pr-4">Usuario</th>
            <th className="pb-3 pr-4">Último evento</th>
            <th className="pb-3 pr-4">Eventos</th>
            <th className="pb-3">Funnel</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {data.map((row) => (
            <tr key={row.userId} className="hover:bg-white/[0.02] transition-colors">
              <td className="py-3 pr-4 font-mono text-xs text-gray-400">{row.userId}…</td>
              <td className="py-3 pr-4 text-xs text-gray-500">
                {new Date(row.lastSeen).toLocaleString("es-AR", {
                  day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                })}
              </td>
              <td className="py-3 pr-4 text-white font-semibold">{row.eventCount}</td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/[0.06] rounded-full overflow-hidden max-w-[80px]">
                    <div
                      className="h-full rounded-full bg-[#FFB800]"
                      style={{ width: `${Math.round((row.completedSteps / totalSteps) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{row.completedSteps}/{totalSteps}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
