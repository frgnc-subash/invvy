import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  DollarSign,
  Layers3,
  Loader2,
  Package,
  PackageCheck,
  PackageX,
} from 'lucide-react';
import { getDashboardStats, getInventories, getItems } from '../api';
import { ChartAreaInteractive, type InventoryChartDatum } from '../components/chart-area-interactive';
import DashboardBar from '../components/DashboardBar';
import { SidebarTrigger } from '../components/ui/sidebar';
import type { DashboardStats, Inventory, Item } from '../types';

const emptyStats: DashboardStats = {
  total_items: 0,
  in_stock: 0,
  low_stock: 0,
  out_of_stock: 0,
  total_value: 0,
  total_cost: 0,
  inventory_count: 0,
  category_count: 0,
};

const statusClasses: Record<Item['status'], string> = {
  'in-stock': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'low-stock': 'bg-blue-100 text-blue-800 ring-blue-300',
  'out-of-stock': 'bg-red-50 text-red-700 ring-red-200',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit' }).format(new Date(value));
}

function statusLabel(status: Item['status']) {
  return status.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone = 'slate',
}: {
  label: string;
  value: string | number;
  icon: typeof Package;
  tone?: 'slate' | 'green' | 'blue' | 'red';
}) {
  const toneClasses = {
    slate: 'bg-stone-100 text-stone-600',
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-100 text-blue-800',
    red: 'bg-red-50 text-red-700',
  };

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-stone-950">{value}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-center">
      <p className="text-sm font-medium text-stone-800">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{description}</p>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setError('');
      try {
        const [statsData, inventoryData, itemData] = await Promise.all([
          getDashboardStats(),
          getInventories(),
          getItems(),
        ]);

        if (!active) return;
        setStats(statsData);
        setInventories(inventoryData);
        setItems(itemData);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not load dashboard');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const stockRiskItems = useMemo(
    () =>
      items
        .filter((item) => item.status === 'low-stock' || item.status === 'out-of-stock' || item.quantity <= item.min_stock)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 6),
    [items],
  );

  const topInventories = useMemo(
    () => [...inventories].sort((a, b) => b.item_count - a.item_count).slice(0, 5),
    [inventories],
  );

  const chartData = useMemo<InventoryChartDatum[]>(
    () =>
      [...inventories]
        .sort((a, b) => b.item_count - a.item_count)
        .slice(0, 8)
        .map((inventory) => ({
          name: inventory.name,
          items: inventory.item_count,
          categories: inventory.category_count,
        })),
    [inventories],
  );

  const margin = stats.total_value - stats.total_cost;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-2">
          <SidebarTrigger className="mt-0.5 size-9 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-950 dark:text-stone-100">Dashboard</h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Inventory operations workspace</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <DashboardBar />
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-4 text-sm text-stone-600 shadow-sm">
          <Loader2 size={18} className="animate-spin" />
          Loading dashboard
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Total items" value={stats.total_items} icon={Package} />
            <StatTile label="In stock" value={stats.in_stock} icon={PackageCheck} tone="green" />
            <StatTile label="Low stock" value={stats.low_stock} icon={AlertTriangle} tone="blue" />
            <StatTile label="Out of stock" value={stats.out_of_stock} icon={PackageX} tone="red" />
          </section>

          <ChartAreaInteractive data={chartData} />

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-stone-950">Inventory locations</h3>
                  <p className="mt-1 text-sm text-stone-500">{stats.inventory_count} locations, {stats.category_count} categories</p>
                </div>
                <Boxes size={20} className="text-stone-400" />
              </div>

              <div className="mt-5 space-y-3">
                {topInventories.length > 0 ? (
                  topInventories.map((inventory) => (
                    <Link
                      key={inventory.id}
                      to={`/inventories/${inventory.id}`}
                      className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 transition-colors hover:bg-blue-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-stone-900">{inventory.name}</p>
                        <p className="mt-1 truncate text-xs text-stone-500">
                          {inventory.description || `Created ${formatDate(inventory.created_at)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-5 text-right text-sm">
                        <div>
                          <p className="text-stone-900">{inventory.item_count}</p>
                          <p className="text-xs text-stone-500">items</p>
                        </div>
                        <div>
                          <p className="text-stone-900">{inventory.category_count}</p>
                          <p className="text-xs text-stone-500">cats</p>
                        </div>
                        <ArrowRight size={16} className="text-stone-400" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <EmptyState title="No inventories yet" description="Create an inventory to start tracking stock." />
                )}
              </div>
            </div>

            <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-stone-950">Stock value</h3>
                  <p className="mt-1 text-sm text-stone-500">Current item totals</p>
                </div>
                <DollarSign size={20} className="text-stone-400" />
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500">Retail value</span>
                    <span className="font-medium text-stone-900">{formatCurrency(stats.total_value)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-stone-100">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: stats.total_value > 0 ? '100%' : '0%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500">Cost basis</span>
                    <span className="font-medium text-stone-900">{formatCurrency(stats.total_cost)}</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-stone-100">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: stats.total_value > 0 ? `${Math.min((stats.total_cost / stats.total_value) * 100, 100)}%` : '0%' }}
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
                  <p className="text-sm text-stone-500">Estimated margin</p>
                  <p className="mt-1 text-xl font-semibold text-stone-950">{formatCurrency(margin)}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-base font-semibold text-stone-950">Needs attention</h3>
                <p className="mt-1 text-sm text-stone-500">Items at or below their minimum stock level</p>
              </div>
              <Link to="/items" className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-blue-700">
                View all items
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-stone-200">
              {stockRiskItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                    <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Item</th>
                        <th className="px-4 py-3 font-semibold">SKU</th>
                        <th className="px-4 py-3 font-semibold">Qty</th>
                        <th className="px-4 py-3 font-semibold">Min</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white">
                      {stockRiskItems.map((item) => (
                        <tr key={item.id} className="hover:bg-stone-50">
                          <td className="whitespace-nowrap px-4 py-4 font-medium text-stone-950">{item.name}</td>
                          <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-stone-500">{item.sku}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-stone-800">{item.quantity}</td>
                          <td className="whitespace-nowrap px-4 py-4 text-stone-500">{item.min_stock}</td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClasses[item.status]}`}>
                              {statusLabel(item.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-stone-50 p-5">
                  <EmptyState title="Stock levels look good" description="No low or out-of-stock items need attention." />
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <StatTile label="Inventories" value={stats.inventory_count} icon={Layers3} />
            <StatTile label="Categories" value={stats.category_count} icon={Boxes} />
          </section>
        </>
      )}
    </div>
  );
}
