import { motion, AnimatePresence } from 'motion/react';
import { ClipboardCheck, Edit, ShoppingBag, Camera, Loader2, ShoppingCart, Users, AlertCircle, Plus, Truck, Filter, MoreHorizontal, FileText, Building2, Trash2, Search, MessageCircle, X, Copy, Mail } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { Badge } from '../components/Badge';
import { NewProductModal } from '../components/NewProductModal';
import { NewVendorModal } from '../components/NewVendorModal';
import { CreatePOModal } from '../components/CreatePOModal';
import { CartModal } from '../components/CartModal';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { RequestQuoteModal } from '../components/RequestQuoteModal';
import { EditQuoteModal } from '../components/EditQuoteModal';
import { ReceiveDeliveryModal } from '../components/ReceiveDeliveryModal';
import React, { useState, useEffect } from 'react';
import { saveProductFile, getProductFile } from '../lib/fileStorage';
import { updateProductData } from '../lib/products';
import { subscribeToPurchases, savePurchase, deletePurchase, Purchase } from '../lib/purchases';
import { subscribeToProducts, saveProduct, deleteProduct, Product } from '../lib/products';
import { subscribeToVendors, saveVendor, deleteVendor, Vendor } from '../lib/vendors';
import { getPublicUrl } from '../lib/utils';
import { subscribeToQuotes, QuoteRequest, deleteQuoteRequest } from '../lib/quotes';
import { generatePOPDF } from '../lib/pdfHelper';
import { Download, FolderKanban } from 'lucide-react';
import { ProjectModal } from '../components/ProjectModal';
import { subscribeToProjects, Project } from '../lib/projects';


const ProductImage = ({ productId, productName, className }: { productId?: string, productName: string, className?: string }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      getProductFile(productId).then((data) => {
        if (data) setImageSrc(data);
      }).catch(console.error);
    }
  }, [productId]);

  if (!imageSrc) return (
    <div className={className || "w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center border border-slate-200"}>
      <ShoppingBag className="w-4 h-4 text-slate-300" />
    </div>
  );
  return <img src={imageSrc} alt={productName} className={className || "w-8 h-8 rounded-md object-cover border border-slate-200"} />;
};

export function PurchaseTab({ searchQuery = '' }: { searchQuery?: string }) {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'vendors' | 'quotes' | 'arrivals' | 'returns'>('orders');
  
  const [isNewVendorModalOpen, setIsNewVendorModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState(false);
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isRequestQuoteModalOpen, setIsRequestQuoteModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<Purchase | null>(null);
  const [isReceiveDeliveryModalOpen, setIsReceiveDeliveryModalOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<any>(null);
  const [selectedProductDetails, setSelectedProductDetails] = useState<Product | null>(null);
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<any>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [quoteSearchQuery, setQuoteSearchQuery] = useState('');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [visualMatchIds, setVisualMatchIds] = useState<string[] | null>(null);
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const parsePrice = (priceStr: string | undefined): number => {
    if (!priceStr) return 0;
    const match = priceStr.toString().match(/\d[\d,.]*/);
    return match ? parseFloat(match[0].replace(/,/g, '')) : 0;
  };

  const calculateTotalSpendMTD = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return purchases.reduce((total, p) => {
      let date = new Date();
      if (p.createdAt) {
        date = typeof p.createdAt.toDate === 'function' ? p.createdAt.toDate() : new Date(p.createdAt);
      }
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
        const unitPrice = parsePrice(p.price);
        const quantity = parseInt(p.details?.quantity || '1', 10);
        return total + (unitPrice * quantity * 1.18); // Including 18% GST
      }
      return total;
    }, 0);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `₹${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toFixed(0)}`;
  };

  const totalSpendStr = formatCurrency(calculateTotalSpendMTD());
  const activeVendorsCount = vendors.length.toString();
  const pendingDeliveriesCount = purchases.filter(p => p.status === 'Ordered' || p.status === 'Pending' || p.status === 'In Transit').length.toString();
  const delayedItemsCount = purchases.filter(p => {
    if (p.status === 'Delayed') return true;
    if (p.status !== 'Delivered' && p.details?.eta) {
      const etaDate = new Date(p.details.eta);
      if (etaDate < new Date()) return true;
    }
    return false;
  }).length.toString();


  const handleImageSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    setIsAnalyzingImage(true);
    
    try {
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
      
      const base64Data = await base64Promise;
      
      const catalog = activeTab === 'products' 
        ? products.map(p => ({ 
            id: p.id, 
            name: p.name, 
            specification: p.specification, 
            category: 'product',
            image: p.details?.productImageData // Pass the base64 image if it exists
          }))
        : quotes.map(q => ({ 
            id: q.id, 
            category: q.category, 
            items: q.items?.map(i => i.productName + ' ' + (i.specification || '')),
            image: q.items ? q.items.find((i: any) => i.imageUrl)?.imageUrl : undefined // Pass the first item's image
          }));
      
      const response = await fetch('/api/visual-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: base64Data, catalog })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze image');
      }
      
      const data = await response.json();
      if (data.matchingIds) {
        setVisualMatchIds(data.matchingIds);
        if (activeTab === 'products') setProductSearchQuery('');
        else setQuoteSearchQuery('');
        
        if (data.matchingIds.length === 0) {
          alert('No visually similar items were found in the catalog.');
        }
      }
    } catch (err) {
      console.error("Error analyzing image:", err);
      if (err.message && err.message.includes("Google AI rate limit") || err.message.includes("Daily limit")) {
        alert(err.message + "\n\nPlease configure your Gemini API Key in the AI Studio Settings.");
      } else {
        alert("Could not identify the product in the image. Please try another image or use text search.");
      }
    } finally {
      setIsAnalyzingImage(false);
      // Reset input
      e.target.value = '';
    }
  };


  const addToCart = (product: Product) => {
    if (!selectedProjectId) {
      alert("Please select a project or create a new one before adding items to the cart.");
      return;
    }
    setCart(prev => {
      const pId = product.id || product.docId;
      const existing = prev.find(item => (item.product.id || item.product.docId) === pId);
      if (existing) {
        return prev.map(item => (item.product.id || item.product.docId) === pId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => (item.product.id || item.product.docId) !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setCart(prev => prev.map(item => (item.product.id || item.product.docId) === productId ? { ...item, quantity } : item));
  };

  const clearCart = () => setCart([]);


  useEffect(() => {
    const unsubPurchases = subscribeToPurchases(setPurchases);
    const unsubProducts = subscribeToProducts(setProducts);
    const unsubVendors = subscribeToVendors(setVendors);
    const unsubQuotes = subscribeToQuotes(setQuotes);
    const unsubProjects = subscribeToProjects(setProjects);
    
    return () => {
      unsubPurchases();
      unsubProducts();
      unsubVendors();
      unsubQuotes();
      unsubProjects();
    };
  }, []);

  const handleAddVendor = async (vendorData: any) => {
    try {
      await saveVendor(vendorData);
      setIsNewVendorModalOpen(false);
    } catch (error: any) {
      console.error('Failed to save vendor', error);
      alert('Failed to save vendor: ' + error.message);
    }
  };

  const handleAddProduct = async (productData: any) => {
    try {
      const newProduct: Partial<Product> = {
        name: productData.productName,
        vendorId: productData.vendorId,
        vendorName: productData.vendorName,
        price: productData.totalUnitPrice || productData.price,
        specification: productData.specification,
        details: {
          productImageName: productData.productImageName,
          details: productData.details,
          measuringMetric: productData.measuringMetric,
          totalUnitPrice: productData.totalUnitPrice,
          perUnitPrice: productData.perUnitPrice,
        }
      };

      let docId;
      if (editingProduct) {
        docId = await updateProductData(editingProduct.docId || editingProduct.id, newProduct);
      } else {
        docId = await saveProduct(newProduct);
      }
      
      if (productData.productImageData) {
        await saveProductFile(docId, productData.productImageData);
      }
      
      setIsNewProductModalOpen(false);
      setEditingProduct(null);
    } catch (error: any) {
      console.error('Failed to save product', error);
      alert('Failed to save product: ' + error.message);
    }
  };

  const handleDeletePurchase = async (docId: string) => {
    try {
      await deletePurchase(docId);
      setConfirmingDeleteId(null);
    } catch (error: any) {
      console.error('Error deleting purchase order:', error);
      alert(`Failed to delete purchase order: ${error.message}`);
    }
  };

  const handleDeleteProduct = async (docId: string) => {
    try {
      await deleteProduct(docId);
      setConfirmingDeleteId(null);
    } catch (error: any) {
      console.error('Error deleting product:', error);
      alert(`Failed to delete product: ${error.message}`);
    }
  };

  const handleDeleteVendor = async (docId: string) => {
    try {
      await deleteVendor(docId);
      setConfirmingDeleteId(null);
    } catch (error: any) {
      console.error('Error deleting vendor:', error);
      alert(`Failed to delete vendor: ${error.message}`);
    }
  };

  const handleDownloadPO = async (po: Purchase) => {
    const poNumber = po.details?.poNumber;
    if (!poNumber) {
      alert("This Purchase Order doesn't have a PO Number assigned.");
      return;
    }
    
    // Find all PO items with this PO number
    const relatedPOs = purchases.filter(p => p.details?.poNumber === poNumber);
    const vendor = vendors.find(v => v.name === po.vendorName) || vendors.find(v => v.id === po.vendorName);
    
    const items = relatedPOs.map(rpo => {
      const product = products.find(p => p.id === rpo.details?.productId);
      return {
        product: product || { 
          id: rpo.details?.productId || rpo.id,
          name: rpo.productName,
          price: rpo.price,
          details: {
            perUnitPrice: rpo.price,
            measuringMetric: rpo.details?.measuringMetric,
            productImageData: rpo.details?.productImageData
          }
        },
        quantity: parseInt(rpo.details?.quantity || '1')
      };
    });
    
    await generatePOPDF(poNumber, po.vendorName, vendor, items);
  };

  const handleCreatePO = async (poData: any) => {
    try {
      const activeProject = projects.find(p => p.id === selectedProjectId);
      const newPurchase: Partial<Purchase> = {
        productName: poData.productName,
        vendorName: poData.vendorName,
        price: poData.price,
        status: 'Pending',
        details: {
          projectId: selectedProjectId || '',
          projectName: activeProject?.name || '',
          poNumber: poData.poNumber,
          productId: poData.productId,
          quantity: poData.quantity,
          eta: poData.eta,
        }
      };

      await savePurchase(newPurchase);
      setIsCreatePOModalOpen(false);
    } catch (error: any) {
      console.error('Failed to save purchase', error);
      alert('Failed to save purchase: ' + error.message);
    }
  };

  
  const filteredQuotes = quotes.filter(quote => {
    if (visualMatchIds) return visualMatchIds.includes(quote.id);
    
    // Support both global and local search queries
    const sq = quoteSearchQuery || searchQuery;
    if (!sq) return true;
    
    const items = quote.items && quote.items.length > 0 ? quote.items : [quote];
    return items.some((item: any) => 
      item.productName?.toLowerCase().includes(sq.toLowerCase()) || 
      item.specification?.toLowerCase().includes(sq.toLowerCase()) ||
      quote.category?.toLowerCase().includes(sq.toLowerCase())
    );
  });

  const filteredProducts = products.filter(p => {
    if (visualMatchIds) return visualMatchIds.includes(p.id);
    const sq = productSearchQuery || searchQuery;
    if (!sq) return true;
    return p.name?.toLowerCase().includes(sq.toLowerCase()) || 
      (p.vendorName || '').toLowerCase().includes(sq.toLowerCase()) ||
      (p.specification || '').toLowerCase().includes(sq.toLowerCase());
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Purchase Management</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage vendor relations, purchase orders, and inbound materials.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setIsNewVendorModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Building2 className="w-4 h-4" />
            Add Vendor
          </button>
          <button 
            onClick={() => setIsNewProductModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            Add Product
          </button>
          <button 
            onClick={() => setIsRequestQuoteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm"
          >
            <MessageCircle className="w-4 h-4" />
            Request Quote
          </button>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (!selectedProjectId) {
                  alert("Please select a project or create a new one before creating a PO.");
                  return;
                }
                setIsCreatePOModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4" />
              Create PO
            </button>
          </div>
        </div>
      </div>

      <NewVendorModal 
        isOpen={isNewVendorModalOpen}
        onClose={() => setIsNewVendorModalOpen(false)}
        onAddVendor={handleAddVendor}
        vendors={vendors}
      />

      <NewProductModal 
        isOpen={isNewProductModalOpen}
        onClose={() => {
          setIsNewProductModalOpen(false);
          setEditingProduct(null);
        }}
        onAddProduct={handleAddProduct}
        vendors={vendors}
        initialData={editingProduct}
      />

      <CreatePOModal 
        isOpen={isCreatePOModalOpen}
        onClose={() => setIsCreatePOModalOpen(false)}
        onCreatePO={handleCreatePO}
        products={products}
        vendors={vendors}
      />

      <CartModal 
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        cart={cart}
        updateQuantity={updateQuantity}
        removeFromCart={removeFromCart}
        vendors={vendors}
        onCreatePO={handleCreatePO}
        clearCart={clearCart}
      />

      <EditQuoteModal
        isOpen={!!editingQuote}
        onClose={() => setEditingQuote(null)}
        quote={editingQuote}
        products={products}
        vendors={vendors}
      />
      <RequestQuoteModal
        isOpen={isRequestQuoteModalOpen}
        onClose={() => setIsRequestQuoteModalOpen(false)}
        products={products}
        vendors={vendors}
      />

      <ProductDetailModal
        isOpen={!!selectedProductDetails}
        onClose={() => setSelectedProductDetails(null)}
        product={selectedProductDetails}
        vendor={selectedProductDetails ? (vendors.find(v => v.id === selectedProductDetails.vendorId) || null) : null}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Spend (MTD)" 
          value={totalSpendStr} 
          
          icon={<ShoppingBag className="w-5 h-5" />}
          colorClass="bg-purple-50 text-purple-600"
        />
        <StatCard 
          title="Active Vendors" 
          value={activeVendorsCount} 
          icon={<Users className="w-5 h-5" />}
          colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard 
          title="Pending Deliveries" 
          value={pendingDeliveriesCount} 
          
          icon={<Truck className="w-5 h-5" />}
          colorClass="bg-emerald-50 text-emerald-600"
        />
        <StatCard 
          title="Delayed Items" 
          value={delayedItemsCount} 
          icon={<AlertCircle className="w-5 h-5" />}
          colorClass="bg-rose-50 text-rose-600"
        />
      </div>

      
      {/* Project Selector */}
      <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-indigo-500" />
            Active Project:
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-w-[200px]"
          >
            <option value="">-- Select a Project --</option>
            {projects.map((p, i) => (
              <option key={`${p.docId || p.id || 'k'}-${i}`} value={p.id}>{p.name} {p.customerName ? `(${p.customerName})` : ''}</option>
            ))}
          </select>
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="px-3 py-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> New
          </button>
        </div>
      </div>

      {/* Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onProjectCreated={(id) => setSelectedProjectId(id)}
      />

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'orders' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Purchase Orders
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'products' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'vendors' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Vendors
        </button>
        <button
          onClick={() => setActiveTab('arrivals')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'arrivals' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Today's Arrivals
        </button>
        <button
          onClick={() => setActiveTab('quotes')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'quotes' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Quotes
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'returns' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Purchase Returns
        </button>
      </div>

      {/* Main Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 flex flex-col"
      >
        <div className="bg-white rounded-t-xl border border-slate-200 flex items-center justify-between px-6 py-4">
          <h2 className="font-bold text-slate-800">
            {activeTab === 'orders' && 'Active Purchase Orders'}
            {activeTab === 'arrivals' && 'Today\'s Arrivals'}
            {activeTab === 'products' && 'Product Directory'}
            {activeTab === 'vendors' && 'Vendor Directory'}
            {activeTab === 'quotes' && 'Requested Quotes'}
            {activeTab === 'returns' && 'Purchase Returns'}
          </h2>
          <div className="flex gap-2">
            {(activeTab === 'products' || activeTab === 'quotes') && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder={activeTab === 'products' ? "Search products..." : "Search by product name..."}
                    value={activeTab === 'products' ? productSearchQuery : quoteSearchQuery}
                    onChange={(e) => { if (activeTab === 'products') { setProductSearchQuery(e.target.value); setVisualMatchIds(null); } else { setQuoteSearchQuery(e.target.value); setVisualMatchIds(null); } }}
                    className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-48 lg:w-64"
                  />
                  {(activeTab === 'products' ? productSearchQuery : quoteSearchQuery) && (
                    <button 
                      onClick={() => { if (activeTab === 'products') { setProductSearchQuery(''); setVisualMatchIds(null); } else { setQuoteSearchQuery(''); setVisualMatchIds(null); } }}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                <div className="relative">
                                    {visualMatchIds && !isAnalyzingImage ? (
                    <button 
                      onClick={() => setVisualMatchIds(null)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer border bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                    >
                      <X className="w-4 h-4" />
                      <span className="hidden sm:inline">Clear Image Match</span>
                    </button>
                  ) : (
                    <label 
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer border ${
                        isAnalyzingImage 
                          ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' 
                          : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50'
                      }`}
                    >
                      {isAnalyzingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">{isAnalyzingImage ? 'Analyzing...' : 'Search by Image'}</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleImageSearch} 
                        disabled={isAnalyzingImage}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'products' && cart.length > 0 && (
              <button 
                onClick={() => setIsCartModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1 bg-rose-500 text-white rounded text-xs font-semibold hover:bg-rose-600 transition-colors shadow-sm relative"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Cart
                <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </button>
            )}

            <button className="px-3 py-1 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50">
              <Filter className="w-3.5 h-3.5 mr-1.5 inline" /> Filters
            </button>
          </div>
        </div>
        <div className="flex-1 bg-white border-x border-b border-slate-200 overflow-hidden rounded-b-xl">
          <div className="overflow-x-auto">
            {activeTab === 'orders' && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3 border-b border-slate-200">PO Number</th>
                    <th className="px-6 py-3 border-b border-slate-200">Project</th>
                    <th className="px-6 py-3 border-b border-slate-200">Vendor</th>
                    <th className="px-6 py-3 border-b border-slate-200">Primary Item</th>
                    <th className="px-6 py-3 border-b border-slate-200">Amount</th>
                    <th className="px-6 py-3 border-b border-slate-200">Status</th>
                    <th className="px-6 py-3 border-b border-slate-200">ETA</th>
                    <th className="px-6 py-3 border-b border-slate-200 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                        No active purchase orders found. Click "Create PO" to create one.
                      </td>
                    </tr>
                  ) : purchases.filter(po => !searchQuery || (po.details?.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || po.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) || po.details?.projectName?.toLowerCase().includes(searchQuery.toLowerCase()))).map((po, i) => (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      key={`${po.docId || po.id || 'k'}-${i}`} 
                      className="hover:bg-slate-50 transition-colors"
                    >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">{po.details?.poNumber || po.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{po.details?.projectName || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{po.vendorName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <ProductImage productId={po.details?.productId} productName={po.productName} />
                        {po.productName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">{po.price}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={
                        po.status === 'Delivered' ? 'success' : 
                        po.status === 'In Transit' ? 'info' : 
                        po.status === 'Delayed' ? 'error' : 
                        po.status === 'Rejected' ? 'error' : 
                        po.status === 'Pending' ? 'warning' : 'info'
                      }>
                        {po.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col">
                        <span className="text-slate-800 font-medium">{po.details?.eta ? new Date(po.details.eta).toLocaleDateString() : 'Not set'}</span>
                        {po.details?.advancePayment && (
                          <span className="text-xs text-indigo-600 font-semibold mt-0.5">Adv: {po.details.advancePayment}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {confirmingDeleteId === po.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-medium">Sure?</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingDeleteId(null);
                              }}
                              className="px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded text-xs font-semibold"
                            >
                              No
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePurchase(po.docId || po.id);
                              }}
                              className="px-2 py-1 bg-red-600 text-white hover:bg-red-700 rounded text-xs font-semibold"
                            >
                              Yes
                            </button>
                          </div>
                        ) : (
                          <>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPO(po);
                                setIsReceiveDeliveryModalOpen(true);
                              }}
                              className={`p-1.5 rounded-md transition-colors ${(po.status === 'Delivered' || po.status === 'Rejected') ? 'text-green-500 hover:text-green-700 hover:bg-green-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                              title={(po.status === 'Delivered' || po.status === 'Rejected') ? 'View QC Report' : 'Receive Delivery'}
                            >
                              {(po.status === 'Delivered' || po.status === 'Rejected') ? <FileText className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPO(po);
                              }}
                              className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-50 transition-colors"
                              title="Download PO PDF"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingDeleteId(po.id);
                              }}
                              className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
                </tbody>
              </table>
            )}

            {activeTab === 'arrivals' && (() => {
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              const todayEnd = new Date();
              todayEnd.setHours(23, 59, 59, 999);

              const todaysArrivals = purchases.filter(po => {
                // Check if ETA is today
                let isEtaToday = false;
                if (po.details?.eta) {
                  const etaDate = new Date(po.details.eta);
                  isEtaToday = etaDate >= todayStart && etaDate <= todayEnd;
                }
                
                // Check if delivered today
                let isDeliveredToday = false;
                if ((po.status === 'Delivered' || po.status === 'Rejected') && po.details?.deliveryQC?.deliveryDateTime) {
                  const deliveryDate = new Date(po.details.deliveryQC.deliveryDateTime);
                  isDeliveredToday = deliveryDate >= todayStart && deliveryDate <= todayEnd;
                }

                return isEtaToday || isDeliveredToday;
              });

              return (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3 border-b border-slate-200">PO Number</th>
                    <th className="px-6 py-3 border-b border-slate-200">Vendor</th>
                    <th className="px-6 py-3 border-b border-slate-200">Primary Item</th>
                    <th className="px-6 py-3 border-b border-slate-200">Status</th>
                    <th className="px-6 py-3 border-b border-slate-200">Qty (Ordered/Rcvd)</th>
                    <th className="px-6 py-3 border-b border-slate-200">Timing</th>
                    <th className="px-6 py-3 border-b border-slate-200 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todaysArrivals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                        No purchases are scheduled or have been delivered today.
                      </td>
                    </tr>
                  ) : todaysArrivals.filter(po => !searchQuery || (po.details?.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || po.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) || po.details?.projectName?.toLowerCase().includes(searchQuery.toLowerCase()))).map((po, i) => {
                    const isDelivered = po.status === 'Delivered';
                    const isCompleted = po.status === 'Delivered' || po.status === 'Rejected';
                    return (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      key={`${po.docId || po.id || 'k'}-${i}`} 
                      className="hover:bg-slate-50 transition-colors"
                    >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">{po.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{po.vendorName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <ProductImage productId={po.details?.productId} productName={po.productName} />
                        {po.productName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={isDelivered ? 'success' : (po.status === 'Rejected' ? 'error' : 'warning')}>
                        {isDelivered ? 'Delivered' : (po.status === 'Rejected' ? 'Rejected' : 'Expected Today')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">
                      {isCompleted ? (po.details?.deliveryQC?.quantityReceived || 'Yes') : (po.details?.quantity || '-')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-medium">
                      {isCompleted 
                        ? new Date(po.details?.deliveryQC?.deliveryDateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                        : 'Pending Arrival'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPO(po);
                            setIsReceiveDeliveryModalOpen(true);
                          }}
                          className={`p-1.5 rounded-md transition-colors ${isCompleted ? 'text-green-500 hover:text-green-700 hover:bg-green-50' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                          title={isCompleted ? 'View QC Report' : 'Receive Delivery'}
                        >
                          {isCompleted ? <FileText className="w-5 h-5" /> : <ClipboardCheck className="w-5 h-5" />}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                  )})}
                </tbody>
              </table>
              );
            })()}
            {activeTab === 'returns' && (() => {
              const rejectedPurchases = purchases.filter(po => po.status === 'Rejected');

              return (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3 border-b border-slate-200">PO Number</th>
                    <th className="px-6 py-3 border-b border-slate-200">Vendor</th>
                    <th className="px-6 py-3 border-b border-slate-200">Primary Item</th>
                    <th className="px-6 py-3 border-b border-slate-200">Status</th>
                    <th className="px-6 py-3 border-b border-slate-200">Qty (Ordered/Rejected)</th>
                    <th className="px-6 py-3 border-b border-slate-200">Timing</th>
                    <th className="px-6 py-3 border-b border-slate-200 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rejectedPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                        No purchase returns found.
                      </td>
                    </tr>
                  ) : rejectedPurchases.filter(po => !searchQuery || (po.details?.poNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || po.vendorName?.toLowerCase().includes(searchQuery.toLowerCase()) || po.details?.projectName?.toLowerCase().includes(searchQuery.toLowerCase()))).map((po, i) => (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      key={`${po.docId || po.id || 'k'}-${i}`} 
                      className="hover:bg-slate-50 transition-colors"
                    >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer">{po.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold">{po.vendorName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <ProductImage productId={po.details?.productId} productName={po.productName} />
                        {po.productName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="error">
                        Rejected
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">
                      {po.details?.quantity || '-'} / {po.details?.deliveryQC?.quantityReceived || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-medium">
                      {po.details?.deliveryQC?.deliveryDateTime
                        ? new Date(po.details?.deliveryQC?.deliveryDateTime).toLocaleString([], {hour: '2-digit', minute:'2-digit'})
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPO(po);
                            setIsReceiveDeliveryModalOpen(true);
                          }}
                          className="p-1.5 rounded-md transition-colors text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          title="View Return Note"
                        >
                          <FileText className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                </tbody>
              </table>
              );
            })()}
            {activeTab === 'products' && (
              <div className="p-6">
                {filteredProducts.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    
                      products.length === 0 
                        ? 'No products found. Click "Add Product" to create one.' 
                        : (visualMatchIds 
                            ? 'No visually similar products were found in your Product Directory.' 
                            : 'No products match your search.')
                    
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product, i) => (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        key={`${product.docId || product.id || 'k'}-${i}`}
                        className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer"
                        onClick={() => setSelectedProductDetails(product)}
                      >
                        <div className="aspect-square bg-slate-50 flex items-center justify-center relative group w-full h-full overflow-hidden">
                          <ProductImage productId={product.id} productName={product.name} className="w-full h-full object-cover" />
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setEditingProduct(product);
                                 setIsNewProductModalOpen(true);
                               }}
                               className="p-1.5 bg-white text-emerald-500 hover:bg-emerald-50 rounded-md shadow-sm border border-slate-200"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setConfirmingDeleteId(product.id!);
                               }}
                               className="p-1.5 bg-white text-rose-500 hover:bg-rose-50 rounded-md shadow-sm border border-slate-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {confirmingDeleteId === product.id && (
                             <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-2">
                               <span className="text-sm font-medium text-slate-700">Delete product?</span>
                               <div className="flex gap-2">
                                 <button onClick={() => setConfirmingDeleteId(null)} className="px-3 py-1 bg-slate-100 rounded text-xs font-medium">No</button>
                                 <button onClick={() => handleDeleteProduct(product.id!)} className="px-3 py-1 bg-rose-600 text-white rounded text-xs font-medium">Yes</button>
                               </div>
                             </div>
                          )}
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <div className="text-xs font-medium text-indigo-600 mb-1">{product.vendorName}</div>
                          <h3 className="font-bold text-slate-800 line-clamp-2 leading-tight mb-1">{product.name}</h3>
                          <div className="text-xs text-slate-500 mb-1">{product.category ? <span className="inline-block bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mr-2">{product.category}</span> : null}</div>
                          <div className="text-xs text-slate-500 mb-3">{product.specification || 'No specification'} • {product.details?.measuringMetric || '-'}</div>
                          <div className="mt-auto pt-4 border-t border-slate-100 flex items-end justify-between">
                            <div>
                              <div className="text-xs text-slate-500 font-medium mb-0.5">Unit Price</div>
                              <div className="font-bold text-lg text-emerald-600 leading-none">
                                {product.details?.perUnitPrice ? `₹${product.details.perUnitPrice}` : '-'}
                              </div>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                addToCart(product);
                              }}
                              className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                            >
                              <ShoppingCart className="w-4 h-4" />
                              Add
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'vendors' && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3 border-b border-slate-200">Vendor Name</th>
                    <th className="px-6 py-3 border-b border-slate-200">Contact Person</th>
                    <th className="px-6 py-3 border-b border-slate-200">Email</th>
                    <th className="px-6 py-3 border-b border-slate-200">Phone</th>
                    <th className="px-6 py-3 border-b border-slate-200">Address</th>
                    <th className="px-6 py-3 border-b border-slate-200 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendors.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                        No vendors found. Click "Add Vendor" to create one.
                      </td>
                    </tr>
                  ) : vendors.filter(v => !searchQuery || v.name?.toLowerCase().includes(searchQuery.toLowerCase()) || v.category?.toLowerCase().includes(searchQuery.toLowerCase())).map((vendor, i) => (
                    <motion.tr 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      key={`${vendor.docId || vendor.id || 'k'}-${i}`} 
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{vendor.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{vendor.contactPerson || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{vendor.email || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{vendor.phone || '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium min-w-[200px]">{vendor.address || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {confirmingDeleteId === vendor.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 font-medium">Sure?</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmingDeleteId(null);
                                }}
                                className="px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded text-xs font-semibold"
                              >
                                No
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVendor(vendor.id!);
                                }}
                                className="px-2 py-1 bg-red-600 text-white hover:bg-red-700 rounded text-xs font-semibold"
                              >
                                Yes
                              </button>
                            </div>
                          ) : (
                            <>
                              <button className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-md hover:bg-indigo-50 transition-colors">
                                <MoreHorizontal className="w-5 h-5" />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmingDeleteId(vendor.id!);
                                }}
                                className="text-slate-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {activeTab === 'quotes' && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3 border-b border-slate-200">Product</th>
                    <th className="px-6 py-3 border-b border-slate-200">Vendor</th>
                    <th className="px-6 py-3 border-b border-slate-200">Quantity</th>
                    <th className="px-6 py-3 border-b border-slate-200">Deadline</th>
                    <th className="px-6 py-3 border-b border-slate-200">Req. Delivery</th>
                    <th className="px-6 py-3 border-b border-slate-200">Status</th>
                    <th className="px-6 py-3 border-b border-slate-200">Price (₹)</th>
                    <th className="px-6 py-3 border-b border-slate-200">Remarks</th>
                    <th className="px-6 py-3 border-b border-slate-200">Ref Image</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredQuotes.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-sm text-slate-500">
                        
                          quotes.length === 0 
                            ? 'No quotes have been requested yet. Click "Request Quote" to create one.' 
                            : (visualMatchIds 
                                ? 'No visually similar quotes were found in your Requested Quotes list.' 
                                : (quoteSearchQuery ? `No quotes found matching "${quoteSearchQuery}"` : 'No quotes found.'))
                        
                      </td>
                    </tr>
                  ) : filteredQuotes.flatMap((quote, i) => {
                    const vendor = vendors.find(v => v.id === quote.vendorId);
                    const items = quote.items && quote.items.length > 0 ? quote.items : [quote as any];
                    
                    return items.map((item, itemIdx) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 + (i + itemIdx * 0.1) * 0.05 }}
                        key={`quote-${i}-item-${itemIdx}`} 
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">
                          <div className="flex items-center gap-2">
                            {item.imageUrl && (
                              <img src={item.imageUrl} alt="" className="w-8 h-8 rounded object-cover border border-slate-200" />
                            )}
                            {item.productName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{vendor?.name || 'Unknown Vendor'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{item.quoteDeadline ? new Date(item.quoteDeadline).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">{item.expectedDeliveryDate ? new Date(item.expectedDeliveryDate).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-2 items-start">
                            <Badge variant={quote.status === 'submitted' ? 'success' : 'warning'}>
                              {quote.status}
                            </Badge>
                            {true && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    const baseUrl = getPublicUrl();
                                    const link = `${baseUrl}?quoteId=${quote.id}`;

                                    const itemsList = quote.items && quote.items.length > 0 ? quote.items : [quote];
                                    const productNames = itemsList.map((i: any) => i.productName).join(', ');
                                    const subject = `Quote Request from SRK Modular: ${productNames}`;
                                    const text = `Hi ${vendor?.contactPerson || vendor?.name},

Please review our requirement for ${productNames} and provide a quote using this link:

${link}

Thank you,
SRK Modular Purchasing`;
                                    
                                    const mailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(vendor?.email || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
                                    window.open(mailUrl, '_blank');
                                  }}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
                                  title="Email Quote Link"
                                >
                                  <Mail className="w-3 h-3" />
                                  Email Link
                                </button>
                                <button
                                  onClick={() => setEditingQuote(quote)}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-700 bg-slate-100 px-2 py-1 rounded"
                                  title="Edit Quote"
                                >
                                  <Edit className="w-3 h-3" />
                                  Edit
                                </button>
                                <button
                                  onClick={async () => {
                                    setQuoteToDelete(quote);
                                  }}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded"
                                  title="Delete Quote"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </button>
                                <button
                                  onClick={() => {
                                    let phoneNum = vendor?.phone?.replace(/[^0-9]/g, '') || '';
                                    if (phoneNum.length >= 10) {
                                      phoneNum = '91' + phoneNum.slice(-10);
                                    }
                                    if (!phoneNum) {
                                      alert('Vendor does not have a valid phone number.');
                                      return;
                                    }

                                    const baseUrl = getPublicUrl();
                                    const link = `${baseUrl}?quoteId=${quote.id}`;

                                    const itemsList = quote.items && quote.items.length > 0 ? quote.items : [quote];
                                    const productNames = itemsList.map((i: any) => i.productName).join(', ');
                                    const text = `Hi ${vendor?.contactPerson || vendor?.name},

Please review our requirement for ${productNames} and provide a quote using this link:
${link}`;
                                    
                                    const whatsappUrl = `https://web.whatsapp.com/send/?phone=${phoneNum}&text=${encodeURIComponent(text)}`;
                                    window.open(whatsappUrl, 'whatsapp_web_tab');
                                  }}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-[#25D366] hover:text-[#128C7E] bg-green-50 px-2 py-1 rounded"
                                  title="WhatsApp Quote Link"
                                >
                                  <MessageCircle className="w-3 h-3" />
                                  WhatsApp
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800 font-bold">{item.vendorPrice ? `₹${item.vendorPrice}` : '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-medium max-w-[200px] truncate">{item.vendorRemarks || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                          {item.vendorImageUrl ? (
                            <button onClick={() => setViewingImageUrl(item.vendorImageUrl!)} className="text-indigo-600 hover:underline">View Image</button>
                          ) : '-'}
                        </td>
                      </motion.tr>
                    ));
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </motion.div>

      <ReceiveDeliveryModal
        isOpen={isReceiveDeliveryModalOpen}
        onClose={() => setIsReceiveDeliveryModalOpen(false)}
        purchase={selectedPO}
      />

      {/* Image View Modal */}
      {viewingImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingImageUrl(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end p-2 absolute top-0 right-0 z-10">
              <button 
                onClick={() => setViewingImageUrl(null)}
                className="p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center min-h-[50vh]">
              <img src={viewingImageUrl} alt="Product Reference" className="max-w-full max-h-full object-contain" />
            </div>
          </div>
        </div>
      )}
      {/* Delete Quote Confirmation Modal */}
      <AnimatePresence>
        {quoteToDelete && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-rose-500" />
                  Delete Quote Request
                </h3>
                <button
                  onClick={() => setQuoteToDelete(null)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete this requested quote? This action cannot be undone.
                </p>
                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    onClick={() => setQuoteToDelete(null)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await deleteQuoteRequest(quoteToDelete.docId || quoteToDelete.id);
                        setQuoteToDelete(null);
                      } catch (error) {
                        console.error('Failed to delete quote:', error);
                        // alert('Failed to delete quote request.');
                      }
                    }}
                    className="px-4 py-2 text-sm font-bold bg-rose-600 text-white hover:bg-rose-700 rounded-lg transition-colors"
                  >
                    Delete Quote
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
