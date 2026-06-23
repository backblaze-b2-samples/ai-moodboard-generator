import type {
  Board,
  BoardStats,
  DailyUploadCount,
  FileMetadata,
  FileUploadResponse,
  GenerateResponse,
  Pin,
  ShareResponse,
  UploadStats,
} from "@ai-moodboard-generator/shared";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Typed API error with HTTP status code for caller-side branching. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** True for 408, 429, 500, 502, 503, 504 — worth retrying. */
  get isRetryable(): boolean {
    return [408, 429, 500, 502, 503, 504].includes(this.status);
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch {
    // Network failure (offline, DNS, CORS, etc.)
    throw new ApiError("Network error — check your connection", 0);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      body.detail || `API error: ${res.status}`,
      res.status,
    );
  }
  return res.json();
}

export async function getHealth() {
  return apiFetch<{ status: string; b2_connected: boolean }>("/health");
}

export async function getFiles(prefix = "", limit = 100) {
  return apiFetch<FileMetadata[]>(
    `/files?prefix=${encodeURIComponent(prefix)}&limit=${limit}`
  );
}

export async function getFileStats() {
  return apiFetch<UploadStats>("/files/stats");
}

export async function getUploadActivity(days = 7) {
  return apiFetch<DailyUploadCount[]>(`/files/stats/activity?days=${days}`);
}

export async function getFile(key: string) {
  return apiFetch<FileMetadata>(`/files/${key}`);
}

export async function getDownloadUrl(key: string) {
  return apiFetch<{ url: string }>(`/files/${key}/download`);
}

/** Preview-only presigned URL — does NOT increment the download counter. */
export async function getPreviewUrl(key: string) {
  return apiFetch<{ url: string }>(`/files/${key}/preview`);
}

export async function deleteFile(key: string) {
  return apiFetch<{ deleted: boolean; key: string }>(`/files/${key}`, {
    method: "DELETE",
  });
}

// --- Moodboards ---

export async function getBoards() {
  return apiFetch<Board[]>("/boards");
}

export async function getBoard(slug: string) {
  return apiFetch<Board>(`/boards/${encodeURIComponent(slug)}`);
}

export async function getBoardPins(slug: string) {
  return apiFetch<Pin[]>(`/boards/${encodeURIComponent(slug)}/pins`);
}

export async function getBoardStats() {
  return apiFetch<BoardStats>("/boards/stats");
}

export async function createBoard(title: string, description = "") {
  return apiFetch<Board>("/boards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description }),
  });
}

export async function shareBoard(slug: string) {
  return apiFetch<ShareResponse>(`/boards/${encodeURIComponent(slug)}/share`, {
    method: "POST",
  });
}

export async function deleteBoard(slug: string) {
  return apiFetch<{ deleted: boolean; slug: string; objects: number }>(
    `/boards/${encodeURIComponent(slug)}`,
    { method: "DELETE" },
  );
}

export async function deletePin(slug: string, pinId: string) {
  return apiFetch<{ deleted: boolean; slug: string; pin_id: string }>(
    `/boards/${encodeURIComponent(slug)}/pins/${encodeURIComponent(pinId)}`,
    { method: "DELETE" },
  );
}

export interface GenerateInput {
  prompt: string;
  board_slug?: string;
  new_board_title?: string;
  parent_pin_id?: string;
}

export async function generateImage(input: GenerateInput) {
  return apiFetch<GenerateResponse>("/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function uploadFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<FileUploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const body = JSON.parse(xhr.responseText);
          reject(new ApiError(body.detail || `Upload failed: ${xhr.status}`, xhr.status));
        } catch {
          reject(new ApiError(`Upload failed: ${xhr.status}`, xhr.status));
        }
      }
    });

    xhr.addEventListener("error", () =>
      reject(new ApiError("Network error — check your connection", 0)),
    );
    xhr.addEventListener("abort", () =>
      reject(new ApiError("Upload aborted", 0)),
    );

    xhr.open("POST", `${API_BASE}/upload`);
    xhr.send(formData);
  });
}
