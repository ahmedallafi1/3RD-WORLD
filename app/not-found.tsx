import Link from "next/link";
import {GlobeMark} from "@/components/storefront";

export default function NotFound(){
  return (
    <main className="not-found">
      <GlobeMark size={92}/>
      <span>404</span>
      <h1>YOU'VE LEFT<br/>THE WORLD.</h1>
      <Link href="/" className="underlined-link">RETURN HOME</Link>
    </main>
  );
}
