"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
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
const MAX_LOCAL_CART_LINES=50;
const MAX_LOCAL_LINE_QUANTITY=20;

function isProduct(value:unknown):value is Product{
  if(!value||typeof value!=="object")return false;
  const product=value as Partial<Product>;
  return typeof product.slug==="string"
    &&typeof product.name==="string"
    &&typeof product.world==="string"
    &&typeof product.price==="number"
    &&Number.isFinite(product.price)
    &&product.price>=0
    &&typeof product.color==="string"
    &&typeof product.category==="string"
    &&Array.isArray(product.sizes)
    &&product.sizes.every(size=>typeof size==="string")
    &&typeof product.description==="string"
    &&typeof product.material==="string"
    &&typeof product.fit==="string"
    &&typeof product.tone==="string";
}

function restoreCart(raw:string):CartLine[]{
  const parsed=JSON.parse(raw) as unknown;
  if(!Array.isArray(parsed))return [];

  return parsed.slice(0,MAX_LOCAL_CART_LINES).flatMap(item=>{
    if(!item||typeof item!=="object")return [];
    const line=item as Partial<CartLine>;
    if(!isProduct(line.product)||typeof line.size!=="string")return [];
    const quantity=Math.min(
      MAX_LOCAL_LINE_QUANTITY,
      Math.max(1,Math.floor(Number(line.quantity)||1)),
    );
    return [{product:line.product,size:line.size.slice(0,32),quantity}];
  });
}

function useDialogFocus(ref:RefObject<HTMLElement|null>,active:boolean){
  useEffect(()=>{
    if(!active||!ref.current)return;
    const dialog=ref.current;
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const selector='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

    const first=dialog.querySelector<HTMLElement>(selector);
    window.requestAnimationFrame(()=>first?.focus());

    const onKey=(event:KeyboardEvent)=>{
      if(event.key!=="Tab")return;
      const focusable=[...dialog.querySelectorAll<HTMLElement>(selector)]
        .filter(element=>element.offsetParent!==null);
      if(!focusable.length)return;
      const firstItem=focusable[0];
      const lastItem=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===firstItem){
        event.preventDefault();
        lastItem.focus();
      }else if(!event.shiftKey&&document.activeElement===lastItem){
        event.preventDefault();
        firstItem.focus();
      }
    };

    dialog.addEventListener("keydown",onKey);
    return ()=>{
      dialog.removeEventListener("keydown",onKey);
      previous?.focus();
    };
  },[active,ref]);
}

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
      if(stored)setLines(restoreCart(stored));
    }catch{
      window.localStorage.removeItem(CART_KEY);
    }
    setHydrated(true);
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    try{
      window.localStorage.setItem(CART_KEY,JSON.stringify(lines));
    }catch{
      // Shopping remains usable even if local persistence is unavailable.
    }
  },[hydrated,lines]);

  const open=useCallback(()=>setIsOpen(true),[]);
  const close=useCallback(()=>setIsOpen(false),[]);
  const clear=useCallback(()=>setLines([]),[]);

  const add=useCallback((product:Product,size:string)=>{
    if(product.status==="SOLD OUT"||product.status==="COMING SOON")return;
    setLines(current=>{
      const index=current.findIndex(line=>line.product.slug===product.slug&&line.size===size);
      if(index===-1){
        if(current.length>=MAX_LOCAL_CART_LINES)return current;
        return [...current,{product,size,quantity:1}];
      }
      return current.map((line,i)=>i===index
        ?{...line,quantity:Math.min(MAX_LOCAL_LINE_QUANTITY,line.quantity+1)}
        :line);
    });
    setIsOpen(true);
  },[]);

  const increment=useCallback((slug:string,size:string)=>{
    setLines(current=>current.map(line=>line.product.slug===slug&&line.size===size
      ?{...line,quantity:Math.min(MAX_LOCAL_LINE_QUANTITY,line.quantity+1)}
      :line));
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

  const value=useMemo<CartContextValue>(()=>({
    lines,count,subtotal,isOpen,open,close,add,increment,decrement,remove,clear,
  }),[lines,count,subtotal,isOpen,open,close,add,increment,decrement,remove,clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(){
  const ctx=useContext(CartContext);
  if(!ctx)throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export function SiteHeader(){
  const [menuOpen,setMenuOpen]=useState(false);
  const cart=useCart();
  const menuRef=useRef<HTMLDivElement>(null);
  const bagRef=useRef<HTMLElement>(null);

  useDialogFocus(menuRef,menuOpen);
  useDialogFocus(bagRef,cart.isOpen);

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
  },[cart.close]);

  return <>
    <header className="site-header">
      <button
        className="text-button"
        onClick={()=>setMenuOpen(true)}
        aria-expanded={menuOpen}
        aria-controls="site-menu"
      >
        MENU
      </button>
      <Link href="/" className="site-wordmark" aria-label="3RD WORLD home">3RD WORLD</Link>
      <div className="header-actions">
        <Link href="/search" className="desktop-only">SEARCH</Link>
        <button
          className="text-button"
          onClick={cart.open}
          aria-expanded={cart.isOpen}
          aria-controls="shopping-bag"
        >
          BAG ({cart.count})
        </button>
      </div>
    </header>

    <div
      id="site-menu"
      ref={menuRef}
      className={"overlay menu-overlay "+(menuOpen?"is-open":"")}
      aria-hidden={!menuOpen}
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
    >
      <div className="overlay-top">
        <button className="text-button" onClick={()=>setMenuOpen(false)}>CLOSE</button>
        <GlobeMark size={38}/>
      </div>
      <nav className="menu-nav" aria-label="Primary navigation">
        <Link onClick={()=>setMenuOpen(false)} href="/shop">SHOP</Link>
        <Link onClick={()=>setMenuOpen(false)} href="/drop">CURRENT DROP</Link>
        <Link onClick={()=>setMenuOpen(false)} href="/archive">ARCHIVE</Link>
        <Link onClick={()=>setMenuOpen(false)} href="/world">WORLD</Link>
        <Link onClick={()=>setMenuOpen(false)} href="/passport">PASSPORT</Link>
        <Link onClick={()=>setMenuOpen(false)} href="/search" className="menu-search">SEARCH</Link>
      </nav>
      <div className="menu-bottom"><span>INSTAGRAM</span><span>TIKTOK</span><span>US / USD</span></div>
    </div>

    <aside
      id="shopping-bag"
      ref={bagRef}
      className={"bag-drawer "+(cart.isOpen?"is-open":"")}
      aria-hidden={!cart.isOpen}
      role="dialog"
      aria-modal="true"
      aria-label="Shopping bag"
    >
      <div className="bag-top">
        <strong>BAG ({cart.count})</strong>
        <button className="text-button" onClick={cart.close}>CLOSE</button>
      </div>

      <div className="bag-lines" aria-live="polite">
        {cart.lines.length===0
          ? <div className="empty-bag"><GlobeMark size={46}/><p>YOUR BAG IS EMPTY.</p><Link href="/shop" onClick={cart.close} className="underlined-link">SHOP 3RD WORLD</Link></div>
          : cart.lines.map(line=>(
            <article className="bag-line" key={line.product.slug+"-"+line.size}>
              <div className={"bag-thumb tone-"+line.product.tone}>{line.product.world}</div>
              <div className="bag-line-copy">
                <strong>{line.product.name}</strong>
                <span>{line.product.color} / {line.size}</span>
                <span>{formatMoney(line.product.price)}</span>
                <div className="quantity-row">
                  <button aria-label={"Decrease "+line.product.name+" quantity"} onClick={()=>cart.decrement(line.product.slug,line.size)}>−</button>
                  <span aria-label={"Quantity "+line.quantity}>{line.quantity}</span>
                  <button aria-label={"Increase "+line.product.name+" quantity"} onClick={()=>cart.increment(line.product.slug,line.size)}>+</button>
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
  const images=product.media?.filter(item=>item.kind==="IMAGE")??[];
  const cover=images.find(item=>item.role==="COVER")??images[0];
  const hover=images.find(item=>item!==cover);

  return (
    <article className="product-card">
      <Link
        href={"/product/"+product.slug}
        className={"product-visual tone-"+product.tone+(cover?" has-media":"")}
        aria-label={product.name+", "+product.color+", "+formatMoney(product.price)}
      >
        {cover?(
          <>
            <img
              className="product-card-image primary"
              src={cover.src}
              alt={cover.alt||product.name+" in "+product.color}
              loading={index<4?"eager":"lazy"}
              decoding="async"
            />
            {hover&&(
              <img
                className="product-card-image hover"
                src={hover.src}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
              />
            )}
          </>
        ):(
          <span className="product-fallback-mark"><GlobeMark size={62}/></span>
        )}
        <span className="product-index">{String(index+1).padStart(2,"0")}</span>
        <span className="product-visual-label">{product.world}</span>
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
            type="button"
          >
            {item}
          </button>
        ))}
      </div>
      <button
        className="primary-button"
        disabled={unavailable}
        onClick={()=>cart.add(product,size)}
        type="button"
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
      <nav aria-label="Footer">
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
