import {NextRequest,NextResponse} from "next/server";
import {getAdminUser} from "@/lib/auth/session";
import {
  isContentPageSlug,
  updateContentPage,
} from "@/lib/content/pages";

const allowed=new Set(["OWNER","ADMIN","CONTENT"]);

export async function PATCH(
  request:NextRequest,
  {params}:{params:Promise<{slug:string}>},
){
  const user=await getAdminUser();
  if(!user||!allowed.has(user.role))return NextResponse.json({error:"Forbidden"},{status:403});
  const {slug}=await params;
  if(!isContentPageSlug(slug))return NextResponse.json({error:"Unknown content page."},{status:404});

  const body=await request.json().catch(()=>null) as {
    title?:string;body?:string;status?:"DRAFT"|"PUBLISHED";
  }|null;
  if(!body?.title||body.body===undefined||!body.status){
    return NextResponse.json({error:"Title, content and status are required."},{status:400});
  }

  try{
    await updateContentPage({
      slug,
      title:body.title,
      body:body.body,
      status:body.status,
      actorId:user.id,
    });
    return NextResponse.json({ok:true});
  }catch(error){
    return NextResponse.json(
      {error:error instanceof Error?error.message:"Unable to update page."},
      {status:400},
    );
  }
}
