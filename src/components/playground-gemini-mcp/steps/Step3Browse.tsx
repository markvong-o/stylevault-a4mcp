"use client";

import React from "react";
import type { GeminiMCPPlaygroundState, Product } from "@/hooks/useGeminiMCPPlaygroundState";
import { PlaygroundStepLayout } from "../../playground/PlaygroundStepLayout";
import { RequestResponsePanel } from "../../playground/RequestResponsePanel";

interface Props {
  state: GeminiMCPPlaygroundState;
  onSearchQueryChange: (query: string) => void;
  onSearch: () => void;
  onSelectProduct: (product: Product) => void;
  onQuantityChange: (quantity: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step3Browse({ state, onSearchQueryChange, onSearch, onSelectProduct, onQuantityChange, onNext, onBack }: Props) {
  const lastRequest = state.requests.productDetails || state.requests.catalog;

  return (
    <PlaygroundStepLayout
      title="Step 3: Browse Catalog"
      subtitle="Call ucp_catalog_search and ucp_product_details tools to browse the merchant's products via MCP."
      rightPanel={
        <RequestResponsePanel
          label="Catalog"
          request={lastRequest}
          loading={state.loading && !state.products.length && !state.productDetails}
        />
      }
      footer={
        <>
          <button
            onClick={onBack}
            className="text-xs text-foreground/40 hover:text-foreground/60 transition-colors cursor-pointer"
          >
            Back
          </button>
          <button
            onClick={onNext}
            disabled={!state.selectedProduct}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Next: Checkout
          </button>
        </>
      }
    >
      {state.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/[0.06] border border-red-500/20 text-sm text-red-600">
          {state.error}
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={state.searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          placeholder="Search products..."
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-foreground/[0.08] bg-white focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
        />
        <button
          onClick={onSearch}
          disabled={state.loading}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {state.loading && !state.products.length ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Product grid */}
      {state.products.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-foreground/30">{state.products.length} product(s) found via ucp_catalog_search</p>
          <div className="grid grid-cols-2 gap-3">
            {state.products.map((product) => {
              const isSelected = state.selectedProduct?.id === product.id;
              return (
                <button
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary/30 bg-primary/[0.04] ring-1 ring-primary/15"
                      : "border-foreground/[0.06] hover:border-foreground/[0.12] bg-white"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground/70">{product.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-sm font-semibold text-foreground/80">${product.price}</span>
                    <span className="text-[10px] text-foreground/30">{product.category}</span>
                  </div>
                  {product.in_stock ? (
                    <span className="text-[10px] text-emerald-600">In Stock</span>
                  ) : (
                    <span className="text-[10px] text-red-500">Out of Stock</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected product details */}
      {state.productDetails && state.selectedProduct && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/[0.02] p-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-foreground/70">Selected Product</h3>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-primary/[0.08] text-primary border border-primary/15">
              via ucp_product_details
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Name</p>
              <p className="text-sm text-foreground/60">{state.productDetails.name}</p>
            </div>
            <div>
              <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Price</p>
              <p className="text-sm font-semibold text-foreground/70">${state.productDetails.price}</p>
            </div>
            <div>
              <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Rating</p>
              <p className="text-sm text-foreground/60">{state.productDetails.rating}/5 ({state.productDetails.reviews} reviews)</p>
            </div>
            <div>
              <p className="text-[10px] text-foreground/30 uppercase tracking-wider mb-0.5">Quantity</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onQuantityChange(Math.max(1, state.quantity - 1))}
                  className="w-6 h-6 rounded border border-foreground/[0.1] text-xs flex items-center justify-center hover:bg-foreground/[0.03] cursor-pointer"
                >
                  -
                </button>
                <span className="text-sm font-mono w-6 text-center">{state.quantity}</span>
                <button
                  onClick={() => onQuantityChange(state.quantity + 1)}
                  className="w-6 h-6 rounded border border-foreground/[0.1] text-xs flex items-center justify-center hover:bg-foreground/[0.03] cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-foreground/40 mt-2">{state.productDetails.description}</p>
          {state.productDetails.price * state.quantity > 250 && (
            <div className="mt-2 px-2 py-1.5 rounded bg-amber-500/[0.06] border border-amber-500/20">
              <p className="text-[11px] text-amber-600">
                Total ${(state.productDetails.price * state.quantity).toFixed(2)} exceeds $250 agent limit. Checkout will require buyer escalation via Auth0 CIBA.
              </p>
            </div>
          )}
        </div>
      )}
    </PlaygroundStepLayout>
  );
}
