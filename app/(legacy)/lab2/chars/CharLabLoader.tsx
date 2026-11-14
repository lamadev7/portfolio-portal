"use client";

import dynamic from "next/dynamic";

const CharLab = dynamic(() => import("./CharLab"), { ssr: false });

export default function CharLabLoader() {
  return <CharLab />;
}
