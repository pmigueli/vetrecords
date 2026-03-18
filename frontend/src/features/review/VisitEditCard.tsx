import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useUpdateVisit } from "../../api/visits";
import RawTextCollapsible from "./RawTextCollapsible";
import type { Visit } from "../../types";

interface VisitEditCardProps {
  visit: Visit;
  index: number;
  total: number;
}

interface VisitFormData {
  date: string;
  visit_type: string;
  reason: string;
  examination: string;
  notes: string;
  veterinarian: string;
  weight_kg: string;
  temperature_celsius: string;
  heart_rate_bpm: string;
  respiratory_rate_rpm: string;
  diagnosis: { value: string }[];
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    route: string;
  }[];
  procedures: { value: string }[];
  diet: string;
  recommendations: { value: string }[];
}

function visitToFormDefaults(v: Visit) {
  return {
    date: v.date ?? "",
    visit_type: v.visit_type ?? "",
    reason: v.reason ?? "",
    examination: v.examination ?? "",
    notes: v.notes ?? "",
    veterinarian: v.veterinarian ?? "",
    weight_kg: v.vital_signs?.weight_kg?.toString() ?? "",
    temperature_celsius: v.vital_signs?.temperature_celsius?.toString() ?? "",
    heart_rate_bpm: v.vital_signs?.heart_rate_bpm?.toString() ?? "",
    respiratory_rate_rpm: v.vital_signs?.respiratory_rate_rpm?.toString() ?? "",
    diagnosis: (v.diagnosis ?? []).map((d) => ({ value: d })),
    medications: (v.treatment?.medications ?? []).map((m) => ({
      name: m.name,
      dosage: m.dosage ?? "",
      frequency: m.frequency ?? "",
      duration: m.duration ?? "",
      route: m.route ?? "",
    })),
    procedures: (v.treatment?.procedures ?? []).map((p) => ({ value: p })),
    diet: v.treatment?.diet ?? "",
    recommendations: (v.treatment?.recommendations ?? []).map((r) => ({ value: r })),
  };
}

export default function VisitEditCard({ visit: initialVisit, index, total }: VisitEditCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [visit, setVisit] = useState<Visit>(initialVisit);
  const updateVisit = useUpdateVisit();

  const { register, handleSubmit, reset, control } = useForm<VisitFormData>({
    values: visitToFormDefaults(visit),
  });

  const { fields: diagnosisFields } = useFieldArray({ control, name: "diagnosis" });
  const { fields: medicationFields } = useFieldArray({ control, name: "medications" });
  const { fields: procedureFields } = useFieldArray({ control, name: "procedures" });
  const { fields: recommendationFields } = useFieldArray({ control, name: "recommendations" });

  const onSubmit = async (data: VisitFormData) => {
    const payload: Partial<Visit> = {
      date: data.date || null,
      visit_type: data.visit_type || null,
      reason: data.reason || null,
      examination: data.examination || null,
      notes: data.notes || null,
      veterinarian: data.veterinarian || null,
      vital_signs: {
        weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
        temperature_celsius: data.temperature_celsius ? parseFloat(data.temperature_celsius) : null,
        heart_rate_bpm: data.heart_rate_bpm ? parseInt(data.heart_rate_bpm) : null,
        respiratory_rate_rpm: data.respiratory_rate_rpm ? parseInt(data.respiratory_rate_rpm) : null,
        other: visit.vital_signs?.other ?? null,
      },
      diagnosis: data.diagnosis.map((d) => d.value).filter(Boolean),
      treatment: {
        medications: data.medications.map((m) => ({
          name: m.name,
          dosage: m.dosage || null,
          frequency: m.frequency || null,
          duration: m.duration || null,
          route: m.route || null,
        })),
        procedures: data.procedures.map((p) => p.value).filter(Boolean),
        diet: data.diet || null,
        recommendations: data.recommendations.map((r) => r.value).filter(Boolean),
      },
    };

    const updated = await updateVisit.mutateAsync({ visitId: visit.id, data: payload });
    setVisit(updated);
    setIsEditing(false);
  };

  const onCancel = () => {
    reset();
    setIsEditing(false);
  };

  return (
    <div className="border border-gray-200 rounded-xl p-5">
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
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Visit {index + 1} of {total}
          </span>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Basic fields */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date</label>
              <input {...register("date")} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Visit Type</label>
              <input {...register("visit_type")} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Veterinarian</label>
              <input {...register("veterinarian")} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Reason</label>
            <textarea {...register("reason")} rows={2} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none" />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Examination</label>
            <textarea {...register("examination")} rows={2} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none" />
          </div>

          {/* Vital Signs */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Vital Signs</p>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Weight (kg)</label>
                <input {...register("weight_kg")} type="number" step="0.1" className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Temp (°C)</label>
                <input {...register("temperature_celsius")} type="number" step="0.1" className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Heart Rate (bpm)</label>
                <input {...register("heart_rate_bpm")} type="number" className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Resp Rate (rpm)</label>
                <input {...register("respiratory_rate_rpm")} type="number" className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
              </div>
            </div>
          </div>

          {/* Diagnosis */}
          {diagnosisFields.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Diagnosis</p>
              <div className="space-y-2">
                {diagnosisFields.map((field, i) => (
                  <input
                    key={field.id}
                    {...register(`diagnosis.${i}.value`)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Medications */}
          {medicationFields.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Medications</p>
              <div className="space-y-3">
                {medicationFields.map((field, i) => (
                  <div key={field.id} className="grid grid-cols-5 gap-2 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Name</label>
                      <input {...register(`medications.${i}.name`)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Dosage</label>
                      <input {...register(`medications.${i}.dosage`)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Frequency</label>
                      <input {...register(`medications.${i}.frequency`)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Duration</label>
                      <input {...register(`medications.${i}.duration`)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Route</label>
                      <input {...register(`medications.${i}.route`)} className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Procedures */}
          {procedureFields.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Procedures</p>
              <div className="space-y-2">
                {procedureFields.map((field, i) => (
                  <input
                    key={field.id}
                    {...register(`procedures.${i}.value`)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {recommendationFields.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Recommendations</p>
              <div className="space-y-2">
                {recommendationFields.map((field, i) => (
                  <input
                    key={field.id}
                    {...register(`recommendations.${i}.value`)}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Diet */}
          {visit.treatment?.diet && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Diet</label>
              <input {...register("diet")} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent" />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea {...register("notes")} rows={2} className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none" />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateVisit.isPending}
              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {updateVisit.isPending ? "Saving..." : "Save"}
            </button>
          </div>

          <RawTextCollapsible rawText={visit.raw_text} />
        </form>
      ) : (
        <>
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

          {/* Vital Signs */}
          {visit.vital_signs && (visit.vital_signs.weight_kg || visit.vital_signs.temperature_celsius || visit.vital_signs.heart_rate_bpm || visit.vital_signs.respiratory_rate_rpm) && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Vital Signs</p>
              <div className="flex flex-wrap gap-3 text-sm text-gray-700">
                {visit.vital_signs.weight_kg && <span>{visit.vital_signs.weight_kg} kg</span>}
                {visit.vital_signs.temperature_celsius && <span>{visit.vital_signs.temperature_celsius} °C</span>}
                {visit.vital_signs.heart_rate_bpm && <span>{visit.vital_signs.heart_rate_bpm} bpm</span>}
                {visit.vital_signs.respiratory_rate_rpm && <span>{visit.vital_signs.respiratory_rate_rpm} rpm</span>}
              </div>
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

          {visit.treatment?.medications && visit.treatment.medications.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Medications</p>
              <div className="space-y-1">
                {visit.treatment.medications.map((med, i) => (
                  <p key={i} className="text-sm text-gray-700">
                    <span className="font-medium">{med.name}</span>
                    {med.dosage && ` · ${med.dosage}`}
                    {med.frequency && ` · ${med.frequency}`}
                    {med.route && ` · ${med.route}`}
                  </p>
                ))}
              </div>
            </div>
          )}

          {visit.treatment?.procedures && visit.treatment.procedures.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Procedures</p>
              <div className="flex flex-wrap gap-1">
                {visit.treatment.procedures.map((p, i) => (
                  <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">{p}</span>
                ))}
              </div>
            </div>
          )}

          {visit.treatment?.diet && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Diet</p>
              <p className="text-sm text-gray-700">{visit.treatment.diet}</p>
            </div>
          )}

          {visit.treatment?.recommendations && visit.treatment.recommendations.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Recommendations</p>
              <ul className="list-disc list-inside text-sm text-gray-700">
                {visit.treatment.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {visit.veterinarian && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Veterinarian</p>
              <p className="text-sm text-gray-700">{visit.veterinarian}</p>
            </div>
          )}

          {visit.notes && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{visit.notes}</p>
            </div>
          )}

          <RawTextCollapsible rawText={visit.raw_text} />
        </>
      )}
    </div>
  );
}
