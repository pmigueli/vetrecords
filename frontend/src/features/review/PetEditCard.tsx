import { useState } from "react";
import { useForm } from "react-hook-form";
import { useUpdatePet } from "../../api/pets";
import type { Pet } from "../../types";

interface PetEditCardProps {
  pet: Pet;
}

interface PetFormData {
  name: string;
  species: string;
  breed: string;
  date_of_birth: string;
  sex: string;
  microchip_id: string;
  coat: string;
  owner_name: string;
  clinic_name: string;
}

export default function PetEditCard({ pet: initialPet }: PetEditCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [pet, setPet] = useState<Pet>(initialPet);
  const updatePet = useUpdatePet();

  const formDefaults = {
    name: pet.name ?? "",
    species: pet.species ?? "",
    breed: pet.breed ?? "",
    date_of_birth: pet.date_of_birth ?? "",
    sex: pet.sex ?? "",
    microchip_id: pet.microchip_id ?? "",
    coat: pet.coat ?? "",
    owner_name: pet.owner_name ?? "",
    clinic_name: pet.clinic_name ?? "",
  };

  const { register, handleSubmit, reset } = useForm<PetFormData>({
    values: formDefaults,
  });

  const onSubmit = async (data: PetFormData) => {
    const updated = await updatePet.mutateAsync({ petId: pet.id, data });
    setPet(updated);
    setIsEditing(false);
  };

  const onCancel = () => {
    reset();
    setIsEditing(false);
  };

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <h4 className="font-semibold text-gray-900">Pet Profile</h4>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-white transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-3 gap-4">
            <EditField label="Name" register={register("name")} />
            <EditField label="Species" register={register("species")} />
            <EditField label="Breed" register={register("breed")} />
            <EditField label="Date of Birth" register={register("date_of_birth")} />
            <EditField label="Sex" register={register("sex")} />
            <EditField label="Microchip" register={register("microchip_id")} />
            <EditField label="Coat" register={register("coat")} />
            <EditField label="Owner" register={register("owner_name")} />
            <EditField label="Clinic" register={register("clinic_name")} />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updatePet.isPending}
              className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {updatePet.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <DisplayField label="Name" value={pet.name} />
          <DisplayField label="Species" value={pet.species} />
          <DisplayField label="Breed" value={pet.breed} />
          <DisplayField label="Date of Birth" value={pet.date_of_birth} />
          <DisplayField label="Sex" value={pet.sex} />
          <DisplayField label="Microchip" value={pet.microchip_id} />
          <DisplayField label="Coat" value={pet.coat} />
          <DisplayField label="Owner" value={pet.owner_name} />
          <DisplayField label="Clinic" value={pet.clinic_name} />
        </div>
      )}
    </div>
  );
}

function DisplayField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900">
        {value || <span className="text-gray-300">&mdash;</span>}
      </p>
    </div>
  );
}

function EditField({ label, register }: { label: string; register: ReturnType<typeof import("react-hook-form").useForm<PetFormData>["register"]> }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        {...register}
        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />
    </div>
  );
}
