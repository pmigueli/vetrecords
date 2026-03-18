import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export function useUpdateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ visitId, data }: { visitId: string; data: Partial<Visit> }) => {
      const response = await apiClient.put(`/api/v1/visits/${visitId}`, data);
      return response.data;
    },
    onSuccess: (updatedVisit) => {
      queryClient.setQueryData(["visit", updatedVisit.id], updatedVisit);
      // Update the visit inside any cached paginated lists
      queryClient.setQueriesData<PaginatedResponse<Visit>>(
        { queryKey: ["visits"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((v) =>
              v.id === updatedVisit.id ? updatedVisit : v
            ),
          };
        }
      );
    },
  });
}
