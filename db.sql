create table public.products (
  sku text primary key,
  name text not null,
  unit text not null,
  price integer not null check (price >= 0),
  stock integer not null check (stock >= 0)
);

create table public.orders (
  id uuid primary key,
  employee_name text not null,
  employee_code text not null,
  sku text not null references public.products,
  quantity integer not null check (quantity > 0),
  unit_price integer not null,
  total bigint generated always as (quantity::bigint * unit_price) stored,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
revoke all on public.products, public.orders from anon, authenticated;
grant select on public.products to service_role;

create function public.place_order(p_id uuid, p_name text, p_code text, p_sku text, p_qty integer, p_price integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  product public.products%rowtype;
  receipt public.orders%rowtype;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into receipt from public.orders where id = p_id;
  if found then
    if (receipt.employee_name, receipt.employee_code, receipt.sku, receipt.quantity, receipt.unit_price)
      is distinct from (p_name, p_code, p_sku, p_qty, p_price) then
      raise exception 'ORDER_CONFLICT';
    end if;
  else
    select * into product from public.products where sku = p_sku for update;
    if not found or p_qty < 1 or p_qty > product.stock then
      raise exception 'INSUFFICIENT_STOCK';
    end if;
    if product.price <> p_price then
      raise exception 'PRICE_CHANGED';
    end if;
    update public.products set stock = stock - p_qty where sku = p_sku;
    insert into public.orders (id, employee_name, employee_code, sku, quantity, unit_price)
    values (p_id, p_name, p_code, p_sku, p_qty, product.price) returning * into receipt;
  end if;
  return jsonb_build_object('id', receipt.id, 'quantity', receipt.quantity, 'total', receipt.total::text);
end;
$$;
revoke all on function public.place_order(uuid,text,text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.place_order(uuid,text,text,text,integer,integer) to service_role;
