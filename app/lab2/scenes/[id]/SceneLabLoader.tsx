"use client";

import dynamic from "next/dynamic";

const SceneLabClient = dynamic(() => import("./SceneLabClient"), { ssr: false });

export default function SceneLabLoader({ id }: { id: string }) {
  return <SceneLabClient id={id} />;
}
