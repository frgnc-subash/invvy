import { useEffect, useMemo, useState } from 'react';
import { Loader2, PackageSearch, Search } from 'lucide-react';
import { getItems } from '../api';
import type { Item } from '../types';
import DashboardBar from '../components/DashboardBar';
import DashboardPageHeader from '../components/DashboardPageHeader';

const statusClasses: Record<Item['status'], string> = {
  'in-stock': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'low-stock': 'bg-blue-100 text-blue-800 ring-blue-300',
  'out-of-stock': 'bg-red-50 text-red-700 ring-red-200',
};

function statusLabel(status: Item['status']) {
  return status.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value));
}

function ItemsTable({ items }: { items: Item[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg shadow-stone-200/70 transition-shadow duration-200 hover:shadow-stone-200/80">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase text-stone-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">Quantity</th>
              <th className="px-4 py-3 font-semibold">Min Stock</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Cost</th>
              <th className="px-4 py-3 font-semibold">Supplier</th>
              <th className="px-4 py-3 font-semibold">Unit</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-stone-50">
                <td className="whitespace-nowrap px-4 py-4 font-medium text-stone-950">{item.name}</td>
                <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-stone-500">{item.sku}</td>
                <td className="whitespace-nowrap px-4 py-4 text-stone-800">{item.quantity}</td>
                <td className="whitespace-nowrap px-4 py-4 text-stone-500">{item.min_stock}</td>
                <td className="whitespace-nowrap px-4 py-4 text-stone-800">${item.price.toFixed(2)}</td>
                <td className="whitespace-nowrap px-4 py-4 text-stone-500">${item.cost.toFixed(2)}</td>
                <td className="whitespace-nowrap px-4 py-4 text-stone-500">{item.supplier || '-'}</td>
                <td className="whitespace-nowrap px-4 py-4 text-stone-500">{item.unit}</td>
                <td className="whitespace-nowrap px-4 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClasses[item.status]}`}>
                    {statusLabel(item.status)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-stone-500">{formatDate(item.last_updated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Items() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadItems() {
      try {
        const data = await getItems();
        if (active) setItems(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load items');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadItems();

    return () => {
      active = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => item.name.toLowerCase().includes(normalized) || item.sku.toLowerCase().includes(normalized));
  }, [items, query]);

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Global inventory"
        title="All Items"
        description="Search across every item in your workspace."
        actions={(
          <>
            <DashboardBar />
            <label className="relative block w-full max-w-md">
              <span className="sr-only">Search by name or SKU</span>
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Search item name or SKU"
              />
            </label>
          </>
        )}
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-700">
          <Loader2 size={18} className="animate-spin" />
          Loading items
        </div>
      ) : filteredItems.length > 0 ? (
        <ItemsTable items={filteredItems} />
      ) : (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white px-6 py-16 text-center shadow-lg shadow-stone-200/70 transition-shadow duration-200 hover:shadow-stone-200/80">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
            <PackageSearch size={28} />
          </div>
          <h3 className="mt-5 text-base font-semibold text-stone-950">No items found</h3>
          <p className="mt-2 text-sm text-stone-500">Try searching a different item name or SKU.</p>
        </div>
      )}
    </div>
  );
}
