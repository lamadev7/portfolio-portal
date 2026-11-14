import SectionHead from "@/components/ui/SectionHead";
import { contactLinks } from "@/lib/data/contact";

export default function Contact() {
  return (
    <section id="contact" data-screen-label="07 Contact">
      <SectionHead num="// 07" title="Contact" meta="↳ open for senior + contract" />
      <div className="contact">
        <div>
          <h3>
            Let&apos;s build
            <br />
            <span className="accent">something.</span>
          </h3>
          <p>
            Available for senior full-stack roles and selective contract work — particularly anything
            sitting at the intersection of TypeScript product engineering and applied agentic systems.
          </p>
        </div>
        <div className="links">
          {contactLinks.map((l, i) => (
            <a className="link" key={i} href={l.href}>
              <div>
                <div className="k">{l.k}</div>
                <div>{l.v}</div>
              </div>
              <span className="arrow">↗</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
