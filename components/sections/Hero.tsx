import CommandLine from "@/components/ui/CommandLine";

/**
 * Hero — server-rendered shell. The only interactive bit is the
 * <CommandLine> (client component) which animates the rotating prompt.
 */
export default function Hero() {
  return (
    <section className="hero" id="hero" data-screen-label="00 Hero">
      <div className="hero-kicker">
        <span className="bar" />
        <span>parbat lama · v.2026.05</span>
        <span className="sep">/</span>
        <span>lalitpur · np · utc+5:45</span>
        <span className="sep">/</span>
        <span className="ok-dot">● available</span>
      </div>

      <div className="hero-grid">
        <div className="hero-text">
          <h1 className="bigname">
            <span className="line">Parbat</span>
            <span className="line">Lama</span>
          </h1>
          <div className="role-line">
            <span className="rl-pre">/</span>
            <span className="rl-text">
              senior full-stack <span className="accent">TypeScript</span> engineer
            </span>
            <span className="caret" />
          </div>
        </div>
      </div>

      <p className="tagline">
        Shipping production web products end-to-end — now teaching agents to do the parts I used to.
      </p>

      <CommandLine />
    </section>
  );
}
