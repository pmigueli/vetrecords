import { useParams, useNavigate, Link } from "react-router-dom";
import { useDocument } from "../api/documents";
import { usePet } from "../api/pets";
import { useVisits } from "../api/visits";
import DocumentViewer from "../features/review/DocumentViewer";

export default function ReviewPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();

  const { data: document, isLoading: docLoading } = useDocument(
    documentId ?? null
  );
  const { data: pet } = usePet(document?.pet_id ?? null);
  const { data: visitsData } = useVisits(pet?.id ?? null, 1, 100, "asc");

  if (docLoading) {
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

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
        <p className="text-gray-500">Document not found</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 text-green-600 hover:text-green-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const visits = visitsData?.items ?? [];

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
          Back to Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Review & Confirm Extraction
          </h2>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
            Draft
          </span>
        </div>

        <div className="text-sm text-gray-400">
          {document.visit_count
            ? `${document.visit_count} visits detected`
            : ""}
        </div>
      </div>

      {/* Split layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: PDF viewer */}
        <div className="w-[45%] p-4 border-r border-gray-200 bg-gray-50">
          <DocumentViewer
            documentId={document.id}
            filename={document.filename}
            contentType={document.content_type}
          />
        </div>

        {/* Right: Extracted data */}
        <div className="w-[55%] overflow-y-auto p-6 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Extracted Data
          </h3>

          {/* Pet Profile */}
          {pet && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <h4 className="font-semibold text-gray-900">Pet Profile</h4>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Name" value={pet.name} />
                <Field label="Species" value={pet.species} />
                <Field label="Breed" value={pet.breed} />
                <Field label="Date of Birth" value={pet.date_of_birth} />
                <Field label="Sex" value={pet.sex} />
                <Field label="Microchip" value={pet.microchip_id} />
                <Field label="Coat" value={pet.coat} />
                <Field label="Owner" value={pet.owner_name} />
                <Field label="Clinic" value={pet.clinic_name} />
              </div>
            </div>
          )}

          {/* Visits */}
          {visits.length > 0 && (
            <div className="space-y-4">
              {visits.map((visit, index) => (
                <div
                  key={visit.id}
                  className="border border-gray-200 rounded-xl p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">
                        {visit.date || "Unknown date"}
                      </span>
                      {visit.visit_type && (
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
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
                        <span className="text-xs text-gray-500">
                          {visit.vital_signs.weight_kg} kg
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">
                      Visit {index + 1} of {visits.length}
                    </span>
                  </div>

                  {visit.reason && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">Reason</p>
                      <p className="text-sm text-gray-700">{visit.reason}</p>
                    </div>
                  )}

                  {visit.examination && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">Examination</p>
                      <p className="text-sm text-gray-700">{visit.examination}</p>
                    </div>
                  )}

                  {visit.diagnosis && visit.diagnosis.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-500 mb-1">Diagnosis</p>
                      <div className="flex flex-wrap gap-1">
                        {visit.diagnosis.map((d, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {visit.treatment?.medications &&
                    visit.treatment.medications.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-gray-500 mb-1">
                          Medications
                        </p>
                        <div className="space-y-1">
                          {visit.treatment.medications.map(
                            (med: { name: string; dosage?: string; frequency?: string; route?: string }, i: number) => (
                              <p key={i} className="text-sm text-gray-700">
                                <span className="font-medium">{med.name}</span>
                                {med.dosage && ` · ${med.dosage}`}
                                {med.frequency && ` · ${med.frequency}`}
                                {med.route && ` · ${med.route}`}
                              </p>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}

          {!pet && visits.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p>No extracted data yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900">
        {value || <span className="text-gray-300">—</span>}
      </p>
    </div>
  );
}
