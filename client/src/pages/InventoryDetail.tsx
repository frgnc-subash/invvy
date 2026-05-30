import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Trash2, LayoutGrid } from 'lucide-react';
import Modal from '../components/Modal';

interface Item {
  id: string;
  name: string;
  quantity: number;
}

interface Category {
  id: string;
  name: string;
  items: Item[];
}

// Mock initial data
const initialCategories: Category[] = [
  {
    id: 'c1',
    name: 'Drinks',
    items: [
      { id: 'i1', name: 'Coca Cola', quantity: 45 },
      { id: 'i2', name: 'Water Bottles', quantity: 120 },
    ],
  },
  {
    id: 'c2',
    name: 'Snacks',
    items: [
      { id: 'i3', name: 'Potato Chips', quantity: 30 },
      { id: 'i4', name: 'Chocolate Bars', quantity: 15 },
    ],
  },
];

export default function InventoryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>(initialCategories);

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  
  // Form state
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('0');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const inventoryName = id === '1' ? 'Main Shop' : id === '2' ? 'Warehouse' : 'Unknown Inventory';

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategoryName.trim()) {
      setCategories([
        ...categories,
        { id: Date.now().toString(), name: newCategoryName.trim(), items: [] },
      ]);
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    setCategories(categories.filter((c) => c.id !== categoryId));
  };

  const openAddItemModal = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setNewItemName('');
    setNewItemQuantity('0');
    setIsItemModalOpen(true);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim() && selectedCategoryId) {
      const qty = parseInt(newItemQuantity) || 0;
      setCategories(
        categories.map((c) => {
          if (c.id === selectedCategoryId) {
            return {
              ...c,
              items: [
                ...c.items,
                { id: Date.now().toString(), name: newItemName.trim(), quantity: qty },
              ],
            };
          }
          return c;
        })
      );
      setIsItemModalOpen(false);
    }
  };

  const handleDeleteItem = (categoryId: string, itemId: string) => {
    setCategories(
      categories.map((c) => {
        if (c.id === categoryId) {
          return { ...c, items: c.items.filter((i) => i.id !== itemId) };
        }
        return c;
      })
    );
  };

  const handleUpdateQuantity = (categoryId: string, itemId: string, change: number) => {
    setCategories(
      categories.map((c) => {
        if (c.id === categoryId) {
          return {
            ...c,
            items: c.items.map((i) => {
              if (i.id === itemId) {
                const newQty = Math.max(0, i.quantity + change);
                return { ...i, quantity: newQty };
              }
              return i;
            }),
          };
        }
        return c;
      })
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 text-stone-500 hover:text-stone-950 hover:bg-stone-100 rounded-full transition-colors"
                title="Back to Dashboard"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-stone-950">{inventoryName}</h1>
              </div>
            </div>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-2 bg-blue-50 text-blue-800 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">Add Category</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {categories.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 border-dashed">
            <LayoutGrid className="mx-auto h-12 w-12 text-stone-400" />
            <h3 className="mt-4 text-sm font-semibold text-stone-950">No categories found</h3>
            <p className="mt-1 text-sm text-stone-500 mb-6">Create a category to start adding items.</p>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
            >
              <Plus size={18} />
              Add First Category
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map((category) => (
              <section key={category.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="bg-stone-50/50 border-b border-stone-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-stone-950">{category.name}</h2>
                    <span className="bg-stone-200 text-stone-700 py-0.5 px-2 rounded-full text-xs font-medium">
                      {category.items.length} items
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAddItemModal(category.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors"
                    >
                      <Plus size={16} />
                      Add Item
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 border border-transparent rounded-lg transition-colors"
                      title="Delete category"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="p-0">
                  {category.items.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-stone-500">No items in this category yet.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-stone-200">
                      {category.items.map((item) => (
                        <li key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 hover:bg-stone-50/50 transition-colors gap-4">
                          <div className="flex-1">
                            <p className="font-medium text-stone-950">{item.name}</p>
                            <p className="text-sm text-stone-500 sm:hidden mt-1">Quantity: {item.quantity}</p>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-64">
                            <div className="flex items-center gap-3 bg-stone-100 p-1 rounded-lg border border-stone-200">
                              <button
                                onClick={() => handleUpdateQuantity(category.id, item.id, -1)}
                                disabled={item.quantity <= 0}
                                className="p-1 text-stone-600 hover:text-stone-950 hover:bg-white rounded-md disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="font-semibold text-stone-950 w-8 text-center tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleUpdateQuantity(category.id, item.id, 1)}
                                className="p-1 text-stone-600 hover:text-stone-950 hover:bg-white rounded-md transition-colors"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                            <button
                              onClick={() => handleDeleteItem(category.id, item.id)}
                              className="p-2 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete item"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Add Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setNewCategoryName('');
        }}
        title="Add New Category"
      >
        <form onSubmit={handleAddCategory} className="space-y-4">
          <div>
            <label htmlFor="categoryName" className="modal-label">
              Category Name
            </label>
            <input
              type="text"
              id="categoryName"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="modal-field"
              placeholder="e.g. Electronics"
              required
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="modal-button-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-button-primary"
            >
              Add Category
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setNewItemName('');
          setNewItemQuantity('0');
        }}
        title="Add New Item"
      >
        <form onSubmit={handleAddItem} className="space-y-4">
          <div>
            <label htmlFor="itemName" className="modal-label">
              Item Name
            </label>
            <input
              type="text"
              id="itemName"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="modal-field"
              placeholder="e.g. AA Batteries"
              required
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="itemQty" className="modal-label">
              Initial Quantity
            </label>
            <input
              type="number"
              id="itemQty"
              min="0"
              value={newItemQuantity}
              onChange={(e) => setNewItemQuantity(e.target.value)}
              className="modal-field"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsItemModalOpen(false)}
              className="modal-button-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-button-primary"
            >
              Add Item
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
