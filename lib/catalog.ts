export type Product={slug:string;name:string;world:string;price:number;color:string;category:"TOPS"|"OUTERWEAR"|"BOTTOMS"|"ACCESSORIES";sizes:string[];description:string;material:string;fit:string};
export type CartLine={product:Product;size:string;quantity:number};

export const products:Product[]=[
{slug:"world-zip",name:"WORLD ZIP",world:"WORLD 001",price:145,color:"BURGUNDY",category:"OUTERWEAR",sizes:["XS","S","M","L","XL","XXL"],description:"Heavyweight full-zip hoodie built as a core 3RD WORLD uniform piece.",material:"Heavyweight cotton fleece",fit:"Relaxed, slightly oversized"},
{slug:"globe-tee",name:"GLOBE TEE",world:"WORLD 001",price:68,color:"WASHED BLACK",category:"TOPS",sizes:["S","M","L","XL","XXL"],description:"Washed heavyweight tee with the 3RD WORLD globe identity.",material:"Heavyweight cotton jersey",fit:"Boxy"},
{slug:"world-hoodie",name:"WORLD HOODIE",world:"WORLD 001",price:132,color:"BONE",category:"OUTERWEAR",sizes:["XS","S","M","L","XL"],description:"Pullover hoodie designed around a clean front and globe-led back graphic.",material:"Heavyweight cotton fleece",fit:"Relaxed"},
{slug:"globe-cap",name:"GLOBE CAP",world:"WORLD 001",price:52,color:"BLACK",category:"ACCESSORIES",sizes:["OS"],description:"Low-profile cap carrying the globe mark.",material:"Cotton twill",fit:"Adjustable"}
];
export const getProduct=(slug:string)=>products.find(p=>p.slug===slug);
