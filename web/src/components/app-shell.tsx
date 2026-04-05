'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/clientes', label: 'Clientes' },
  { href: '/produtos', label: 'Produtos' },
  { href: '/pedidos', label: 'Pedidos' },
  { href: '/fechamento', label: 'Fechamento' },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 flex">
      <aside className="w-56 border-r border-zinc-200 bg-white p-4 flex flex-col gap-6 shrink-0 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
            SalveFacil
          </p>
          <p className="text-sm font-semibold text-zinc-900 mt-1">CRUD</p>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-teal-100 text-teal-900 font-medium'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
