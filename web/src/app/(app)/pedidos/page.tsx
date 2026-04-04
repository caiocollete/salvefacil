'use client';

import { apiFetch } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';

type Client = { id: string; name: string; type: string };
type Product = { id: string; name: string; price: string };
type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: string;
  product: Product;
};
type Order = {
  id: string;
  orderNumber: string;
  shippingDate: string;
  total: string;
  client: Client;
  items: OrderItem[];
};

type Line = { productId: string; quantity: number };

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [shippingDate, setShippingDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: 1 }]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, c, p] = await Promise.all([
        apiFetch<Order[]>('/orders'),
        apiFetch<Client[]>('/clients'),
        apiFetch<Product[]>('/products'),
      ]);
      setOrders(o);
      setClients(c);
      setProducts(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function addLine() {
    setLines((L) => [...L, { productId: '', quantity: 1 }]);
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((L) => L.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  function removeLine(i: number) {
    setLines((L) => L.filter((_, j) => j !== i));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const items = lines
      .filter((l) => l.productId)
      .map((l) => ({ productId: l.productId, quantity: l.quantity }));
    if (!items.length) {
      setError('Inclua ao menos um item com produto.');
      return;
    }
    const body = {
      orderNumber,
      clientId,
      shippingDate: new Date(shippingDate + 'T12:00:00.000Z').toISOString(),
      items,
    };
    try {
      if (editingId) {
        await apiFetch(`/orders/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch('/orders', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      resetForm();
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  function resetForm() {
    setOrderNumber('');
    setClientId('');
    setShippingDate(new Date().toISOString().slice(0, 10));
    setLines([{ productId: '', quantity: 1 }]);
    setEditingId(null);
  }

  function startEdit(o: Order) {
    setEditingId(o.id);
    setOrderNumber(o.orderNumber);
    setClientId(o.client.id);
    setShippingDate(o.shippingDate.slice(0, 10));
    setLines(
      o.items.map((it) => ({
        productId: it.product.id,
        quantity: it.quantity,
      })),
    );
  }

  async function removeOrder(id: string) {
    if (!confirm('Excluir este pedido?')) return;
    try {
      await apiFetch(`/orders/${id}`, { method: 'DELETE' });
      if (editingId === id) resetForm();
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Pedidos</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Vinculados ao cliente; total calculado pelos preços atuais dos
          produtos.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-500">Nº do pedido</label>
            <input
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="mt-1 w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Cliente</label>
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="mt-1 w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm"
            >
              <option value="">Selecione…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500">Data de envio</label>
            <input
              required
              type="date"
              value={shippingDate}
              onChange={(e) => setShippingDate(e.target.value)}
              className="mt-1 w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-200"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-500 uppercase">Itens</span>
            <button
              type="button"
              onClick={addLine}
              className="text-xs text-teal-400 hover:underline"
            >
              + produto
            </button>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[200px]">
                <select
                  value={line.productId}
                  onChange={(e) => updateLine(i, { productId: e.target.value })}
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm"
                >
                  <option value="">Produto…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — R$ {Number(p.price).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="text-xs text-zinc-500">Qtd</label>
                <input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(i, {
                      quantity: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="mt-1 w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm"
                />
              </div>
              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(i)}
                  className="text-red-400 text-xs pb-2"
                >
                  remover
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-teal-600 hover:bg-teal-500 px-4 py-2 text-sm font-medium"
          >
            {editingId ? 'Atualizar pedido' : 'Criar pedido'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Envio</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3 w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-zinc-500">
                  Carregando…
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-zinc-500">
                  Nenhum pedido.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-zinc-900/50 align-top">
                  <td className="px-4 py-3 font-mono text-white">
                    {o.orderNumber}
                    <ul className="mt-1 text-xs text-zinc-500 font-normal list-disc list-inside">
                      {o.items.map((it) => (
                        <li key={it.id}>
                          {it.product.name} × {it.quantity}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-4 py-3">{o.client.name}</td>
                  <td className="px-4 py-3">{o.shippingDate.slice(0, 10)}</td>
                  <td className="px-4 py-3 font-mono">
                    R$ {Number(o.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => startEdit(o)}
                      className="text-teal-400 text-xs hover:underline block"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeOrder(o.id)}
                      className="text-red-400 text-xs hover:underline"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
