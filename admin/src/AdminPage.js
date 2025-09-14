// admin/src/AdminPage.js
import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import {
  fetchProducts,
  fetchOrders,
  fetchSummary,
  addProduct,
  updateProduct,
  deleteProduct,
  updateOrderStatus,
} from "./shared/api";
import "./AdminPage.css";

/*
  Full AdminPage.js
  - Products: Add / Edit inline / Delete
  - Orders: filters, expand items, export, WhatsApp quick send, 4-statuses
  - Summary: category/item/subItem/count, filters, export
*/

export default function AdminPage() {
  // tabs
  const [tab, setTab] = useState("orders");

  // data states
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState([]);

  // loading
  const [loading, setLoading] = useState({ products: false, orders: false, summary: false });

  // products form / edit
  const [showAdd, setShowAdd] = useState(false);
  const [formProduct, setFormProduct] = useState({ Category: "", Item: "", "Sub Item": "", "Our Price": "", "Local Price": "" });
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);

  // orders filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [hasInvoiceFilter, setHasInvoiceFilter] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // summary filters
  const [summaryCategoryFilter, setSummaryCategoryFilter] = useState("All");
  const [minCountFilter, setMinCountFilter] = useState(0);

  // expanded row
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // status options (exact 4)
  const STATUS_OPTIONS = [
    { value: "Order Received", color: "#f0ad4e" }, // amber
    { value: "Part Paid", color: "#17a2b8" },      // cyan
    { value: "Full Paid", color: "#007bff" },      // blue
    { value: "Delivered", color: "#28a745" }       // green
  ];

  // initial load
  useEffect(() => {
    loadProducts();
    loadOrders();
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Loaders ===== */
  async function loadProducts() {
    setLoading((s) => ({ ...s, products: true }));
    try {
      const p = await fetchProducts();
      setProducts(p);
    } catch (err) {
      console.error("loadProducts", err);
      setProducts([]);
    } finally {
      setLoading((s) => ({ ...s, products: false }));
    }
  }

  async function loadOrders() {
    setLoading((s) => ({ ...s, orders: true }));
    try {
      // you can send category filter to backend for performance if needed
      const params = {};
      const o = await fetchOrders(params);
      setOrders(o);
    } catch (err) {
      console.error("loadOrders", err);
      setOrders([]);
    } finally {
      setLoading((s) => ({ ...s, orders: false }));
    }
  }

  async function loadSummary() {
    setLoading((s) => ({ ...s, summary: true }));
    try {
      const s = await fetchSummary();
      setSummary(s);
    } catch (err) {
      console.error("loadSummary", err);
      setSummary([]);
    } finally {
      setLoading((s) => ({ ...s, summary: false }));
    }
  }

  /* ===== Products CRUD ===== */
  async function handleAddProduct() {
    if (!formProduct.Category || !formProduct.Item) {
      alert("Category and Item required");
      return;
    }
    const success = await addProduct(formProduct);
    if (success) {
      await loadProducts();
      setFormProduct({ Category: "", Item: "", "Sub Item": "", "Our Price": "", "Local Price": "" });
      setShowAdd(false);
    } else {
      alert("Add product failed");
    }
  }

  function startEditProduct(idx) {
    setEditingIndex(idx);
    const p = products[idx];
    setEditingProduct({
      Category: p.category,
      Item: p.item,
      "Sub Item": p.subItem,
      "Our Price": p.ourPrice,
      "Local Price": p.localPrice,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditingProduct(null);
  }

  async function saveEditProduct() {
    if (!editingProduct || editingIndex === null) return;
    const ok = await updateProduct(editingProduct);
    if (ok) {
      await loadProducts();
      cancelEdit();
    } else {
      alert("Update failed");
    }
  }

  async function handleDeleteProduct(p) {
    if (!window.confirm("Delete product?")) return;
    const ok = await deleteProduct({ Category: p.category, Item: p.item, "Sub Item": p.subItem });
    if (ok) await loadProducts();
    else alert("Delete failed");
  }

  /* ===== Orders actions & filters ===== */
  function applyOrderFilters(list) {
    const s = (searchTerm || "").trim().toLowerCase();
    return list.filter((o) => {
      if (statusFilter !== "All" && (o.Status || "Order Received") !== statusFilter) return false;
      if (hasInvoiceFilter === "With" && !o.InvoiceLink) return false;
      if (hasInvoiceFilter === "Without" && o.InvoiceLink) return false;
      if (categoryFilter !== "All") {
        const hasCat = (o.Items || []).some(it => (it.category || it.Category || "").toLowerCase() === categoryFilter.toLowerCase());
        if (!hasCat) return false;
      }
      if (dateFrom || dateTo) {
        if (!o.OrderDate) return false;
        const d = new Date(o.OrderDate);
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo && d > new Date(dateTo + "T23:59:59")) return false;
      }
      if (!s) return true;
      return (
        (o.OrderId || "").toLowerCase().includes(s) ||
        (o.Name || "").toLowerCase().includes(s) ||
        (o.Phone || "").toLowerCase().includes(s) ||
        (o.Address || "").toLowerCase().includes(s) ||
        String(o.Subtotal || "").toLowerCase().includes(s)
      );
    });
  }

  async function handleChangeStatus(orderId, status) {
    const ok = await updateOrderStatus(orderId, status);
    if (ok) {
      setOrders((prev) => prev.map((o) => (o.OrderId === orderId ? { ...o, Status: status } : o)));
    } else {
      alert("Failed to update status");
      await loadOrders();
    }
  }

  function toggleExpand(orderId) {
    setExpandedOrderId((cur) => (cur === orderId ? null : orderId));
  }

  function buildWhatsAppMessage(order) {
    const lines = [];
    lines.push(`Order: ${order.OrderId}`);
    lines.push(`Name: ${order.Name}`);
    lines.push(`Phone: ${order.Phone}`);
    lines.push(`Address: ${order.Address}`);
    lines.push("");
    lines.push("Items:");
    (order.Items || []).forEach((it) => {
      const qty = Number(it.qty ?? it.quantity ?? it.Qty ?? 0);
      const label = `${it.category ?? it.Category ?? ""} - ${it.item ?? it.Item ?? ""}${it.subItem ? " (" + it.subItem + ")" : ""}`;
      const price = Number(it.price ?? it.unitPrice ?? it.ourPrice ?? 0);
      lines.push(`${label} x${qty} @ ₹${price} = ₹${(qty * price).toFixed(2)}`);
    });
    lines.push("");
    lines.push(`Grand Total: ₹${Number(order.Subtotal || 0).toFixed(2)}`);
    lines.push(`Status: ${order.Status}`);
    return lines.join("\n");
  }

  function openWhatsAppToCustomer(order) {
    const phoneRaw = String(order.Phone || order.WhatsApp || "").replace(/\D/g, "");
    if (!phoneRaw) {
      alert("Customer phone not available");
      return;
    }
    const msg = buildWhatsAppMessage(order);
    const url = `https://wa.me/${phoneRaw}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  /* ===== Export helpers ===== */
  function exportOrdersToExcel(list) {
    const rows = (list || []).map((o) => ({
      OrderId: o.OrderId,
      Name: o.Name,
      Phone: o.Phone,
      WhatsApp: o.WhatsApp,
      Address: o.Address,
      Subtotal: Number(o.Subtotal || 0).toFixed(2),
      InvoiceLink: o.InvoiceLink || "",
      Status: o.Status || "",
      OrderDate: o.OrderDate || "",
      Items: JSON.stringify(o.Items || [])
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `orders_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  function exportSummaryToExcel(list) {
    const rows = (list || []).map((r) => ({
      Category: r.category,
      Item: r.item,
      "Sub Item": r.subItem || "",
      Count: r.count
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ItemsSummary");
    XLSX.writeFile(wb, `items_summary_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  /* ===== Derived data ===== */
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort();
  const filteredOrders = applyOrderFilters(orders);
  const filteredSummary = summary
    .filter(s => (summaryCategoryFilter === "All" ? true : s.category === summaryCategoryFilter))
    .filter(s => (minCountFilter > 0 ? s.count >= Number(minCountFilter) : true));

  const statusColor = (status) => (STATUS_OPTIONS.find(s => s.value === status)?.color || "#999");

  /* ===== Render ===== */
  return (
    <div className="admin-root">
      <header className="admin-header">
        <h1>🎆 Fireworks Admin</h1>
        <div className="tabs">
          <button className={`tab-btn ${tab === "orders" ? "active" : ""}`} onClick={() => setTab("orders")}>📑 Orders</button>
          <button className={`tab-btn ${tab === "products" ? "active" : ""}`} onClick={() => setTab("products")}>📦 Products</button>
          <button className={`tab-btn ${tab === "summary" ? "active" : ""}`} onClick={() => setTab("summary")}>📊 Items</button>
        </div>
      </header>

      <main className="admin-main">

        {/* ORDERS */}
        {tab === "orders" && (
          <section className="card">
            <div className="card-head">
              <h2>Orders</h2>
              <div>
                <button className="btn small outline" onClick={() => { loadOrders(); setExpandedOrderId(null); }}>Refresh</button>
                <button className="btn small" onClick={() => exportOrdersToExcel(filteredOrders)}>Export</button>
              </div>
            </div>

            <div className="form-row" style={{ marginBottom: 12 }}>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="All">All Status</option>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
              </select>

              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                <option value="All">All Categories</option>
                {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
              </select>

              <select value={hasInvoiceFilter} onChange={e => setHasInvoiceFilter(e.target.value)}>
                <option value="All">Invoice: All</option>
                <option value="With">With Invoice</option>
                <option value="Without">Without Invoice</option>
              </select>

              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />

              <input type="text" placeholder="Search orderId/name/phone/address/total" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ minWidth: 220 }} />
              <button className="btn small outline" onClick={() => { /* apply just reload local filters */ }}>Apply</button>
            </div>

            <div className="table-wrap">
              <table className="compact-table">
                <thead>
                  <tr>
                    <th style={{ width: 140 }}>Order ID</th>
                    <th style={{ width: 160 }}>Customer</th>
                    <th style={{ width: 110 }}>Phone</th>
                    <th style={{ width: 110 }}>WhatsApp</th>
                    <th style={{ width: 220 }}>Address</th>
                    <th style={{ width: 110, textAlign: "right" }}>Total</th>
                    <th style={{ width: 120 }}>Invoice</th>
                    <th style={{ width: 140 }}>Status</th>
                    <th style={{ width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading.orders ? (
                    <tr><td colSpan="9">Loading...</td></tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr><td colSpan="9">No orders match filters</td></tr>
                  ) : (
                    filteredOrders.map((o, idx) => (
                      <React.Fragment key={o.OrderId || idx}>
                        <tr>
                          <td title={o.OrderId}>{o.OrderId}</td>
                          <td title={o.Name}>{o.Name}</td>
                          <td title={o.Phone}>{o.Phone}</td>
                          <td title={o.WhatsApp}>{o.WhatsApp}</td>
                          <td title={o.Address}>{o.Address}</td>
                          <td style={{ textAlign: "right" }}>₹{Number(o.Subtotal || 0).toFixed(2)}</td>
                          <td>{o.InvoiceLink ? <a href={o.InvoiceLink} target="_blank" rel="noreferrer">Open</a> : <span className="badge red">Not Uploaded</span>}</td>
                          <td>
                            <select
                              value={o.Status}
                              onChange={(e) => handleChangeStatus(o.OrderId, e.target.value)}
                              style={{ backgroundColor: statusColor(o.Status), color: "#fff", padding: "6px 8px", borderRadius: 6, border: "none" }}
                            >
                              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
                            </select>
                          </td>
                          <td>
                            <button className="btn small" onClick={() => toggleExpand(o.OrderId)}>{expandedOrderId === o.OrderId ? "Collapse" : "Items"}</button>
                            <button className="btn small" onClick={() => openWhatsAppToCustomer(o)}>WhatsApp</button>
                          </td>
                        </tr>

                        {expandedOrderId === o.OrderId && (
                          <tr>
                            <td colSpan="9" style={{ padding: 10, background: "#fbfdff" }}>
                              <strong>Items</strong>
                              <div style={{ marginTop: 8, overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                  <thead>
                                    <tr style={{ background: "#eef5ff" }}>
                                      <th style={{ padding: 6, width: 200 }}>Category</th>
                                      <th style={{ padding: 6, width: 260 }}>Item</th>
                                      <th style={{ padding: 6, width: 160 }}>Sub Item</th>
                                      <th style={{ padding: 6, width: 100 }}>Qty</th>
                                      <th style={{ padding: 6, width: 120 }}>Unit Price</th>
                                      <th style={{ padding: 6, width: 120 }}>Line Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(o.Items || []).map((it, j) => {
                                      const qty = Number(it.qty ?? it.quantity ?? it.Qty ?? 0);
                                      const price = Number(it.price ?? it.unitPrice ?? it.ourPrice ?? 0);
                                      return (
                                        <tr key={j}>
                                          <td style={{ padding: 6 }}>{it.category ?? it.Category ?? ""}</td>
                                          <td style={{ padding: 6 }}>{it.item ?? it.Item ?? ""}</td>
                                          <td style={{ padding: 6 }}>{it.subItem ?? it["Sub Item"] ?? ""}</td>
                                          <td style={{ padding: 6 }}>{qty}</td>
                                          <td style={{ padding: 6 }}>₹{price.toFixed(2)}</td>
                                          <td style={{ padding: 6 }}>₹{(qty * price).toFixed(2)}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* PRODUCTS */}
        {tab === "products" && (
          <section className="card">
            <div className="card-head">
              <h2>Products Catalog</h2>
              <div>
                <button className="btn small" onClick={() => setShowAdd((s) => !s)}>{showAdd ? "Cancel" : "➕ Add Product"}</button>
                <button className="btn small outline" onClick={loadProducts}>Refresh</button>
              </div>
            </div>

            {showAdd && (
              <div className="form-row">
                <input placeholder="Category" value={formProduct.Category} onChange={e => setFormProduct({ ...formProduct, Category: e.target.value })} />
                <input placeholder="Item" value={formProduct.Item} onChange={e => setFormProduct({ ...formProduct, Item: e.target.value })} />
                <input placeholder="Sub Item" value={formProduct["Sub Item"]} onChange={e => setFormProduct({ ...formProduct, "Sub Item": e.target.value })} />
                <input placeholder="Our Price" value={formProduct["Our Price"]} onChange={e => setFormProduct({ ...formProduct, "Our Price": e.target.value })} />
                <input placeholder="Local Price" value={formProduct["Local Price"]} onChange={e => setFormProduct({ ...formProduct, "Local Price": e.target.value })} />
                <button className="btn primary" onClick={handleAddProduct}>Save</button>
              </div>
            )}

            <div className="table-wrap">
              <table className="compact-table">
                <thead>
                  <tr>
                    <th style={{ width: 160 }}>Category</th>
                    <th style={{ width: 180 }}>Item</th>
                    <th style={{ width: 220 }}>Sub Item</th>
                    <th style={{ width: 100 }}>Our Price</th>
                    <th style={{ width: 100 }}>Local Price</th>
                    <th style={{ width: 140 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading.products ? (
                    <tr><td colSpan="6">Loading...</td></tr>
                  ) : products.length === 0 ? (
                    <tr><td colSpan="6">No products</td></tr>
                  ) : products.map((p, i) => {
                    const isEditing = editingIndex === i;
                    return (
                      <tr key={i}>
                        <td title={p.category}>
                          {isEditing ? <input value={editingProduct.Category} onChange={e => setEditingProduct({ ...editingProduct, Category: e.target.value })} /> : p.category}
                        </td>
                        <td title={p.item}>
                          {isEditing ? <input value={editingProduct.Item} onChange={e => setEditingProduct({ ...editingProduct, Item: e.target.value })} /> : p.item}
                        </td>
                        <td title={p.subItem}>
                          {isEditing ? <input value={editingProduct["Sub Item"]} onChange={e => setEditingProduct({ ...editingProduct, "Sub Item": e.target.value })} /> : p.subItem}
                        </td>
                        <td>{isEditing ? <input value={editingProduct["Our Price"]} onChange={e => setEditingProduct({ ...editingProduct, "Our Price": e.target.value })} /> : `₹${Number(p.ourPrice || 0).toFixed(2)}`}</td>
                        <td>{isEditing ? <input value={editingProduct["Local Price"]} onChange={e => setEditingProduct({ ...editingProduct, "Local Price": e.target.value })} /> : `₹${Number(p.localPrice || 0).toFixed(2)}`}</td>
                        <td>
                          {isEditing ? (
                            <>
                              <button className="btn small primary" onClick={saveEditProduct}>Save</button>
                              <button className="btn small outline" onClick={cancelEdit}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button className="btn small" onClick={() => startEditProduct(i)}>Edit</button>
                              <button className="btn danger small" onClick={() => handleDeleteProduct(p)}>Delete</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* SUMMARY */}
        {tab === "summary" && (
          <section className="card">
            <div className="card-head">
              <h2>Items Summary</h2>
              <div>
                <select value={summaryCategoryFilter} onChange={e => setSummaryCategoryFilter(e.target.value)}>
                  <option value="All">All categories</option>
                  {categories.map((c, i) => <option key={i} value={c}>{c}</option>)}
                </select>
                <input type="number" placeholder="Min count" value={minCountFilter} onChange={e => setMinCountFilter(Number(e.target.value || 0))} style={{ width: 120 }} />
                <button className="btn small outline" onClick={loadSummary}>Refresh</button>
                <button className="btn small" onClick={() => exportSummaryToExcel(filteredSummary)}>Export</button>
              </div>
            </div>

            <div className="table-wrap">
              <table className="compact-table">
                <thead>
                  <tr>
                    <th style={{ width: 180 }}>Category</th>
                    <th style={{ width: 340 }}>Item</th>
                    <th style={{ width: 180 }}>Sub Item</th>
                    <th style={{ width: 120 }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {loading.summary ? (
                    <tr><td colSpan="4">Loading...</td></tr>
                  ) : filteredSummary.length === 0 ? (
                    <tr><td colSpan="4">No items summary</td></tr>
                  ) : filteredSummary.map((s, i) => (
                    <tr key={i}>
                      <td title={s.category}>{s.category}</td>
                      <td title={s.item}>{s.item}</td>
                      <td title={s.subItem || ""}>{s.subItem || ""}</td>
                      <td style={{ textAlign: "right" }}>{s.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
