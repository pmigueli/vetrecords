import type { Pet, Visit } from "../../types";

interface PetInfoSidebarProps {
  pet: Pet;
  visits: Visit[];
}

export default function PetInfoSidebar({ pet, visits }: PetInfoSidebarProps) {
  // Extract vaccinations from all visits
  const vaccinations = visits.flatMap((v) => v.vaccinations ?? []);
  const uniqueVaccinations = vaccinations.reduce(
    (acc, vac) => {
      if (!acc.find((v) => v.name === vac.name)) acc.push(vac);
      return acc;
    },
    [] as typeof vaccinations
  );

  // Extract recurring diagnoses
  const diagnosisCounts: Record<string, number> = {};
  visits.forEach((v) => {
    (v.diagnosis ?? []).forEach((d) => {
      diagnosisCounts[d] = (diagnosisCounts[d] || 0) + 1;
    });
  });
  const recurringConditions = Object.entries(diagnosisCounts)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Pet Details */}
      <Section title="Pet Details" icon="pet">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" value={pet.name} />
          <Field label="Species" value={pet.species} />
          <Field label="Breed" value={pet.breed} />
          <Field label="Sex" value={pet.sex} />
          <Field label="Date of Birth" value={pet.date_of_birth} />
          <Field label="Microchip" value={pet.microchip_id} />
        </div>
      </Section>

      {/* Owner */}
      <Section title="Owner" icon="owner">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-900">
            {pet.owner_name || "—"}
          </p>
          {pet.owner_address && (
            <p className="text-xs text-gray-500">{pet.owner_address}</p>
          )}
          {pet.owner_phone && (
            <p className="text-xs text-gray-500">{pet.owner_phone}</p>
          )}
        </div>
      </Section>

      {/* Vaccinations */}
      {uniqueVaccinations.length > 0 && (
        <Section title="Vaccinations" icon="vaccination">
          <div className="space-y-2">
            {uniqueVaccinations.map((vac, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{vac.name}</span>
                <span className="text-gray-400 text-xs">
                  {vac.date_administered}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recurring Conditions */}
      {recurringConditions.length > 0 && (
        <Section title="Recurring Conditions" icon="condition">
          <div className="flex flex-wrap gap-2">
            {recurringConditions.map(([name, count]) => (
              <span
                key={name}
                className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-50 text-red-700"
              >
                {name} ({count}x)
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  const icons: Record<string, React.ReactNode> = {
    pet: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    ),
    owner: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
      />
    ),
    vaccination: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
      />
    ),
    condition: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z"
      />
    ),
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          {icons[icon]}
        </svg>
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      </div>
      {children}
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
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-900">{value || "—"}</p>
    </div>
  );
}
