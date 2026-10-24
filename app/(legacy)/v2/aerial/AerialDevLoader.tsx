"use client";

import dynamic from "next/dynamic";

const AerialDev = dynamic(() => import("./AerialDev"), { ssr: false });

export default function AerialDevLoader() {
  return <AerialDev />;
}
