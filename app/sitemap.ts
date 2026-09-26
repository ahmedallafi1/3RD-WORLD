import type {MetadataRoute} from "next";
import {getStorefrontProducts} from "@/lib/commerce/storefront-catalog";
import {listArchiveWorlds} from "@/lib/world-engine/repository";
import {listPublishedContentPages} from "@/lib/content/pages";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  const base=(process.env.PUBLIC_SITE_URL??"https://3rdworld.com").replace(/\/$/,"");
  const [products,worlds,contentPages]=await Promise.all([
    getStorefrontProducts(),
    listArchiveWorlds(),
    listPublishedContentPages(),
  ]);
  const staticRoutes=["","/shop","/world","/archive","/access"];

  return [
    ...staticRoutes.map(route=>({url:base+route,lastModified:new Date()})),
    ...worlds.map(world=>({url:base+"/world/"+world.slug,lastModified:new Date()})),
    ...products.map(product=>({url:base+"/product/"+product.slug,lastModified:new Date()})),
    ...contentPages.map(page=>({url:base+"/"+page.slug,lastModified:new Date(page.updatedAt??Date.now())})),
  ];
}
