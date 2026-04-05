'use client';

import { apiFetch } from '@/lib/api';
import {
  classificationLabels,
  digitsOnly,
  formatDocument,
  type ClientClassification,
  type PersonType,
} from '@/lib/format-document';
import { useCallback, useEffect, useMemo, useState } from 'react';

type ClientList = { id: string; name: string; type: string };

type ClientDetail = {
  id: string;
  name: string;
  type: PersonType;
  classification: ClientClassification;
  document: string;
  address: string;
  phone: string;
};

type Product = { id: string; name: string; price: string };
type OrderItem = {
  id: string;
  quantity: number;
  unitPrice: string;
  observation: string | null;
  product: Product;
};
type Order = {
  id: string;
  orderNumber: string;
  shippingDate: string;
  total: string;
  client: ClientDetail;
  items: OrderItem[];
};

type Line = { productId: string; quantity: number; observation: string };

function orderMatchesQuery(o: Order, raw: string) {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  if (o.orderNumber.toLowerCase().includes(q)) return true;
  if (o.client.name.toLowerCase().includes(q)) return true;
  const ship = o.shippingDate.slice(0, 10);
  if (ship.includes(q)) return true;
  const docDigits = digitsOnly(o.client.document);
  if (docDigits.includes(digitsOnly(q))) return true;
  if (
    formatDocument(o.client.type, docDigits).toLowerCase().includes(q)
  ) {
    return true;
  }
  for (const it of o.items) {
    if (it.product.name.toLowerCase().includes(q)) return true;
    if (it.observation && it.observation.toLowerCase().includes(q)) return true;
  }
  return false;
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<ClientList[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [shippingDate, setShippingDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [lines, setLines] = useState<Line[]>([
    { productId: '', quantity: 1, observation: '' },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);

  const filteredOrders = useMemo(
    () => orders.filter((o) => orderMatchesQuery(o, search)),
    [orders, search],
  );

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, c, p] = await Promise.all([
        apiFetch<Order[]>('/orders'),
        apiFetch<ClientList[]>('/clients'),
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

  useEffect(() => {
    if (!viewOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setViewOpen(false);
        setViewOrder(null);
        setViewError(null);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewOpen]);

  async function openView(orderId: string) {
    setViewOpen(true);
    setViewOrder(null);
    setViewError(null);
    setViewLoading(true);
    try {
      const detail = await apiFetch<Order>(`/orders/${orderId}`);
      setViewOrder(detail);
    } catch (e) {
      setViewError(e instanceof Error ? e.message : 'Erro ao carregar pedido');
    } finally {
      setViewLoading(false);
    }
  }

  function closeView() {
    setViewOpen(false);
    setViewOrder(null);
    setViewError(null);
  }

  function addLine() {
    setLines((L) => [...L, { productId: '', quantity: 1, observation: '' }]);
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
      .map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        ...(l.observation.trim() ? { observation: l.observation.trim() } : {}),
      }));
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
    setLines([{ productId: '', quantity: 1, observation: '' }]);
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
        observation: it.observation ?? '',
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
        <h1 className="text-2xl font-semibold text-zinc-900">Pedidos</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Vinculados ao cliente; total calculado pelos preços atuais dos
          produtos.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-zinc-200 bg-white shadow-sm p-6 space-y-4"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-zinc-600">Nº do pedido</label>
            <input
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-600">Cliente</label>
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white border border-zinc-300 px-3 py-2 text-sm"
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
            <label className="text-xs text-zinc-600">Data de envio</label>
            <input
              required
              type="date"
              value={shippingDate}
              onChange={(e) => setShippingDate(e.target.value)}
              className="mt-1 w-full rounded-lg bg-white border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-zinc-600 uppercase">Itens</span>
            <button
              type="button"
              onClick={addLine}
              className="text-xs text-teal-700 hover:underline"
            >
              + produto
            </button>
          </div>
          {lines.map((line, i) => (
            <div key={i} className="rounded-lg border border-zinc-200 p-3 space-y-2">
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-zinc-600">Produto</label>
                  <select
                    value={line.productId}
                    onChange={(e) =>
                      updateLine(i, { productId: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg bg-white border border-zinc-300 px-3 py-2 text-sm"
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
                  <label className="text-xs text-zinc-600">Qtd</label>
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(i, {
                        quantity: Math.max(1, Number(e.target.value) || 1),
                      })
                    }
                    className="mt-1 w-full rounded-lg bg-white border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                {lines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="text-red-600 text-xs pb-2"
                  >
                    remover
                  </button>
                )}
              </div>
              <div>
                <label className="text-xs text-zinc-600">Observação (opcional)</label>
                <input
                  type="text"
                  maxLength={2000}
                  value={line.observation}
                  onChange={(e) =>
                    updateLine(i, { observation: e.target.value })
                  }
                  placeholder="Nota sobre este item"
                  className="mt-1 w-full rounded-lg bg-white border border-zinc-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 text-sm font-medium"
          >
            {editingId ? 'Atualizar pedido' : 'Criar pedido'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-zinc-300 text-zinc-800 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-zinc-600">Buscar pedidos</label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nº do pedido, cliente, documento, data de envio, produto ou observação"
            className="mt-1 w-full max-w-xl rounded-lg bg-white border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-xl border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-100 text-zinc-700 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Envio</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3 w-40"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-zinc-600">
                    Carregando…
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-zinc-600">
                    Nenhum pedido.
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-zinc-600">
                    Nenhum pedido corresponde à busca.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50 align-top">
                    <td className="px-4 py-3 font-mono text-zinc-900">
                      {o.orderNumber}
                      <ul className="mt-1 text-xs text-zinc-600 font-normal list-disc list-inside">
                        {o.items.map((it) => (
                          <li key={it.id}>
                            {it.product.name} × {it.quantity}
                            {it.observation ? (
                              <span className="text-zinc-600">
                                {' '}
                                — {it.observation}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3">{o.client.name}</td>
                    <td className="px-4 py-3">{o.shippingDate.slice(0, 10)}</td>
                    <td className="px-4 py-3 font-mono">
                      R$ {Number(o.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 space-y-1">
                      <button
                        type="button"
                        onClick={() => void openView(o.id)}
                        className="text-zinc-700 text-xs hover:underline block"
                      >
                        Visualizar
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(o)}
                        className="text-teal-700 text-xs hover:underline block"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void removeOrder(o.id)}
                        className="text-red-600 text-xs hover:underline"
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

      {viewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-view-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeView();
          }}
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/10">
            <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-4">
              <h2 id="order-view-title" className="text-lg font-medium text-zinc-900">
                {viewOrder
                  ? `Pedido ${viewOrder.orderNumber}`
                  : 'Detalhes do pedido'}
              </h2>
              <button
                type="button"
                onClick={closeView}
                className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-800 hover:bg-zinc-100"
              >
                Fechar
              </button>
            </div>
            <div className="px-5 py-4 space-y-6 text-sm">
              {viewLoading && (
                <p className="text-zinc-600">Carregando…</p>
              )}
              {viewError && (
                <p className="text-red-600">{viewError}</p>
              )}
              {viewOrder && !viewLoading && (
                <>
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 mb-2">
                      Cliente
                    </h3>
                    <dl className="grid gap-2 sm:grid-cols-2 text-zinc-800">
                      <div>
                        <dt className="text-xs text-zinc-600">Nome</dt>
                        <dd className="text-zinc-900">{viewOrder.client.name}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-600">Tipo</dt>
                        <dd>{viewOrder.client.type}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-600">Classificação</dt>
                        <dd>
                          {classificationLabels[viewOrder.client.classification]}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-600">
                          {viewOrder.client.type === 'PF' ? 'CPF' : 'CNPJ'}
                        </dt>
                        <dd className="font-mono text-zinc-800">
                          {formatDocument(
                            viewOrder.client.type,
                            viewOrder.client.document,
                          )}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-zinc-600">Endereço</dt>
                        <dd>{viewOrder.client.address}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-600">Telefone</dt>
                        <dd>{viewOrder.client.phone}</dd>
                      </div>
                    </dl>
                  </section>

                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 mb-2">
                      Pedido
                    </h3>
                    <dl className="grid gap-2 sm:grid-cols-2 text-zinc-800 mb-4">
                      <div>
                        <dt className="text-xs text-zinc-600">Nº do pedido</dt>
                        <dd className="font-mono text-zinc-900">
                          {viewOrder.orderNumber}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-600">Data de envio</dt>
                        <dd>{viewOrder.shippingDate.slice(0, 10)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-zinc-600">Total</dt>
                        <dd className="font-mono text-zinc-900 text-base">
                          R$ {Number(viewOrder.total).toFixed(2)}
                        </dd>
                      </div>
                    </dl>

                    <div className="overflow-x-auto rounded-lg border border-zinc-200">
                      <table className="w-full text-xs sm:text-sm">
                        <thead className="bg-zinc-100 text-zinc-700">
                          <tr>
                            <th className="px-3 py-2 text-left">Produto</th>
                            <th className="px-3 py-2 text-right">Qtd</th>
                            <th className="px-3 py-2 text-left">Obs.</th>
                            <th className="px-3 py-2 text-right">Unit.</th>
                            <th className="px-3 py-2 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                          {viewOrder.items.map((it) => {
                            const sub =
                              Number(it.unitPrice) * it.quantity;
                            return (
                              <tr key={it.id} className="text-zinc-800">
                                <td className="px-3 py-2">{it.product.name}</td>
                                <td className="px-3 py-2 text-right">
                                  {it.quantity}
                                </td>
                                <td className="px-3 py-2 text-zinc-600 max-w-48">
                                  {it.observation ?? '—'}
                                </td>
                                <td className="px-3 py-2 text-right font-mono">
                                  R$ {Number(it.unitPrice).toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-right font-mono">
                                  R$ {sub.toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
