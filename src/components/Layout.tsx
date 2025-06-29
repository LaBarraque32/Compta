import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  FileText, 
  PlusCircle, 
  Settings, 
  Calendar,
  DollarSign,
  Menu,
  X,
  FolderOpen,
  Archive
} from 'lucide-react';
import { getActiveExercice } from '../services/database';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentExercice, setCurrentExercice] = useState<string>('');

  useEffect(() => {
    loadCurrentExercice();
  }, []);

  const loadCurrentExercice = async () => {
    try {
      const activeExercice = await getActiveExercice();
      setCurrentExercice(activeExercice?.year || new Date().getFullYear().toString());
    } catch (error) {
      console.error('Error loading active exercice:', error);
      setCurrentExercice(new Date().getFullYear().toString());
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3 },
    { id: 'saisie', label: 'Saisie', icon: PlusCircle },
    { id: 'transactions', label: 'Transactions', icon: FileText },
    { id: 'events', label: 'Événements', icon: Calendar },
    { id: 'categories', label: 'Catégories', icon: FolderOpen },
    { id: 'exercices', label: 'Exercices', icon: Archive },
    { id: 'settings', label: 'Paramètres', icon: Settings }
  ];

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    // Recharger l'exercice actif quand on change d'onglet
    // car il pourrait avoir changé (notamment depuis la gestion des exercices)
    if (tab === 'dashboard' || tab === 'transactions' || tab === 'events') {
      setTimeout(loadCurrentExercice, 100);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <div className="flex items-center ml-2 md:ml-0">
                <DollarSign className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900">La Barraque</h1>
                  <p className="text-sm text-gray-600">Comptabilité Associative</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block">
                <span className="text-sm text-gray-600">Exercice {currentExercice}</span>
              </div>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">LB</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64 bg-white shadow-sm border-r border-gray-200">
            <nav className="flex-1 px-4 py-6 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === item.id
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon 
                      size={20} 
                      className={`mr-3 ${
                        activeTab === item.id ? 'text-blue-700' : 'text-gray-400 group-hover:text-blue-500'
                      }`} 
                    />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
              <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="px-4 py-6 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleTabChange(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:text-blue-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon 
                        size={20} 
                        className={`mr-3 ${
                          activeTab === item.id ? 'text-blue-700' : 'text-gray-400 group-hover:text-blue-500'
                        }`} 
                      />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-h-screen">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;