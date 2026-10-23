import { notFound } from "next/navigation";
import Link from "next/link";
import { SCENE_IDS } from "./registry";

export default function SceneIndex() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main style={{ padding: 24, fontFamily: "system-ui", background: "#0b0d12", color: "#cfd6e4", minHeight: "100vh" }}>
      <h1 style={{ fontSize: 18 }}>Journey v2 scenes</h1>
      <ul>{SCENE_IDS.map((id) => <li key={id}><Link style={{ color: "#8fb4ff" }} href={`/lab2/scenes/${id}`}>{id}</Link></li>)}</ul>
    </main>
  );
}
