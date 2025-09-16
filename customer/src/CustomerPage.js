import React, { useEffect, useState } from "react";
import { API_URL } from "./shared/api";
import { downloadPdfInvoice } from "./shared/invoice"; // ✅ Only import this
import "./CustomerPage.css";

function normalizeNumberForWa(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}
function isTenDigits(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length === 10;
}

export default function CustomerPage() {
  const [products, setProducts] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [cart, setCart] = useState({});
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    address: "",
  });
  const [placing, setPlacing] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // ✅ New: loading state
  const [loading, setLoading] = useState(true);

  // fetch products + admins
  useEffect(() => {
    const cached = localStorage.getItem("fireworks_products");
    if (cached) {
      try {
        setProducts(JSON.parse(cached));
        setLoading(false);
      } catch {}
    }

    fetch(`${API_URL}?action=getProducts`)
      .then((r) => r.json())
      .then((data) => {
        let arr = [];
        if (Array.isArray(data)) arr = data;
        else if (data?.data && Array.isArray(data.data)) arr = data.data;
        else if (data?.products && Array.isArray(data.products)) arr = data.products;
        setProducts(arr);
        localStorage.setItem("fireworks_products", JSON.stringify(arr));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));

    fetch(`${API_URL}?action=getAdmins`)
      .then((r) => r.json())
      .then((data) => setAdmins(Array.isArray(data) ? data.map(String) : []))
      .catch(() => setAdmins([]));
  }, []);

  const categories = ["All", "Cart", ...Array.from(new Set(products.map((p) => p.category || "Uncategorized")))];

  let displayedProducts;
  if (selectedCategory === "Cart") displayedProducts = Object.values(cart);
  else if (selectedCategory === "All") displayedProducts = products;
  else displayedProducts = products.filter((p) => p.category === selectedCategory);

  function addToCart(p) {
    setCart((prev) => {
      const existing = prev[p.id] || { ...p, qty: 0 };
      return { ...prev, [p.id]: { ...existing, qty: existing.qty + 1 } };
    });
  }
  function updateQty(productId, newQty) {
    setCart((prev) => {
      if (newQty <= 0) {
        const { [productId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [productId]: { ...prev[productId], qty: newQty } };
    });
  }

  const subtotal = Object.values(cart).reduce(
    (s, it) => s + Number(it.qty || 0) * Number(it.ourPrice || it.price || 0),
    0
  );

  async function handlePlaceOrder() {
    if (subtotal < 2500) {
      return alert("⚠️ Minimum order value is ₹2500. Please add more items.");
    }
    if (!customer.name.trim()) return alert("Please enter name.");
    if (!isTenDigits(customer.phone)) return alert("Phone must be 10 digits.");
    if (!isTenDigits(customer.whatsapp)) return alert("WhatsApp must be 10 digits.");
    if (Object.keys(cart).length === 0) return alert("Cart is empty.");

    setPlacing(true);
    const itemsForServer = Object.values(cart).map((it) => ({
      id: it.id || "",
      item: it.item || "",
      subItem: it.subItem || "",
      category: it.category || "",
      qty: Number(it.qty || 0),
      price: Number(it.ourPrice || it.price || 0),
    }));

    const payload = { action: "placeOrder", customer, items: itemsForServer, subtotal: Number(subtotal || 0) };

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "payload=" + encodeURIComponent(JSON.stringify(payload)),
      });
      const data = await res.json();

      if (data?.success && data.orderId) {
        const order = {
          orderId: data.orderId,
          createdAt: new Date().toLocaleString(),
          customer,
          items: itemsForServer,
          subtotal,
        };

        // ✅ Generate + download invoice (this also uploads to backend)
        downloadPdfInvoice(order);

        setLastOrder(order);
        setCart({});
        setCustomer({ name: "", phone: "", whatsapp: "", address: "" });
      } else {
        alert("❌ Failed to place order: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("⚠️ Error placing order. Check console.");
      console.error(err);
    } finally {
      setPlacing(false);
    }
  }

  // success screen
  if (lastOrder) {
    return (
      <div className="page" style={{
        backgroundImage: "url('/images/BG.webp')", backgroundSize: "cover",
        backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundAttachment: "fixed"
      }}>
        <div className="success-box">
          <h2>✅ Order placed successfully!</h2>
          <p><b>Order ID:</b> {lastOrder.orderId}</p>
          <h3>Grand Total: ₹{lastOrder.subtotal.toFixed(2)}</h3>
          <p>
            📄 Invoice:{" "}
            <button onClick={() => downloadPdfInvoice(lastOrder)}>
              View Invoice
            </button>
          </p>
          <button onClick={() => setLastOrder(null)}>Back to catalog</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{
      backgroundImage: "url('/images/BG.webp')", backgroundSize: "cover",
      backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundAttachment: "fixed"
    }}>
      <h1 className="header">🎆 Diwali Fireworks Catalog 🎆</h1>

      {/* category tabs */}
      <div className="category-nav">
        <div className="categories">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            if (cat === "Cart") {
              const cartCount = Object.values(cart).reduce((s, it) => s + it.qty, 0);
              return (
                <button
                  key={cat}
                  className={`cat-tab cart-tab ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  🛒 Cart{cartCount > 0 ? ` (${cartCount})` : ""}
                </button>
              );
            }
            if (cat === "All") {
              return (
                <button
                  key={cat}
                  className={`cat-tab all-tab ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              );
            }
            return (
              <button
                key={cat}
                className={`cat-tab ${isActive ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div className="main">
        {/* products */}
        <div className="product-grid">
          {loading ? (
            <div className="product-card">⏳ Loading products...</div>
          ) : displayedProducts.length === 0 ? (
            <div className="product-card">No products found.</div>
          ) : (
            displayedProducts.map((p) => {
              const inCart = cart[p.id];
              const addedCount = inCart ? inCart.qty : 0;
              return (
                <div className="product-card" key={p.id}>
                  <h3>{p.item}{p.subItem ? <span className="sub"> — {p.subItem}</span> : null}</h3>
                  <p className="category-label">{p.category}</p>
                  <p className="price">
                    <span className="price-current">₹{Number(p.ourPrice).toFixed(2)}</span>
                    <span className="old-price">₹{Number(p.localPrice || 0).toFixed(2)}</span>
                  </p>
                  {addedCount === 0 ? (
                    <button className="add-btn" onClick={() => addToCart(p)}>Add</button>
                  ) : (
                    <div className="qty-controls">
                      <button onClick={() => updateQty(p.id, addedCount - 1)}>-</button>
                      <span>{addedCount}</span>
                      <button onClick={() => updateQty(p.id, addedCount + 1)}>+</button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* order summary */}
        <div className="order-summary">
          <h2>🧾 Order Summary</h2>
          <div className="order-items">
            {Object.values(cart).length === 0 && <div style={{ color: "#666" }}>Cart is empty</div>}
            {Object.values(cart).map((it) => (
              <div className="item" key={it.id}>
                <div>
                  {it.item} {it.subItem ? ` — ${it.subItem}` : ""}{" "}
                  <span style={{ fontSize: "0.8em", color: "#666" }}>({it.category})</span>
                </div>
                <div>{it.qty} × ₹{Number(it.ourPrice).toFixed(2)} = ₹{(it.qty * it.ourPrice).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="subtotal">Grand Total: ₹{Number(subtotal).toFixed(2)}</div>

          {/* 🚨 Show minimum order banner */}
          {subtotal > 0 && subtotal < 2500 && (
            <div className="min-warning">
              ⚠️ Minimum Order Value: ₹2500 required
            </div>
          )}

          <div className="order-form">
            <input placeholder="Your name" value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
            <input placeholder="Phone (10 digits)" value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            <input placeholder="WhatsApp (10 digits)" value={customer.whatsapp}
              onChange={(e) => setCustomer({ ...customer, whatsapp: e.target.value })} />
            <textarea placeholder="Address" rows={3} value={customer.address}
              onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
          </div>

          <button
            className="place-order-btn"
            onClick={handlePlaceOrder}
            disabled={placing || subtotal < 2500}
          >
            {placing ? "Placing..." : "✔ Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
