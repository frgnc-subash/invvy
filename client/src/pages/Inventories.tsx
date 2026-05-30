import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, CalendarDays, Loader2, PackagePlus, Pencil, Trash2 } from 'lucide-react';
import { createInventory, deleteInventory, getInventories, updateInventory } from '../api';
import Modal from '../components/Modal';
import DashboardBar from '../components/DashboardBar';
import DashboardPageHeader from '../components/DashboardPageHeader';
import type { Inventory } from '../types';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(value));
}

export default function Inventories() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInventory, setEditingInventory] = useState<Inventory | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const hasInventories = inventories.length > 0;

  const loadInventories = async () => {
    setError('');
    try {
      setInventories(await getInventories());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load inventories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventories();
  }, []);

  const openCreateModal = () => {
    setEditingInventory(null);
    setName('');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (inventory: Inventory) => {
    setEditingInventory(inventory);
    setName(inventory.name);
    setDescription(inventory.description || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingInventory(null);
    setName('');
    setDescription('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingInventory) {
        await updateInventory(editingInventory.id, name, description || undefined);
      } else {
        await createInventory(name, description || undefined);
      }
      closeModal();
      await loadInventories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save inventory');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (inventory: Inventory) => {
    setError('');
    try {
      await deleteInventory(inventory.id);
      await loadInventories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete inventory');
    }
  };

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Inventory locations"
        title="Inventories"
        description="Organize warehouses, shops, and storage locations."
        actions={(
          <>
            <DashboardBar />
            {hasInventories ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
              >
                <PackagePlus size={18} />
                Create Inventory
              </button>
            ) : null}
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
          Loading inventories
        </div>
      ) : null}

      {hasInventories ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {inventories.map((inventory) => (
            <Link
              key={inventory.id}
              to={`/inventories/${inventory.id}`}
              className="group rounded-lg border border-stone-200 bg-white p-5 shadow-lg shadow-stone-200/70 transition-shadow duration-200 hover:shadow-stone-200/80"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600/10 text-blue-700">
                  <Boxes size={22} />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      openEditModal(inventory);
                    }}
                    className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-blue-700"
                    aria-label="Edit inventory"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      handleDelete(inventory);
                    }}
                    className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-red-50 hover:text-red-700"
                    aria-label="Delete inventory"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ArrowRight size={18} className="text-stone-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-700" />
                </div>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-stone-950">{inventory.name}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-stone-500">{inventory.description || 'No description provided.'}</p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <p className="text-stone-500">Categories</p>
                  <p className="mt-1 font-semibold text-stone-900">{inventory.category_count}</p>
                </div>
                <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                  <p className="text-stone-500">Items</p>
                  <p className="mt-1 font-semibold text-stone-900">{inventory.item_count}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-stone-500">
                <CalendarDays size={15} />
                Created {formatDate(inventory.created_at)}
              </div>
            </Link>
          ))}
        </section>
      ) : !loading && !error ? (
        <section className="flex min-h-[52vh] items-center justify-center">
          <div className="w-full max-w-lg rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-600/10 text-blue-700">
              <Boxes size={28} />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight text-stone-950">No inventories yet</h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">
              Create your first inventory to start organizing locations, categories, and stock.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
              >
                <PackagePlus size={18} />
                Create Inventory
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingInventory ? 'Edit Inventory' : 'New Inventory'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="inventoryName" className="modal-label">
              Name
            </label>
            <input
              id="inventoryName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="modal-field"
              required
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="inventoryDescription" className="modal-label">
              Description
            </label>
            <textarea
              id="inventoryDescription"
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
