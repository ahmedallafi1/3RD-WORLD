export type Product = {
  slug: string;
  name: string;
  price: number;
  color: string;
  world: string;
  tone: "black" | "bone" | "burgundy" | "grey";
  description: string;
  details: string[];
  sizes: string[];
};

export const products: Product[] = [
  {
    slug: "world-zip-black",
    name: "WORLD ZIP",
    price: 145,
    color: "BLACK",
    world: "WORLD 001",
    tone: "black",
    description: "Heavyweight zip hoodie with a restrained 3RD WORLD identity.",
    details: ["HEAVYWEIGHT COTTON", "RELAXED FIT", "METAL ZIP", "GLOBE MARK"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  },
  {
    slug: "globe-tee-bone",
    name: "GLOBE TEE",
    price: 65,
    color: "BONE",
    world: "WORLD 001",
    tone: "bone",
    description: "Dense cotton jersey tee with the 3RD WORLD globe system.",
    details: ["HEAVY JERSEY", "BOX FIT", "SCREEN PRINT", "UNISEX"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  },
  {
    slug: "heavyweight-hoodie-burgundy",
    name: "HEAVYWEIGHT HOODIE",
    price: 160,
    color: "BURGUNDY",
    world: "WORLD 001",
    tone: "burgundy",
    description: "Oversized pullover designed as a core piece of WORLD 001.",
    details: ["HEAVYWEIGHT FLEECE", "OVERSIZED FIT", "RIBBED FINISH", "GLOBE MARK"],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  },
  {
    slug: "world-cap-black",
    name: "WORLD CAP",
    price: 55,
    color: "BLACK",
    world: "WORLD 001",
    tone: "grey",
    description: "Low-profile cap with minimal globe embroidery.",
    details: ["COTTON TWILL", "ADJUSTABLE BACK", "EMBROIDERED MARK", "ONE SIZE"],
    sizes: ["ONE SIZE"],
  },
];

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}

export function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
