from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # B2 / S3 credentials. Endpoint is derived from the region so callers
    # only ever configure a short region slug (Standard #3 env-var names).
    b2_region: str = "us-west-004"
    b2_application_key_id: str = ""
    b2_application_key: str = ""
    b2_bucket_name: str = ""
    # Optional durable public base (public bucket / CDN in front of B2).
    # When set, pins render via durable public URLs instead of presigned
    # ones — the egress/CDN showcase. Empty => app-mediated presigned URLs.
    b2_public_url_base: str = ""

    # --- AI image generation (Genblaze + OpenAI) ---
    # Provider key for the OpenAI DalleProvider. Never committed.
    openai_api_key: str = ""
    # gpt-image-1 render quality: low | medium | high | auto.
    moodboard_image_quality: str = "medium"

    api_port: int = 8000
    # Explicit allowlist by default — covers Next on :3000 and the
    # fallback :3001 it picks if 3000 is busy. Production deploys should
    # override with the exact frontend origin.
    api_cors_origins: str = "http://localhost:3000,http://localhost:3001"
    # Optional dev-only escape hatch: a regex that matches additional
    # allowed origins. Empty by default — set this to e.g.
    # `^http://localhost:\d+$` to accept any localhost port without
    # listing each one. NEVER ship this to production.
    api_cors_origin_regex: str = ""

    # Upload limits
    max_file_size: int = 100 * 1024 * 1024  # 100MB

    # Small durable counters (downloads, etc). Point at a persistent
    # volume in production if you care about surviving restarts.
    download_count_file: str = "data/download_count.json"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.api_cors_origins.split(",")]

    @property
    def b2_endpoint(self) -> str:
        """Derive the S3 endpoint from the region slug — the only place a
        region string ever turns into a URL. No hardcoded region elsewhere."""
        return f"https://s3.{self.b2_region}.backblazeb2.com"


settings = Settings()
