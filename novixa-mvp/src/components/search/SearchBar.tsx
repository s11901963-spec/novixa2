"use client";

import { useState, useRef } from "react";
import { Search, Upload, Camera, Loader2, X } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onImageUpload: (file: File) => void;
  loading?: boolean;
}

export default function SearchBar({
  onSearch,
  onImageUpload,
  loading = false,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        onImageUpload(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Image Preview */}
      {imagePreview && (
        <div className="mb-4 relative inline-block">
          <img
            src={imagePreview}
            alt="Product preview"
            className="w-32 h-32 object-cover rounded-xl border-2 border-primary/20 shadow-lg"
          />
          <button
            onClick={clearImage}
            className="absolute -top-2 -left-2 bg-error text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex flex-col sm:flex-row gap-3 bg-white rounded-2xl shadow-xl border border-gray-100 p-2">
          {/* Text Input */}
          <div className="flex-1 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن منتج... مثال: شاشة كمبيوتر 27 بوصة"
              className="w-full pr-12 pl-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none text-base"
              dir="rtl"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {/* Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-gray-700"
              title="رفع صورة"
            >
              <Upload className="w-5 h-5" />
              <span className="hidden sm:inline">صورة</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Camera Button */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-gray-700"
              title="التقاط صورة"
            >
              <Camera className="w-5 h-5" />
              <span className="hidden sm:inline">كاميرا</span>
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Search Button */}
            <button
              type="submit"
              disabled={loading || (!query.trim() && !imagePreview)}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-primary hover:bg-primary-dark disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl transition-colors text-white font-medium"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              <span>بحث</span>
            </button>
          </div>
        </div>
      </form>

      {/* Quick Suggestions */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {["شاشة كمبيوتر", "لابتوب ألعاب", "هاتف ذكي", "سماعات"].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSearch(suggestion)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-primary hover:text-primary transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
