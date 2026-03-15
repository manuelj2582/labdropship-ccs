import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function generateInvoicePDF(sale, products, companyInfo = {}) {
  const doc = new jsPDF();
  const company = {
    name: companyInfo.name || 'VeneLab',
    rif: companyInfo.rif || 'J-XXXXXXXX-X',
    address: companyInfo.address || 'Caracas, Venezuela',
    phone: companyInfo.phone || '+58 XXX-XXX-XXXX',
    ...companyInfo,
  };

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header background
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // Company name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, 15, 20);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`RIF: ${company.rif}  |  ${company.address}  |  ${company.phone}`, 15, 30);

  // Invoice number
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(sale.invoice_num || 'FAC-000', pageWidth - 15, 20, { align: 'right' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date(sale.date + 'T12:00:00').toLocaleDateString('es-VE', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  doc.text(dateStr, pageWidth - 15, 30, { align: 'right' });

  // Status badge
  const statusColors = {
    completada: [16, 185, 129],
    pendiente: [245, 158, 11],
    enviada: [99, 102, 241],
  };
  const sc = statusColors[sale.status] || statusColors.pendiente;
  doc.setFillColor(...sc);
  const statusText = (sale.status || 'pendiente').toUpperCase();
  const statusWidth = doc.getTextWidth(statusText) + 12;
  doc.roundedRect(pageWidth - 15 - statusWidth, 33, statusWidth, 7, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(statusText, pageWidth - 15 - statusWidth / 2, 38, { align: 'center' });

  // Client info box
  doc.setTextColor(30, 41, 59);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, 52, pageWidth - 30, 30, 3, 3, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('CLIENTE', 22, 60);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(sale.client_name || '', 22, 68);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`RIF: ${sale.client_rif || '—'}    |    ${sale.client_contact || ''}`, 22, 76);

  // Payment & notes
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('MÉTODO DE PAGO', pageWidth - 80, 60);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(sale.payment_method || 'Transferencia', pageWidth - 80, 68);

  // Items table
  const items = (sale.items || []).map(item => {
    const prod = products.find(p => p.id === item.product_id);
    return [
      prod?.name || '—',
      item.qty.toString(),
      `$${Number(item.unit_price).toFixed(2)}`,
      `$${(item.qty * item.unit_price).toFixed(2)}`,
    ];
  });

  const total = (sale.items || []).reduce((s, it) => s + it.qty * it.unit_price, 0);
  const totalUnits = (sale.items || []).reduce((s, it) => s + it.qty, 0);

  doc.autoTable({
    startY: 90,
    head: [['Producto', 'Cantidad', 'Precio Unit.', 'Subtotal']],
    body: items,
    theme: 'plain',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 6,
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 6,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35, fontStyle: 'bold' },
    },
    margin: { left: 15, right: 15 },
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  // Totals box
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(pageWidth - 95, finalY, 80, 28, 3, 3, 'F');

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${totalUnits} unidades`, pageWidth - 88, finalY + 10);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`$${total.toFixed(2)}`, pageWidth - 88, finalY + 22);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text('TOTAL', pageWidth - 30, finalY + 10);

  // Notes
  if (sale.notes) {
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTAS:', 15, finalY + 8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(sale.notes, 15, finalY + 16, { maxWidth: 80 });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`${company.name} · ${company.rif} · Documento generado el ${new Date().toLocaleDateString('es-VE')}`, pageWidth / 2, pageHeight - 12, { align: 'center' });

  // Download
  doc.save(`${sale.invoice_num || 'factura'}.pdf`);
}

export function generateDeliveryNotePDF(sale, products, companyInfo = {}) {
  const doc = new jsPDF();
  const company = {
    name: companyInfo.name || 'VeneLab',
    rif: companyInfo.rif || 'J-XXXXXXXX-X',
    address: companyInfo.address || 'Caracas, Venezuela',
    phone: companyInfo.phone || '+58 XXX-XXX-XXXX',
    ...companyInfo,
  };

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(5, 150, 105);
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA DE ENTREGA', 15, 18);

  doc.setFontSize(12);
  doc.text(sale.invoice_num || '', 15, 28);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const dateStr = new Date(sale.date + 'T12:00:00').toLocaleDateString('es-VE', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  doc.text(dateStr, pageWidth - 15, 18, { align: 'right' });
  doc.text(company.name, pageWidth - 15, 28, { align: 'right' });

  // Client
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Entregar a:', 15, 52);
  doc.setFontSize(14);
  doc.text(sale.client_name || '', 15, 62);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`RIF: ${sale.client_rif || '—'}  ·  ${sale.client_contact || ''}`, 15, 70);

  // Items
  const items = (sale.items || []).map(item => {
    const prod = products.find(p => p.id === item.product_id);
    return [prod?.name || '—', item.qty.toString(), prod?.category || '—'];
  });

  doc.autoTable({
    startY: 80,
    head: [['Producto', 'Cantidad', 'Categoría']],
    body: items,
    theme: 'grid',
    headStyles: { fillColor: [5, 150, 105], fontSize: 9 },
    bodyStyles: { fontSize: 10, cellPadding: 7 },
    columnStyles: {
      1: { halign: 'center', cellWidth: 30, fontStyle: 'bold' },
    },
    margin: { left: 15, right: 15 },
  });

  const finalY = doc.lastAutoTable.finalY + 15;
  const totalUnits = (sale.items || []).reduce((s, it) => s + it.qty, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Total: ${totalUnits} unidades`, 15, finalY);

  if (sale.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Notas: ${sale.notes}`, 15, finalY + 10, { maxWidth: pageWidth - 30 });
  }

  // Signature lines
  const sigY = finalY + 40;
  doc.setDrawColor(200, 200, 200);
  doc.line(15, sigY, 85, sigY);
  doc.line(pageWidth - 85, sigY, pageWidth - 15, sigY);
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Entregado por', 50, sigY + 6, { align: 'center' });
  doc.text('Recibido por', pageWidth - 50, sigY + 6, { align: 'center' });

  doc.save(`NE-${sale.invoice_num || 'entrega'}.pdf`);
}
