const get = (id) => document.getElementById(id);
const access = get('access');
const order = get('order');
const fields = order.querySelector('fieldset');
const quantity = order.elements.quantity;
const status = get('status');
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
let code = '';
let selected;
let pending;
let busy = false;

async function request(method, payload) {
  const response = await fetch('/api/shop', {
    method,
    headers: { Authorization: 'Bearer ' + code, 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error), { status: response.status });
  return data;
}

function updateTotal() {
  get('total').textContent = selected && quantity.validity.valid
    ? money.format(BigInt(selected.price) * BigInt(quantity.valueAsNumber)) : '—';
}

function select(product) {
  selected = product;
  fields.disabled = !product?.stock || busy || Boolean(pending);
  get('selected').textContent = product ? product.name + ' · ' + money.format(product.price) + '/' + product.unit : 'Chọn một sản phẩm trong danh mục.';
  quantity.max = product?.stock ?? 0;
  updateTotal();
}

function render(products) {
  const list = get('products');
  list.replaceChildren();
  if (!products.length) {
    const empty = document.createElement('li');
    empty.textContent = 'Chưa có sản phẩm.';
    list.append(empty);
  }
  for (const product of products) {
    const row = document.createElement('li');
    row.className = 'product';
    const info = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = product.name;
    const detail = document.createElement('small');
    detail.textContent = product.sku + ' · ' + money.format(product.price) + '/' + product.unit + ' · Tồn ' + product.stock + ' ' + product.unit;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = product.stock ? 'Chọn' : 'Hết hàng';
    button.disabled = !product.stock;
    button.onclick = () => {
      if (busy || pending) return;
      quantity.value = '1';
      select(product);
      order.elements.name.focus();
    };
    info.append(title, detail);
    row.append(info, button);
    list.append(row);
  }
  select(products.find((product) => product.sku === selected?.sku));
}

access.onsubmit = async (event) => {
  event.preventDefault();
  const button = access.querySelector('button');
  button.disabled = true;
  code = access.elements.code.value.trim();
  try {
    render(await request('GET'));
    access.reset();
    access.hidden = true;
    get('shop').hidden = false;
    status.textContent = '';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
};

get('refresh').onclick = async () => {
  if (busy || pending) return;
  busy = true;
  fields.disabled = true;
  try {
    render(await request('GET'));
    status.textContent = 'Đã cập nhật tồn kho.';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    busy = false;
    select(selected);
  }
};

quantity.oninput = updateTotal;
order.onsubmit = async (event) => {
  event.preventDefault();
  if (!selected || busy || pending) return;
  pending = {
    id: crypto.randomUUID(),
    name: order.elements.name.value,
    employee: order.elements.employee.value,
    sku: selected.sku,
    price: selected.price,
    quantity: quantity.valueAsNumber,
  };
  await submit();
};

const retry = document.createElement('button');
retry.type = 'button';
retry.textContent = 'Thử lại đơn này';
retry.hidden = true;
retry.onclick = submit;
order.append(retry);

async function submit() {
  if (!pending || busy) return;
  busy = true;
  fields.disabled = true;
  retry.hidden = true;
  status.textContent = 'Đang xác nhận đơn…';
  try {
    const receipt = await request('POST', pending);
    pending = undefined;
    const message = 'Đã đặt ' + receipt.quantity + ' sản phẩm · ' + money.format(BigInt(receipt.total)) + ' · Mã đơn ' + receipt.id;
    order.reset();
    select(undefined);
    status.textContent = message;
    try {
      render(await request('GET'));
    } catch {
      get('products').replaceChildren();
      status.textContent += ' Bấm Cập nhật tồn để tải lại danh mục.';
    }
  } catch (error) {
    status.textContent = error.message;
    if (error.status >= 400 && error.status < 500) {
      pending = undefined;
      if (error.status === 409) {
        try {
          render(await request('GET'));
        } catch {
          get('products').replaceChildren();
          select(undefined);
        }
      }
    } else {
      retry.hidden = false;
    }
  } finally {
    busy = false;
    select(selected);
  }
}
