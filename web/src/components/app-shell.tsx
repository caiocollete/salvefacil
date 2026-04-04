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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      <aside className="w-56 border-r border-zinc-800 p-4 flex flex-col gap-6 shrink-0">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
            SalveFacil
          </p>
          <p className="text-sm font-semibold text-white mt-1">CRUD</p>
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
                    ? 'bg-teal-600/20 text-teal-300'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
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
