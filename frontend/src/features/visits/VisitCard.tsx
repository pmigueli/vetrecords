import type { Visit } from "../../types";

interface VisitCardProps {
  visit: Visit;
  onClick: () => void;
}

export default function VisitCard({ visit, onClick }: VisitCardProps) {
  const typeColors: Record<string, string> = {
    emergency: "bg-red-100 text-red-700",
    vaccination: "bg-green-100 text-green-700",
    consultation: "bg-blue-100 text-blue-700",
    follow_up: "bg-purple-100 text-purple-700",
    surgery: "bg-orange-100 text-orange-700",
    hospitalization: "bg-yellow-100 text-yellow-700",
    phone_call: "bg-gray-100 text-gray-700",
    lab_results: "bg-cyan-100 text-cyan-700",
  };

  const typeClass =
    typeColors[visit.visit_type ?? ""] ?? "bg-gray-100 text-gray-700";

  return (
    <div
      onClick={onClick}
      className="relative pl-8 pb-8 cursor-pointer group"
    >
      {/* Timeline dot and line */}
      <div className="absolute left-0 top-1 w-3 h-3 bg-white border-2 border-green-500 rounded-full z-10 group-hover:bg-green-500 transition-colors" />
      <div className="absolute left-[5px] top-4 w-0.5 h-full bg-gray-200" />

      {/* Card content */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:border-green-300 hover:shadow-sm transition-all">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-semibold text-gray-900 text-sm">
            {formatDate(visit.date)}
          </span>
          {visit.visit_type && (
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeClass}`}
            >
              {visit.visit_type.replace("_", " ")}
            </span>
          )}
          {visit.vital_signs?.weight_kg && (
            <span className="text-xs text-gray-400">
              {visit.vital_signs.weight_kg} kg
            </span>
          )}
        </div>

        {visit.reason && (
          <p className="text-sm text-gray-600 line-clamp-2">{visit.reason}</p>
        )}

        {visit.diagnosis && visit.diagnosis.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {visit.diagnosis.map((d, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700"
              >
                {d}
              </span>
            ))}
          </div>
        )}

        {/* Chevron */}
        <svg
          className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </div>
  );
}

function formatDate(date: string | null): string {
  if (!date) return "Unknown date";
  try {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date;
  }
}
