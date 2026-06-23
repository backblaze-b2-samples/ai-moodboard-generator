"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiError,
  createBoard,
  deleteBoard,
  deleteFile,
  deletePin,
  generateImage,
  getBoard,
  getBoardPins,
  getBoards,
  getBoardStats,
  getFiles,
  getFileStats,
  getPreviewUrl,
  getUploadActivity,
  shareBoard,
  type GenerateInput,
} from "@/lib/api-client";
import type {
  Board,
  BoardStats,
  FileMetadata,
  GenerateResponse,
  Pin,
  ShareResponse,
} from "@ai-moodboard-generator/shared";

// Single source of truth for query keys. Keep these tightly scoped so that
// invalidating "files" doesn't blow away unrelated caches, and so an IDE
// "find usages" of `qk.files` reveals every consumer.
export const qk = {
  all: ["b2"] as const,
  files: (prefix?: string, limit?: number) =>
    [...qk.all, "files", prefix ?? "", limit ?? 100] as const,
  stats: () => [...qk.all, "stats"] as const,
  uploadActivity: (days: number) =>
    [...qk.all, "stats", "activity", days] as const,
  preview: (key: string) => [...qk.all, "preview", key] as const,
  boards: () => [...qk.all, "boards"] as const,
  board: (slug: string) => [...qk.all, "boards", slug] as const,
  boardPins: (slug: string) => [...qk.all, "boards", slug, "pins"] as const,
  boardStats: () => [...qk.all, "boards", "stats"] as const,
};

export function useFiles(prefix = "", limit = 100) {
  return useQuery<FileMetadata[], ApiError>({
    queryKey: qk.files(prefix, limit),
    queryFn: () => getFiles(prefix, limit),
  });
}

export function useFileStats() {
  return useQuery({
    queryKey: qk.stats(),
    queryFn: getFileStats,
  });
}

export function useUploadActivity(days = 7) {
  return useQuery({
    queryKey: qk.uploadActivity(days),
    queryFn: () => getUploadActivity(days),
  });
}

// Presigned preview URL — only fetched when `enabled` is true (e.g., when
// the dialog opens for a specific file). Kept short-lived (60s) because
// the URL itself has a presigned expiry and is cheap to regenerate.
export function usePreviewUrl(key: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: qk.preview(key ?? ""),
    queryFn: () => getPreviewUrl(key as string),
    enabled: enabled && !!key,
    staleTime: 60_000,
  });
}

export function useDeleteFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fileKey: string) => deleteFile(fileKey),
    // After delete, blow away every cached file list + stats. Cheap and
    // correct — the dashboard re-fetches lazily as components remount.
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.all });
    },
  });
}

// --- Moodboards ---

export function useBoards() {
  return useQuery<Board[], ApiError>({
    queryKey: qk.boards(),
    queryFn: getBoards,
  });
}

export function useBoard(slug: string | undefined) {
  return useQuery<Board, ApiError>({
    queryKey: qk.board(slug ?? ""),
    queryFn: () => getBoard(slug as string),
    enabled: !!slug,
  });
}

export function useBoardPins(slug: string | undefined) {
  return useQuery<Pin[], ApiError>({
    queryKey: qk.boardPins(slug ?? ""),
    queryFn: () => getBoardPins(slug as string),
    enabled: !!slug,
  });
}

export function useBoardStats() {
  return useQuery<BoardStats, ApiError>({
    queryKey: qk.boardStats(),
    queryFn: getBoardStats,
  });
}

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation<Board, ApiError, { title: string; description?: string }>({
    mutationFn: ({ title, description }) => createBoard(title, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.boards() }),
  });
}

export function useGenerate() {
  const qc = useQueryClient();
  return useMutation<GenerateResponse, ApiError, GenerateInput>({
    mutationFn: (input) => generateImage(input),
    // A new pin changes board lists, the board's pins, and all stats.
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useShareBoard() {
  return useMutation<ShareResponse, ApiError, string>({
    mutationFn: (slug) => shareBoard(slug),
  });
}

export function useDeleteBoard() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, string>({
    mutationFn: (slug) => deleteBoard(slug),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}

export function useDeletePin() {
  const qc = useQueryClient();
  return useMutation<unknown, ApiError, { slug: string; pinId: string }>({
    mutationFn: ({ slug, pinId }) => deletePin(slug, pinId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.all }),
  });
}
