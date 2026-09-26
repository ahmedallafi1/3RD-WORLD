import {redirect} from "next/navigation";
import {AccessForm} from "@/components/access-form";
import {GlobeMark} from "@/components/storefront";
import {getPrimaryDrop} from "@/lib/world-engine/repository";

export const metadata={title:"Access"};
export const dynamic="force-dynamic";

export default async function AccessPage(){
  const drop=await getPrimaryDrop();
  if(drop)redirect("/drop/"+drop.slug);

  return (
    <main className="drop-screen">
      <GlobeMark size={118}/>
      <span>NEXT TRANSMISSION</span>
      <h1>COMING SOON.</h1>
      <AccessForm/>
      <p className="muted">JOIN FOR THE NEXT WORLD.</p>
    </main>
  );
}
