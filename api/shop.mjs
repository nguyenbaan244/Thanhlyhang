import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (value) => createHash('sha256').update(value).digest();
const integer = (value, min) => Number.isInteger(value) && value >= min && value <= 2147483647;

export default async function shop(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const { SHOP_ACCESS_CODE, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SHOP_ACCESS_CODE || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Cửa hàng chưa được cấu hình.' });
  }
  const code = req.headers.authorization || '';
  if (!timingSafeEqual(digest(code), digest('Bearer ' + SHOP_ACCESS_CODE))) {
    return res.status(401).json({ error: 'Mã truy cập không hợp lệ.' });
  }
  const headers = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: 'Bearer ' + SUPABASE_SERVICE_ROLE_KEY,
    'Content-Type': 'application/json',
  };
  let path = 'products?select=sku,name,unit,price,stock&order=name,sku';
  let body;
  if (req.method === 'POST') {
    const { id, name, employee, sku, quantity, price } = req.body || {};
    const validText = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
    if (typeof id !== 'string' || !/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id) ||
        !validText(name, 120) || !validText(employee, 40) || !validText(sku, 100) ||
        !integer(quantity, 1) || !integer(price, 0)) {
      return res.status(400).json({ error: 'Vui lòng kiểm tra thông tin đặt hàng.' });
    }
    path = 'rpc/place_order';
    body = JSON.stringify({ p_id: id, p_name: name.trim(), p_code: employee.trim(), p_sku: sku, p_qty: quantity, p_price: price });
  } else if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end();
  }
  try {
    const result = await fetch(new URL('/rest/v1/' + path, SUPABASE_URL), {
      method: req.method, headers, body, signal: AbortSignal.timeout(8000),
    });
    const data = await result.json();
    if (result.ok) return res.status(200).json(data);
    const messages = {
      INSUFFICIENT_STOCK: 'Số lượng tồn đã thay đổi. Vui lòng kiểm tra lại.',
      PRICE_CHANGED: 'Giá đã thay đổi. Vui lòng kiểm tra lại.',
      ORDER_CONFLICT: 'Mã yêu cầu đã được dùng cho một đơn khác.',
    };
    if (Object.hasOwn(messages, data.message)) {
      return res.status(409).json({ error: messages[data.message] });
    }
  } catch {
    // A retry with the same order ID safely recovers an uncertain response.
  }
  return res.status(502).json({ error: 'Chưa nhận được kết quả từ hệ thống. Vui lòng thử lại.' });
}
