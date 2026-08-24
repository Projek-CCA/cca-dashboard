import { redirect } from 'next/navigation';

/** Compatibility route for older generated Next.js type manifests. */
export default function LegacyAuthLoginPage() {
  redirect('/login');
}
