import {ShopExperience} from "@/components/shop-experience";
import {getStorefrontProducts} from "@/lib/commerce/storefront-catalog";

export const metadata={title:"Shop"};
export const dynamic="force-dynamic";

export default async function ShopPage(){
  const products=await getStorefrontProducts();
  return <main className="page-shell"><ShopExperience items={products}/></main>;
}
