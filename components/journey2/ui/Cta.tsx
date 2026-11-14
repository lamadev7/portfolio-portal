import Link from "next/link";
import { profile } from "@/lib/data/profile";

export default function Cta({ onReplay }: { onReplay: () => void }) {
  return (
    <section className="j2-end" aria-label="Get in touch">
      <p className="j2-end-k">NEXT · OPEN TO WORK</p>
      <h2 className="j2-end-t">Much more to go.</h2>
      <p className="j2-end-p">{profile.availability}. Read the résumé, or just say hello.</p>
      <div className="j2-cta-row">
        <Link href="/resume" className="j2-btn j2-btn-p">Résumé</Link>
        <a href="mailto:parbatlama70@gmail.com" className="j2-btn j2-btn-g">Email</a>
      </div>
      <button type="button" className="j2-end-replay" onClick={onReplay}>Walk it again</button>
    </section>
  );
}
