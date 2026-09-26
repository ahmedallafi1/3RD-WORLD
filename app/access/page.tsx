import {AccessForm} from "@/components/access-form";
import {DropCountdown} from "@/components/drop-countdown";
import {GlobeMark} from "@/components/storefront";

export const metadata={title:"Access"};

export default function AccessPage(){
  return (
    <main className="drop-screen">
      <GlobeMark size={118}/>
      <span>NEXT TRANSMISSION</span>
      <h1>WORLD 002</h1>
      <DropCountdown/>
      <AccessForm/>
      <p className="muted">PRIVATE ACCESS APPEARS HERE WHEN ENABLED.</p>
    </main>
  );
}
