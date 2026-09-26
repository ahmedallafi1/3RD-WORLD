"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Product } from "@/lib/catalog";

type BagItem = {
  product: Product;
  size: string;
  quantity: number;
};

type StorefrontContextValue = {
  menuOpen: boolean;
  bagOpen: boolean;
  bagItems: BagItem[];
  bagCount: number;
  setMenuOpen: (open: boolean) => void;
  setBagOpen: (open: boolean) => void;
  addToBag: (product: Product, size: string) => void;
  changeQuantity: (slug: string, size: string, delta: number) => void;
  removeFromBag: (slug: string, size: string) => void;
};

const StorefrontContext = createContext<StorefrontContextValue | null>(null);

const STORAGE_KEY = "third-world-bag";

export function StorefrontProvider({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [bagItems, setBagItems] = useState<BagItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let savedItems: BagItem[] = [];

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) savedItems = JSON.parse(saved);
    } catch {
      // Keep the storefront usable if local storage is unavailable.
    }

    const timer = window.setTimeout(() => {
      setBagItems(savedItems);
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bagItems));
    } catch {
      // Bag still works for the active session.
    }
  }, [bagItems, hydrated]);

  const addToBag = useCallback((product: Product, size: string) => {
    setBagItems((current) => {
      const index = current.findIndex(
        (item) => item.product.slug === product.slug && item.size === size,
      );
      if (index === -1) return [...current, { product, size, quantity: 1 }];

      return current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
    setBagOpen(true);
  }, []);

  const changeQuantity = useCallback(
    (slug: string, size: string, delta: number) => {
      setBagItems((current) =>
        current
          .map((item) =>
            item.product.slug === slug && item.size === size
              ? { ...item, quantity: Math.max(0, item.quantity + delta) }
              : item,
          )
          .filter((item) => item.quantity > 0),
      );
    },
    [],
  );

  const removeFromBag = useCallback((slug: string, size: string) => {
    setBagItems((current) =>
      current.filter(
        (item) => !(item.product.slug === slug && item.size === size),
      ),
    );
  }, []);

  const value = useMemo(
    () => ({
      menuOpen,
      bagOpen,
      bagItems,
      bagCount: bagItems.reduce((sum, item) => sum + item.quantity, 0),
      setMenuOpen,
      setBagOpen,
      addToBag,
      changeQuantity,
      removeFromBag,
    }),
    [
      menuOpen,
      bagOpen,
      bagItems,
      addToBag,
      changeQuantity,
      removeFromBag,
    ],
  );

  return (
    <StorefrontContext.Provider value={value}>
      {children}
    </StorefrontContext.Provider>
  );
}

export function useStorefront() {
  const context = useContext(StorefrontContext);
  if (!context) {
    throw new Error("useStorefront must be used inside StorefrontProvider");
  }
  return context;
}
