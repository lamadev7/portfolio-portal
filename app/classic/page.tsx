import Topbar from "@/components/layout/Topbar";
import Rails from "@/components/layout/Rails";
import Footer from "@/components/layout/Footer";
import Hero from "@/components/sections/Hero";
import Experience from "@/components/sections/Experience";
import Work from "@/components/sections/Work";
import AgentsSection from "@/components/sections/AgentsSection";
import EduHonors from "@/components/sections/EduHonors";
import Stack from "@/components/sections/Stack";
import Contact from "@/components/sections/Contact";
import SceneLoader from "@/components/scene/SceneLoader";
import TweaksMount from "@/components/tweaks/TweaksMount";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Classic portfolio",
  alternates: { canonical: "/classic" },
};

/**
 * Classic portfolio (V3) — server-rendered as much as possible.
 *
 * Static sections (Experience, Work, EduHonors, Stack, Contact) are pure
 * server components: zero JS shipped for them. Interactive bits are isolated
 * into "use client" subcomponents (CommandLine, AgentGraph, Scene, Tweaks).
 *
 * The heavy Three.js scene is dynamically imported with ssr:false so it
 * code-splits into its own chunk and never blocks the initial HTML payload.
 */
export default function ClassicPage() {
  return (
    <>
      <SceneLoader />
      <div className="film" />
      <div className="vignette" />

      <Topbar />
      <Rails />

      <main className="page">
        <Hero />
        <Experience />
        <Work />
        <AgentsSection />
        <EduHonors />
        <Stack />
        <Contact />
      </main>

      <Footer />
      <TweaksMount />
    </>
  );
}
