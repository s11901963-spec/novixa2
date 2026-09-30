"use client";

import { useState, useCallback } from "react";
import Hero from "@/components/layout/Hero";
import Features from "@/components/layout/Features";
import HowItWorks from "@/components/layout/HowItWorks";
import Categories from "@/components/layout/Categories";
import SearchResults from "@/components/search/SearchResults";
import ProductModal from "@/components/product/ProductModal";
import Cart from "@/components/product/Cart";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Product, CartItem, SearchResponse } from "@/types";
import { blobToBase64, compressImageFile } from "@/lib/compress-image";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchResponse["mode"]>("demo");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const runSearch = useCallback(async (label: string, body: Record<string, string>) => {
    setLoading(true);
    setQuery(label);
    setError(null);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as Partial<SearchResponse> & { error?: string };
      setMode(data.mode ?? "live");
      setProducts(data.products ?? []);
      setError(data.error ?? (response.ok ? null : "فشل البحث"));
    } catch {
      setProducts([]);
      setError("تعذّر الاتصال بخادم الموقع.");
    } finally {
      setLoading(false);
    }
  }, []);

  // A pasted 1688/Taobao/Weidian link is parsed; anything else is a keyword.
  const handleSearch = useCallback(
    (searchQuery: string) =>
      /^https?:\/\//i.test(searchQuery)
        ? runSearch(searchQuery, { url: searchQuery })
        : runSearch(searchQuery, { keyword: searchQuery }),
    [runSearch]
  );

  const handleImageUpload = useCallback(
    async (file: File) => {
      try {
        const image = await blobToBase64(await compressImageFile(file));
        await runSearch("بحث بالصورة", { image_base64: image });
      } catch {
        setError("تعذّرت قراءة الصورة.");
      }
    },
    [runSearch]
  );

  // Live products get their full details (description, specs, MOQ) on open.
  const handleSelectProduct = async (product: Product) => {
    setSelectedProduct(product);
    if (product.source === "demo") return;
    try {
      const response = await fetch("/api/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: product.id, channel: product.source }),
      });
      if (!response.ok) return;
      const { product: detail } = (await response.json()) as { product: Product };
      setSelectedProduct((current) => (current?.id === product.id ? { ...product, ...detail } : current));
    } catch {
      // Keep the list-level data if details fail.
    }
  };

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSelectedProduct(null);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleCheckout = () => {
    alert("سيتم توجيهك إلى صفحة الدفع (تجريبي)");
    setCart([]);
    setIsCartOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        onCartClick={() => setIsCartOpen(true)}
      />

      <main className="flex-1">
        {/* Hero Section */}
        <Hero
          onSearch={handleSearch}
          onImageUpload={handleImageUpload}
          loading={loading}
        />

        {/* Search Results */}
        {(products.length > 0 || query) && (
          <section className="py-12 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <SearchResults
                products={products}
                query={query}
                mode={mode}
                error={error}
                loading={loading}
                onSelectProduct={handleSelectProduct}
              />
            </div>
          </section>
        )}

        {/* Features */}
        <Features />

        {/* How It Works */}
        <HowItWorks />

        {/* Categories */}
        <Categories />
      </main>

      <Footer />

      {/* Modals */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      {isCartOpen && (
        <Cart
          items={cart}
          onClose={() => setIsCartOpen(false)}
          onRemoveItem={handleRemoveFromCart}
          onCheckout={handleCheckout}
        />
      )}
    </div>
  );
}
