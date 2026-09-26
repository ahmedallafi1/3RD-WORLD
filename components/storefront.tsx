"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {formatMoney,type CartLine,type Product} from "@/lib/catalog";

type CartContextValue={
  lines:CartLine[];
  count:number;
  subtotal:number;
  isOpen:boolean;
  open:()=>void;
  close:()=>void;
  add:(product:Product,size:string)=>void;
  increment:(slug:string,size:string)=>void;
  decrement:(slug:string,size:string)=>void;
  remove:(slug:string,size:string)=>void;
  clear:()=>void;
};

const CartContext=createContext<CartContextValue|null>(null);
const CART_KEY="3rd-world:bag";

export function GlobeMark({size=34}:{size?:number}){
  return <span className="globe-mark" aria-hidden="true" style={{width:size,height:size}}><span/><span/></span>;
}

export function CartProvider({children}:{children:ReactNode}){
  const [lines,setLines]=useState<CartLine[]>([]);
  const [isOpen,setIsOpen]=useState(false);
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    try{
      const stored=window.localStorage.getItem(CART_KEY);
      if(stored)setLines(JSON.parse(stored) as CartLine[]);
    }catch{}
    setHydrated(true);
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    window.localStorage.setItem(CART_KEY,JSON.stringify(lines));
  },[hydrated,lines]);

  const add=useCallback((product:Product,size:string)=>{
    if(product.status==="SOLD OUT"||product.status==="COMING SOON")return;
    setLines(current=>{
      const index=current.findIndex(line=>line.product.slug===product.slug&&line.size===size);
      if(index===-1)return [...current,{product,size,quantity:1}];
      return current.map((line,i)=>i===index?{...line,quantity:line.quantity+1}:line);
    });
    setIsOpen(true);
  },[]);

  const increment=useCallback((slug:string,size:string)=>{
    setLines(current=>current.map(line=>line.product.slug===slug&&line.size===size?{...line,quantity:line.quantity+1}:line));
  },[]);

  const decrement=useCallback((slug:string,size:string)=>{
    setLines(current=>current
      .map(line=>line.product.slug===slug&&line.size===size?{...line,quantity:Math.max(0,line.quantity-1)}:line)
      .filter(line=>line.quantity>0)
    );
  },[]);

  const remove=useCallback((slug:string,size:string)=>{
    setLines(current=>current.filter(line=>!(line.product.slug===slug&&line.size===size)));
  },[]);

  const count=useMemo(()=>lines.reduce((sum,line)=>sum+line.quantity,0),[lines]);
  const subtotal=useMemo(()=>lines.reduce((sum,line)=>sum+line.product.price*line.quantity,0),[lines]);

  return (
    <CartContext.Provider value={{
      lines,count,subtotal,isOpen,
      open:()=>setIsOpen(true),
      close:()=>setIsOpen(false),
      add,increment,decrement,remove,
      clear:()=>setLines([])
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(){
  const ctx=useContext(CartContext);
  if(!ctx)throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export function SiteHeader(){
  const [menuOpen,setMenuOpen]=useState(false);
  const cart=useCart();

  useEffect(()=>{
    const locked=menuOpen||cart.isOpen;
    document.documentElement.classList.toggle("scroll-locked",locked);
    return ()=>document.documentElement.classList.remove("scroll-locked");
  },[menuOpen,cart.isOpen]);

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if(event.key!=="Escape")return;
      setMenuOpen(false);
      cart.close();
    };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[cart]);

  return <>
    <header className="site-header">
      <button className="text-button" onClick={()=>setMenuOpen(true)} aria-expanded={menuOpen}>MENU</button>
      <Link href="/" className="site-wordmark" aria-label="3RD WORLD home">3RD WORLD</Link>
      <div className="header-actions">
        <Link href="/search" className="desktop-only">SEARCH</Link>
        <button className="text-button" onClick={cart.open}>BAG ({cart.count})</button>
      </div>
    </header>

    <div className={"overlay menu-overlay "+(menuOpen?"is-open":"")} aria-hidden={!menuOpen}>
      <div className="overlay-top">
        <button className="text-button" onClick={()=>setMenuOpen(false)}>CLOSE</button>
        <GlobeMark size={38}/>
      </div>
      <nav className="menu-nav" aria-label="Primary navigation">
        <Link onClick={()=>setMenuOpen(false)} href="/shop">SHOP</Link>
        <Link onClick={()=>setMenuOpen(false)} href="/world/001">LATEST WORLD</Link>
        <Link onClick={()=>setMenuOpen(false)} href="/archive">ARCHIVE</Link>
        <Link onClick={()=>setMenuOpen(false)} href="/world">WORLD</Link>
        <Link onClick={()=>setMenuOpen(false)} href="/passport">PASSPORT</Link>
        <Link onClick={()=>setMenuOpen(false)} href="/search" className="menu-search">SEARCH</Link>
      </nav>
      <div className="menu-bottom"><span>INSTAGRAM</span><span>TIKTOK</span><span>US / USD</span></div>
    </div>

    <aside className={"bag-drawer "+(cart.isOpen?"is-open":"")} aria-hidden={!cart.isOpen}>
      <div className="bag-top">
        <strong>BAG ({cart.count})</strong>
        <button className="text-button" onClick={cart.close}>CLOSE</button>
      </div>

      <div className="bag-lines">
        {cart.lines.length===0
          ? <div className="empty-bag"><GlobeMark size={46}/><p>YOUR BAG IS EMPTY.</p><Link href="/shop" onClick={cart.close} className="underlined-link">SHOP WORLD 001</Link></div>
          : cart.lines.map(line=>(
            <article className="bag-line" key={line.product.slug+"-"+line.size}>
              <div className={"bag-thumb tone-"+line.product.tone}>{line.product.world}</div>
              <div className="bag-line-copy">
                <strong>{line.product.name}</strong>
                <span>{line.product.color} / {line.size}</span>
                <span>{formatMoney(line.product.price)}</span>
                <div className="quantity-row">
                  <button aria-label="Decrease quantity" onClick={()=>cart.decrement(line.product.slug,line.size)}>−</button>
                  <span>{line.quantity}</span>
                  <button aria-label="Increase quantity" onClick={()=>cart.increment(line.product.slug,line.size)}>+</button>
                  <button className="remove" onClick={()=>cart.remove(line.product.slug,line.size)}>REMOVE</button>
                </div>
              </div>
            </article>
          ))
        }
      </div>

      {cart.lines.length>0&&(
        <div className="bag-footer">
          <div className="subtotal"><span>SUBTOTAL</span><strong>{formatMoney(cart.subtotal)}</strong></div>
          <p className="bag-note">SHIPPING AND TAXES CALCULATED AT CHECKOUT.</p>
          <Link href="/checkout" className="primary-button" onClick={cart.close}>CHECKOUT</Link>
          <button className="secondary-button" onClick={cart.close}>CONTINUE SHOPPING</button>
        </div>
      )}
    </aside>

    {cart.isOpen&&<button className="scrim" aria-label="Close bag" onClick={cart.close}/>}
  </>;
}

export function ProductCard({product,index}:{product:Product;index:number}){
  return (
    <article className="product-card">
      <Link href={"/product/"+product.slug} className={"product-visual tone-"+product.tone}>
        <span className="product-index">{String(index+1).padStart(2,"0")}</span>
        <span className="product-visual-label">{product.world}</span>
        <span className="product-silhouette" aria-hidden="true"/>
        {product.status&&<span className="product-status">{product.status}</span>}
      </Link>
      <div className="product-meta">
        <div>
          <Link href={"/product/"+product.slug}>{product.name}</Link>
          <span>{product.color}</span>
        </div>
        <strong>{formatMoney(product.price)}</strong>
      </div>
    </article>
  );
}

export function AddToBag({product}:{product:Product}){
  const [size,setSize]=useState(product.sizes[0]);
  const cart=useCart();
  const unavailable=product.status==="SOLD OUT"||product.status==="COMING SOON";

  return (
    <div className="purchase-block">
      <div className="size-row" role="group" aria-label="Select size">
        {product.sizes.map(item=>(
          <button
            key={item}
            className={item===size?"active":""}
            onClick={()=>setSize(item)}
            aria-pressed={item===size}
          >
            {item}
          </button>
        ))}
      </div>
      <button
        className="primary-button"
        disabled={unavailable}
        onClick={()=>cart.add(product,size)}
      >
        {product.status==="COMING SOON"?"COMING SOON":product.status==="SOLD OUT"?"SOLD OUT":"ADD TO BAG"}
      </button>
    </div>
  );
}

export function Footer(){
  return (
    <footer className="footer">
      <div>
        <strong>3RD WORLD</strong>
        <span>STAY HUNGRY. NEVER THIRSTY.</span>
      </div>
      <nav>
        <Link href="/shop">SHOP</Link>
        <Link href="/archive">ARCHIVE</Link>
        <Link href="/world">WORLD</Link>
        <Link href="/passport">PASSPORT</Link>
      </nav>
      <div className="footer-meta">
        <Link href="/search">SEARCH</Link>
        <span>US / USD</span>
        <span>© 3RD WORLD</span>
      </div>
    </footer>
  );
}
