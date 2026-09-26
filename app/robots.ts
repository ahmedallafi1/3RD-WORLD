import type {MetadataRoute} from "next";

export default function robots():MetadataRoute.Robots{
  return {
    rules:{userAgent:"*",allow:"/"},
    sitemap:"https://3rdworld.com/sitemap.xml"
  };
}
