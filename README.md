<p align="center">
  <img src="https://img.shields.io/badge/VatiKart-Customer%20View-8B5CF6?style=for-the-badge&logo=react&logoColor=white" alt="VatiKart Customer View" />
</p>

# 🛍️ VatiKart — Customer View (Storefront)

A beautiful, customer-facing **storefront web app** that lets customers browse merchant catalogues, add products to cart, and place orders with WhatsApp confirmation. Built with **React 19** and **Vite**, deployed on **Firebase Hosting**.

---

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Components](#-components)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
- [Scripts](#-scripts)

---

## 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| **React 19** | UI Framework |
| **Vite 8** | Build tool & dev server |
| **Lucide React** | Icon library |
| **Firebase Hosting** | Production deployment |
| **Google Fonts** | Outfit + Plus Jakarta Sans typography |

---

## ✨ Features

### 📦 Dynamic Catalogue Loading
- Catalogues loaded from backend API via URL path (`/c/{id}` or `/catalogue/{id}`)
- Images served from `cdn.vatikart.in`
- Graceful fallback with error messages if API is unavailable

### 🔐 Private Catalogue Access
- Private catalogues show an **Access Request** form (name + phone)
- Auto-polls every 5 seconds for owner approval
- Automatically loads catalogue once access is granted

### 🔍 Advanced Product Filtering
- **Live search** across product name, description, and category
- **Category filter** — dynamic categories from product data
- **Size filter** — multi-select pills (S, M, L, XL, XXL, One Size)
- **Color filter** — visual color swatches with hex previews
- **Price range** — slider with dynamic ceiling
- **Sorting** — Popularity, Price Low→High, Price High→Low, Rating
- **URL sync** — all filter states sync to URL query params (shareable filtered views)

### 🛒 Shopping Cart
- Persistent cart stored in `localStorage`
- Slide-in drawer with quantity controls
- Duplicate detection by product + size + color + options
- Cart badge count in header
- **Quick Add** — one-click add with default variant selection

### 💳 Full Checkout Flow
- Order summary with item images, variants, per-item pricing
- Per-item custom comments/notes
- **Coupon system** — supports `WELCOME10` (10% off), `AURA20` (20% off)
- **Delivery details** — name, phone, address with validation
- **Pricing breakdown** — subtotal, savings, coupon discount, 5% GST, total

### 📲 WhatsApp Order Confirmation
- Orders saved to database via API
- Opens WhatsApp with pre-formatted order message to the merchant
- Includes customer details, itemized order with variants, and pricing

### 🧾 Invoice/Receipt
- Printable invoice modal after order confirmation
- Contains order ID, customer info, items, pricing, date
- Cart auto-clears after closing

### 🎨 Dark/Light Theme
- Toggle in header (Sun/Moon icons)
- Theme persisted to `localStorage`
- Beautiful glassmorphism design with custom scrollbars
- Smooth CSS animations (fadeIn, slideUp, slideInRight, scaleIn)

### 📱 Responsive Design
- 3-column → 2-column → 1-column grid
- Sidebar collapses on mobile (≤992px)
- Max container width: 1280px

---

## 🧩 Components

| Component | Description |
|---|---|
| `App.jsx` | Main application — catalogue loading, state management |
| `Header.jsx` | Top bar with search, theme toggle, cart badge |
| `FilterSidebar.jsx` | Category, size, color, price range filters |
| `ProductCard.jsx` | Product grid card with quick-add button |
| `ProductDrawer.jsx` | Slide-in product detail panel with variants |
| `CartDrawer.jsx` | Slide-in shopping cart with quantity controls |
| `CheckoutView.jsx` | Full checkout page with delivery form & coupons |
| `MockInvoiceModal.jsx` | Printable order receipt/invoice |

---

## 🏗 Project Structure

```
customerview/
├── src/
│   ├── App.jsx               # Main app with catalogue loading
│   ├── App.css               # Component-specific styles
│   ├── index.css             # Design system & theme variables
│   ├── main.jsx              # Vite entry point
│   ├── components/           # All UI components
│   ├── data/
│   │   └── products.js       # Fallback product data
│   └── services/
│       └── storeApi.js       # API integration layer
├── firebase.json             # Firebase Hosting config
├── .env.example              # Environment template
├── vite.config.js
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18

### Installation

```bash
# Navigate to customer view
cd VatiKart/customerview

# Install dependencies
npm install

# Start development server
npm run dev
```

The dev server starts at `http://localhost:5174`.

### Accessing a Catalogue
Open the app with a catalogue ID in the URL:
```
http://localhost:5174/c/1
http://localhost:5174/catalogue/1
http://localhost:5174/?catalogue=1
```

### Deployment (Firebase)
```bash
npm run build
firebase deploy
```

---

## 🔑 Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API URL | `https://api.vatikart.in` |

---

## 🌐 API Endpoints Used

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/catalogue/public/{id}/products` | Fetch public catalogue products |
| `POST` | `/catalogue/public/{id}/request-access` | Request access to private catalogue |
| `POST` | `/order/public/book` | Place a new order |

### Authentication
- Optional Bearer token via URL param `?token=` or `localStorage`
- Customer phone sent via `customer-phone` header for access control
- **No login required** for public catalogues

---

## 📜 Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start Vite dev server |
| `build` | `npm run build` | Production build |
| `preview` | `npm run preview` | Preview production build |
| `lint` | `npm run lint` | Run ESLint |

---

<p align="center">
  Built with ❤️ for <strong>VatiKart</strong>
</p>
