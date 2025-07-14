import React, { useState, useEffect } from 'react';
import { Save, Calculator, Plus, Trash2 } from 'lucide-react';
import './App.css';

interface QuotationItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

interface SavedProject {
  id: string;
  projectName: string;
  clientName: string;
  items: QuotationItem[];
  total: number;
  createdAt: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'documentation' | 'saved-projects'>('documentation');
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, price: 0 });
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('savedProjects');
    if (saved) {
      setSavedProjects(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('savedProjects', JSON.stringify(savedProjects));
  }, [savedProjects]);

  const addItem = () => {
    if (newItem.name.trim()) {
      const item: QuotationItem = {
        id: Date.now().toString(),
        name: newItem.name,
        quantity: newItem.quantity,
        price: newItem.price
      };
      setQuotationItems([...quotationItems, item]);
      setNewItem({ name: '', quantity: 1, price: 0 });
    }
  };

  const removeItem = (id: string) => {
    setQuotationItems(quotationItems.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return quotationItems.reduce((total, item) => total + (item.quantity * item.price), 0);
  };

  const saveProject = () => {
    if (projectName.trim() && clientName.trim() && quotationItems.length > 0) {
      const project: SavedProject = {
        id: Date.now().toString(),
        projectName,
        clientName,
        items: [...quotationItems],
        total: calculateTotal(),
        createdAt: new Date().toLocaleDateString()
      };
      setSavedProjects([...savedProjects, project]);
      setShowSaveModal(false);
      setProjectName('');
      setClientName('');
    }
  };

  const loadProject = (project: SavedProject) => {
    setQuotationItems([...project.items]);
    setActiveTab('documentation');
  };

  const deleteProject = (id: string) => {
    setSavedProjects(savedProjects.filter(project => project.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left Panel - Quotation Builder */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">Quotation Builder</h1>
          
          {/* Add Item Form */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Add Item</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input
                type="text"
                placeholder="Item name"
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                className="border rounded px-3 py-2"
              />
              <input
                type="number"
                placeholder="Quantity"
                value={newItem.quantity}
                onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                className="border rounded px-3 py-2"
              />
              <input
                type="number"
                placeholder="Price"
                value={newItem.price}
                onChange={(e) => setNewItem({...newItem, price: parseFloat(e.target.value) || 0})}
                className="border rounded px-3 py-2"
              />
              <button
                onClick={addItem}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>

          {/* Items List */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Items ({quotationItems.length})</h3>
            {quotationItems.length === 0 ? (
              <p className="text-gray-500">No items added yet</p>
            ) : (
              <div className="space-y-2">
                {quotationItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-gray-600 ml-4">Qty: {item.quantity} × ${item.price}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">${(item.quantity * item.price).toFixed(2)}</span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total and Actions */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xl font-bold">Total: ${calculateTotal().toFixed(2)}</span>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSaveModal(true)}
                  disabled={quotationItems.length === 0}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  Save Project
                </button>
                <button
                  disabled={quotationItems.length === 0}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <Calculator size={16} />
                  Calculate
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Documentation & Saved Projects */}
      <div className="w-96 bg-white shadow-lg">
        {/* Tab Navigation */}
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('documentation')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === 'documentation' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Documentation
            </button>
            <button
              onClick={() => setActiveTab('saved-projects')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === 'saved-projects' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Saved Projects
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 h-full overflow-y-auto">
          {activeTab === 'documentation' ? (
            <div>
              <h3 className="text-lg font-semibold mb-4">Documentation</h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>Welcome to the Quotation Builder!</p>
                <p>1. Add items with quantities and prices</p>
                <p>2. Review your total calculation</p>
                <p>3. Save projects for later use</p>
                <p>4. Generate documents from saved projects</p>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-4">Saved Projects ({savedProjects.length})</h3>
              {savedProjects.length === 0 ? (
                <p className="text-gray-500 text-sm">No saved projects yet</p>
              ) : (
                <div className="space-y-3">
                  {savedProjects.map((project) => (
                    <div
                      key={project.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer group"
                      onClick={() => loadProject(project)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{project.projectName}</h4>
                          <p className="text-sm text-gray-600">{project.clientName}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {project.items.length} items • ${project.total.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-400">{project.createdAt}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteProject(project.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save Project Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Project</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Client Name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveProject}
                  disabled={!projectName.trim() || !clientName.trim()}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
