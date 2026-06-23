import { Suspense } from "react";
import { GenerateForm } from "@/components/generate/generate-form";

export default function GeneratePage() {
  return (
    <div className="space-y-8">
      <div className="animate-fade-in border-b border-border pb-5">
        <h1 className="page-title">Generate</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Describe an image, pick a board, and pin it. Generation runs through
          Genblaze (OpenAI gpt-image-1) and every pin is stored on Backblaze B2.
        </p>
      </div>
      <div className="animate-fade-in-up stagger-2">
        <Suspense fallback={null}>
          <GenerateForm />
        </Suspense>
      </div>
    </div>
  );
}
