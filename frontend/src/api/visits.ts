import { useQuery } from "@tanstack/react-query";
import apiClient from "./client";
import type { Visit, PaginatedResponse } from "../types";

export function useVisits(
  petId: string | null,
  page: number = 1,
  perPage: number = 50,
  sort: string = "asc"
) {
  return useQuery<PaginatedResponse<Visit>>({
    queryKey: ["visits", petId, page, perPage, sort],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/pets/${petId}/visits`, {
        params: { page, per_page: perPage, sort },
      });
      return response.data;
    },
    enabled: !!petId,
  });
}

export function useVisit(visitId: string | null) {
  return useQuery<Visit>({
    queryKey: ["visit", visitId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/visits/${visitId}`);
      return response.data;
    },
    enabled: !!visitId,
  });
}
