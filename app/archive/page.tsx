import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

const worlds = [
  { id: "001", year: "2026", city: "NEW YORK", status: "AVAILABLE" },
];

export default function ArchivePage() {
  return (
    <main className="page-shell">
      <header className="archive-header">
        <p>3RD WORLD / HISTORY</p>
        <h1>ARCHIVE</h1>
      </header>

      <section className="archive-list">
        {worlds.map((world) => (
          <Link href={`/world/${world.id}`} className="archive-row" key={world.id}>
            <div><span>WORLD {world.id}</span><span>{world.city}</span></div>
            <div><span>{world.year}</span><span>{world.status}</span></div>
          </Link>
        ))}
        <div className="archive-row archive-row--ghost">
          <div><span>WORLD 002</span><span>LOCATION UNDISCLOSED</span></div>
          <div><span>—</span><span>LOCKED</span></div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
