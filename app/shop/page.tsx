import {ProductCard} from "@/components/storefront";
import {products} from "@/lib/catalog";
export const metadata={title:"Shop"};
export default function ShopPage(){return <main className="page-shell"><div className="shop-head"><h1>SHOP</h1><div className="shop-filters"><button className="active">ALL</button><button>OUTERWEAR</button><button>TOPS</button><button>BOTTOMS</button><button>ACCESSORIES</button></div></div><div className="product-grid">{products.map((product,index)=><ProductCard product={product} index={index} key={product.slug}/>)}</div></main>}
