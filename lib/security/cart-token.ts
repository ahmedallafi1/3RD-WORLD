import {createHash,randomBytes,timingSafeEqual} from "node:crypto";
import {query} from "@/lib/db";

export function newCartToken(){
  return randomBytes(32).toString("base64url");
}

export function hashCartToken(token:string){
  return createHash("sha256").update(token).digest("hex");
}

function safeEqualHex(a:string,b:string){
  try{
    const left=Buffer.from(a,"hex");
    const right=Buffer.from(b,"hex");
    return left.length===right.length&&timingSafeEqual(left,right);
  }catch{
    return false;
  }
}

export async function assertCartToken(cartId:string,token?:string|null){
  if(!token)throw new Error("Cart authorization is required.");
  const result=await query<{access_token_hash:string|null}>(
    "SELECT access_token_hash FROM carts WHERE id=$1 LIMIT 1",
    [cartId],
  );
  const stored=result.rows[0]?.access_token_hash;
  if(!stored||!safeEqualHex(stored,hashCartToken(token))){
    throw new Error("Cart authorization is invalid.");
  }
}
