interface DocumentViewerProps {
  documentId: string;
  filename: string;
  contentType: string;
}

export default function DocumentViewer({
  documentId,
  filename,
  contentType,
}: DocumentViewerProps) {
  const fileUrl = `http://localhost:8000/api/v1/documents/${documentId}/file`;

  if (contentType === "application/pdf") {
    return (
      <div className="h-full flex flex-col bg-gray-900 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <svg
              className="w-4 h-4"
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
            <span className="truncate">{filename}</span>
          </div>
        </div>
        <iframe
          src={`${fileUrl}#toolbar=0`}
          className="flex-1 w-full"
          title="Document preview"
        />
      </div>
    );
  }

  // Image files
  if (contentType.startsWith("image/")) {
    return (
      <div className="h-full flex flex-col bg-gray-100 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-sm text-gray-600">
          <span className="truncate">{filename}</span>
        </div>
        <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
          <img
            src={fileUrl}
            alt="Uploaded document"
            className="max-w-full shadow-lg rounded"
          />
        </div>
      </div>
    );
  }

  // Unsupported preview
  return (
    <div className="h-full flex items-center justify-center bg-gray-100 rounded-lg">
      <div className="text-center text-gray-500">
        <p className="font-medium">{filename}</p>
        <p className="text-sm mt-1">Preview not available for this file type</p>
        <a
          href={fileUrl}
          download
          className="inline-block mt-3 text-sm text-green-600 hover:text-green-700"
        >
          Download file
        </a>
      </div>
    </div>
  );
}
