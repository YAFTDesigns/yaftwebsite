import type { Metadata } from 'next';
import StudentClient from './StudentClient';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Student portal | YAFT Designs', robots: { index: false, follow: false } };

export default function StudentPage() {
  return <StudentClient />;
}
