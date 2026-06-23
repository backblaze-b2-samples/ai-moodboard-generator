import { BoardDetail } from "@/components/boards/board-detail";

export default async function BoardDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <BoardDetail slug={slug} />;
}
