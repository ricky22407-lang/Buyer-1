import { Order } from '../types';

export const exportCSV = (orders: Order[]) => {
  const headers = ['群組名稱', '買家', '商品', '數量', '單價', '總價', '狀態', '來源', '原始訊息'];
  const rows = orders.map(o => [
    `"${o.groupName}"`,
    o.buyerName,
    o.itemName,
    o.quantity,
    o.price,
    o.quantity * o.price,
    o.status,
    o.source === 'monitor' ? '自動監控' : '手動匯入',
    `"${o.rawText.replace(/"/g, '""')}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
    + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `line_orders_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};