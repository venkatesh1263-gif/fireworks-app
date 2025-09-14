// admin/src/shared/api.js
// Replace API_URL with your deployed Apps Script exec URL
export const API_URL = "https://script.google.com/macros/s/AKfycbyfdFlTM41RfSoq-mK8cCeKSMA-YqPZ-8ZAK3wZbxYE534BEYiQOzwGqEKgeTknJj96tg/exec";

/* Helper to POST payload=JSON as application/x-www-form-urlencoded */
async function postPayload(obj) {
  const body = new URLSearchParams({ payload: JSON.stringify(obj) }).toString();
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return await res.json().catch(() => null);
}

/* ========== PRODUCTS ========== */
export async function fetchProducts() {
  const res = await fetch(`${API_URL}?action=getProducts`);
  const json = await res.json().catch(() => []);
  const arr = Array.isArray(json) ? json : (json.products || json || []);
  return arr.map((p) => ({
    category: p.category ?? p.Category ?? "",
    item: p.item ?? p.Item ?? "",
    subItem: p.subItem ?? p["Sub Item"] ?? p["Sub item"] ?? "",
    ourPrice: p.ourPrice ?? p["Our Price"] ?? p.OurPrice ?? 0,
    localPrice: p.localPrice ?? p["Local Price"] ?? p.LocalPrice ?? 0,
  }));
}

export async function addProduct(product) {
  const json = await postPayload({ action: "addProduct", ...product });
  return !!(json && json.success);
}

export async function updateProduct(product) {
  // expects keys Category, Item, "Sub Item", "Our Price", "Local Price"
  const json = await postPayload({ action: "updateProduct", ...product });
  return !!(json && json.success);
}

export async function deleteProduct(product) {
  const json = await postPayload({ action: "deleteProduct", ...product });
  return !!(json && json.success);
}

/* ========== ORDERS ========== */
/*
 fetchOrders returns array with normalized shape:
 { OrderId, Name, Phone, WhatsApp, Address, ItemsJSON, Items (array), Subtotal, InvoiceLink, Status, OrderDate }
*/
export async function fetchOrders(params = {}) {
  const qs = new URLSearchParams({ action: "getOrders", ...params }).toString();
  const res = await fetch(`${API_URL}?${qs}`);
  const json = await res.json().catch(() => ({ data: [] }));
  const arr = Array.isArray(json) ? json : (json.data || []);
  return arr.map((o) => {
    let items = [];
    try {
      if (Array.isArray(o.Items)) items = o.Items;
      else if (typeof o.ItemsJSON === "string") items = JSON.parse(o.ItemsJSON || "[]");
      else if (o.Items) items = o.Items;
    } catch (err) {
      items = [];
    }
    return {
      OrderId: o.OrderId ?? o.orderId ?? "",
      Name: o.Name ?? o.Customer ?? o.customer ?? "",
      Phone: o.Phone ?? "",
      WhatsApp: o.WhatsApp ?? o.Whatsapp ?? o.whatsapp ?? "",
      Address: o.Address ?? o.address ?? "",
      ItemsJSON: typeof o.ItemsJSON === "string" ? o.ItemsJSON : JSON.stringify(items || []),
      Items: items,
      Subtotal: Number(o.Subtotal ?? o.Total ?? o.total ?? 0),
      InvoiceLink: o.InvoiceLink ?? o.Invoice ?? o.invoice ?? "",
      Status: o.Status ?? o.status ?? "Order Received",
      OrderDate: o.OrderDate ?? o.orderDate ?? ""
    };
  });
}

export async function updateOrderStatus(orderId, status) {
  const json = await postPayload({ action: "updateOrderStatus", orderId, status });
  return !!(json && json.success);
}

/* ========== SUMMARY ========== */
export async function fetchSummary(params = {}) {
  const qs = new URLSearchParams({ action: "getSummary", ...params }).toString();
  const res = await fetch(`${API_URL}?${qs}`);
  const json = await res.json().catch(() => ({ data: [] }));
  const arr = Array.isArray(json) ? json : (json.data || []);
  return arr.map((r) => ({
    category: r.category ?? r.Category ?? "",
    item: r.item ?? r.Item ?? "",
    subItem: r.subItem ?? r["Sub Item"] ?? r.SubItem ?? "",
    count: Number(r.count ?? r.Count ?? 0),
  }));
}

/* ========== ADMINS ========== */
export async function fetchAdmins() {
  const res = await fetch(`${API_URL}?action=getAdmins`);
  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : [];
}
