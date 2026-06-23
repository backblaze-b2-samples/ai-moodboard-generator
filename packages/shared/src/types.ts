export type FileStatus = "uploading" | "complete" | "error";

export interface FileMetadata {
  key: string;
  filename: string;
  folder: string;
  size_bytes: number;
  size_human: string;
  content_type: string;
  uploaded_at: string;
  url: string | null;
}

export interface FileMetadataDetail {
  filename: string;
  size_bytes: number;
  size_human: string;
  mime_type: string;
  extension: string;
  md5: string;
  sha256: string;
  uploaded_at: string;
  // Image-specific
  image_width: number | null;
  image_height: number | null;
  exif: Record<string, string> | null;
  // PDF-specific
  pdf_pages: number | null;
  pdf_author: string | null;
  pdf_title: string | null;
  // Audio/Video
  duration_seconds: number | null;
  codec: string | null;
  bitrate: number | null;
}

export interface FileUploadResponse {
  key: string;
  filename: string;
  size_bytes: number;
  size_human: string;
  content_type: string;
  uploaded_at: string;
  url: string | null;
  metadata: FileMetadataDetail | null;
}

export interface DailyUploadCount {
  date: string;
  uploads: number;
}

export interface UploadStats {
  total_files: number;
  total_size_bytes: number;
  total_size_human: string;
  uploads_today: number;
  total_downloads: number;
}

// --- Moodboards (boards + pins are plain B2 objects; no database) ---

export interface Board {
  slug: string;
  title: string;
  description: string;
  created_at: string;
  cover_pin_id: string | null;
  pin_count: number;
}

export interface Pin {
  pin_id: string;
  board_slug: string;
  prompt: string;
  provider: string;
  model: string;
  parent_pin_id: string | null;
  created_at: string;
  sha256: string;
  width: number;
  height: number;
  media_type: string;
  image_key: string;
  url: string | null;
  manifest: Record<string, unknown> | null;
  canonical_hash: string | null;
}

export interface GenerateResponse {
  pin: Pin;
  board_slug: string;
}

export interface ShareResponse {
  slug: string;
  share_url: string;
  mode: "public" | "presigned";
  expires_in: number | null;
}

export interface BoardStats {
  boards: number;
  pins: number;
  pins_today: number;
}

