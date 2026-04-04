'use client';

import { apiFetch } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';

type PersonType = 'PF' | 'PJ';

function digitsOnly(s: string) {
  return s.replace(/\D/g, '');
}

function formatCpf(d: string): string {
  const x = digitsOnly(d).slice(0, 11);
  if (!x) return '';
  if (x.length <= 3) return x;
  if (x.length <= 6) return `${x.slice(0, 3)}.${x.slice(3)}`;
  if (x.length <= 9) return `${x.slice(0, 3)}.${x.slice(3, 6)}.${x.slice(6)}`;
  return `${x.slice(0, 3)}.${x.slice(3, 6)}.${x.slice(6, 9)}-${x.slice(9)}`;
}

/** xx.xxx.xxx/xxxx-xx */
function formatCnpj(d: string): string {
  const x = digitsOnly(d).slice(0, 14);
  if (!x) return '';
  if (x.length <= 2) return x;
  if (x.length <= 5) return `${x.slice(0, 2)}.${x.slice(2)}`;
  if (x.length <= 8) return `${x.slice(0, 2)}.${x.slice(2, 5)}.${x.slice(5)}`;
  if (x.length <= 12) {
    return `${x.slice(0, 2)}.${x.slice(2, 5)}.${x.slice(5, 8)}/${x.slice(8)}`;
  }
  return `${x.slice(0, 2)}.${x.slice(2, 5)}.${x.slice(5, 8)}/${x.slice(8, 12)}-${x.slice(12)}`;
}

function formatDocument(type: PersonType, storedDigits: string) {
  return type === 'PF' ? formatCpf(storedDigits) : formatCnpj(storedDigits);
}

type Client = {
  id: string;
  type: PersonType;
  name: string;
  document: string;
  address: string;
  phone: string;
};

const empty = {
  type: 'PF' as PersonType,
  name: '',
  document: '',
  address: '',
  phone: '',
};

export default function ClientesPage() {
  const [list, setList] = useState<Client[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Client[]>('/clients');
      setList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
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
    const doc = digitsOnly(form.document);
    if (form.type === 'PF' && doc.length !== 11) {
      setError('CPF deve ter 11 dígitos.');
      return;
    }
    if (form.type === 'PJ' && doc.length !== 14) {
      setError('CNPJ deve ter 14 dígitos.');
      return;
    }
    const payload = { ...form, document: doc };
    try {
      if (editingId) {
        await apiFetch(`/clients/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/clients', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      setForm(empty);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  function startEdit(c: Client) {
    setEditingId(c.id);
    setForm({
      type: c.type,
      name: c.name,
      document: digitsOnly(c.document),
      address: c.address,
      phone: c.phone,
    });
  }

  async function remove(id: string) {
    if (!confirm('Excluir este cliente?')) return;
    setError(null);
    try {
      await apiFetch(`/clients/${id}`, { method: 'DELETE' });
      if (editingId === id) {
        setEditingId(null);
        setForm(empty);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Clientes</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Pessoa física ou jurídica — CPF/CNPJ único.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 grid gap-4 sm:grid-cols-2"
      >
        <div className="sm:col-span-2 flex gap-4 items-center">
          <span className="text-sm text-zinc-400">Tipo de Pessoa:</span>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="type"
              checked={form.type === 'PF'}
              onChange={() =>
                setForm((f) => ({
                  ...f,
                  type: 'PF',
                  document: digitsOnly(f.document).slice(0, 11),
                }))
              }
            />
            Física
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="type"
              checked={form.type === 'PJ'}
              onChange={() =>
                setForm((f) => ({
                  ...f,
                  type: 'PJ',
                  document: digitsOnly(f.document).slice(0, 14),
                }))
              }
            />
            Jurídica
          </label>
        </div>
        <div>
          <label className="text-xs text-zinc-500">Nome</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="mt-1 w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500">
            {form.type === 'PF' ? 'CPF' : 'CNPJ'}
          </label>
          <input
            required
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder={
              form.type === 'PF'
                ? '000.000.000-00'
                : '00.000.000/0000-00'
            }
            value={formatDocument(form.type, form.document)}
            onChange={(e) => {
              const max = form.type === 'PF' ? 11 : 14;
              const next = digitsOnly(e.target.value).slice(0, max);
              setForm((f) => ({ ...f, document: next }));
            }}
            className="mt-1 w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm font-mono text-zinc-200"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-zinc-500">Endereço</label>
          <input
            required
            value={form.address}
            onChange={(e) =>
              setForm((f) => ({ ...f, address: e.target.value }))
            }
            className="mt-1 w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500">Telefone</label>
          <input
            required
            minLength={8}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="mt-1 w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2 flex gap-2">
          <button
            type="submit"
            className="rounded-lg bg-teal-600 hover:bg-teal-500 px-4 py-2 text-sm font-medium"
          >
            {editingId ? 'Atualizar' : 'Cadastrar'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(empty);
              }}
              className="rounded-lg border border-zinc-600 px-4 py-2 text-sm"
            >
              Cancelar edição
            </button>
          )}
        </div>
        {error && <p className="sm:col-span-2 text-sm text-red-400">{error}</p>}
      </form>

      <div className="rounded-xl border border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Telefone</th>
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
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-zinc-500">
                    Nenhum cliente cadastrado.
                  </td>
                </tr>
              ) : (
                list.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-3">{c.type}</td>
                    <td className="px-4 py-3 text-white">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-zinc-400">
                      {formatDocument(c.type, c.document)}
                    </td>
                    <td className="px-4 py-3">{c.phone}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(c)}
                        className="text-teal-400 text-xs hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(c.id)}
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
    </div>
  );
}
