"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, ShoppingBag, Menu, X } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 space-x-reverse">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Novixa</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8 space-x-reverse">
            <Link
              href="/"
              className="text-gray-700 hover:text-primary transition-colors"
            >
              الرئيسية
            </Link>
            <Link
              href="#categories"
              className="text-gray-700 hover:text-primary transition-colors"
            >
              الفئات
            </Link>
            <Link
              href="#how-it-works"
              className="text-gray-700 hover:text-primary transition-colors"
            >
              كيف يعمل
            </Link>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center space-x-4 space-x-reverse">
            <button className="p-2 text-gray-700 hover:text-primary transition-colors">
              <ShoppingBag className="w-5 h-5" />
            </button>
            <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
              تسجيل الدخول
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="px-4 pt-2 pb-4 space-y-2">
            <Link
              href="/"
              className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
            >
              الرئيسية
            </Link>
            <Link
              href="#categories"
              className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
            >
              الفئات
            </Link>
            <Link
              href="#how-it-works"
              className="block px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
            >
              كيف يعمل
            </Link>
            <button className="w-full text-right px-3 py-2 text-primary font-medium">
              تسجيل الدخول
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
