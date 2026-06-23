"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Wand2 } from "lucide-react";
import type { Pin } from "@ai-moodboard-generator/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { GeneratingLoader } from "@/components/ui/generating-loader";
import { EmptyState } from "@/components/ui/empty-state";
import { useGenerate } from "@/lib/queries";
import { BoardPicker, type BoardSelection } from "./board-picker";
import { PinResult } from "./pin-result";

export function GenerateForm() {
  // Fork links (from a board's pin) prefill the prompt, target board, and
  // parent lineage via query params.
  const params = useSearchParams();
  const [prompt, setPrompt] = useState(() => params.get("prompt") ?? "");
  const [board, setBoard] = useState<BoardSelection>(() => {
    const slug = params.get("board");
    return slug ? { slug, newTitle: "" } : { slug: null, newTitle: "" };
  });
  const [parentPinId, setParentPinId] = useState<string | null>(
    () => params.get("parent"),
  );
  const [lastPin, setLastPin] = useState<{ pin: Pin; slug: string } | null>(null);
  const generate = useGenerate();

  const canSubmit =
    prompt.trim().length > 0 &&
    (board.slug !== null || board.newTitle.trim().length > 0) &&
    !generate.isPending;

  const handleGenerate = () => {
    if (!canSubmit) return;
    generate.mutate(
      {
        prompt: prompt.trim(),
        board_slug: board.slug ?? undefined,
        new_board_title: board.slug === null ? board.newTitle.trim() : undefined,
        parent_pin_id: parentPinId ?? undefined,
      },
      {
        onSuccess: (res) => {
          setLastPin({ pin: res.pin, slug: res.board_slug });
          // Stay on the board we just pinned into for follow-up generations.
          setBoard({ slug: res.board_slug, newTitle: "" });
          setParentPinId(null);
          toast.success(`Pinned to ${res.board_slug}`);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleFork = (pin: Pin) => {
    setPrompt(pin.prompt);
    setParentPinId(pin.pin_id);
    setBoard({ slug: pin.board_slug, newTitle: "" });
    toast.info("Prompt forked — tweak it and generate a variation.");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="border-b border-border py-4 px-5">
          <CardTitle className="card-title">Generate a pin</CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea
              id="prompt"
              rows={4}
              maxLength={1000}
              placeholder="A sun-bleached coastal kitchen, warm linen, morning light…"
              value={prompt}
              disabled={generate.isPending}
              onChange={(e) => setPrompt(e.target.value)}
            />
            {parentPinId && (
              <p className="text-xs text-muted-foreground">
                Forking from an existing pin — lineage will be recorded.
              </p>
            )}
          </div>

          <BoardPicker
            value={board}
            onChange={setBoard}
            disabled={generate.isPending}
          />

          <Button
            className="w-full"
            disabled={!canSubmit}
            onClick={handleGenerate}
          >
            <Wand2 className="h-4 w-4" />
            {generate.isPending ? "Generating…" : "Generate & pin"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center">
        {generate.isPending ? (
          <GeneratingLoader size="lg" variant="stars" label="Generating image…" />
        ) : lastPin ? (
          <div className="w-full max-w-sm">
            <PinResult
              pin={lastPin.pin}
              boardSlug={lastPin.slug}
              onFork={handleFork}
            />
          </div>
        ) : (
          <EmptyState
            icon={Wand2}
            title="Your pin appears here"
            description="Describe an image, choose a board, and generate. Every pin is stored on Backblaze B2."
          />
        )}
      </div>
    </div>
  );
}
