import { useState } from "react";
import FileDropzone from "./FileDropzone";
import { useUploadDocument } from "../api/documents";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const uploadMutation = useUploadDocument();

  if (!isOpen) return null;

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadMutation.mutateAsync(selectedFile);
      setSelectedFile(null);
      onClose();
    } catch {
      // Error is handled by mutation state
    }
  };

  const handleClose = () => {
    if (uploadMutation.isPending) return;
    setSelectedFile(null);
    uploadMutation.reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Upload Medical Document
          </h2>
          <button
            onClick={handleClose}
            disabled={uploadMutation.isPending}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-2">
          <FileDropzone
            onFileSelected={handleFileSelected}
            disabled={uploadMutation.isPending}
          />

          {selectedFile && !uploadMutation.isPending && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
              </svg>
              <span className="truncate">{selectedFile.name}</span>
              <span className="text-gray-400">
                ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
              </span>
            </div>
          )}

          {uploadMutation.isPending && (
            <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading...
            </div>
          )}

          {uploadMutation.isError && (
            <p className="mt-3 text-sm text-red-600">
              Upload failed. Please try again.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-5">
          <button
            onClick={handleClose}
            disabled={uploadMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload & Process
          </button>
        </div>
      </div>
    </div>
  );
}
