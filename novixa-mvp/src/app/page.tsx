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
import { Product, CartItem } from "@/types";
import { searchProducts } from "@/lib/data";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleSearch = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setQuery(searchQuery);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const results = searchProducts(searchQuery);
    setProducts(results);
    setLoading(false);
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    setLoading(true);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const base64Data = base64.split(",")[1];

        // Call AI analysis API
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64Data }),
        });

        if (response.ok) {
          const data = await response.json();
          // Search with the analyzed query
          handleSearch(data.searchQuery || "منتجات مشابهة");
        } else {
          // Fallback: search with generic query
          handleSearch("منتجات");
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error analyzing image:", error);
      handleSearch("منتجات");
    }
  }, [handleSearch]);

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
                loading={loading}
                onSelectProduct={setSelectedProduct}
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
