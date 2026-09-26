import {redirect} from "next/navigation";
import {getPrimaryDrop} from "@/lib/world-engine/repository";

export const dynamic="force-dynamic";

export default async function DropPage(){
  const drop=await getPrimaryDrop();
  if(!drop)redirect("/archive");
  redirect("/drop/"+drop.slug);
}
