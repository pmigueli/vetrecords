import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type { Pet } from "../types";

export function usePets() {
  return useQuery<Pet[]>({
    queryKey: ["pets"],
    queryFn: async () => {
      const response = await apiClient.get("/api/v1/pets");
      return response.data;
    },
  });
}

export function usePet(petId: string | null) {
  return useQuery<Pet>({
    queryKey: ["pet", petId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/v1/pets/${petId}`);
      return response.data;
    },
    enabled: !!petId,
  });
}

export function useUpdatePet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ petId, data }: { petId: string; data: Partial<Pet> }) => {
      const response = await apiClient.put(`/api/v1/pets/${petId}`, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(["pet", variables.petId], data);
    },
  });
}
