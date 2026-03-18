import { useCallback, useState } from "react";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".jpg", ".jpeg", ".png"];

const MAX_SIZE_MB = 20;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function FileDropzone({
  onFileSelected,
  disabled = false,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return `File type '${ext}' not supported. Use PDF, DOCX, JPG, or PNG.`;
    }
    if (!ACCEPTED_TYPES.includes(file.type) && file.type !== "") {
      return "Invalid file type.";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `File exceeds ${MAX_SIZE_MB}MB limit.`;
    }
    if (file.size === 0) {
      return "File is empty.";
    }
    return null;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
      setError(null);
      onFileSelected(file);
    },
    [validateFile, onFileSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile, disabled]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          block border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
          transition-colors
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${
            isDragging
              ? "border-green-400 bg-green-50"
              : "border-gray-200 bg-gray-50 hover:border-gray-300"
          }
        `}
      >
        <input
          type="file"
          className="hidden"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleFileInput}
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-2">
          <svg
            className="w-10 h-10 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
            />
          </svg>
          <p className="font-semibold text-gray-900">
            Drag and drop your file here
          </p>
          <p className="text-sm text-gray-500">or click to browse files</p>
          <p className="text-xs text-gray-400">
            PDF, DOCX, JPG, PNG — Max {MAX_SIZE_MB}MB
          </p>
        </div>
      </label>

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
