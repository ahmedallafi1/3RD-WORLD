export function resolveMediaUrl(storageKey:string){
  const key=storageKey.trim();
  if(!key)return null;

  if(key.startsWith("/"))return key;
  if(/^https:\/\//i.test(key))return key;
  if(/^http:\/\//i.test(key)){
    return process.env.NODE_ENV==="production"?null:key;
  }

  const base=process.env.MEDIA_CDN_BASE_URL?.replace(/\/$/,"");
  if(!base)return null;
  const path=key.split("/").map(part=>encodeURIComponent(part)).join("/");
  return base+"/"+path;
}
