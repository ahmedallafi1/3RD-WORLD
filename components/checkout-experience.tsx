"use client";

import {FormEvent,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {useCart} from "@/components/storefront";

type Quote={
  currency:string;
  subtotalAmount:number;
  shippingAmount:number;
  taxAmount:number;
  dutyAmount:number;
  totalAmount:number;
  taxStatus:string;
  dutyStatus:string;
  shippingService:string;
  marketCode:string;
};

type PreparedCheckout={
  order:{id:string;number:string};
  quote:Quote;
  pricedLines:Array<{
    id:string;
    variantId:string;
    quantity:number;
    unitPriceAmount:number;
    currency:string;
    sku:string;
    productName:string;
    size:string;
    color:string;
  }>;
};

type PaymentSession={
  clientSecret:string;
  publishableKey:string|null;
  amount:number;
  currency:string;
};

type StripeError={message?:string};
type StripePaymentIntent={status?:string};
type StripeConfirmResult={error?:StripeError;paymentIntent?:StripePaymentIntent};
type StripeElement={
  mount:(selector:string)=>void;
  unmount:()=>void;
  on?:(event:string,handler:(event:unknown)=>void)=>void;
};
type StripeElements={
  create:(type:"payment"|"expressCheckout",options?:Record<string,unknown>)=>StripeElement;
  submit?:()=>Promise<{error?:StripeError}>;
};
type StripeInstance={
  elements:(options:Record<string,unknown>)=>StripeElements;
  confirmPayment:(options:{
    elements:StripeElements;
    confirmParams:{return_url:string};
    redirect:"if_required";
  })=>Promise<StripeConfirmResult>;
};
declare global{
  interface Window{
    Stripe?: (publishableKey:string)=>StripeInstance;
  }
}

let stripeScriptPromise:Promise<void>|null=null;
function loadStripeJs(){
  if(typeof window==="undefined")return Promise.reject(new Error("Stripe.js requires a browser."));
  if(window.Stripe)return Promise.resolve();
  if(stripeScriptPromise)return stripeScriptPromise;

  stripeScriptPromise=new Promise((resolve,reject)=>{
    const existing=document.querySelector<HTMLScriptElement>('script[src="https://js.stripe.com/v3/"]');
    if(existing){
      existing.addEventListener("load",()=>resolve(),{once:true});
      existing.addEventListener("error",()=>reject(new Error("Unable to load secure payment fields.")),{once:true});
      return;
    }
    const script=document.createElement("script");
    script.src="https://js.stripe.com/v3/";
    script.async=true;
    script.onload=()=>resolve();
    script.onerror=()=>reject(new Error("Unable to load secure payment fields."));
    document.head.appendChild(script);
  });
  return stripeScriptPromise;
}

function money(amount:number,currency:string){
  return new Intl.NumberFormat("en-US",{
    style:"currency",
    currency,
  }).format(amount/100);
}

function StripePaymentPanel({
  session,
  orderId,
  onComplete,
}:{session:PaymentSession;orderId:string;onComplete:()=>void}){
  const elementsRef=useRef<StripeElements|null>(null);
  const stripeRef=useRef<StripeInstance|null>(null);
  const mountedRef=useRef<StripeElement[]>([]);
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;

    async function mount(){
      if(!session.publishableKey){
        setError("Payment publishable key is not configured.");
        return;
      }

      try{
        await loadStripeJs();
        if(!active||!window.Stripe)return;
        const stripe=window.Stripe(session.publishableKey);
        const elements=stripe.elements({
          clientSecret:session.clientSecret,
          appearance:{
            theme:"stripe",
            variables:{
              colorPrimary:"#090909",
              colorBackground:"#f4f3ef",
              colorText:"#090909",
              colorDanger:"#8a1e1e",
              borderRadius:"0px",
              fontFamily:"Helvetica Neue, Helvetica, Arial, sans-serif",
              spacingUnit:"4px",
            },
            rules:{
              ".Input":{boxShadow:"none",border:"1px solid #c9c8c3"},
              ".Input:focus":{boxShadow:"none",border:"1px solid #090909"},
              ".Tab":{boxShadow:"none",border:"1px solid #c9c8c3"},
              ".Tab--selected":{boxShadow:"none",border:"1px solid #090909"},
            },
          },
        });

        const express=elements.create("expressCheckout");
        express.mount("#tw-express-checkout");
        mountedRef.current.push(express);

        const payment=elements.create("payment",{
          layout:{type:"accordion",defaultCollapsed:false,radios:true,spacedAccordionItems:false},
        });
        payment.mount("#tw-payment-element");
        mountedRef.current.push(payment);

        const finish=async()=>{
          setBusy(true);
          setError("");
          const submitted=elements.submit?await elements.submit():{};
          if(submitted.error){
            setError(submitted.error.message??"Check your payment details.");
            setBusy(false);
            return;
          }
          const result=await stripe.confirmPayment({
            elements,
            confirmParams:{
              return_url:window.location.origin+"/order/confirmation?order="+encodeURIComponent(orderId),
            },
            redirect:"if_required",
          });
          if(result.error){
            setError(result.error.message??"Payment could not be completed.");
            setBusy(false);
            return;
          }
          if(["succeeded","processing","requires_capture"].includes(result.paymentIntent?.status??"")){
            onComplete();
            return;
          }
          setBusy(false);
        };

        express.on?.("confirm",()=>{void finish();});
        stripeRef.current=stripe;
        elementsRef.current=elements;
        if(active)setReady(true);
      }catch(err){
        if(active)setError(err instanceof Error?err.message:"Unable to initialize payment.");
      }
    }

    void mount();
    return ()=>{
      active=false;
      for(const element of mountedRef.current){
        try{element.unmount();}catch{}
      }
      mountedRef.current=[];
      elementsRef.current=null;
      stripeRef.current=null;
    };
  },[session,orderId,onComplete]);

  async function pay(){
    const stripe=stripeRef.current;
    const elements=elementsRef.current;
    if(!stripe||!elements)return;

    setBusy(true);
    setError("");
    const submitted=elements.submit?await elements.submit():{};
    if(submitted.error){
      setError(submitted.error.message??"Check your payment details.");
      setBusy(false);
      return;
    }

    const result=await stripe.confirmPayment({
      elements,
      confirmParams:{
        return_url:window.location.origin+"/order/confirmation?order="+encodeURIComponent(orderId),
      },
      redirect:"if_required",
    });

    if(result.error){
      setError(result.error.message??"Payment could not be completed.");
      setBusy(false);
      return;
    }

    if(["succeeded","processing","requires_capture"].includes(result.paymentIntent?.status??"")){
      onComplete();
      return;
    }
    setBusy(false);
  }

  return (
    <div className="secure-payment">
      <div id="tw-express-checkout" className="express-payment"/>
      <div className="payment-divider"><span>OR PAY ANOTHER WAY</span></div>
      <div id="tw-payment-element" className="stripe-payment-element"/>
      {error&&<p className="checkout-error">{error}</p>}
      <button className="primary-button" type="button" disabled={!ready||busy} onClick={()=>void pay()}>
        {busy?"PROCESSING…":"PAY "+money(session.amount,session.currency)}
      </button>
      <p className="secure-note">PAYMENT DETAILS ARE TOKENIZED BY THE PAYMENT PROVIDER AND NEVER STORED BY 3RD WORLD.</p>
    </div>
  );
}

export function CheckoutExperience(){
  const cart=useCart();
  const [step,setStep]=useState<"details"|"payment"|"complete">("details");
  const [prepared,setPrepared]=useState<PreparedCheckout|null>(null);
  const [paymentSession,setPaymentSession]=useState<PaymentSession|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  const displaySubtotal=Math.round(cart.subtotal*100);
  const summaryCurrency=prepared?.quote.currency??"USD";
  const quote=prepared?.quote;

  const cartPayload=useMemo(
    ()=>cart.lines.map(line=>({
      slug:line.product.slug,
      size:line.size,
      quantity:line.quantity,
    })),
    [cart.lines],
  );

  async function submitDetails(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!cartPayload.length){
      setError("Your bag is empty.");
      return;
    }

    setBusy(true);
    setError("");
    const form=new FormData(event.currentTarget);
    const firstName=String(form.get("firstName")??"").trim();
    const lastName=String(form.get("lastName")??"").trim();
    const country=String(form.get("country")??"US").toUpperCase();
    const email=String(form.get("email")??"").trim();

    const shippingAddress={
      name:(firstName+" "+lastName).trim(),
      line1:String(form.get("line1")??"").trim(),
      line2:String(form.get("line2")??"").trim()||undefined,
      city:String(form.get("city")??"").trim(),
      state:String(form.get("state")??"").trim()||undefined,
      postalCode:String(form.get("postalCode")??"").trim(),
      country,
      phone:String(form.get("phone")??"").trim()||undefined,
      email,
    };

    try{
      const preparedResponse=await fetch("/api/commerce/checkout/prepare",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          email,
          countryCode:country,
          lines:cartPayload,
          shippingAddress,
        }),
      });
      const preparedPayload=await preparedResponse.json();
      if(!preparedResponse.ok)throw new Error(preparedPayload.error??"Unable to prepare checkout.");

      const nextPrepared=preparedPayload.data as PreparedCheckout;
      setPrepared(nextPrepared);

      const paymentResponse=await fetch("/api/commerce/payments/session",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({orderId:nextPrepared.order.id}),
      });
      const paymentPayload=await paymentResponse.json();
      if(!paymentResponse.ok){
        await fetch("/api/commerce/checkout/cancel",{
          method:"POST",
          headers:{"content-type":"application/json"},
          body:JSON.stringify({orderId:nextPrepared.order.id}),
        }).catch(()=>undefined);
        setPrepared(null);
        throw new Error(paymentPayload.error??"Unable to start secure payment.");
      }

      setPaymentSession(paymentPayload.data as PaymentSession);
      setStep("payment");
    }catch(err){
      setError(err instanceof Error?err.message:"Checkout could not be prepared.");
    }finally{
      setBusy(false);
    }
  }

  function complete(){
    cart.clear();
    setStep("complete");
  }

  async function editDetails(){
    const orderId=prepared?.order.id;
    if(orderId){
      await fetch("/api/commerce/checkout/cancel",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({orderId}),
      }).catch(()=>undefined);
    }
    setPaymentSession(null);
    setPrepared(null);
    setStep("details");
  }

  if(step==="complete"){
    return (
      <main className="checkout-complete">
        <span>3RD WORLD</span>
        <h1>YOU&apos;RE IN.</h1>
        <p>PAYMENT RECEIVED. YOUR ORDER IS BEING VERIFIED AND PREPARED.</p>
        <Link href="/passport" className="underlined-link">OPEN PASSPORT</Link>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <section className="checkout-form">
        <div className="checkout-brand">3RD WORLD</div>
        <h1>CHECKOUT</h1>

        {step==="details"&&(
          <form onSubmit={submitDetails}>
            <label>
              <span>CONTACT</span>
              <input name="email" type="email" autoComplete="email" placeholder="EMAIL ADDRESS" required/>
            </label>

            <fieldset>
              <legend>DELIVERY</legend>
              <div className="field-grid">
                <input name="firstName" autoComplete="given-name" placeholder="FIRST NAME" required/>
                <input name="lastName" autoComplete="family-name" placeholder="LAST NAME" required/>
                <input name="line1" className="full" autoComplete="address-line1" placeholder="ADDRESS" required/>
                <input name="line2" className="full" autoComplete="address-line2" placeholder="APT / SUITE"/>
                <input name="city" autoComplete="address-level2" placeholder="CITY" required/>
                <input name="state" autoComplete="address-level1" placeholder="STATE / REGION"/>
                <input name="postalCode" autoComplete="postal-code" placeholder="POSTAL CODE" required/>
                <select name="country" className="checkout-select" autoComplete="country" defaultValue="US" required>
                  <option value="US">UNITED STATES</option>
                  <option value="CA">CANADA</option>
                  <option value="GB">UNITED KINGDOM</option>
                  <option value="FR">FRANCE</option>
                  <option value="DE">GERMANY</option>
                  <option value="IT">ITALY</option>
                  <option value="ES">SPAIN</option>
                  <option value="NL">NETHERLANDS</option>
                  <option value="BE">BELGIUM</option>
                  <option value="IE">IRELAND</option>
                  <option value="AE">UNITED ARAB EMIRATES</option>
                  <option value="AU">AUSTRALIA</option>
                </select>
                <input name="phone" className="full" autoComplete="tel" placeholder="PHONE"/>
              </div>
            </fieldset>

            {error&&<p className="checkout-error">{error}</p>}
            <button className="primary-button" disabled={busy||cart.lines.length===0}>
              {busy?"RESERVING YOUR PIECES…":"CONTINUE TO PAYMENT"}
            </button>
          </form>
        )}

        {step==="payment"&&paymentSession&&prepared&&(
          <fieldset>
            <legend>PAYMENT</legend>
            <div className="payment-order-ref">
              <span>{prepared.order.number}</span>
              <button type="button" onClick={()=>void editDetails()}>EDIT DETAILS</button>
            </div>
            <StripePaymentPanel
              session={paymentSession}
              orderId={prepared.order.id}
              onComplete={complete}
            />
          </fieldset>
        )}
      </section>

      <aside className="checkout-summary">
        <h2>ORDER</h2>
        {cart.lines.length===0
          ? <p className="muted">NO ITEMS YET.</p>
          : prepared?.pricedLines?.length
            ? prepared.pricedLines.map(line=>(
              <div className="checkout-line" key={line.id}>
                <span>{line.productName}<small>{line.size} × {line.quantity}</small></span>
                <strong>{money(line.unitPriceAmount*line.quantity,line.currency)}</strong>
              </div>
            ))
            : cart.lines.map(line=>(
              <div className="checkout-line" key={line.product.slug+"-"+line.size}>
                <span>{line.product.name}<small>{line.size} × {line.quantity}</small></span>
                <strong>{money(Math.round(line.product.price*line.quantity*100),"USD")}</strong>
              </div>
            ))
        }

        <div className="checkout-total checkout-breakdown">
          <span>SUBTOTAL</span>
          <strong>{money(quote?.subtotalAmount??displaySubtotal,summaryCurrency)}</strong>
        </div>
        {quote&&<>
          <div className="checkout-breakdown"><span>{quote.shippingService||"SHIPPING"}</span><strong>{quote.shippingAmount===0?"FREE":money(quote.shippingAmount,summaryCurrency)}</strong></div>
          <div className="checkout-breakdown"><span>TAX</span><strong>{quote.taxStatus==="NOT_CONFIGURED"?"—":money(quote.taxAmount,summaryCurrency)}</strong></div>
          <div className="checkout-breakdown"><span>DUTIES</span><strong>{quote.dutyStatus==="NOT_CONFIGURED"?"—":money(quote.dutyAmount,summaryCurrency)}</strong></div>
          <div className="checkout-grand-total"><span>TOTAL</span><strong>{money(quote.totalAmount,summaryCurrency)}</strong></div>
        </>}
      </aside>
    </main>
  );
}
