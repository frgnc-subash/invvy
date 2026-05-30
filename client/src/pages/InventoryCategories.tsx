import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, ChevronRight, Layers3, Loader2, Package, PackagePlus, Pencil, Trash2 } from 'lucide-react';
import { createCategory, deleteCategory, getCategories, getInventory, updateCategory } from '../api';
import Modal from '../components/Modal';
import { SidebarTrigger } from '../components/ui/sidebar';
import DashboardBar from '../components/DashboardBar';
import type { Category, Inventory } from '../types';

export default function InventoryCategories() {
  const { invId = '' } = useParams();
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const loadCategories = async () => {
    if (!invId) return;
    setError('');

    try {
      const [inventoryData, categoryData] = await Promise.all([
        getInventory(invId),
        getCategories(invId),
      ]);
      setInventory(inventoryData);
      setCategories(categoryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [invId]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setName('');
    setDescription('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!invId) return;
    setSaving(true);
    setError('');

    try {
      if (editingCategory) {
        await updateCategory(invId, editingCategory.id, name, description || undefined);
      } else {
        await createCategory(invId, name, description || undefined);
      }
      closeModal();
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!invId) return;
    setError('');

    try {
      await deleteCategory(invId, category.id);
      await loadCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete category');
    }
  };

  const inventoryName = inventory?.name || 'Inventory';

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
        <Link to="/inventories" className="hover:text-blue-700">Inventories</Link>
        <ChevronRight size={16} className="text-stone-400" />
        <span className="text-stone-800">{inventoryName}</span>
      </nav>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-2">
          <SidebarTrigger className="mt-0.5 size-9 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground" />
          <div>
            <p className="text-sm font-medium text-blue-700">Category overview</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">{inventoryName}</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <DashboardBar />
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
          >
            <PackagePlus size={18} />
            Create Category
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
          Loading categories
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/inventories/${invId}/${category.id}`}
            className="group rounded-lg border border-stone-200 bg-white p-5 shadow-lg shadow-stone-200/70 transition-shadow duration-200 hover:shadow-stone-200/80"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600/10 text-blue-700">
                <Layers3 size={22} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    openEditModal(category);
                  }}
                  className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-blue-700"
                  aria-label="Edit category"
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    handleDelete(category);
                  }}
                  className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-red-50 hover:text-red-700"
                  aria-label="Delete category"
                >
                  <Trash2 size={16} />
                </button>
                <ArrowRight size={18} className="text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-700" />
              </div>
            </div>
            <h3 className="mt-5 text-lg font-semibold text-stone-950">{category.name}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">{category.description || 'No description provided.'}</p>
            <div className="mt-5 flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm">
              <span className="flex items-center gap-2 text-stone-500"><Package size={16} /> Items</span>
              <span className="font-semibold text-stone-900">{category.item_count}</span>
            </div>
            <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm">
              <p className="text-stone-500">Total quantity</p>
              <p className="mt-1 font-semibold text-stone-900">{category.total_quantity}</p>
            </div>
          </Link>
        ))}
      </section>

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingCategory ? 'Edit Category' : 'New Category'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="categoryName" className="modal-label">
              Name
            </label>
            <input
              id="categoryName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="modal-field"
              required
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="categoryDescription" className="modal-label">
              Description
            </label>
            <textarea
              id="categoryDescription"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="modal-field modal-textarea"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="modal-button-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="modal-button-primary"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
