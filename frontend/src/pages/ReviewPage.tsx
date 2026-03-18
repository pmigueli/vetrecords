import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDocument, useConfirmDocument, useDiscardDocument } from "../api/documents";
import { usePet } from "../api/pets";
import { useVisits } from "../api/visits";
import DocumentViewer from "../features/review/DocumentViewer";
import PetEditCard from "../features/review/PetEditCard";
import VisitEditCard from "../features/review/VisitEditCard";

export default function ReviewPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const confirmMutation = useConfirmDocument();
  const discardMutation = useDiscardDocument();

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

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDiscardConfirm(true)}
            disabled={discardMutation.isPending || confirmMutation.isPending}
            className="px-4 py-1.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Discard
          </button>
          <button
            onClick={async () => {
              if (!documentId) return;
              const result = await confirmMutation.mutateAsync(documentId);
              navigate(`/pets/${result.pet_id}`);
            }}
            disabled={confirmMutation.isPending || discardMutation.isPending}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Confirm & Save
          </button>
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
          {pet && <PetEditCard pet={pet} />}

          {/* Visits */}
          {visits.length > 0 && (
            <div className="space-y-4">
              {visits.map((visit, index) => (
                <VisitEditCard
                  key={visit.id}
                  visit={visit}
                  index={index}
                  total={visits.length}
                />
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

      {/* Discard confirmation dialog */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowDiscardConfirm(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Discard this document?
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              This will delete all extracted data including the pet profile and
              visits. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!documentId) return;
                  await discardMutation.mutateAsync(documentId);
                  navigate("/");
                }}
                disabled={discardMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {discardMutation.isPending ? "Deleting..." : "Discard"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
