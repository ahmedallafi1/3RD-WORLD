import Link from "next/link";
export const metadata={title:"Archive"};
export default function ArchivePage(){return <main className="page-shell archive-page"><h1>ARCHIVE</h1><div className="archive-list"><Link href="/world/001" className="archive-row"><div><span>WORLD 001</span><h2>NO BORDERS</h2></div><span>2026</span></Link></div></main>}
