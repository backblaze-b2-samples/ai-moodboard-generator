"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBoards } from "@/lib/queries";

const NEW_BOARD = "__new__";

export interface BoardSelection {
  // Either an existing board slug, or null when creating a new board.
  slug: string | null;
  // Title for the new board (only meaningful when slug is null).
  newTitle: string;
}

interface BoardPickerProps {
  value: BoardSelection;
  onChange: (value: BoardSelection) => void;
  disabled?: boolean;
}

export function BoardPicker({ value, onChange, disabled }: BoardPickerProps) {
  const { data: boards = [], isLoading } = useBoards();

  const selectValue = value.slug ?? NEW_BOARD;

  return (
    <div className="space-y-2">
      <Label htmlFor="board-picker">Board</Label>
      <Select
        value={selectValue}
        disabled={disabled}
        onValueChange={(v) =>
          onChange(
            v === NEW_BOARD
              ? { slug: null, newTitle: value.newTitle }
              : { slug: v, newTitle: "" },
          )
        }
      >
        <SelectTrigger id="board-picker" className="w-full">
          <SelectValue placeholder={isLoading ? "Loading…" : "Choose a board"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NEW_BOARD}>+ Create new board</SelectItem>
          {boards.map((b) => (
            <SelectItem key={b.slug} value={b.slug}>
              {b.title} ({b.pin_count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {value.slug === null && (
        <Input
          aria-label="New board title"
          placeholder="New board title (e.g. Coastal Calm)"
          value={value.newTitle}
          disabled={disabled}
          maxLength={120}
          onChange={(e) => onChange({ slug: null, newTitle: e.target.value })}
        />
      )}
    </div>
  );
}
