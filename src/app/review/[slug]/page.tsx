import { ReviewNotFound, ReviewWorkspace } from './ReviewWorkspace';

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) return <ReviewNotFound />;
  return <ReviewWorkspace taskId={slug} />;
}
