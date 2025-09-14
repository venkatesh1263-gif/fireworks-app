// shared/invoice.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Helper: format INR safely (no ₹, no superscripts)
function formatINR(n) {
  const num = Number(n || 0);
  return "Rs. " + num.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

export function downloadPdfInvoice(order) {
  try {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginLeft = 40;
    let y = 40;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Diwali Fireworks Invoice", marginLeft, y);

    y += 25;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Order ID: ${order.orderId}`, marginLeft, y);
    doc.text(`Date: ${order.createdAt || new Date().toLocaleString()}`, marginLeft + 300, y);

    // Customer Info
    y += 25;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Customer Details:", marginLeft, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    y += 15; doc.text(`Name: ${order.customer?.name || ""}`, marginLeft, y);
    y += 15; doc.text(`Phone: ${order.customer?.phone || ""}`, marginLeft, y);
    y += 15; doc.text(`WhatsApp: ${order.customer?.whatsapp || ""}`, marginLeft, y);
    y += 15; doc.text(`Address: ${order.customer?.address || ""}`, marginLeft, y);

    // Items Table
    const tableBody = (order.items || []).map((it) => [
      it.item + (it.subItem ? ` — ${it.subItem}` : ""),
      String(it.qty),
      formatINR(it.price),
      formatINR((it.qty || 0) * (it.price || 0)),
    ]);

    autoTable(doc, {
      startY: y + 20,
      head: [["Item", "Qty", "Unit Price", "Total"]],
      body: tableBody,
      theme: "striped",
      styles: { font: "helvetica", fontSize: 10, halign: "center" },
      headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { halign: "left" },
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
    });

    const finalY = doc.lastAutoTable?.finalY || (y + 40);

    // Grand Total
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(200, 0, 0);
    doc.text(
      `Grand Total: ${formatINR(order.subtotal || 0)}`,
      marginLeft,
      finalY + 30
    );

    // Footer - Thank you
    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80, 80, 80);
    doc.text("Thank you for shopping with Diwali Fireworks!", marginLeft, finalY + 60);

    // Footer - Contact info
    doc.setTextColor(0, 0, 150);
    doc.setFont("helvetica", "normal");
    doc.text("Contact us for any queries and Payment link:", marginLeft, finalY + 85);

    // WhatsApp Links
    doc.setTextColor(0, 102, 0);
    doc.textWithLink("WhatsApp: 9494496494", marginLeft, finalY + 105, {
      url: "https://wa.me/919494496494",
    });
    doc.textWithLink("WhatsApp: 6302400271", marginLeft, finalY + 125, {
      url: "https://wa.me/916302400271",
    });

    doc.save(`invoice-${order.orderId}.pdf`);
  } catch (err) {
    console.error("PDF generation error:", err);
    alert("⚠️ Could not generate PDF invoice. Please check console.");
  }
}
