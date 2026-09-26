import type {MetadataRoute} from "next";
import {getStorefrontProducts} from "@/lib/commerce/storefront-catalog";
import {listArchiveWorlds} from "@/lib/world-engine/repository";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=(process.env.PUBLIC_SITE_URL??"https://3rdworld.com").replace(/\/$/,"");
  const [products,worlds]=await Promise.all([
    getStorefrontProducts(),
    listArchiveWorlds(),
  ]);
  const staticRoutes=["","/shop","/world","/archive","/access"];

  return [
    ...staticRoutes.map(route=>({url:base+route,lastModified:new Date()})),
    ...worlds.map(world=>({url:base+"/world/"+world.slug,lastModified:new Date()})),
    ...products.map(product=>({url:base+"/product/"+product.slug,lastModified:new Date()})),
  ];
}
