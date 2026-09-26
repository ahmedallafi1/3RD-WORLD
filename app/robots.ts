import type {MetadataRoute} from "next";

export default function robots():MetadataRoute.Robots{
  const base=(process.env.PUBLIC_SITE_URL??"https://3rdworld.com").replace(/\/$/,"");
  return {
    rules:{userAgent:"*",allow:"/"},
    sitemap:base+"/sitemap.xml",
  };
}
