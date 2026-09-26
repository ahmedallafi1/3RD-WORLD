export type Product={
  slug:string;
  name:string;
  world:string;
  price:number;
  color:string;
  category:"TOPS"|"OUTERWEAR"|"BOTTOMS"|"ACCESSORIES";
  sizes:string[];
  description:string;
  material:string;
  fit:string;
  tone:"burgundy"|"black"|"bone"|"navy"|"grey";
  status?:"AVAILABLE"|"SOLD OUT"|"COMING SOON";
};

export type CartLine={product:Product;size:string;quantity:number};

export const products:Product[]=[
  {slug:"world-zip",name:"WORLD ZIP",world:"WORLD 001",price:145,color:"BURGUNDY",category:"OUTERWEAR",sizes:["XS","S","M","L","XL","XXL"],description:"Heavyweight full-zip hoodie built as a core 3RD WORLD uniform piece.",material:"Heavyweight cotton fleece",fit:"Relaxed, slightly oversized",tone:"burgundy"},
  {slug:"globe-tee",name:"GLOBE TEE",world:"WORLD 001",price:68,color:"WASHED BLACK",category:"TOPS",sizes:["S","M","L","XL","XXL"],description:"Washed heavyweight tee with the 3RD WORLD globe identity.",material:"Heavyweight cotton jersey",fit:"Boxy",tone:"black"},
  {slug:"world-hoodie",name:"WORLD HOODIE",world:"WORLD 001",price:132,color:"BONE",category:"OUTERWEAR",sizes:["XS","S","M","L","XL"],description:"Pullover hoodie designed around a clean front and globe-led back graphic.",material:"Heavyweight cotton fleece",fit:"Relaxed",tone:"bone"},
  {slug:"globe-cap",name:"GLOBE CAP",world:"WORLD 001",price:52,color:"BLACK",category:"ACCESSORIES",sizes:["OS"],description:"Low-profile cap carrying the globe mark.",material:"Cotton twill",fit:"Adjustable",tone:"black"},
  {slug:"world-sweatpant",name:"WORLD SWEATPANT",world:"WORLD 001",price:118,color:"BURGUNDY",category:"BOTTOMS",sizes:["XS","S","M","L","XL","XXL"],description:"Heavyweight sweatpant cut to match the WORLD ZIP.",material:"Heavyweight cotton fleece",fit:"Relaxed straight leg",tone:"burgundy"},
  {slug:"3rd-world-tee",name:"3RD WORLD TEE",world:"WORLD 001",price:72,color:"BONE",category:"TOPS",sizes:["S","M","L","XL","XXL"],description:"Clean front mark with a larger globe treatment on the back.",material:"Heavyweight cotton jersey",fit:"Boxy",tone:"bone"},
  {slug:"world-track-pant",name:"WORLD TRACK PANT",world:"WORLD 001",price:124,color:"NAVY",category:"BOTTOMS",sizes:["XS","S","M","L","XL"],description:"Technical track pant with restrained 3RD WORLD branding.",material:"Nylon shell",fit:"Relaxed",tone:"navy"},
  {slug:"globe-beanie",name:"GLOBE BEANIE",world:"WORLD 001",price:48,color:"GREY",category:"ACCESSORIES",sizes:["OS"],description:"Rib knit beanie with the globe mark.",material:"Cotton knit",fit:"One size",tone:"grey",status:"COMING SOON"}
];

export const categories=["ALL","OUTERWEAR","TOPS","BOTTOMS","ACCESSORIES"] as const;
export type Category=(typeof categories)[number];

export const getProduct=(slug:string)=>products.find(p=>p.slug===slug);
export const formatMoney=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(value);
