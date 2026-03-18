import { useState } from "react";
import { useNavigate } from "react-router-dom";
import UploadModal from "../components/UploadModal";
import { useDocuments } from "../api/documents";
import type { Document } from "../types";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    processing: {
      label: "Processing",
      className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    },
    extracting: {
      label: "Extracting",
      className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    },
    splitting: {
      label: "Splitting",
      className: "bg-yellow-50 text-yellow-700 border-yellow-200",
    },
    structuring: {
      label: "Structuring",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    review: {
      label: "Ready for Review",
      className: "bg-orange-50 text-orange-700 border-orange-200",
    },
    confirmed: {
      label: "Processed",
      className: "bg-green-50 text-green-700 border-green-200",
    },
    error: {
      label: "Error",
      className: "bg-red-50 text-red-700 border-red-200",
    },
    partial: {
      label: "Partial",
      className: "bg-orange-50 text-orange-700 border-orange-200",
    },
  };

  const { label, className } = config[status] || {
    label: status,
    className: "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full border ${className}`}
    >
      {(status === "processing" ||
        status === "extracting" ||
        status === "splitting" ||
        status === "structuring") && (
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {status === "confirmed" && (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
        </svg>
      )}
      {label}
    </span>
  );
}

function DocumentCard({
  document,
  onClick,
}: {
  document: Document;
  onClick?: () => void;
}) {
  const isClickable =
    document.status === "review" || document.status === "confirmed";

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between ${
        isClickable
          ? "cursor-pointer hover:border-green-300 hover:shadow-sm transition-all"
          : ""
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <div>
          <p className="font-medium text-gray-900">{document.filename}</p>
          <p className="text-sm text-gray-500">
            {document.file_size || "—"}
            {document.visit_count && ` · ${document.visit_count} visits`}
            {" · "}
            {new Date(document.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusBadge status={document.status} />
        {isClickable && (
          <svg
            className="w-5 h-5 text-gray-400"
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
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const navigate = useNavigate();
  const { data: documents, isLoading } = useDocuments();

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500 mt-1">
            Upload clinical histories and browse structured pet records
          </p>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Upload Document
        </button>
      </div>

      {isLoading && (
        <div className="text-center py-16">
          <svg
            className="w-8 h-8 animate-spin text-green-600 mx-auto"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      )}

      {!isLoading && documents && documents.length > 0 && (
        <div className="space-y-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onClick={() => {
                if (doc.status === "review") {
                  navigate(`/documents/${doc.id}/review`);
                } else if (doc.status === "confirmed" && doc.pet_id) {
                  navigate(`/pets/${doc.pet_id}`);
                }
              }}
            />
          ))}
        </div>
      )}

      {!isLoading && (!documents || documents.length === 0) && (
        <div className="text-center py-16 text-gray-400">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <p>No patients yet. Upload a clinical history to get started.</p>
        </div>
      )}

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />
    </div>
  );
}
