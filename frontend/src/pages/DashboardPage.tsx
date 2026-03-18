export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500 mt-1">
            Upload clinical histories and browse structured pet records
          </p>
        </div>
      </div>

      <div className="text-center py-16 text-gray-400">
        <p>No patients yet. Upload a clinical history to get started.</p>
      </div>
    </div>
  );
}
