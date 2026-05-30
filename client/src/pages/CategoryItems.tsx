import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Loader2, PackagePlus, Pencil, Trash2 } from 'lucide-react';
import { createItem, deleteItem, getCategories, getInventory, getItems, updateItem } from '../api';
import Modal from '../components/Modal';
import { SidebarTrigger } from '../components/ui/sidebar';
import DashboardBar from '../components/DashboardBar';
import type { Category, Inventory, Item, ItemCreate } from '../types';

const statusClasses: Record<Item['status'], string> = {
  'in-stock': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'low-stock': 'bg-blue-100 text-blue-800 ring-blue-300',
  'out-of-stock': 'bg-red-50 text-red-700 ring-red-200',
};

const emptyForm = {
  name: '',
  sku: '',
  quantity: '0',
  min_stock: '0',
  price: '0',
  cost: '0',
  supplier: '',
  unit: 'pieces',
  status: 'in-stock' as Item['status'],
  image: '',
};

function statusLabel(status: Item['status']) {
  return status.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ');
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value));
}

function toFormData(item: Item) {
  return {
    name: item.name,
    sku: item.sku,
    quantity: String(item.quantity),
    min_stock: String(item.min_stock),
    price: String(item.price),
    cost: String(item.cost),
    supplier: item.supplier || '',
    unit: item.unit,
    status: item.status,
    image: item.image || '',
  };
}

function buildItemPayload(form: typeof emptyForm, categoryId: string): ItemCreate {
  return {
    name: form.name,
    sku: form.sku,
    category_id: categoryId,
    quantity: Number(form.quantity) || 0,
    min_stock: Number(form.min_stock) || 0,
    price: Number(form.price) || 0,
    cost: Number(form.cost) || 0,
    supplier: form.supplier || undefined,
    unit: form.unit || 'pieces',
    status: form.status,
    image: form.image || undefined,
  };
}

function ItemsTable({
  items,
  onEdit,
  onDelete,
}: {
  items: Item[];
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}) {
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
              <th className="px-4 py-3 font-semibold">Actions</th>
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
                <td className="whitespace-nowrap px-4 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-blue-700"
                      aria-label="Edit item"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-red-50 hover:text-red-700"
                      aria-label="Delete item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CategoryItems() {
  const { invId = '', catId = '' } = useParams();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadItems = async () => {
    if (!invId || !catId) return;
    setError('');

    try {
      const [inventoryData, categoryData, itemData] = await Promise.all([
        getInventory(invId),
        getCategories(invId),
        getItems({ cat_id: catId }),
      ]);
      setInventory(inventoryData);
      setCategory(categoryData.find((entry) => entry.id === catId) || null);
      setItems(itemData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load category items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [invId, catId]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (item: Item) => {
    setEditingItem(item);
    setForm(toFormData(item));
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!catId) return;
    setSaving(true);
    setError('');

    try {
      const payload = buildItemPayload(form, catId);
      if (editingItem) {
        await updateItem(editingItem.id, payload);
      } else {
        await createItem(payload);
      }
      closeModal();
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Item) => {
    setError('');
    try {
      await deleteItem(item.id);
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete item');
    }
  };

  const inventoryName = inventory?.name || 'Inventory';
  const categoryName = category?.name || 'Category';

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
        <Link to="/inventories" className="hover:text-blue-700">Inventories</Link>
        <ChevronRight size={16} className="text-stone-400" />
        <Link to={`/inventories/${invId}`} className="hover:text-blue-700">{inventoryName}</Link>
        <ChevronRight size={16} className="text-stone-400" />
        <span className="text-stone-800">{categoryName}</span>
      </nav>

      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-2">
          <SidebarTrigger className="mt-0.5 size-9 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-blue-700">Category items</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">{categoryName}</h2>
          </div>
        </div>
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          <div className="shrink-0">
            <DashboardBar />
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700 sm:w-auto"
          >
            <PackagePlus size={18} />
            Add Item
          </button>
        </div>
      </div>

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
      ) : (
        <ItemsTable items={items} onEdit={openEditModal} onDelete={handleDelete} />
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? 'Edit Item' : 'New Item'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="itemName" className="modal-label">Name</label>
            <input id="itemName" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="modal-field" required autoFocus />
          </div>
          <div>
            <label htmlFor="itemSku" className="modal-label">SKU</label>
            <input id="itemSku" value={form.sku} onChange={(event) => setForm({ ...form, sku: event.target.value })} className="modal-field" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="itemQuantity" className="modal-label">Quantity</label>
              <input id="itemQuantity" type="number" min="0" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="modal-field" required />
            </div>
            <div>
              <label htmlFor="itemMinStock" className="modal-label">Min Stock</label>
              <input id="itemMinStock" type="number" min="0" value={form.min_stock} onChange={(event) => setForm({ ...form, min_stock: event.target.value })} className="modal-field" required />
            </div>
            <div>
              <label htmlFor="itemPrice" className="modal-label">Price</label>
              <input id="itemPrice" type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} className="modal-field" required />
            </div>
            <div>
              <label htmlFor="itemCost" className="modal-label">Cost</label>
              <input id="itemCost" type="number" min="0" step="0.01" value={form.cost} onChange={(event) => setForm({ ...form, cost: event.target.value })} className="modal-field" required />
            </div>
          </div>
          <div>
            <label htmlFor="itemSupplier" className="modal-label">Supplier</label>
            <input id="itemSupplier" value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })} className="modal-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="itemUnit" className="modal-label">Unit</label>
              <input id="itemUnit" value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} className="modal-field" required />
            </div>
            <div>
              <label htmlFor="itemStatus" className="modal-label">Status</label>
              <select id="itemStatus" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as Item['status'] })} className="modal-field">
                <option value="in-stock">In Stock</option>
                <option value="low-stock">Low Stock</option>
                <option value="out-of-stock">Out of Stock</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={closeModal} className="modal-button-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="modal-button-primary">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
