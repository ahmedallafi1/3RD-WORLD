import {notFound} from "next/navigation";
import {getContentPage,type ContentPageSlug} from "@/lib/content/pages";

function blocks(body:string){
  return body.split(/\n{2,}/).map(block=>block.trim()).filter(Boolean);
}

export async function ContentPageView({slug}:{slug:ContentPageSlug}){
  const page=await getContentPage(slug);
  if(!page||page.status!=="PUBLISHED")notFound();

  return (
    <main className="content-page">
      <header>
        <span>3RD WORLD / INFORMATION</span>
        <h1>{page.title}</h1>
      </header>
      <article>
        {blocks(page.body).map((block,index)=>{
          if(block.startsWith("## ")){
            return <h2 key={index}>{block.slice(3)}</h2>;
          }
          return <p key={index}>{block}</p>;
        })}
        {page.updatedAt&&<small>UPDATED {new Date(page.updatedAt).toLocaleDateString("en-US")}</small>}
      </article>
    </main>
  );
}
