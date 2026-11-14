import { notFound } from "next/navigation";
import SceneLabLoader from "./SceneLabLoader";

/* dev-only viewer for journey v2 location scenes: #shot=arrival|spawn|<stand>&ov=1&bloom=0&walk=<path>&chars=1 */
export default function SceneLabPage({ params }: { params: { id: string } }) {
  if (process.env.NODE_ENV === "production") notFound();
  return <SceneLabLoader id={params.id} />;
}
