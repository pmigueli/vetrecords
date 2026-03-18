import type { Visit } from "../../types";
import VisitCard from "./VisitCard";

interface VisitTimelineProps {
  visits: Visit[];
  totalVisits: number;
  onVisitClick: (visit: Visit) => void;
}

export default function VisitTimeline({
  visits,
  totalVisits,
  onVisitClick,
}: VisitTimelineProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Visit Timeline</h2>
        <span className="text-sm text-gray-500">{totalVisits} visits</span>
      </div>

      <div className="relative">
        {visits.map((visit) => (
          <VisitCard
            key={visit.id}
            visit={visit}
            onClick={() => onVisitClick(visit)}
          />
        ))}

        {visits.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">
            No visits recorded
          </p>
        )}
      </div>
    </div>
  );
}
