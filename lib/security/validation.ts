import type {ShippingAddress} from "@/lib/shipping/easypost";

export function normalizeEmail(value:unknown){
  if(typeof value!=="string")return "";
  const email=value.trim().toLowerCase();
  if(email.length>320)return "";
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return "";
  return email;
}

export function boundedText(
  value:unknown,
  max:number,
  {required=false}:{required?:boolean}={},
){
  if(typeof value!=="string"){
    if(required)throw new Error("Required text value is missing.");
    return "";
  }
  const text=value.trim();
  if(required&&!text)throw new Error("Required text value is missing.");
  if(text.length>max)throw new Error("A checkout field is too long.");
  return text;
}

export function validateShippingAddress(value:unknown):ShippingAddress{
  if(!value||typeof value!=="object")throw new Error("Delivery address is required.");
  const input=value as Record<string,unknown>;
  const country=boundedText(input.country,2,{required:true}).toUpperCase();
  if(!/^[A-Z]{2}$/.test(country))throw new Error("Invalid delivery country.");

  const email=normalizeEmail(input.email);
  if(input.email&&!email)throw new Error("Invalid delivery email.");

  return {
    name:boundedText(input.name,120,{required:true}),
    line1:boundedText(input.line1,160,{required:true}),
    line2:boundedText(input.line2,160)||undefined,
    city:boundedText(input.city,100,{required:true}),
    state:boundedText(input.state,100)||undefined,
    postalCode:boundedText(input.postalCode,24,{required:true}),
    country,
    phone:boundedText(input.phone,32)||undefined,
    email:email||undefined,
  };
}
