import {isDatabaseConfigured,query,withTransaction} from "@/lib/db";
import {writeAdminAudit} from "@/lib/commerce/repositories/audit";

export const contentPageSlugs=[
  "shipping","returns","privacy","terms","accessibility","contact","faq","size-guide",
] as const;
export type ContentPageSlug=(typeof contentPageSlugs)[number];

export type ContentPage={
  slug:ContentPageSlug;
  title:string;
  body:string;
  status:"DRAFT"|"PUBLISHED";
  updatedAt:string|null;
};

const preview:Record<ContentPageSlug,{title:string;body:string}>={
  shipping:{title:"Shipping",body:"Shipping information will be published before the store opens."},
  returns:{title:"Returns",body:"Return information will be published before the store opens."},
  privacy:{title:"Privacy",body:"Privacy information will be published before the store opens."},
  terms:{title:"Terms",body:"Terms will be published before the store opens."},
  accessibility:{title:"Accessibility",body:"3RD WORLD is committed to providing an accessible digital experience."},
  contact:{title:"Contact",body:"Contact information will be published before the store opens."},
  faq:{title:"FAQ",body:"Frequently asked questions will be published before the store opens."},
  "size-guide":{title:"Size Guide",body:"Final garment measurements will be published for each release."},
};

export function isContentPageSlug(value:string):value is ContentPageSlug{
  return (contentPageSlugs as readonly string[]).includes(value);
}

export async function getContentPage(slug:ContentPageSlug):Promise<ContentPage|null>{
  if(!isDatabaseConfigured()){
    return {
      slug,
      title:preview[slug].title,
      body:preview[slug].body,
      status:"PUBLISHED",
      updatedAt:null,
    };
  }
  const result=await query<{
    slug:ContentPageSlug;title:string;body:string;status:"DRAFT"|"PUBLISHED";updated_at:Date;
  }>(
    "SELECT slug,title,body,status,updated_at FROM content_pages WHERE slug=$1 LIMIT 1",
    [slug],
  );
  const row=result.rows[0];
  return row?{
    slug:row.slug,title:row.title,body:row.body,status:row.status,
    updatedAt:row.updated_at.toISOString(),
  }:null;
}

export async function listContentPages(){
  if(!isDatabaseConfigured()){
    return Promise.all(contentPageSlugs.map(slug=>getContentPage(slug))).then(items=>items.filter(Boolean) as ContentPage[]);
  }
  const result=await query<{
    slug:ContentPageSlug;title:string;body:string;status:"DRAFT"|"PUBLISHED";updated_at:Date;
  }>(
    `SELECT slug,title,body,status,updated_at
     FROM content_pages
     ORDER BY array_position($1::text[],slug)`,
    [contentPageSlugs],
  );
  return result.rows.map(row=>({
    slug:row.slug,title:row.title,body:row.body,status:row.status,
    updatedAt:row.updated_at.toISOString(),
  }));
}

export async function listPublishedContentPages(){
  const pages=await listContentPages();
  return pages.filter(page=>page.status==="PUBLISHED");
}

export async function updateContentPage(args:{
  slug:ContentPageSlug;
  title:string;
  body:string;
  status:"DRAFT"|"PUBLISHED";
  actorId:string;
}){
  const title=args.title.trim();
  const body=args.body.trim();
  if(!title||title.length>120)throw new Error("A valid page title is required.");
  if(body.length>100_000)throw new Error("Page content is too long.");
  if(args.status==="PUBLISHED"&&!body)throw new Error("Published pages cannot be empty.");

  return withTransaction(async client=>{
    const before=await client.query(
      "SELECT * FROM content_pages WHERE slug=$1 FOR UPDATE",
      [args.slug],
    );
    if(!before.rows[0])throw new Error("Content page not found.");

    await client.query(
      `UPDATE content_pages
       SET title=$2,body=$3,status=$4,updated_by=$5,
           published_at=CASE WHEN $4='PUBLISHED' THEN COALESCE(published_at,now()) ELSE published_at END,
           updated_at=now()
       WHERE slug=$1`,
      [args.slug,title,body,args.status,args.actorId],
    );
    await writeAdminAudit(client,{
      actorId:args.actorId,
      action:"CONTENT_PAGE_UPDATE",
      resourceType:"content_page",
      resourceId:args.slug,
      before:before.rows[0],
      after:{title,status:args.status},
    });
  });
}
