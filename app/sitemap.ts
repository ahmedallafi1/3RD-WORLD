import type {MetadataRoute} from "next";
import {products} from "@/lib/catalog";

export default function sitemap():MetadataRoute.Sitemap{
  const base="https://3rdworld.com";
  const staticRoutes=["","/shop","/world","/world/001","/archive","/access"];
  return [
    ...staticRoutes.map(route=>({url:base+route,lastModified:new Date()})),
    ...products.map(product=>({url:base+"/product/"+product.slug,lastModified:new Date()}))
  ];
}
