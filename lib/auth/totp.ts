import {createHmac,timingSafeEqual} from "node:crypto";

const ALPHABET="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(input:string){
  const clean=input.toUpperCase().replace(/[^A-Z2-7]/g,"");
  let bits="";
  for(const char of clean){
    const value=ALPHABET.indexOf(char);
    if(value<0)throw new Error("Invalid TOTP secret.");
    bits+=value.toString(2).padStart(5,"0");
  }
  const bytes:number[]=[];
  for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2));
  return Buffer.from(bytes);
}

function tokenFor(secret:string,counter:number){
  const key=decodeBase32(secret);
  const message=Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest=createHmac("sha1",key).update(message).digest();
  const offset=digest[digest.length-1]&0x0f;
  const code=((digest[offset]&0x7f)<<24)
    |((digest[offset+1]&0xff)<<16)
    |((digest[offset+2]&0xff)<<8)
    |(digest[offset+3]&0xff);
  return String(code%1_000_000).padStart(6,"0");
}

export function verifyTotp(secret:string,token:string,now=Date.now()){
  const normalized=token.replace(/\s+/g,"");
  if(!/^\d{6}$/.test(normalized))return false;
  const counter=Math.floor(now/1000/30);
  for(const drift of [-1,0,1]){
    const expected=Buffer.from(tokenFor(secret,counter+drift));
    const actual=Buffer.from(normalized);
    if(expected.length===actual.length&&timingSafeEqual(expected,actual))return true;
  }
  return false;
}
