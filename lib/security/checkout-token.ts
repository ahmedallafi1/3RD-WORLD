import {createHash,randomBytes,timingSafeEqual} from "node:crypto";
import {query} from "@/lib/db";

export function newCheckoutToken(){
  return randomBytes(32).toString("base64url");
}

export function hashCheckoutToken(token:string){
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

export async function assertCheckoutToken(orderId:string,token?:string|null){
  if(!token)throw new Error("Checkout authorization is required.");

  const result=await query<{checkout_token_hash:string|null}>(
    "SELECT checkout_token_hash FROM orders WHERE id=$1 LIMIT 1",
    [orderId],
  );
  const stored=result.rows[0]?.checkout_token_hash;
  if(!stored||!safeEqualHex(stored,hashCheckoutToken(token))){
    throw new Error("Checkout authorization is invalid.");
  }
}
