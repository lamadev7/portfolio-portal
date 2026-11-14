import { notFound } from 'next/navigation';
import LabLoader from './LabLoader';

/* dev-only bench for the journey's characters and chapter scenes */
export default function LabPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <LabLoader />;
}
