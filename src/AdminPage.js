// src/AdminPage.js
import React, { useState, useEffect } from "react";
import "./AdminPage.css";

const API_URL =
  "https://script.google.com/macros/s/AKfycbyv4Xd9JG0hapYkkU7qAx-PURfIRNBVB9iDSDCFD675schctZpNBWD2DYhKnvBr5etsjw/exec";

function AdminPage({ onSwitch }) {
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState({
    category: "",
    item: "",
    subItem: "",
    ourPrice: "",
    localPrice: "",
  });
  const [summary, setSummary] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [itemFilter, setItemFilter] = useState("All");

  // Load catalog
  useEffect(() => {
    fetch(`${API_URL}?action=getCatalog`)
      .then((res) => res.json())
      .then((data) => setCatalog(data))
      .catch((err) => console.error("❌ Fetch error:", err));
  }, []);

  // Load order summary
  useEffect(() => {
    fetch(`${API_URL}?action=getOrderSummary`)
      .then((res) => res.json())
      .then((data) => setSummary(data))
      .catch((err) => console.error("❌ Summary fetch error:", err));
  }, []);

  const handleAddItem = () => {
    if (!form.category || !form.item || !form.ourPrice || !form.localPrice) {
      alert("⚠️ Please fill all required fields.");
      return;
    }

    const params = new URLSearchParams({
      action: "addItem",
      ...form,
    });

    fetch(`${API_URL}?${params.toString()}`, { method: "POST" })
      .then((res) => res.json())
      .then((response) => {
        if (response.success) {
          alert("✅ Item added successfully!");
          setForm({
            category: "",
            item: "",
            subItem: "",
            ourPrice: "",
            localPrice: "",
          });
          // Reload catalog
          return fetch(`${API_URL}?action=getCatalog`);
        } else {
          throw new Error(response.error);
        }
      })
      .then((res) => res.json())
      .then((data) => setCatalog(data))
      .catch((err) => alert("❌ Error: " + err.message));
  };

  // Export Order Summary to CSV
  const downloadCSV = () => {
    if (!summary.length) {
      alert("⚠️ No summary data to export.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Item,Quantity,Total Sales\n";
    filteredSummary.forEach((row) => {
      csvContent += `${row.item},${row.qty},${row.total}\n`;
    });
    csvContent += `\n,,Grand Total,${grandTotal}`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "order_summary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Apply filters
  const filteredSummary = summary.filter((row) => {
    const matchesCategory =
      categoryFilter === "All" || row.item.startsWith(categoryFilter);
    const matchesItem =
      itemFilter === "All" ||
      row.item.toLowerCase().includes(itemFilter.toLowerCase());
    return matchesCategory && matchesItem;
  });

  // Grand Total Sales
  const grandTotal = filteredSummary.reduce((sum, row) => sum + row.total, 0);

  // Extract unique categories for dropdown
  const categories = [
    "All",
    ...new Set(summary.map((row) => row.item.split(" – ")[0])),
  ];

  return (
    <div className="admin-page">
      <h2>🛠 Admin Page</h2>

      <button onClick={onSwitch} style={{ marginBottom: "20px" }}>
        Switch to Customer Page
      </button>

      {/* ------------------ Catalog Management ------------------ */}
      <div className="catalog-section">
        <h3>📂 Catalog Management</h3>
        <div className="form-row">
          <input
            placeholder="Category"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            placeholder="Item"
            value={form.item}
            onChange={(e) => setForm({ ...form, item: e.target.value })}
          />
          <input
            placeholder="Sub-item (optional)"
            value={form.subItem}
            onChange={(e) => setForm({ ...form, subItem: e.target.value })}
          />
          <input
            type="number"
            placeholder="Our Price"
            value={form.ourPrice}
            onChange={(e) => setForm({ ...form, ourPrice: e.target.value })}
          />
          <input
            type="number"
            placeholder="Local Price"
            value={form.localPrice}
            onChange={(e) => setForm({ ...form, localPrice: e.target.value })}
          />
          <button onClick={handleAddItem}>+ Add</button>
        </div>

        <table className="catalog-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Item</th>
              <th>Sub-item</th>
              <th>Our Price</th>
              <th>Local Price</th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((row, i) => (
              <tr key={i}>
                <td>{row.category}</td>
                <td>{row.item}</td>
                <td>{row.subItem}</td>
                <td>{row.ourPrice}</td>
                <td>{row.localPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ------------------ Order Summary ------------------ */}
      <div className="summary-section">
        <h3>📊 Order Summary</h3>

        {/* Filters */}
        <div className="filter-row">
          <label>
            Category:
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map((cat, i) => (
                <option key={i} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          <label>
            Item:
            <input
              type="text"
              placeholder="Search Item"
              value={itemFilter === "All" ? "" : itemFilter}
              onChange={(e) =>
                setItemFilter(e.target.value ? e.target.value : "All")
              }
            />
          </label>
        </div>

        <table className="summary-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Total Quantity</th>
              <th>Total Sales (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            {filteredSummary.map((row, i) => (
              <tr key={i}>
                <td>{row.item}</td>
                <td>{row.qty}</td>
                <td>{row.total}</td>
              </tr>
            ))}
            <tr className="grand-total-row">
              <td colSpan="2" style={{ fontWeight: "bold" }}>
                Grand Total Sales
              </td>
              <td style={{ fontWeight: "bold" }}>{grandTotal}</td>
            </tr>
          </tbody>
        </table>
        <button onClick={downloadCSV} style={{ marginTop: "10px" }}>
          ⬇️ Download CSV
        </button>
      </div>
    </div>
  );
}

export default AdminPage;
