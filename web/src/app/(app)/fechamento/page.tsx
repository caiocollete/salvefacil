'use client';

import { apiFetch } from '@/lib/api';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type ClosingRow = {
  shippingDate: string;
  orderNumber: string;
  clientName: string;
  clientDocument: string;
  personType: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

type ClosingResponse = {
  period: { from: string; to: string };
  rows: ClosingRow[];
  summary: {
    orderCount: number;
    lineCount: number;
    totalBRL: string;
  };
};

type MonthlyResponse = {
  year: number;
  months: {
    month: number;
    label: string;
    orderCount: number;
    totalBRL: string;
  }[];
  yearTotalBRL: string;
};

type ClientOption = {
  id: string;
  name: string;
  type: string;
  document: string;
};

function formatClientLabel(c: ClientOption) {
  return `${c.name} (${c.type}) — ${c.document}`;
}

function clientMatchesQuery(c: ClientOption, raw: string) {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  if (c.name.toLowerCase().includes(q)) return true;
  if (c.document.toLowerCase().includes(q)) return true;
  const digitsDoc = c.document.replace(/\D/g, '');
  const digitsQ = q.replace(/\D/g, '');
  if (digitsQ.length >= 3 && digitsDoc.includes(digitsQ)) return true;
  return false;
}

type ByClientResponse = {
  period: { from: string; to: string };
  filterClientId: string | null;
  clients: {
    id: string;
    name: string;
    document: string;
    personType: string;
    orderCount: number;
    totalBRL: string;
  }[];
  summary: { clientCount: number; totalBRL: string };
};

export default function FechamentoPage() {
  const yearNow = new Date().getFullYear();
  const [from, setFrom] = useState(`${yearNow}-01-01`);
  const [to, setTo] = useState(`${yearNow}-12-31`);
  const [year, setYear] = useState(yearNow);
  const [reportClientId, setReportClientId] = useState('');
  const [clientInput, setClientInput] = useState('');
  const [clientMenuOpen, setClientMenuOpen] = useState(false);
  const [clientHighlight, setClientHighlight] = useState(0);
  const clientPickerRef = useRef<HTMLDivElement>(null);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [closing, setClosing] = useState<ClosingResponse | null>(null);
  const [monthly, setMonthly] = useState<MonthlyResponse | null>(null);
  const [byClient, setByClient] = useState<ByClientResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    void apiFetch<ClientOption[]>('/clients')
      .then(setClientOptions)
      .catch(() => {
        /* lista opcional; erro já aparece ao gerar relatório */
      });
  }, []);

  const filteredClients = useMemo(() => {
    return clientOptions.filter((c) => clientMatchesQuery(c, clientInput));
  }, [clientOptions, clientInput]);

  const menuRows = useMemo(() => {
    return [
      { kind: 'all' as const },
      ...filteredClients.map((c) => ({ kind: 'client' as const, client: c })),
    ];
  }, [filteredClients]);

  useEffect(() => {
    setClientHighlight(0);
  }, [clientInput, clientMenuOpen]);

  useEffect(() => {
    if (!clientMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!clientPickerRef.current?.contains(e.target as Node)) {
        setClientMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [clientMenuOpen]);

  const pickClient = useCallback((c: ClientOption | null) => {
    if (!c) {
      setReportClientId('');
      setClientInput('');
    } else {
      setReportClientId(c.id);
      setClientInput(formatClientLabel(c));
    }
    setClientMenuOpen(false);
  }, []);

  const onClientInputChange = (v: string) => {
    setClientInput(v);
    setClientMenuOpen(true);
    const selected = clientOptions.find((x) => x.id === reportClientId);
    if (selected && formatClientLabel(selected) !== v) {
      setReportClientId('');
    }
  };

  const run = useCallback(
    async (which: 'closing' | 'monthly' | 'client') => {
      setError(null);
      setLoading(which);
      try {
        if (which === 'closing') {
          const q = new URLSearchParams({ from, to });
          const data = await apiFetch<ClosingResponse>(
            `/reports/closing?${q}`,
          );
          setClosing(data);
        } else if (which === 'monthly') {
          const data = await apiFetch<MonthlyResponse>(
            `/reports/monthly?year=${year}`,
          );
          setMonthly(data);
        } else {
          const q = new URLSearchParams({ from, to });
          if (reportClientId) {
            q.set('clientId', reportClientId);
          }
          const data = await apiFetch<ByClientResponse>(
            `/reports/by-client?${q}`,
          );
          setByClient(data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro');
      } finally {
        setLoading(null);
      }
    },
    [from, to, year, reportClientId],
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div>
        <h1 className="text-2xl font-semibold text-white">Fechamento</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Relatórios por período (data de envio), mensal e por cliente (PF/PJ).
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-400 border border-red-900/50 rounded-lg px-4 py-3 bg-red-950/30">
          {error}
        </p>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
        <h2 className="text-lg font-medium text-white">
          Recibo — linhas e sumário
        </h2>
        <p className="text-xs text-zinc-500">
          Cada linha é um item de pedido; ao final, totais do período.
        </p>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-zinc-500">De</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-200"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Até</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-200"
            />
          </div>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void run('closing')}
            className="rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 px-4 py-2 text-sm font-medium"
          >
            {loading === 'closing' ? '…' : 'Gerar'}
          </button>
        </div>
        {closing && (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-zinc-950 text-zinc-400">
                <tr>
                  <th className="px-2 py-2">Data</th>
                  <th className="px-2 py-2">Pedido</th>
                  <th className="px-2 py-2">Cliente</th>
                  <th className="px-2 py-2">Produto</th>
                  <th className="px-2 py-2">Qtd</th>
                  <th className="px-2 py-2">Unit.</th>
                  <th className="px-2 py-2">Linha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {closing.rows.map((r, i) => (
                  <tr key={i} className="hover:bg-zinc-900/50">
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {r.shippingDate}
                    </td>
                    <td className="px-2 py-1.5 font-mono">{r.orderNumber}</td>
                    <td className="px-2 py-1.5">{r.clientName}</td>
                    <td className="px-2 py-1.5">{r.productName}</td>
                    <td className="px-2 py-1.5">{r.quantity}</td>
                    <td className="px-2 py-1.5 font-mono">{r.unitPrice}</td>
                    <td className="px-2 py-1.5 font-mono">{r.lineTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-zinc-800 bg-zinc-950 px-4 py-3 text-sm space-y-1">
              <p className="text-zinc-400">
                Período: {closing.period.from} — {closing.period.to}
              </p>
              <p className="text-white font-medium">
                Sumário: {closing.summary.orderCount} pedidos,{' '}
                {closing.summary.lineCount} linhas — Total R${' '}
                {closing.summary.totalBRL}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
        <h2 className="text-lg font-medium text-white">Mensal (por envio)</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-zinc-500">Ano</label>
            <input
              type="number"
              min={1950}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="mt-1 block w-28 rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-200"
            />
          </div>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void run('monthly')}
            className="rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 px-4 py-2 text-sm font-medium"
          >
            {loading === 'monthly' ? '…' : 'Gerar'}
          </button>
        </div>
        {monthly && (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2">Mês</th>
                  <th className="px-4 py-2">Pedidos</th>
                  <th className="px-4 py-2">Total R$</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {monthly.months.map((m) => (
                  <tr key={m.month} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-2">{m.label}</td>
                    <td className="px-4 py-2">{m.orderCount}</td>
                    <td className="px-4 py-2 font-mono">{m.totalBRL}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-zinc-800 bg-zinc-950">
                <tr>
                  <td className="px-4 py-2 font-medium text-white" colSpan={2}>
                    Ano {monthly.year}
                  </td>
                  <td className="px-4 py-2 font-mono font-medium text-teal-300">
                    {monthly.yearTotalBRL}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
        <h2 className="text-lg font-medium text-white">Por cliente</h2>
        <p className="text-xs text-zinc-500">
          PF e PJ. Escolha um cliente para filtrar ou deixe &quot;Todos&quot;
          para ver o resumo de cada um no período.
        </p>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs text-zinc-500">De</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-200"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500">Até</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-200"
            />
          </div>
          <div
            ref={clientPickerRef}
            className="min-w-[220px] flex-1 relative z-20"
          >
            <label className="text-xs text-zinc-500">Cliente</label>
            <input
              type="text"
              role="combobox"
              aria-expanded={clientMenuOpen}
              aria-controls="fechamento-client-listbox"
              aria-autocomplete="list"
              placeholder="Todos — digite nome ou documento para buscar"
              value={clientInput}
              onChange={(e) => onClientInputChange(e.target.value)}
              onFocus={() => setClientMenuOpen(true)}
              onKeyDown={(e) => {
                if (!clientMenuOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
                  setClientMenuOpen(true);
                  return;
                }
                if (e.key === 'Escape') {
                  setClientMenuOpen(false);
                  return;
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setClientHighlight((i) =>
                    Math.min(i + 1, menuRows.length - 1),
                  );
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setClientHighlight((i) => Math.max(i - 1, 0));
                } else if (e.key === 'Enter' && clientMenuOpen) {
                  e.preventDefault();
                  const row = menuRows[clientHighlight];
                  if (!row) return;
                  if (row.kind === 'all') pickClient(null);
                  else pickClient(row.client);
                }
              }}
              className="mt-1 block w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600"
            />
            {clientMenuOpen && (
              <ul
                id="fechamento-client-listbox"
                role="listbox"
                className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 py-1 shadow-xl"
              >
                {menuRows.map((row, idx) => {
                  if (row.kind === 'all') {
                    return (
                      <li key="__all__">
                        <button
                          type="button"
                          role="option"
                          aria-selected={!reportClientId && idx === clientHighlight}
                          className={`w-full text-left px-3 py-2 text-sm ${
                            idx === clientHighlight
                              ? 'bg-zinc-800 text-white'
                              : 'text-zinc-300 hover:bg-zinc-800/80'
                          }`}
                          onMouseEnter={() => setClientHighlight(idx)}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pickClient(null)}
                        >
                          Todos os clientes
                        </button>
                      </li>
                    );
                  }
                  const c = row.client;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={reportClientId === c.id}
                        className={`w-full text-left px-3 py-2 text-sm ${
                          idx === clientHighlight
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-300 hover:bg-zinc-800/80'
                        }`}
                        onMouseEnter={() => setClientHighlight(idx)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => pickClient(c)}
                      >
                        <span className="text-white">{c.name}</span>
                        <span className="text-zinc-500">
                          {' '}
                          ({c.type}) —{' '}
                        </span>
                        <span className="font-mono text-zinc-400">
                          {c.document}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {filteredClients.length === 0 && clientInput.trim() !== '' && (
                  <li className="px-3 py-2 text-sm text-zinc-500">
                    Nenhum cliente encontrado
                  </li>
                )}
              </ul>
            )}
          </div>
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => void run('client')}
            className="rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 px-4 py-2 text-sm font-medium"
          >
            {loading === 'client' ? '…' : 'Gerar'}
          </button>
        </div>
        {byClient && (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2">Documento</th>
                  <th className="px-4 py-2">Tipo</th>
                  <th className="px-4 py-2">Pedidos</th>
                  <th className="px-4 py-2">Total R$</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {byClient.clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-zinc-500">
                      Nenhum pedido neste período
                      {byClient.filterClientId ? ' para este cliente.' : '.'}
                    </td>
                  </tr>
                ) : (
                  byClient.clients.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-900/50">
                      <td className="px-4 py-2 text-white">{c.name}</td>
                      <td className="px-4 py-2 font-mono text-zinc-400">
                        {c.document}
                      </td>
                      <td className="px-4 py-2">{c.personType}</td>
                      <td className="px-4 py-2">{c.orderCount}</td>
                      <td className="px-4 py-2 font-mono">{c.totalBRL}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {byClient.clients.length > 0 && (
                <tfoot className="border-t border-zinc-800 bg-zinc-950">
                  <tr>
                    <td className="px-4 py-2 font-medium" colSpan={4}>
                      {byClient.filterClientId
                        ? 'Total do cliente'
                        : `Total (${byClient.summary.clientCount} clientes)`}
                    </td>
                    <td className="px-4 py-2 font-mono font-medium text-teal-300">
                      {byClient.summary.totalBRL}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
