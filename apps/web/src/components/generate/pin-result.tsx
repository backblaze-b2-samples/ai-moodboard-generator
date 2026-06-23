"use client";

import Image from "next/image";
import Link from "next/link";
import { GitFork, ArrowRight } from "lucide-react";
import type { Pin } from "@ai-moodboard-generator/shared";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PinResultProps {
  pin: Pin;
  boardSlug: string;
  // Fork = reuse this pin's prompt as the starting point for a variation.
  onFork: (pin: Pin) => void;
}

export function PinResult({ pin, boardSlug, onFork }: PinResultProps) {
  return (
    <Card className="overflow-hidden animate-fade-in-up">
      <CardContent className="p-0">
        {pin.url ? (
          <div className="relative aspect-square w-full bg-muted">
            <Image
              src={pin.url}
              alt={pin.prompt}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 512px"
            />
          </div>
        ) : (
          <div className="aspect-square w-full bg-muted" />
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-3 p-4">
        <p className="text-sm text-foreground line-clamp-2">{pin.prompt}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{pin.model}</Badge>
          {pin.parent_pin_id && <Badge variant="outline">fork</Badge>}
          {pin.canonical_hash && (
            <span
              className="font-mono text-[10px] text-muted-foreground"
              title={`Genblaze provenance hash: ${pin.canonical_hash}`}
            >
              {pin.canonical_hash.slice(0, 10)}…
            </span>
          )}
        </div>
        <div className="flex w-full items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => onFork(pin)}
          >
            <GitFork className="h-3.5 w-3.5" />
            Fork prompt
          </Button>
          <Button asChild size="sm" className="ml-auto h-8">
            <Link href={`/boards/${boardSlug}`}>
              View board
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
