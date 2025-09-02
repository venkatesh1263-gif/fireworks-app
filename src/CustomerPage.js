// src/CustomerPage.js
import React, { useState, useEffect } from "react";
import "./CustomerPage.css";

const API_URL =
  "https://script.google.com/macros/s/AKfycbyv4Xd9JG0hapYkkU7qAx-PURfIRNBVB9iDSDCFD675schctZpNBWD2DYhKnvBr5etsjw/exec";

function CustomerPage({ onSwitch }) {
  const [catalog, setCatalog] = useState([]);
  const [cart, setCart] = useState([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    whatsapp: "",
    address: "",
    location: "",
  });

  // Load catalog
  useEffect(() => {
    fetch(`${API_URL}?action=getCatalog`)
      .then((res) => res.json())
      .then((data) => setCatalog(data))
      .catch((err) => console.error("❌ Fetch error:", err));
  }, []);

  // Add item to cart
  const addToCart = (product) => {
    const existing = cart.find(
      (item) =>
        item.category === product.category &&
        item.item === product.item &&
        item.subItem === product.subItem
    );
    if (existing) {
      setCart(
        cart.map((item) =>
          item === existing ? { ...item, qty: item.qty + 1 } : item
        )
      );
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  // Update qty
  const updateQty = (product, qty) => {
    if (qty <= 0) {
      setCart(cart.filter((item) => item !== product));
    } else {
      setCart(
        cart.map((item) => (item === product ? { ...item, qty } : item))
      );
    }
  };

  // Grand total
  const grandTotal = cart.reduce(
    (sum, item) => sum + item.qty * item.ourPrice,
    0
  );

  // Place Order
  const placeOrder = () => {
    if (!form.name || !form.phone || cart.length === 0) {
      alert("⚠️ Please fill details and add items.");
      return;
    }

    const itemsText = cart
      .map(
        (item) =>
          `${item.category} – ${item.item}${
            item.subItem ? " – " + item.subItem : ""
          } x${item.qty}`
      )
      .join(", ");

    // Save order to Google Sheets
    const params = new URLSearchParams({
      action: "saveOrder",
      name: form.name,
      phone: form.phone,
      whatsapp: form.whatsapp,
      address: form.address,
      location: form.location,
      items: itemsText,
      total: grandTotal,
    });

    fetch(`${API_URL}?${params.toString()}`, { method: "POST" })
      .then((res) => res.json())
      .then((response) => {
        if (response.success) {
          alert("✅ Order placed successfully!");

          // WhatsApp message
          const shopNumber = "919494496894"; // your shop number
          const message = `🎆 New Fireworks Order 🎆

Name: ${form.name}
Phone: ${form.phone}
Address: ${form.address}
Location: ${form.location}

Items:
${cart
  .map(
    (item) =>
      `${item.category} – ${item.item}${
        item.subItem ? " – " + item.subItem : ""
      } × ${item.qty} = ₹${item.qty * item.ourPrice}`
  )
  .join("\n")}

Grand Total: ₹${grandTotal}`;

          const encodedMessage = encodeURIComponent(message);
          const whatsappUrl = `https://wa.me/${shopNumber}?text=${encodedMessage}`;
          window.open(whatsappUrl, "_blank");

          // Reset
          setCart([]);
          setForm({
            name: "",
            phone: "",
            whatsapp: "",
            address: "",
            location: "",
          });
        } else {
          throw new Error(response.error);
        }
      })
      .catch((err) => alert("❌ Error: " + err.message));
  };

  return (
    <div className="customer-page">
      <h2>🎇 Fireworks Catalog – Customer Page</h2>

      <button onClick={onSwitch} className="switch-btn">
        Switch to Admin Page
      </button>

      <div className="customer-layout">
        {/* ------------------ Catalog ------------------ */}
        <div className="catalog">
          {catalog.length === 0 ? (
            <p className="no-products">⚠️ No products available.</p>
          ) : (
            catalog.map((product, i) => (
              <div className="product-tile" key={i}>
                <h4>
                  {product.category} – {product.item}
                  {product.subItem ? " – " + product.subItem : ""}
                </h4>
                <p>
                  <span className="price-label">Our Price:</span>{" "}
                  <span className="price-value">₹{product.ourPrice}</span>
                </p>
                <p>
                  <span className="price-label local">Local Price:</span>{" "}
                  <span className="price-value">₹{product.localPrice}</span>
                </p>
                <button onClick={() => addToCart(product)}>+ Add</button>
              </div>
            ))
          )}
        </div>

        {/* ------------------ Cart ------------------ */}
        <div className="cart">
          <h3>🛒 Order Summary</h3>
          <div className="cart-summary">
            {cart.length === 0 ? (
              <p>No items selected.</p>
            ) : (
              <ul>
                {cart.map((item, i) => (
                  <li key={i}>
                    {item.category} – {item.item}
                    {item.subItem ? " – " + item.subItem : ""} ×{" "}
                    <input
                      type="number"
                      value={item.qty}
                      min="0"
                      onChange={(e) =>
                        updateQty(item, parseInt(e.target.value) || 0)
                      }
                      style={{ width: "50px", marginRight: "5px" }}
                    />{" "}
                    = ₹{item.qty * item.ourPrice}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <h4 className="grand-total">Grand Total: ₹{grandTotal}</h4>

          {/* ------------------ Customer Form ------------------ */}
          <div className="customer-form">
            <input
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <input
              placeholder="WhatsApp (optional)"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            />
            <input
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <input
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>

          <button className="place-order" onClick={placeOrder}>
            ✅ Place Order
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerPage;
