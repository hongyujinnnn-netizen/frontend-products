# ShopLite Frontend — Refactor & Redesign Task

You are working on a Next.js 16 + React 19 + TypeScript e-commerce frontend (`frontend-products` repo) that consumes a Spring Boot API. The codebase has working features but suffers from bloat, duplicated logic, and inconsistent UI. Your job is to fix the critical issues and apply a UI redesign.

**Tech stack constraints:**
- Next.js 16.1.4 (Pages Router, NOT App Router — do not migrate)
- React 19.2.3
- TypeScript 5
- Tailwind CSS v4 (already installed but barely used — see Phase 2)
- SWR for data fetching
- React Hook Form + Zod for validation
- No new dependencies unless absolutely necessary

**Working style:**
- Make changes incrementally, phase by phase
- After each phase, run `npm run build` and `npm run lint` to confirm nothing broke
- Preserve all existing functionality (auth, cart, checkout, admin, reviews, wishlist)
- Do NOT touch the backend API contract — only consume it

---

## PHASE 1 — Delete dead code & quick wins (do this first, low risk)

### 1.1 Remove production console logs
File: `services/api.ts`
Wrap the `console.log('[API]'...)` block on line 31 in `if (process.env.NODE_ENV === 'development')`, or remove entirely. Search the whole codebase for other stray `console.log` calls in `services/`, `hooks/`, `utils/`, `context/` and gate them the same way. Keep `console.error` for actual errors.

### 1.2 Clean up duplicate theme code in globals.css
File: `styles/globals.css` (top ~80 lines)
The selectors `:root[data-theme='light']` and `:root[data-theme='dark']` set IDENTICAL values, and `@media (prefers-color-scheme: dark)` also forces light values. This is dead theming. Action:
- Delete the `:root[data-theme='light']` block entirely (redundant with `:root`)
- Delete the `:root[data-theme='dark']` block entirely
- Delete the `@media (prefers-color-scheme: dark)` block
- Keep only the base `:root` block

### 1.3 Remove the forced theme write in Navbar
File: `components/Navbar.tsx` (around line 22-26)
Delete this `useEffect`:
```tsx
useEffect(() => {
  if (!isClient) return;
  document.documentElement.setAttribute('data-theme', 'light');
  window.localStorage.setItem('theme', 'light');
}, [isClient]);
```
It's writing 'light' on every mount for no reason now that themes are unified.

### 1.4 Remove the hard reload after login
File: `components/Navbar.tsx` (around line 28-41)
Delete the `useEffect` that calls `window.location.reload()` 100ms after auth state change. The auth state from `useAuth()` is already reactive — components re-render automatically. If something specific isn't updating, fix THAT bug instead. Also remove the `prevAuthState` state and its setter, since they only existed for this hack.

### 1.5 Move documentation files to /docs
Move all root-level `.md` files EXCEPT `README.md` into a new `/docs` folder:
- `ADD_TO_CART_FIX.md`, `ADMIN_UI_CHECKLIST.md`, `ADMIN_UI_IMPROVEMENTS.md`, `ADMIN_UI_VISUAL_REFERENCE.md`, `CART_BADGE_NOTIFICATIONS.md`, `CART_CHECKOUT_IMPLEMENTATION.md`, `CHECKOUT_INTEGRATION.md`, `DASHBOARD_API_INTEGRATION.md`, `IMPLEMENTATION_COMPLETE.md`, `IMPLEMENTATION_REFERENCE.md`, `IMPROVEMENTS.md`, `MVP_CART_CHECKOUT_COMPLETE.md`, `PHASE2_CHECKLIST.md`, `QUICK_START_CART_CHECKOUT.md`, `USAGE_GUIDE.md`

### 1.6 Add an ErrorBoundary
Create `components/ErrorBoundary.tsx` — a class component that catches errors in its subtree and renders a friendly fallback UI ("Something went wrong. Refresh to try again."). Wrap `<Component {...pageProps} />` in `pages/_app.tsx` with it.

### 1.7 Add a local fallback image
The placeholder `https://via.placeholder.com/480x320?text=Product` in `components/ProductCard.tsx` is unreliable. Create `public/product-placeholder.svg` — a simple SVG with a subtle gray background and a centered icon (use a basic camera or box outline). Update ProductCard to use `/product-placeholder.svg` as the fallback.

### 1.8 Centralize currency formatting
Create `utils/format.ts`:
```ts
export const formatCurrency = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
```
Search the codebase for `$${...toFixed(2)}` and `$${price}` patterns and replace ALL of them with `formatCurrency(price)`. Files to check at minimum: `ProductCard.tsx`, `pages/cart.tsx`, `pages/checkout.tsx`, `pages/dashboard.tsx`, `pages/product/[id].tsx`, `pages/admin/index.tsx`.

**Run `npm run build` and `npm run lint` before moving on.**

---

## PHASE 2 — Deduplicate logic

### 2.1 Consolidate JWT decoding
Both `utils/auth.ts` and `context/AuthContext.tsx` implement their own `decodeJwtPayload` / `decodeToken` and role/identity extraction. Action:
- Keep the implementations in `utils/auth.ts` as the single source of truth
- Export `decodeJwtPayload`, `getRoleFromToken`, `getIdentityFromToken`, `isTokenExpired` from `utils/auth.ts`
- In `context/AuthContext.tsx`, delete the local `decodeToken`, `isTokenExpired`, `getRoleFromToken`, `getIdentityFromToken` functions and import them from `utils/auth.ts` instead
- Verify: only ONE `atob`-based JWT decoder remains in the codebase

### 2.2 Build a CartContext (mirror AuthContext pattern)
Currently `utils/cart.ts` reads/writes localStorage directly and dispatches a custom `cartUpdated` event that components manually listen to. Replace this with a proper Context.

Create `context/CartContext.tsx`:
- Export `CartProvider` and `useCart()` hook
- Internal state: `items: CartItem[]`
- Methods exposed: `addItem(product, quantity)`, `removeItem(productId)`, `updateQuantity(productId, quantity)`, `clear()`
- Computed values exposed: `itemCount`, `total`
- Persist to localStorage on every state change via a `useEffect`
- On mount, hydrate from localStorage (guarded for SSR — only read in `useEffect`, not during render, to avoid hydration mismatch)
- Listen to `storage` events for cross-tab sync

Update consumers:
- Wrap the app in `<CartProvider>` in `pages/_app.tsx` (inside `<AuthProvider>`)
- `components/ProductCard.tsx` → use `useCart().addItem` instead of importing `addToCart` from utils
- `pages/cart.tsx` → use `useCart()` for items, removeItem, updateQuantity, clear
- `hooks/useCartCount.ts` → can be deleted; replace with `useCart().itemCount`
- DELETE `utils/cart.ts` and the manual `cartUpdated` event plumbing

### 2.3 Standardize hooks on SWR
`useProducts` uses SWR cleanly. Make `useUsers` and `useOrders` follow the exact same pattern:
- Use `useSWR` for the GET request
- Expose `data`, `isLoading`, `error` from SWR
- For mutations, use `mutate()` to update the cache optimistically
- Remove any duplicate manual loading state where SWR's `isLoading` covers it

**Run `npm run build` and `npm run lint`.**

---

## PHASE 3 — Split monolithic files

### 3.1 Split pages/admin/index.tsx (1,985 lines)
Create folder `components/admin/` with these files (move corresponding logic out of `pages/admin/index.tsx`):
- `AdminLayout.tsx` — sidebar nav + main content area shell
- `DashboardTab.tsx` — stats cards, recent orders, low-stock alerts
- `ProductsTab.tsx` — product list, search/filter, bulk actions
- `ProductForm.tsx` — create/edit product form (already uses react-hook-form + zod)
- `OrdersTab.tsx` — orders list, search/filter, status updates
- `ReviewsTab.tsx` — review moderation
- (existing) `CustomerControlPanel.tsx` — already exists, leave it

After splitting, `pages/admin/index.tsx` should be under 200 lines and only handle:
- ProtectedRoute wrap
- Active tab state
- Rendering the AdminLayout with the active tab component

Each tab component receives only the props it needs. Do NOT prop-drill — use the existing hooks (`useProducts`, `useUsers`, `useOrders`) inside each tab.

### 3.2 Split components/Navbar.tsx (923 lines)
Create folder `components/navbar/`:
- `Navbar.tsx` — top-level component, scroll state, layout shell
- `NavbarSearch.tsx` — search input + submit logic
- `NavbarMenu.tsx` — mobile menu drawer
- `NavbarProfile.tsx` — user avatar dropdown / sign-in button

Replace the existing `components/Navbar.tsx` with a re-export from `components/navbar/Navbar.tsx` so existing imports still work.

### 3.3 Split pages/product/[id].tsx (833 lines)
Create folder `components/product/`:
- `ProductGallery.tsx` — image display
- `ProductInfo.tsx` — name, price, description, stock
- `ProductActions.tsx` — quantity selector, add-to-cart, wishlist
- `ProductReviews.tsx` — reviews list + submission form

`pages/product/[id].tsx` should orchestrate these and stay under 200 lines.

**Run `npm run build` and `npm run lint`. Manually click through admin, navbar, and product detail in dev mode to confirm nothing regressed.**

---

## PHASE 4 — UI redesign

### 4.1 Design tokens
In `styles/globals.css`, replace the existing `:root` color block with this exact set:
```css
:root {
  color-scheme: light;
  --color-bg: #FAFAF9;
  --color-surface: #FFFFFF;
  --color-surface-alt: #F3F4F6;
  --color-border: #E5E7EB;
  --color-border-strong: #D1D5DB;
  --color-text: #111827;
  --color-text-muted: #6B7280;
  --color-text-subtle: #9CA3AF;
  --color-primary: #111827;
  --color-primary-hover: #1F2937;
  --color-accent: #6366F1;
  --color-accent-hover: #4F46E5;
  --color-success: #059669;
  --color-warning: #F59E0B;
  --color-danger: #DC2626;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-pill: 999px;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 20px 40px rgba(0, 0, 0, 0.08);
  --max-width: 1200px;
}
```

Font: keep `Inter` as the body font. Add `letter-spacing: -0.01em` to all headings.

### 4.2 Redesign the homepage hero
File: `pages/index.tsx`
Replace the current single-column centered hero with a 55/45 two-column layout:

**Left column (`.hero-content`):**
- Small pill badge: indigo bg, "New collection — [current month]" with a colored dot
- H1: 38–44px, weight 500, tight line-height (1.1), letter-spacing -0.02em
- Two-line headline (e.g., "Curated essentials,<br/>thoughtfully made.")
- Subhead: 15px, muted color, max-width 380px
- Two buttons side-by-side: primary (dark filled) "Shop now" with arrow icon, secondary (white outlined) "Browse catalog"
- Trust signals row below buttons: 3 items with icons (truck = free shipping, shield = 30-day returns, headphones = 24/7 support), 12px text in `--color-text-subtle`

**Right column (`.hero-visual`):**
- Warm gradient background (amber/yellow tones)
- Centered featured product card floating with a slight rotation
- Small price tag overlay in bottom-right corner

On mobile (≤860px): stack to single column, visual on top with reduced height.

### 4.3 Redesign ProductCard
File: `components/ProductCard.tsx`
Match this structure exactly:
- Square image area (aspect-ratio: 1.1) with a subtle background tint based on category, or `--color-surface-alt` as fallback
- Top-left corner badge: ONE of `NEW`, `-X%`, `LOW`, `SALE` — pick the most relevant single signal, never stack
- Top-right corner: circular wishlist heart button (28×28, white bg, subtle border)
- Body: small uppercase category eyebrow (11px, tracking-wide, muted) → product name (14px, weight 500) → rating + review count row (star icon + "4.8 · 248 reviews" in 11px muted)
- Footer: price on left (16px, weight 500), circular `+` button on right (30×30, dark bg, white plus icon)
- If discounted: show original price struck-through next to current price
- Remove the dual stock signal (badge + "X in stock" text) — keep ONLY the badge for low stock; otherwise show no stock text on the card

The card itself: white bg, 0.5px border in `--color-border`, `--radius-md` corners, no shadow at rest, hover state lifts to `--shadow-md` and shifts up 2px (use `transform: translateY(-2px)` with `transition: 0.2s ease`).

### 4.4 Filter pills above product grid
On the homepage, replace the "Browse all" button next to the section title with a horizontal row of pill-style filter chips: `All` (active, dark bg), `New`, `Sale`, `Top rated`, `In stock`. Active pill: `--color-primary` bg with white text. Inactive: white bg, `--color-border` outline, muted text. These should filter the displayed products client-side based on tags/stock/price.

### 4.5 Replace fake testimonials
File: `pages/index.tsx`
The hardcoded `testimonials` array is fake (Sarah Johnson, Michael Chen, Emma Rodriguez are fabricated). Replace with one of these options:
- **Preferred:** Pull the 3 highest-rated approved reviews from the existing reviews API, show them as testimonials
- **Fallback:** Delete the testimonials section entirely

### 4.6 Add loading skeletons
Create `components/ProductCardSkeleton.tsx` — a static card with the same dimensions as ProductCard but with shimmering gray placeholder blocks for image, title, price (use a subtle `@keyframes shimmer` animation that translates a gradient across each block).

In `pages/index.tsx` and `pages/search.tsx`, when `loading` is true, render a grid of 6 `<ProductCardSkeleton />` instead of the "Loading products" empty state.

### 4.7 Add a newsletter band
Above the footer on the homepage: full-width dark band (`--color-primary` bg) with white text. Left side: small uppercase eyebrow ("JOIN THE CLUB"), 22px headline ("Get 10% off your first order"), small muted subhead. Right side: email input + "Subscribe" button. The form can be non-functional for now (just `e.preventDefault()` and show a success toast).

### 4.8 Polish empty states
Every empty/error state currently uses the same `.empty-state` div with plain text. Replace with a centered card containing:
- A 48px outline icon (use Lucide React or inline SVG)
- 16px medium-weight title
- 13px muted description
- Optional action button

Apply this to: empty cart, empty wishlist, no search results, no products.

**Run `npm run build` and `npm run lint`. Test responsiveness at 1440px, 860px, 480px.**

---

## PHASE 5 — Final cleanup

### 5.1 Audit globals.css
Open `styles/globals.css` (currently 4,293 lines). Find and delete any class that no longer has a matching `className=` reference in the codebase. Use this command to check usage of each class:
```bash
grep -r "class-name-here" --include="*.tsx" --include="*.ts" pages/ components/
```
Aim to reduce globals.css below 2,500 lines.

### 5.2 Verify all builds + types pass
- `npm run build` must succeed with zero errors
- `npm run lint` must pass with zero warnings
- TypeScript: zero `any` types in newly written code (existing `any` in legacy areas can stay for now)

### 5.3 Final manual smoke test
Walk through these flows in dev mode and confirm each works:
1. Browse homepage → click product → view detail page
2. Register a new user → log out → log back in
3. Add items to cart from product card AND product detail page
4. Open cart → update quantities → remove item → checkout
5. As admin: open `/admin`, switch between all tabs, create/edit/delete a product, change a user role, moderate a review
6. Search for a product, filter results
7. Add to wishlist, view wishlist page

---

## Out of scope (do NOT do these)
- Migrating to App Router
- Adding new features (don't add multi-currency, internationalization, payment integration, etc.)
- Migrating ALL custom CSS to Tailwind utilities (too risky in one pass — leave the existing utility-style classes alone, just don't add MORE custom CSS for new components in Phase 4; use Tailwind for those)
- Touching the backend
- Adding tests (separate task)
- Dark mode (defer until user explicitly requests)

## Definition of done
- All 5 phases complete
- `npm run build` and `npm run lint` pass cleanly
- No file in `pages/` or `components/` exceeds 400 lines
- `globals.css` under 2,500 lines
- Homepage matches the redesign description
- ProductCard matches the redesign description
- Cart logic flows through CartContext, not localStorage utilities
- One JWT decoder, one currency formatter, one source of truth for theme variables
- All flows in the smoke test pass

Start with Phase 1. After each phase, summarize what you changed in 3–5 bullet points before moving to the next phase.
