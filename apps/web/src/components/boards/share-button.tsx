"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useShareBoard } from "@/lib/queries";

interface ShareButtonProps {
  slug: string;
}

export function ShareButton({ slug }: ShareButtonProps) {
  const share = useShareBoard();

  const handleShare = () => {
    share.mutate(slug, {
      onSuccess: async (res) => {
        try {
          await navigator.clipboard.writeText(res.share_url);
          toast.success(
            res.mode === "public"
              ? "Durable public link copied to clipboard"
              : "Presigned share link copied (expires in 7 days)",
          );
        } catch {
          // Clipboard can be blocked (insecure context); show the URL instead.
          toast.success(res.share_url);
        }
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-8"
      disabled={share.isPending}
      onClick={handleShare}
    >
      <Share2 className="h-3.5 w-3.5" />
      {share.isPending ? "Sharing…" : "Share"}
    </Button>
  );
}
