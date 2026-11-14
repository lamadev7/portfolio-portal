import Image from "next/image";
import type { SceneArt } from "@/lib/content/art";

export default function Art({ art, priority = false }: { art?: SceneArt; priority?: boolean }) {
  if (!art) return null;
  return (
    <figure className="art" data-reveal>
      <Image src={art.src} alt={art.alt} width={1536} height={1024} priority={priority} unoptimized />
    </figure>
  );
}
