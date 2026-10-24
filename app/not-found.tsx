import Link from "next/link";
import Header from "@/components/site/Header";
import Footer from "@/components/site/Footer";
import ThemeDots from "@/components/site/ThemeDots";
import "./(site)/site.css";

export default function NotFound() {
  return (
    <div className="page">
      <Header />
      <main id="main" className="col">
        <header className="page-head">
          <h1>Lost in the grass.</h1>
          <p className="tag">That page doesn&apos;t exist. The cat may have moved it.</p>
          <p style={{ marginTop: 28 }}>
            <Link href="/" className="more">
              Back home <span className="arr" aria-hidden="true">→</span>
            </Link>
          </p>
        </header>
      </main>
      <Footer />
      <ThemeDots variant="rail" />
    </div>
  );
}
