import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { usePet } from "../api/pets";
import { useVisits } from "../api/visits";
import PetInfoSidebar from "../features/pets/PetInfoSidebar";
import VisitTimeline from "../features/visits/VisitTimeline";
import type { Visit } from "../types";

export default function PetProfilePage() {
  const { petId } = useParams<{ petId: string }>();
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  const { data: pet, isLoading: petLoading } = usePet(petId ?? null);
  const { data: visitsData, isLoading: visitsLoading } = useVisits(
    petId ?? null,
    1,
    100,
    "desc"
  );

  if (petLoading || visitsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <svg
          className="w-8 h-8 animate-spin text-green-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
        <p className="text-gray-500">Pet not found</p>
        <Link to="/" className="mt-4 text-green-600 hover:text-green-700">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const visits = visitsData?.items ?? [];
  const totalVisits = visitsData?.total ?? 0;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
        <Link
          to="/"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Patients
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-900">
            {pet.name} — {pet.breed}
          </h2>
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
            {totalVisits} visits
          </span>
        </div>

        <div />
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-[300px] border-r border-gray-200 overflow-y-auto p-5 bg-white">
          <PetInfoSidebar pet={pet} visits={visits} />
        </div>

        {/* Right: Visit timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          <VisitTimeline
            visits={visits}
            totalVisits={totalVisits}
            onVisitClick={(visit) => setSelectedVisit(visit)}
          />
        </div>
      </div>

      {/* Visit Detail Modal */}
      {selectedVisit && (
        <VisitDetailModal
          visit={selectedVisit}
          onClose={() => setSelectedVisit(null)}
        />
      )}
    </div>
  );
}

function VisitDetailModal({
  visit,
  onClose,
}: {
  visit: Visit;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-gray-900">
              {formatDate(visit.date)}
            </span>
            {visit.visit_type && (
              <span
                className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                  visit.visit_type === "emergency"
                    ? "bg-red-100 text-red-700"
                    : visit.visit_type === "vaccination"
                    ? "bg-green-100 text-green-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {visit.visit_type.replace("_", " ")}
              </span>
            )}
            {visit.vital_signs?.weight_kg && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                {visit.vital_signs.weight_kg} kg
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {visit.reason && (
            <DetailSection title="Reason">
              <p className="text-sm text-gray-700">{visit.reason}</p>
            </DetailSection>
          )}

          {visit.examination && (
            <DetailSection title="Examination">
              <p className="text-sm text-gray-700">{visit.examination}</p>
            </DetailSection>
          )}

          {/* Vital Signs */}
          {visit.vital_signs && (
            <DetailSection title="Vital Signs">
              <div className="grid grid-cols-3 gap-3">
                {visit.vital_signs.weight_kg && (
                  <VitalCard label="Weight" value={`${visit.vital_signs.weight_kg} kg`} />
                )}
                {visit.vital_signs.temperature_celsius && (
                  <VitalCard label="Temperature" value={`${visit.vital_signs.temperature_celsius}°C`} />
                )}
                {visit.vital_signs.heart_rate_bpm && (
                  <VitalCard label="Heart Rate" value={`${visit.vital_signs.heart_rate_bpm} bpm`} />
                )}
              </div>
            </DetailSection>
          )}

          {/* Diagnosis */}
          {visit.diagnosis && visit.diagnosis.length > 0 && (
            <DetailSection title="Diagnosis">
              <div className="flex flex-wrap gap-2">
                {visit.diagnosis.map((d, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-700"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Medications */}
          {visit.treatment?.medications &&
            visit.treatment.medications.length > 0 && (
              <DetailSection title="Medications">
                <div className="space-y-2">
                  {visit.treatment.medications.map((med, i) => (
                    <div
                      key={i}
                      className="bg-gray-50 rounded-lg px-4 py-3"
                    >
                      <p className="font-medium text-sm text-gray-900">
                        {med.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {[med.dosage, med.route, med.frequency, med.duration]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  ))}
                </div>
              </DetailSection>
            )}

          {/* Procedures */}
          {visit.treatment?.procedures &&
            visit.treatment.procedures.length > 0 && (
              <DetailSection title="Procedures">
                <div className="flex flex-wrap gap-2">
                  {visit.treatment.procedures.map((p, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </DetailSection>
            )}

          {/* Diet */}
          {visit.treatment?.diet && (
            <DetailSection title="Diet">
              <p className="text-sm text-gray-700">{visit.treatment.diet}</p>
            </DetailSection>
          )}

          {/* Lab Results */}
          {visit.lab_results && visit.lab_results.length > 0 && (
            <DetailSection title="Lab Results">
              <div className="space-y-2">
                {visit.lab_results.map((lab, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg px-4 py-3">
                    <div className="flex justify-between">
                      <span className="font-medium text-sm text-gray-900">
                        {lab.test_name}
                      </span>
                      <span className="text-sm text-gray-700">
                        {lab.result}
                      </span>
                    </div>
                    {lab.interpretation && (
                      <p className="text-xs text-gray-500 mt-1">
                        {lab.interpretation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </DetailSection>
          )}

          {/* Notes */}
          {visit.notes && (
            <DetailSection title="Notes">
              <p className="text-sm text-gray-700">{visit.notes}</p>
            </DetailSection>
          )}

          {/* Original Text */}
          {visit.raw_text && (
            <details className="border border-gray-200 rounded-lg">
              <summary className="px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Original Text
              </summary>
              <div className="px-4 py-3 border-t border-gray-200">
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                  {visit.raw_text}
                </pre>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function VitalCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function formatDate(date: string | null): string {
  if (!date) return "Unknown date";
  try {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return date;
  }
}
