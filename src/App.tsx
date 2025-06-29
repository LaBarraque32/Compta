import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import EventManagement from './components/EventManagement';
import CategoryManagement from './components/CategoryManagement';
import ExerciceManagement from './components/ExerciceManagement';
import { ExerciseProvider } from './contexts/ExerciseContext';
import { initDatabase } from './services/database';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
      } catch (error) {
        console.error('Failed to initialize database:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const handleTransactionAdded = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard key={refreshTrigger} />;
      
      case 'saisie':
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Saisie des transactions</h1>
            <TransactionForm onTransactionAdded={handleTransactionAdded} />
          </div>
        );
      
      case 'transactions':
        return (
          <TransactionList 
            refreshTrigger={refreshTrigger}
          />
        );
      
      case 'events':
        return <EventManagement />;
      
      case 'categories':
        return <CategoryManagement />;
      
      case 'exercices':
        return <ExerciceManagement />;
      
      case 'settings':
        return (
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-600">Module de paramétrage en cours de développement</p>
              <p className="text-sm text-gray-500 mt-2">
                Fonctionnalités prévues : configuration générale, sauvegarde cloud, utilisateurs
              </p>
            </div>
          </div>
        );
      
      default:
        return <Dashboard key={refreshTrigger} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Initialisation de l'application...</p>
        </div>
      </div>
    );
  }

  return (
    <ExerciseProvider>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderContent()}
      </Layout>
    </ExerciseProvider>
  );
}

export default App;