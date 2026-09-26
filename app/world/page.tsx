import Link from "next/link";
import {listArchiveWorlds} from "@/lib/world-engine/repository";

export const metadata={title:"World"};
export const dynamic="force-dynamic";

export default async function WorldPage(){
  const worlds=await listArchiveWorlds();
  const latest=worlds[0];

  return (
    <main className="editorial-page">
      <section className="editorial-hero">
        <span>3RD WORLD / CULTURE</span>
        <h1>THE WORLD IS<br/>BIGGER THAN CLOTHES.</h1>
      </section>
      <section className="editorial-grid">
        <div className="editorial-block"><span>PEOPLE</span><strong>01</strong></div>
        <div className="editorial-block"><span>CITIES</span><strong>02</strong></div>
        <div className="editorial-block"><span>FILMS</span><strong>03</strong></div>
        <div className="editorial-block"><span>SOUND</span><strong>04</strong></div>
      </section>
      <div className="editorial-end">
        {latest
          ? <Link href={"/world/"+latest.slug} className="underlined-link">ENTER {latest.code}</Link>
          : <Link href="/archive" className="underlined-link">ENTER ARCHIVE</Link>}
      </div>
    </main>
  );
}
