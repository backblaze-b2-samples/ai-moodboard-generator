"use client";

import Image from "next/image";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { ArrowRight, Inbox } from "lucide-react";
import type { Pin } from "@ai-moodboard-generator/shared";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { getBoardPins } from "@/lib/api-client";
import { qk, useBoards } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

const MAX_RECENT = 8;

export function RecentPins() {
  const boards = useBoards();

  // Fan out to each board's pins, then flatten + sort newest-first. Boards
  // are few in a demo, so this stays cheap and keeps the no-DB design.
  const pinQueries = useQueries({
    queries: (boards.data ?? []).map((b) => ({
      queryKey: qk.boardPins(b.slug),
      queryFn: () => getBoardPins(b.slug),
    })),
  });

  const loading = boards.isLoading || pinQueries.some((q) => q.isLoading);
  const pins: Pin[] = pinQueries
    .flatMap((q) => q.data ?? [])
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, MAX_RECENT);

  return (
    <Card>
      <CardHeader className="border-b border-border py-4 px-5">
        <CardTitle className="card-title">Recent Pins</CardTitle>
        <CardAction className="self-center">
          <Link
            href="/boards"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        {boards.error ? (
          <ErrorState error={boards.error} onRetry={() => boards.refetch()} />
        ) : loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : pins.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No pins yet"
            description="Head to Generate to create your first pin."
          />
        ) : (
          <ul className="divide-y divide-border">
            {pins.map((pin) => (
              <li key={pin.pin_id}>
                <Link
                  href={`/boards/${pin.board_slug}`}
                  className="flex items-center gap-3 px-5 py-3 table-row-hover"
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {pin.url && (
                      <Image
                        src={pin.url}
                        alt={pin.prompt}
                        fill
                        unoptimized
                        className="object-cover"
                        sizes="40px"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pin.prompt}</p>
                    <p className="text-xs text-muted-foreground">
                      {pin.board_slug} · {formatDate(pin.created_at)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
