"use client";

import { apiFetch } from "@/lib/api";
import { useCallback, useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  details: string | null;
  price: string;
};

export default function ProdutosPage() {
  const [list, setList] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [price, setPrice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Product[]>("/products");
      setList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body = {
      name,
      details: details.trim() || undefined,
      price: Number(price.replace(",", ".")),
    };
    try {
      if (editingId) {
        await apiFetch(`/products/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/products", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setName("");
      setDetails("");
      setPrice("");
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    }
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setName(p.name);
    setDetails(p.details ?? "");
    setPrice(p.price.replace(".", ","));
  }

  async function remove(id: string) {
    if (!confirm("Excluir este produto?")) return;
    try {
      await apiFetch(`/products/${id}`, { method: "DELETE" });
      if (editingId === id) {
        setEditingId(null);
        setName("");
        setDetails("");
        setPrice("");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Produtos</h1>
        <p className="text-sm text-zinc-600 mt-1">Nome, detalhes e preço.</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-zinc-200 bg-white shadow-sm p-6 space-y-4"
      >
        <div>
          <label className="text-xs text-zinc-600">Nome</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg bg-white border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-600">Detalhes</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg bg-white border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-600">Preço (R$)</label>
          <input
            required
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1 w-full max-w-xs rounded-lg bg-white border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 text-sm font-medium"
          >
            {editingId ? "Atualizar" : "Cadastrar"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setName("");
                setDetails("");
                setPrice("");
              }}
              className="rounded-lg border border-zinc-300 text-zinc-800 px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <div className="rounded-xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-100 text-zinc-700 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Preço</th>
              <th className="px-4 py-3 w-32"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-zinc-600">
                  Carregando…
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-zinc-600">
                  Nenhum produto.
                </td>
              </tr>
            ) : (
              list.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <span className="text-zinc-900">{p.name}</span>
                    {p.details && (
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {p.details}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono">
                    R$ {Number(p.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="text-teal-700 text-xs hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(p.id)}
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
  );
}
