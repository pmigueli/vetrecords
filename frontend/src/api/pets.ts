import { useQuery } from "@tanstack/react-query";
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
