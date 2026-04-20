"use client";

import React from "react";
import type { PlaygroundState, Product } from "@/hooks/usePlaygroundState";
import { PlaygroundStepLayout } from "../PlaygroundStepLayout";
import { RequestResponsePanel } from "../RequestResponsePanel";
import { Auth0Placeholder } from "../Auth0Placeholder";

interface Props {
  state: PlaygroundState;
  onSearch: (query: string) => void;
  onSearchQueryChange: (query: string) => void;
  onSelectProduct: (product: Product) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step2Catalog({ state, onSearch, onSearchQueryChange, onSelectProduct, onNext, onBack }: Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(state.searchQuery);
  };

  return (
    <PlaygroundStepLayout
      title="Step 2: Browse Catalog"
      subtitle="Search the product catalog via the UCP catalog endpoint."
      rightPanel={
        <RequestResponsePanel
          label="Catalog Search"
          request={state.requests.catalog}
          loading={state.loading && !state.products.length}
        />
      }
      footer={
        <>
          <button
            onClick={onBack}
            className="px-4 py-2 rounded-lg text-sm font-medium text-foreground/50 hover:text-foreground/70 hover:bg-foreground/[0.03] border border-foreground/[0.08] transition-colors cursor-pointer"
          >
            Back
          </button>
          <div className="flex items-center gap-3">
            {state.selectedProduct && (
              <span className="text-xs text-foreground/40">
                Selected: <span className="font-medium text-foreground/60">{state.selectedProduct.name}</span>
              </span>
            )}
            <button
              onClick={onNext}
              disabled={!state.selectedProduct}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              Next: Create Checkout
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-4">
        {/* Search */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={state.searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search products..."
            className="flex-1 px-3 py-2 rounded-lg border border-foreground/[0.1] bg-white text-sm text-foreground/70 placeholder:text-foreground/25 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
          />
          <button
            type="submit"
            disabled={state.loading}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        {state.error && (
          <div className="p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-sm text-red-600">
            {state.error}
          </div>
        )}

        {/* Results */}
        {state.products.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-foreground/35">{state.products.length} product{state.products.length !== 1 ? "s" : ""} found</p>
            <div className="grid grid-cols-1 gap-2">
              {state.products.map((product) => {
                const isSelected = state.selectedProduct?.id === product.id;
                return (
                  <button
                    key={product.id}
                    onClick={() => onSelectProduct(product)}
                    className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary/40 bg-primary/[0.04] ring-1 ring-primary/20"
                        : "border-foreground/[0.06] hover:border-foreground/[0.12] bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground/75">{product.name}</span>
                      <span className="text-sm font-semibold font-mono text-foreground/60">${product.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-foreground/35">
                      <span className="capitalize">{product.category}</span>
                      <span>Rating: {product.rating}/5</span>
                      <span>{product.in_stock ? "In stock" : "Out of stock"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Auth0 integration point */}
        {state.selectedProduct && (
          <Auth0Placeholder
            title="User Authentication & Consent"
            description="In production, Auth0 handles user login (Universal Login with passkeys) and OAuth 2.1 consent before the agent can proceed with checkout on the user's behalf. The server currently runs in demo mode and accepts all requests."
          />
        )}
      </div>
    </PlaygroundStepLayout>
  );
}
