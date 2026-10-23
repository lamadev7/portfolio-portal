'use client';

import dynamic from 'next/dynamic';

const LabClient = dynamic(() => import('./LabClient'), { ssr: false });

export default function LabLoader() {
  return <LabClient />;
}
