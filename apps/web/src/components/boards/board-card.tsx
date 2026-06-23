"use client";

import Image from "next/image";
import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import type { Board } from "@ai-moodboard-generator/shared";
import { Card, CardContent } from "@/components/ui/card";
import { useBoardPins } from "@/lib/queries";

interface BoardCardProps {
  board: Board;
}

export function BoardCard({ board }: BoardCardProps) {
  // Boards are few; fetching pins to resolve the cover thumbnail keeps the
  // no-DB design intact (the board.json stores only cover_pin_id).
  const { data: pins = [] } = useBoardPins(board.slug);
  const cover =
    pins.find((p) => p.pin_id === board.cover_pin_id)?.url ?? pins[0]?.url ?? null;

  return (
    <Link href={`/boards/${board.slug}`}>
      <Card className="card-hover overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-[4/3] w-full bg-muted">
            {cover ? (
              <Image
                src={cover}
                alt={board.title}
                fill
                unoptimized
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 320px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <LayoutGrid className="h-8 w-8" />
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-sm truncate">{board.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {board.pin_count} {board.pin_count === 1 ? "pin" : "pins"}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
