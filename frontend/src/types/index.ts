export interface Document {
  id: string;
  filename: string;
  file_path: string;
  content_type: string;
  file_size: string | null;
  extracted_text: string | null;
  detected_language: string;
  status: DocumentStatus;
  error_message: string | null;
  pet_id: string | null;
  visit_count: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentStatus =
  | "uploading"
  | "extracting"
  | "splitting"
  | "structuring"
  | "review"
  | "confirmed"
  | "error"
  | "partial";

export interface Pet {
  id: string;
  document_id: string;
  name: string | null;
  species: string | null;
  breed: string | null;
  date_of_birth: string | null;
  sex: string | null;
  microchip_id: string | null;
  coat: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  owner_address: string | null;
  owner_email: string | null;
  clinic_name: string | null;
  clinic_address: string | null;
  status: "draft" | "confirmed";
  visit_count?: number;
  last_visit_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VitalSigns {
  temperature_celsius: number | null;
  weight_kg: number | null;
  heart_rate_bpm: number | null;
  respiratory_rate_rpm: number | null;
  other: string | null;
}

export interface Medication {
  name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  route: string | null;
}

export interface Treatment {
  medications: Medication[];
  procedures: string[];
  diet: string | null;
  recommendations: string[];
}

export interface LabResult {
  test_name: string;
  result: string;
  reference_range: string | null;
  interpretation: string | null;
}

export interface Vaccination {
  name: string;
  date_administered: string;
}

export interface Visit {
  id: string;
  pet_id: string;
  document_id: string;
  date: string | null;
  time: string | null;
  visit_type: string | null;
  reason: string | null;
  examination: string | null;
  vital_signs: VitalSigns | null;
  diagnosis: string[] | null;
  treatment: Treatment | null;
  lab_results: LabResult[] | null;
  vaccinations: Vaccination[] | null;
  notes: string | null;
  veterinarian: string | null;
  raw_text: string | null;
  edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}
