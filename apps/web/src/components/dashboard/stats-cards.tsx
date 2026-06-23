"use client";

import { LayoutGrid, Image as ImageIcon, Sparkles, HardDrive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useBoardStats, useFileStats } from "@/lib/queries";

export function StatsCards() {
  const boards = useBoardStats();
  const files = useFileStats();

  // Surface fetch failures inline rather than rendering zeros — that would
  // lie about the bucket state when the API is just unreachable.
  if (boards.error) {
    return (
      <Card>
        <CardContent className="p-0">
          <ErrorState error={boards.error} onRetry={() => boards.refetch()} />
        </CardContent>
      </Card>
    );
  }

  const isLoading = boards.isLoading || files.isLoading;
  const cards = [
    { title: "Boards", value: boards.data?.boards ?? 0, icon: LayoutGrid },
    { title: "Pins", value: boards.data?.pins ?? 0, icon: ImageIcon },
    { title: "Generated Today", value: boards.data?.pins_today ?? 0, icon: Sparkles },
    {
      title: "Storage Used",
      value: files.data?.total_size_human ?? "0 B",
      icon: HardDrive,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, i) => (
        <Card
          key={card.title}
          className={`card-hover animate-fade-in-up stagger-${i + 1}`}
        >
          <CardHeader className="flex flex-row items-center justify-between pt-4 pb-2 px-4 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className="stat-icon-wrap">
              <card.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pb-5 px-4">
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="stat-value">{card.value}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
