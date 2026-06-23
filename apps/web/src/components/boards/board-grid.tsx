"use client";

import Link from "next/link";
import { LayoutGrid, Wand2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Button } from "@/components/ui/button";
import { useBoards } from "@/lib/queries";
import { BoardCard } from "./board-card";

export function BoardGrid() {
  const { data: boards = [], isLoading, error, refetch } = useBoards();

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <EmptyState
        icon={LayoutGrid}
        title="No boards yet"
        description="Generate your first pin to create a moodboard. Every pin is stored on Backblaze B2."
        action={
          <Button asChild size="sm">
            <Link href="/generate">
              <Wand2 className="h-3.5 w-3.5" />
              Generate a pin
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {boards.map((b) => (
        <BoardCard key={b.slug} board={b} />
      ))}
    </div>
  );
}
