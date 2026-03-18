import { useState } from "react";

interface RawTextCollapsibleProps {
  rawText: string | null;
}

export default function RawTextCollapsible({ rawText }: RawTextCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!rawText) return null;

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Original text
      </button>

      {isOpen && (
        <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
          {rawText}
        </pre>
      )}
    </div>
  );
}
