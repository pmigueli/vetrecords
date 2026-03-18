import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "./client";
import type { Document } from "../types";

interface UploadResponse {
  id: string;
  filename: string;
  status: string;
  message: string;
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File): Promise<UploadResponse> => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post(
        "/api/v1/documents/upload",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDocuments() {
  return useQuery<Document[]>({
    queryKey: ["documents"],
    queryFn: async () => {
      const response = await apiClient.get("/api/v1/documents");
      return response.data;
    },
  });
}

export function useConfirmDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiClient.post(
        `/api/v1/documents/${documentId}/confirm`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    },
  });
}

export function useDiscardDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      await apiClient.delete(`/api/v1/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDocument(documentId: string | null) {
  return useQuery<Document>({
    queryKey: ["document", documentId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/v1/documents/${documentId}`
      );
      return response.data;
    },
    enabled: !!documentId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll every 3 seconds while processing
      if (
        status === "processing" ||
        status === "extracting" ||
        status === "splitting" ||
        status === "structuring"
      ) {
        return 3000;
      }
      return false;
    },
  });
}
