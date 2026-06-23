import { getContentBySlug } from '@/lib/mock-data';
import { ReviewNotFound, ReviewWorkspace } from './ReviewWorkspace';

export default async function ReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = getContentBySlug(slug);

  if (!item) return <ReviewNotFound />;

  return <ReviewWorkspace item={item} />;
}
