import { BoardGrid } from "@/components/boards/board-grid";
import { CreateBoardDialog } from "@/components/boards/create-board-dialog";

export default function BoardsPage() {
  return (
    <div className="space-y-8">
      <div className="animate-fade-in flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="page-title">Boards</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Your moodboards — a gallery scoped to the <code>boards/</code> prefix
            on Backblaze B2, distinct from the full-bucket Files explorer.
          </p>
        </div>
        <CreateBoardDialog />
      </div>
      <div className="animate-fade-in-up stagger-2">
        <BoardGrid />
      </div>
    </div>
  );
}
