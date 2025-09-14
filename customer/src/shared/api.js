// customer/src/shared/api.js
export const API_URL =
  "https://script.google.com/macros/s/AKfycbyfdFlTM41RfSoq-mK8cCeKSMA-YqPZ-8ZAK3wZbxYE534BEYiQOzwGqEKgeTknJj96tg/exec";

// ✅ Fetch products
export async function fetchProductsFromAdmin() {
  const res = await fetch(`${API_URL}?action=getProducts`);
  if (!res.ok) throw new Error("Failed to fetch products");
  const data = await res.json();

  console.log("Fetched products:", data); // debug

  // If products are directly in the array
  if (Array.isArray(data)) return data;
  // If wrapped in { products: [...] }
  if (data.products && Array.isArray(data.products)) return data.products;

  throw new Error("Unexpected API format: " + JSON.stringify(data));
}

// ✅ Fetch admin numbers
export async function fetchAdminNumbers() {
  const res = await fetch(`${API_URL}?action=getAdmins`);
  if (!res.ok) throw new Error("Failed to fetch admins");
  return res.json();
}

// ✅ Post order
export async function postOrderToServer(order) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "payload=" + encodeURIComponent(JSON.stringify(order)),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => null);
    throw new Error("Failed to post order: " + (text || res.status));
  }
  return res.json();
}
