import Link from "next/link";
import {listArchiveWorlds} from "@/lib/world-engine/repository";

export const metadata={title:"Archive"};
export const dynamic="force-dynamic";

export default async function ArchivePage(){
  const worlds=await listArchiveWorlds();

  return (
    <main className="page-shell archive-page">
      <div className="archive-head">
        <span>3RD WORLD / HISTORY</span>
        <h1>ARCHIVE</h1>
      </div>
      <div className="archive-list">
        {worlds.map(world=>(
          <Link href={"/world/"+world.slug} className="archive-row" key={world.id}>
            <div>
              <span>{world.code}</span>
              <h2>{world.title}</h2>
              {world.tagline&&<p>{world.tagline}</p>}
            </div>
            <span>{world.year??"—"}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
