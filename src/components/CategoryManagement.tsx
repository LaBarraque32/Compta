import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  FolderPlus,
  Folder
} from 'lucide-react';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../services/database';
import { Category, Subcategory } from '../types/accounting';

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<{ category: Category; subcategory: Subcategory } | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'recette' as 'recette' | 'depense'
  });
  const [subcategoryFormData, setSubcategoryFormData] = useState({
    code: '',
    name: '',
    parentCode: ''
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data.sort((a, b) => a.code.localeCompare(b.code)));
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id!, {
          ...formData,
          subcategories: editingCategory.subcategories
        });
      } else {
        await addCategory({
          ...formData,
          subcategories: []
        });
      }

      await loadCategories();
      resetCategoryForm();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleSubmitSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingSubcategory) return;

    try {
      const category = editingSubcategory.category;
      const subcategories = category.subcategories || [];
      
      const updatedSubcategories = subcategories.map(sub => 
        sub.code === editingSubcategory.subcategory.code 
          ? { ...subcategoryFormData, parentCode: category.code }
          : sub
      );

      await updateCategory(category.id!, {
        ...category,
        subcategories: updatedSubcategories
      });

      await loadCategories();
      resetSubcategoryForm();
    } catch (error) {
      console.error('Error saving subcategory:', error);
    }
  };

  const handleAddSubcategory = async (category: Category) => {
    if (!subcategoryFormData.code || !subcategoryFormData.name) return;

    try {
      const subcategories = category.subcategories || [];
      const newSubcategory: Subcategory = {
        ...subcategoryFormData,
        parentCode: category.code
      };

      await updateCategory(category.id!, {
        ...category,
        subcategories: [...subcategories, newSubcategory]
      });

      await loadCategories();
      setSubcategoryFormData({ code: '', name: '', parentCode: '' });
    } catch (error) {
      console.error('Error adding subcategory:', error);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      code: category.code,
      name: category.name,
      type: category.type
    });
    setShowForm(true);
  };

  const handleEditSubcategory = (category: Category, subcategory: Subcategory) => {
    setEditingSubcategory({ category, subcategory });
    setSubcategoryFormData({
      code: subcategory.code,
      name: subcategory.name,
      parentCode: subcategory.parentCode
    });
  };

  const handleDeleteCategory = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ? Toutes les sous-catégories seront également supprimées.')) {
      try {
        await deleteCategory(id);
        await loadCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const handleDeleteSubcategory = async (category: Category, subcategoryCode: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette sous-catégorie ?')) {
      try {
        const updatedSubcategories = (category.subcategories || []).filter(
          sub => sub.code !== subcategoryCode
        );

        await updateCategory(category.id!, {
          ...category,
          subcategories: updatedSubcategories
        });

        await loadCategories();
      } catch (error) {
        console.error('Error deleting subcategory:', error);
      }
    }
  };

  const resetCategoryForm = () => {
    setFormData({ code: '', name: '', type: 'recette' });
    setEditingCategory(null);
    setShowForm(false);
  };

  const resetSubcategoryForm = () => {
    setSubcategoryFormData({ code: '', name: '', parentCode: '' });
    setEditingSubcategory(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Gestion des catégories</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} className="mr-2" />
          Nouvelle catégorie
        </button>
      </div>

      {/* Category Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={resetCategoryForm}></div>
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                </h3>
                <button onClick={resetCategoryForm} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmitCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: 70"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ex: Ventes de prestations de services"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="recette">Recette</option>
                    <option value="depense">Dépense</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetCategoryForm}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Save size={16} className="mr-2" />
                    {editingCategory ? 'Modifier' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Category Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Folder className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {category.code} - {category.name}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      category.type === 'recette' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {category.type === 'recette' ? 'Recette' : 'Dépense'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditCategory(category)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Modifier"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteCategory(category.id!)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Subcategories */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">Sous-catégories</h4>
              </div>

              {/* Add Subcategory Form */}
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="text"
                  placeholder="Code"
                  value={subcategoryFormData.code}
                  onChange={(e) => setSubcategoryFormData(prev => ({ ...prev, code: e.target.value }))}
                  className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Nom de la sous-catégorie"
                  value={subcategoryFormData.name}
                  onChange={(e) => setSubcategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => handleAddSubcategory(category)}
                  disabled={!subcategoryFormData.code || !subcategoryFormData.name}
                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Ajouter"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* Subcategories List */}
              <div className="space-y-2">
                {(category.subcategories || []).map((subcategory) => (
                  <div key={subcategory.code} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    {editingSubcategory?.subcategory.code === subcategory.code ? (
                      <form onSubmit={handleSubmitSubcategory} className="flex items-center space-x-2 flex-1">
                        <input
                          type="text"
                          value={subcategoryFormData.code}
                          onChange={(e) => setSubcategoryFormData(prev => ({ ...prev, code: e.target.value }))}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          value={subcategoryFormData.name}
                          onChange={(e) => setSubcategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <button
                          type="submit"
                          className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                        >
                          <Save size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={resetSubcategoryForm}
                          className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="text-sm text-gray-900">
                          {subcategory.code} - {subcategory.name}
                        </span>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleEditSubcategory(category, subcategory)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteSubcategory(category, subcategory.code)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryManagement;