import React, { useState, useEffect } from 'react';
import { Save, Upload, X } from 'lucide-react';
import { addTransaction, generatePieceNumber, getCategories, getAllEvents } from '../services/database';
import { PAYMENT_METHODS } from '../data/accountingPlan';
import { Transaction, Category, Event } from '../types/accounting';
import { useExercise } from '../contexts/ExerciseContext';

interface TransactionFormProps {
  onTransactionAdded: () => void;
  onClose?: () => void;
  initialData?: Partial<Transaction>;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onTransactionAdded, 
  onClose,
  initialData 
}) => {
  const { activeExercice } = useExercise();
  const [categories, setCategories] = useState<(Category & { id: string })[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [formData, setFormData] = useState({
    date: initialData?.date || new Date().toISOString().split('T')[0],
    amount: initialData?.amount || 0,
    description: initialData?.description || '',
    category: initialData?.category || '',
    subcategory: initialData?.subcategory || '',
    paymentMethod: initialData?.paymentMethod || 'CB',
    type: initialData?.type || 'recette',
    eventId: initialData?.eventId || '',
    attachment: initialData?.attachment || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculer l'exercice basé sur la date
  const calculatedExercice = new Date(formData.date).getFullYear().toString();

  useEffect(() => {
    loadData();
  }, []);

  // Recharger les événements quand la date change
  useEffect(() => {
    const loadEventsForExercice = async () => {
      try {
        const eventsData = await getAllEvents();
        setEvents(eventsData.filter(e => e.exercice === calculatedExercice));
        // Reset eventId si l'événement sélectionné n'est plus dans le bon exercice
        if (formData.eventId) {
          const selectedEvent = eventsData.find(e => e.id === formData.eventId);
          if (selectedEvent && selectedEvent.exercice !== calculatedExercice) {
            setFormData(prev => ({ ...prev, eventId: '' }));
          }
        }
      } catch (error) {
        console.error('Error loading events for exercice:', error);
      }
    };

    loadEventsForExercice();
  }, [calculatedExercice, formData.eventId]);

  const loadData = async () => {
    try {
      const [categoriesData, eventsData] = await Promise.all([
        getCategories(),
        getAllEvents()
      ]);
      setCategories(categoriesData);
      // Filtrer les événements pour l'exercice calculé
      setEvents(eventsData.filter(e => e.exercice === calculatedExercice));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const selectedCategory = categories.find(cat => cat.code === formData.category);
  const subcategories = selectedCategory?.subcategories || [];

  useEffect(() => {
    // Reset subcategory when category changes
    if (formData.category && !subcategories.some(sub => sub.code === formData.subcategory)) {
      setFormData(prev => ({ ...prev, subcategory: '' }));
    }
  }, [formData.category, subcategories]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.date) newErrors.date = 'La date est obligatoire';
    if (!formData.amount || formData.amount <= 0) newErrors.amount = 'Le montant doit être supérieur à 0';
    if (!formData.description.trim()) newErrors.description = 'La description est obligatoire';
    if (!formData.category) newErrors.category = 'La catégorie est obligatoire';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const pieceNumber = await generatePieceNumber(formData.type as 'recette' | 'depense', calculatedExercice);

      await addTransaction({
        ...formData,
        amount: Number(formData.amount),
        pieceNumber,
        isValidated: false,
        exercice: calculatedExercice // Utiliser l'exercice calculé basé sur la date
      });

      onTransactionAdded();
      
      // Reset form
      setFormData({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        description: '',
        category: '',
        subcategory: '',
        paymentMethod: 'CB',
        type: 'recette',
        eventId: '',
        attachment: ''
      });

      if (onClose) onClose();
    } catch (error) {
      console.error('Error adding transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For demo purposes, we'll just store the filename
      // In a real app, you'd upload to a server or convert to base64
      setFormData(prev => ({ ...prev, attachment: file.name }));
    }
  };

  const getFilteredCategories = () => {
    return categories.filter(cat => cat.type === formData.type);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Nouvelle {formData.type === 'recette' ? 'recette' : 'dépense'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Exercice {calculatedExercice} (basé sur la date)
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Selection */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Type de transaction
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="recette"
                checked={formData.type === 'recette'}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any, category: '', subcategory: '' }))}
                className="sr-only"
              />
              <div className={`px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                formData.type === 'recette' 
                  ? 'border-green-500 bg-green-50 text-green-700' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                Recette
              </div>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="depense"
                checked={formData.type === 'depense'}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any, category: '', subcategory: '' }))}
                className="sr-only"
              />
              <div className={`px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                formData.type === 'depense' 
                  ? 'border-red-500 bg-red-50 text-red-700' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                Dépense
              </div>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Date * <span className="text-xs text-gray-500">(détermine l'exercice)</span>
            </label>
            <input
              type="date"
              id="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.date ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
            <p className="mt-1 text-xs text-gray-500">
              Exercice : {calculatedExercice}
            </p>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Montant (€) *
            </label>
            <input
              type="number"
              id="amount"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.amount ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0.00"
            />
            {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <input
            type="text"
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.description ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Ex: Achat matériel sono, Recette billetterie concert..."
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Catégorie *
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value, subcategory: '' }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.category ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Sélectionner une catégorie</option>
              {getFilteredCategories().map((category) => (
                <option key={category.code} value={category.code}>
                  {category.code} - {category.name}
                </option>
              ))}
            </select>
            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
          </div>

          {/* Subcategory */}
          <div>
            <label htmlFor="subcategory" className="block text-sm font-medium text-gray-700 mb-2">
              Sous-catégorie
            </label>
            <select
              id="subcategory"
              value={formData.subcategory}
              onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={subcategories.length === 0}
            >
              <option value="">Sélectionner une sous-catégorie</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.code} value={subcategory.code}>
                  {subcategory.code} - {subcategory.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Event Selection */}
        <div>
          <label htmlFor="eventId" className="block text-sm font-medium text-gray-700 mb-2">
            Événement associé (optionnel)
          </label>
          <select
            id="eventId"
            value={formData.eventId}
            onChange={(e) => setFormData(prev => ({ ...prev, eventId: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Aucun événement</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} - {new Date(event.date).toLocaleDateString('fr-FR')}
              </option>
            ))}
          </select>
          {events.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Aucun événement disponible pour l'exercice {calculatedExercice}
            </p>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
            Mode de paiement
          </label>
          <select
            id="paymentMethod"
            value={formData.paymentMethod}
            onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {PAYMENT_METHODS.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>

        {/* File Upload */}
        <div>
          <label htmlFor="attachment" className="block text-sm font-medium text-gray-700 mb-2">
            Justificatif (PDF, JPG)
          </label>
          <div className="flex items-center space-x-3">
            <label className="flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <Upload size={16} className="mr-2 text-gray-500" />
              <span className="text-sm text-gray-600">Choisir un fichier</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {formData.attachment && (
              <span className="text-sm text-green-600">{formData.attachment}</span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={16} className="mr-2" />
            {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransactionForm;