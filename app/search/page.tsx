import {SearchExperience} from "@/components/search-experience";
import {getStorefrontProducts} from "@/lib/commerce/storefront-catalog";

export const metadata={title:"Search"};
export const dynamic="force-dynamic";

export default async function SearchPage(){
  const products=await getStorefrontProducts();
  return <SearchExperience items={products}/>;
}
