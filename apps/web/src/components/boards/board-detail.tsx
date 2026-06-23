"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { GitFork, ImageOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Pin } from "@ai-moodboard-generator/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBoard, useBoardPins, useDeletePin } from "@/lib/queries";
import { ShareButton } from "./share-button";

interface BoardDetailProps {
  slug: string;
}

function PinTile({ pin }: { pin: Pin }) {
  const router = useRouter();
  const deletePin = useDeletePin();

  return (
    <div className="group relative mb-4 break-inside-avoid overflow-hidden rounded-xl border border-border bg-card">
      {pin.url ? (
        <Image
          src={pin.url}
          alt={pin.prompt}
          width={pin.width || 1024}
          height={pin.height || 1024}
          unoptimized
          className="w-full object-cover"
        />
      ) : (
        <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground">
          <ImageOff className="h-6 w-6" />
        </div>
      )}
      <div className="p-3">
        <p className="line-clamp-2 text-xs text-foreground">{pin.prompt}</p>
        <div className="mt-2 flex items-center gap-1.5">
          {pin.parent_pin_id && <Badge variant="outline">fork</Badge>}
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-7 px-2"
            title="Fork this prompt"
            onClick={() =>
              router.push(
                `/generate?prompt=${encodeURIComponent(pin.prompt)}` +
                  `&board=${pin.board_slug}&parent=${pin.pin_id}`,
              )
            }
          >
            <GitFork className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-destructive"
            title="Delete pin"
            disabled={deletePin.isPending}
            onClick={() =>
              deletePin.mutate(
                { slug: pin.board_slug, pinId: pin.pin_id },
                {
                  onSuccess: () => toast.success("Pin deleted"),
                  onError: (err) => toast.error(err.message),
                },
              )
            }
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function BoardDetail({ slug }: BoardDetailProps) {
  const board = useBoard(slug);
  const pins = useBoardPins(slug);

  if (board.error) return <ErrorState error={board.error} onRetry={() => board.refetch()} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="page-title">{board.data?.title ?? slug}</h1>
          {board.data?.description && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {board.data.description}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {board.data?.pin_count ?? 0} pins · stored on Backblaze B2
          </p>
        </div>
        <ShareButton slug={slug} />
      </div>

      {pins.error ? (
        <ErrorState error={pins.error} onRetry={() => pins.refetch()} />
      ) : pins.isLoading ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="mb-4 h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : (pins.data ?? []).length === 0 ? (
        <EmptyState
          icon={ImageOff}
          title="No pins yet"
          description="Generate an image into this board to see it here."
        />
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {(pins.data ?? []).map((pin) => (
            <PinTile key={pin.pin_id} pin={pin} />
          ))}
        </div>
      )}
    </div>
  );
}
