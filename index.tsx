import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, Package, LogOut, Plus, Search, 
  Trash2, ShieldCheck, Loader2, FileText,
  DollarSign, TrendingUp, Edit3, X, CheckCircle2,
  Truck, Calendar, ChevronRight, Clock, ChevronLeft,
  BarChart3, Activity, Wallet, ArrowDownCircle, ArrowUpCircle,
  Briefcase, Layers, Split, Copy, PiggyBank, PieChart,
  BarChart, ArrowRightLeft, Target, TrendingDown,
  Percent, ShoppingBag, Landmark, Database,
  ChevronDown, ChevronUp, AlertCircle, Info, Flame,
  ShieldAlert, RefreshCcw, Banknote, Shield,
  GripVertical, CreditCard, Layers as LayersIcon,
  Zap
} from 'lucide-react';

// 财务格式化 (保留2位小数并加千分位)
const formatMoney = (num: number) => {
  return (Number(num) || 0).toLocaleString('zh-CN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

// 专业渠道色彩引擎 - UI大师方案 (12套马卡龙色库)
const getChannelStyles = (channel: string) => {
  if (!channel) return { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-100', accent: 'bg-slate-400' };
  const colors = [
    { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', accent: 'bg-indigo-500' },
    { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'bg-emerald-500' },
    { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accent: 'bg-blue-500' },
    { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', accent: 'bg-amber-500' },
    { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', accent: 'bg-rose-500' },
    { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', accent: 'bg-violet-500' },
    { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', accent: 'bg-cyan-500' },
    { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', accent: 'bg-fuchsia-500' },
    { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200', accent: 'bg-lime-500' },
    { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', accent: 'bg-orange-500' },
    { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', accent: 'bg-teal-500' },
    { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', accent: 'bg-pink-500' },
  ];
  let hash = 0;
  for (let i = 0; i < channel.length; i++) hash = channel.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const InventoryApp = () => {
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('inventory'); 
  // 修改：使用 expandedContracts 替代 collapsedContracts，默认空对象即代表全收起
  const [expandedContracts, setExpandedContracts] = useState<Record<string, boolean>>({});
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  // 销售明细编辑状态
  const [modalSellingPrice, setModalSellingPrice] = useState<string>('');
  const [modalSalesQuantity, setModalSalesQuantity] = useState<string>('0');
  const [modalSalesTax, setModalSalesTax] = useState<string>('13');

  const apiRequest = async (action: string, options: any = {}) => {
    try {
      const response = await fetch(`./api.php?action=${action}`, {
        ...options,
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json', ...(options.headers || {}) }
      });
      
      const text = await response.text();
      // 1. 处理空响应
      if (!text || !text.trim()) {
         throw new Error('服务器返回了空响应 (可能是 PHP 错误或网络问题)');
      }
      
      let data;
      try {
        // 2. 尝试解析 JSON (自动处理 BOM)
        data = JSON.parse(text.trim());
      } catch (e) {
        console.error("API Parse Error. Raw Response:", text);
        // 3. 识别 HTML 错误页
        if (text.trim().startsWith('<') || text.includes('404 Not Found') || text.includes('File not found')) {
             throw new Error(`请求 API 失败 (404/500)。请检查 api.php 文件是否存在且服务器配置正确。Raw: ${text.substring(0, 50)}...`);
        }
        throw new Error("服务器返回数据格式无效 (JSON Parse Failed)");
      }

      if (!response.ok) {
         throw new Error(data?.error || `请求失败 (HTTP ${response.status})`);
      }
      
      return data;
    } catch (err: any) {
      if (err.message.includes('Unauthorized') && action !== 'login' && action !== 'me') {
         setUser(null);
      }
      throw err;
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiRequest('list');
      setProducts(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } catch (e: any) { 
        console.error("Fetch Products Error:", e);
        // 不弹出 alert 打断用户，而是在控制台记录，或者显示 Toast
    }
  };

  useEffect(() => {
    apiRequest('me').then(data => { if (data?.user) setUser(data.user); }).finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { if (user) fetchProducts(); }, [user]);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeTab]);

  useEffect(() => {
    if (editingProduct) {
      setModalSellingPrice(editingProduct.selling_price?.toString() || '');
      setModalSalesQuantity(Math.round(editingProduct.sales_quantity || 0).toString());
      setModalSalesTax(Math.round(editingProduct.sales_tax_amount || 13).toString());
    }
  }, [editingProduct, isModalOpen]);

  const existingChannels = useMemo(() => Array.from(new Set(products.map(p => p.purchase_channel).filter(Boolean))), [products]);
  const existingCategories = useMemo(() => Array.from(new Set(products.map(p => p.category).filter(Boolean))), [products]);

  const modalTotalSale = useMemo(() => {
    const p = parseFloat(modalSellingPrice) || 0;
    const q = parseInt(modalSalesQuantity) || 0;
    const t = parseInt(modalSalesTax) || 0;
    return p * q * (1 + t / 100);
  }, [modalSellingPrice, modalSalesQuantity, modalSalesTax]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let base = [...products];
    
    // Tab 专属过滤
    if (activeTab === 'inventory') {
      base = base.filter(p => !p.sales_contract_id);
      base.sort((a, b) => (b.purchase_invoice_date || '0').localeCompare(a.purchase_invoice_date || '0') || Number(b.id) - Number(a.id));
    } else if (activeTab === 'contracts') {
      base = base.filter(p => p.sales_contract_id);
      base.sort((a, b) => (b.sales_invoice_date || '0').localeCompare(a.sales_invoice_date || '0') || Number(b.id) - Number(a.id));
    }
    
    // 全局搜索过滤 (支持名称、合同号、客户、分类、渠道)
    if (!q) return base;
    return base.filter(p => 
      (p.name||'').toLowerCase().includes(q) || 
      (p.sales_contract_id||'').toLowerCase().includes(q) || 
      (p.customer_name||'').toLowerCase().includes(q) ||
      (p.category||'').toLowerCase().includes(q) ||
      (p.purchase_channel||'').toLowerCase().includes(q)
    );
  }, [products, searchQuery, activeTab]);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;

  const contractGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredProducts.filter(p => p.sales_contract_id).forEach(p => {
      const cid = p.sales_contract_id;
      if (!groups[cid]) groups[cid] = [];
      groups[cid].push(p);
    });
    return Object.entries(groups).sort((a, b) => (b[1][0].sales_invoice_date || '0').localeCompare(a[1][0].sales_invoice_date || '0'));
  }, [filteredProducts]);

  // 新增：合同分页逻辑
  const paginatedContractGroups = useMemo(() => {
    if (activeTab !== 'contracts') return [];
    const start = (currentPage - 1) * itemsPerPage;
    return contractGroups.slice(start, start + itemsPerPage);
  }, [contractGroups, currentPage, itemsPerPage, activeTab]);

  const totalContractPages = Math.ceil(contractGroups.length / itemsPerPage) || 1;

  const stats = useMemo(() => {
    let matchedRevenue = 0, matchedCost = 0; // 含税
    let matchedRevenueNoTax = 0, matchedCostNoTax = 0; // 未税
    let realCashIn = 0;
    let inStockCost = 0;
    let categoryPerf: Record<string, { revenue: number, cost: number }> = {};
    let channelPerf: Record<string, { revenue: number, cost: number }> = {};

    filteredProducts.forEach(p => {
      const pQty = Number(p.purchase_quantity) || 0;
      const sQty = Number(p.sales_quantity) || 0;
      const pPrice = Number(p.purchase_price) || 0;
      const sPrice = Number(p.selling_price) || 0;
      const pTaxVal = Number(p.purchase_tax_amount) || 0;
      const pTax = 1 + pTaxVal / 100;
      const sTax = 1 + (Number(p.sales_tax_amount) || 0) / 100;

      if (p.sales_contract_id) {
        // --- 含税逻辑 ---
        const cost = pPrice * sQty * pTax;
        const revenue = sPrice * sQty * sTax;
        matchedCost += cost;
        matchedRevenue += revenue;
        
        // --- 未税逻辑 (特殊业务需求: 税率1%时，成本全额计入) ---
        const revenueNoTax = sPrice * sQty; // 销售永远取未税单价
        let costNoTax = 0;
        
        if (Math.abs(pTaxVal - 1) < 0.01) {
            // 特殊情况：进项税为 1% 时，未税成本 = 价格 * 数量 * (1+税率) => 即含税总成本
            costNoTax = pPrice * sQty * pTax;
        } else {
            // 一般情况：未税成本 = 价格 * 数量
            costNoTax = pPrice * sQty;
        }
        
        matchedRevenueNoTax += revenueNoTax;
        matchedCostNoTax += costNoTax;

        if (p.paid) realCashIn += revenue;

        const cat = p.category || '未分类';
        if (!categoryPerf[cat]) categoryPerf[cat] = { revenue: 0, cost: 0 };
        categoryPerf[cat].revenue += revenue;
        categoryPerf[cat].cost += cost;

        const chan = p.purchase_channel || '默认渠道';
        if (!channelPerf[chan]) channelPerf[chan] = { revenue: 0, cost: 0 };
        channelPerf[chan].revenue += revenue;
        channelPerf[chan].cost += cost;
      } else {
        inStockCost += pPrice * pQty * pTax;
      }
    });

    const netProfit = matchedRevenue - matchedCost;
    const netProfitNoTax = matchedRevenueNoTax - matchedCostNoTax;

    return {
      // 含税数据
      netProfit,
      margin: matchedRevenue > 0 ? (netProfit / matchedRevenue) * 100 : 0,
      roi: matchedCost > 0 ? (netProfit / matchedCost) * 100 : 0,
      
      // 未税数据
      netProfitNoTax,
      marginNoTax: matchedRevenueNoTax > 0 ? (netProfitNoTax / matchedRevenueNoTax) * 100 : 0,
      roiNoTax: matchedCostNoTax > 0 ? (netProfitNoTax / matchedCostNoTax) * 100 : 0,

      // 其他通用
      realCashIn,
      receivables: matchedRevenue - realCashIn,
      tCost: matchedCost,
      totalStockValue: inStockCost,
      categoryChart: Object.entries(categoryPerf).map(([k,v])=>({name:k, profit: v.revenue-v.cost})).sort((a,b)=>b.profit-a.profit),
      channelChart: Object.entries(channelPerf).map(([k,v])=>({name:k, profit: v.revenue-v.cost})).sort((a,b)=>b.profit-a.profit)
    };
  }, [filteredProducts]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsActionLoading(true);
    const fd = new FormData(e.currentTarget);
    if (editingProduct) fd.append('id', editingProduct.id);
    try {
      await apiRequest('save', { method: 'POST', body: fd });
      setIsModalOpen(false); setEditingProduct(null); fetchProducts();
    } catch (e: any) { alert(e.message); }
    finally { setIsActionLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('此操作将永久删除该资产档案，且无法撤销。\n确认要继续吗？')) return;
    setIsActionLoading(true);
    try {
        await apiRequest('delete', { method: 'POST', body: JSON.stringify({ id }) });
        fetchProducts(); // 刷新列表
    } catch (e: any) {
        alert(e.message);
    } finally {
        setIsActionLoading(false);
    }
  };

  const Pagination = () => (
    <div className="flex items-center justify-between px-10 py-6 bg-white border-t border-slate-100 text-slate-500 font-medium text-sm">
      <div className="flex items-center gap-6"><span>共 {filteredProducts.length} 条资产</span></div>
      <div className="flex items-center gap-2">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronLeft size={20} /></button>
        <div className="flex items-center gap-1">
           <span className="bg-slate-900 text-white w-8 h-8 rounded flex items-center justify-center font-bold text-xs">{currentPage}</span>
           <span className="text-slate-300 mx-2 font-black italic">/</span>
           <span className="text-slate-400 font-bold text-xs">{totalPages}</span>
        </div>
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"><ChevronRight size={20} /></button>
      </div>
    </div>
  );

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
      <p className="font-black uppercase tracking-widest italic animate-pulse">智库 IMS · 正在初始化终端...</p>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="max-w-md w-full bg-white rounded-[4rem] p-12 shadow-2xl animate-in zoom-in duration-500">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-slate-900 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-slate-950/20">
            <ShieldCheck className="text-blue-500" size={40} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">智库 IMS</h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-3">Terminal Authentication</p>
        </div>
        <form className="space-y-6" onSubmit={async (e)=>{
          e.preventDefault(); setIsActionLoading(true);
          const fd = new FormData(e.currentTarget);
          try { const res = await apiRequest('login', { method: 'POST', body: JSON.stringify(Object.fromEntries(fd)) }); setUser(res.user); }
          catch(err:any){ alert(err.message); } finally { setIsActionLoading(false); }
        }}>
          <input name="username" placeholder="USERNAME" required className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black focus:ring-4 ring-blue-100 focus:border-blue-600 outline-none transition-all" />
          <input name="password" type="password" placeholder="PASSWORD" required className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black focus:ring-4 ring-blue-100 focus:border-blue-600 outline-none transition-all" />
          <button disabled={isActionLoading} className="w-full bg-slate-950 text-white font-black py-6 rounded-3xl hover:bg-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-xl shadow-slate-950/20">
            {isActionLoading ? <Loader2 className="animate-spin" /> : '进入系统'}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans text-slate-900">
      {/* 侧边导航栏 */}
      <aside className="w-24 md:w-72 bg-slate-950 flex flex-col border-r border-white/5 z-20 shadow-2xl">
        <div className="p-10 flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20"><Package className="text-white" size={28} /></div>
          <span className="hidden md:block text-white font-black text-2xl tracking-tighter uppercase italic">智库 IMS</span>
        </div>
        <nav className="flex-1 mt-6 px-6 space-y-4">
          {[
            { id: 'inventory', label: '资产池库', icon: <Package size={22} /> },
            { id: 'contracts', label: '合同台账', icon: <Briefcase size={22} /> },
            { id: 'dashboard', label: '经营看板', icon: <LayoutDashboard size={22} /> }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-5 px-6 py-5 rounded-3xl transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
              {tab.icon}<span className="hidden md:block font-black text-sm uppercase">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-8"><button onClick={() => apiRequest('logout').then(() => setUser(null))} className="w-full p-5 bg-white/5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center md:justify-start gap-4 font-black text-sm rounded-2xl transition-all uppercase tracking-widest"><LogOut size={22} /><span className="hidden md:block">注销终端</span></button></div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-12 shrink-0 z-10">
          <h2 className="text-2xl font-black text-slate-950 tracking-tighter uppercase italic flex items-center gap-4">
            {activeTab === 'inventory' ? '资产库存池' : activeTab === 'contracts' ? '销售合同中心' : '经营实绩看板'}
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative group flex items-center">
              <Search className="absolute left-5 text-slate-400 pointer-events-none" size={18} />
              <input 
                type="text" 
                placeholder="全局检索 (名称/合同/渠道...)" 
                className="pl-14 pr-12 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl w-80 font-bold focus:bg-white focus:border-blue-500 outline-none transition-all" 
                value={searchQuery} 
                onChange={e=>setSearchQuery(e.target.value)} 
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {activeTab === 'inventory' && <button onClick={()=>{setEditingProduct(null); setIsModalOpen(true);}} className="bg-slate-950 text-white px-8 py-3.5 rounded-[1.5rem] flex items-center gap-3 text-sm font-black shadow-xl hover:bg-black transition-all active:scale-95 group"><Plus size={20}/> 资产入库</button>}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 bg-slate-50/50 custom-scroll">
           {activeTab === 'inventory' && (
             <div className="animate-in fade-in slide-in-from-bottom-5">
                <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead><tr className="bg-slate-50/80 text-slate-400 font-black text-[11px] tracking-[0.2em] uppercase border-b border-slate-100"><th className="px-10 py-6 w-12"><input type="checkbox" className="w-5 h-5 rounded cursor-pointer accent-blue-600" checked={selectedIds.length === paginatedProducts.length && paginatedProducts.length > 0} onChange={e => setSelectedIds(e.target.checked ? paginatedProducts.map(p => p.id) : [])} /></th><th className="px-6 py-6">资产名称/类目</th><th className="px-6 py-6 text-center">当前结存</th><th className="px-6 py-6">进货渠道</th><th className="px-6 py-6 text-right">进货成本</th><th className="px-10 py-6 text-right">操作</th></tr></thead>
                    <tbody className="divide-y divide-slate-50">
                      {paginatedProducts.map(p => {
                        const style = getChannelStyles(p.purchase_channel);
                        const isSelected = selectedIds.includes(p.id);
                        return (
                          <tr key={p.id} className={`group transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-[1.005] hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 hover:z-10 relative rounded-2xl ${isSelected ? 'bg-blue-50/50' : 'hover:bg-white'}`}>
                            <td className="px-10 py-8 text-center"><input type="checkbox" className="w-5 h-5 rounded cursor-pointer accent-blue-600" checked={isSelected} onChange={() => setSelectedIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])} /></td>
                            <td className="px-6 py-8">
                                <div className="flex items-center gap-4">
                                    <div className={`w-1.5 h-12 rounded-full ${style.accent} shadow-sm`}></div>
                                    <div>
                                        <div className="font-black text-slate-900 text-lg uppercase tracking-tight">{p.name}</div>
                                        <div className="flex gap-2 mt-2">
                                            <span className="text-[10px] font-black bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase">{p.category || '通用'}</span>
                                            <span className="text-[10px] font-black bg-blue-50 px-3 py-1 rounded-full text-blue-600 italic">进项税 {Math.round(p.purchase_tax_amount)}%</span>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-8 text-center font-mono font-black text-slate-900 text-2xl italic">{Math.round(p.purchase_quantity)}</td>
                            <td className="px-6 py-8">
                                <span className={`inline-block px-5 py-2.5 rounded-full text-[11px] font-black border uppercase tracking-widest shadow-md transition-transform hover:scale-105 ${style.bg} ${style.text} ${style.border}`}>
                                    {p.purchase_channel || '未知渠道'}
                                </span>
                                <div className="text-[9px] text-slate-300 font-black mt-3 uppercase flex items-center gap-1.5 ml-1">
                                    <Calendar size={12}/> {p.purchase_invoice_date || '-'}
                                </div>
                            </td>
                            <td className="px-6 py-8 text-right font-black text-slate-950 tabular-nums text-xl italic">¥{formatMoney(p.purchase_price)}</td>
                            <td className="px-10 py-8 text-right">
                                <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                                    <button 
                                        onClick={()=>{setEditingProduct(p); setIsModalOpen(true);}} 
                                        className="p-3 bg-white border border-slate-200 text-slate-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 rounded-xl shadow-sm transition-colors"
                                        title="编辑资产"
                                    >
                                        <Edit3 size={16}/>
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(p.id)}
                                        className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl shadow-sm transition-colors"
                                        title="删除资产"
                                    >
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <Pagination />
                </div>
                {selectedIds.length > 0 && (
                  <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-slate-950 text-white px-12 py-7 rounded-[3rem] shadow-2xl flex items-center gap-12 animate-in slide-in-from-bottom-10 z-50 border border-white/10">
                     <span className="font-black text-sm uppercase tracking-widest">已选 {selectedIds.length} 项资产</span>
                     <button onClick={() => setIsContractModalOpen(true)} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-sm hover:bg-blue-700 shadow-xl shadow-blue-500/30 flex items-center gap-3 uppercase active:scale-95 transition-all"><Briefcase size={20}/> 生成销售合同</button>
                     <button onClick={() => setSelectedIds([])} className="text-slate-600 hover:text-white text-[10px] font-black uppercase tracking-widest">取消选中</button>
                  </div>
                )}
             </div>
           )}

           {activeTab === 'contracts' && (
             <div className="animate-in slide-in-from-right-10 space-y-8 pb-32">
                {paginatedContractGroups.length > 0 ? (
                  <>
                  {paginatedContractGroups.map(([cid, items]) => {
                  const first = items[0];
                  const totalSale = items.reduce((sum, p) => sum + (Number(p.selling_price) * Number(p.sales_quantity) * (1 + Number(p.sales_tax_amount)/100)), 0);
                  const allPaid = items.every(p => Number(p.paid) === 1); // 强制数字比较
                  // 逻辑反转：expandedContracts 中为 true 才是展开，默认为 undefined (false) 即收起
                  const isExpanded = expandedContracts[cid];
                  
                  return (
                    <div key={cid} className={`group bg-white rounded-[2.5rem] border transition-all duration-500 ${!isExpanded ? 'shadow-lg border-slate-200 opacity-90' : 'shadow-2xl border-slate-950 shadow-slate-200'}`}>
                       <div 
                         onClick={() => setExpandedContracts(prev => ({ ...prev, [cid]: !prev[cid] }))}
                         className={`p-10 transition-all duration-500 flex items-center justify-between cursor-pointer rounded-t-[2.5rem] ${!isExpanded ? 'bg-white' : 'bg-slate-950 text-white'}`}
                       >
                          <div className="flex items-center gap-8">
                             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${!isExpanded ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white shadow-lg'}`}>
                                {isExpanded ? <ChevronUp size={28}/> : <ChevronDown size={28}/>}
                             </div>
                             <div>
                                <h4 className="text-2xl font-black italic tracking-tighter uppercase">CTR-{cid}</h4>
                                <p className={`text-[11px] font-black uppercase tracking-[0.2em] mt-1.5 ${!isExpanded ? 'text-slate-400' : 'text-blue-400'}`}>{first.customer_name} · {first.sales_invoice_date || '未归档'}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-12 text-right">
                             <div>
                               <span className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${!isExpanded ? 'text-slate-300' : 'text-slate-500'}`}>合同含税价值</span>
                               <span className={`text-3xl font-black tabular-nums italic ${!isExpanded ? 'text-slate-950' : 'text-white'}`}>¥{formatMoney(totalSale)}</span>
                             </div>
                             <div className={`px-6 py-2.5 rounded-full text-xs font-black uppercase border-2 flex items-center gap-3 transition-all ${allPaid ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-amber-500/10 border-amber-500/20 text-amber-500 shadow-lg'}`}>
                                <RefreshCcw size={14} className={allPaid ? '' : 'animate-spin-slow'}/>
                                {allPaid ? '已结算' : '履行中'}
                             </div>
                          </div>
                       </div>

                       {isExpanded && (
                         <div className="animate-in slide-in-from-top-4">
                           <div className="p-8 bg-slate-50/60 border-b border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5 group/item">
                               <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 transition-all group-hover/item:scale-110"><Truck size={20}/></div>
                               <div>
                                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">批量发货调度</span>
                                  <input type="date" className="text-xs font-black bg-transparent outline-none focus:text-blue-600" onChange={e => {
                                      if (e.target.value) {
                                          const d = e.target.value;
                                          const ids = items.map(p => p.id);
                                          apiRequest('batchUpdate', { method: 'POST', body: JSON.stringify({ids, field:'shipped', date:d}) }).then(fetchProducts);
                                      }
                                  }} />
                               </div>
                             </div>
                             <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5 group/item">
                               <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 transition-all group-hover/item:scale-110"><Banknote size={20}/></div>
                               <div>
                                  <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">批量回款登记</span>
                                  <input type="date" className="text-xs font-black bg-transparent outline-none focus:text-emerald-600" onChange={e => {
                                      if (e.target.value) {
                                          const d = e.target.value;
                                          const ids = items.map(p => p.id);
                                          apiRequest('batchUpdate', { method: 'POST', body: JSON.stringify({ids, field:'paid', date:d}) }).then(fetchProducts);
                                      }
                                  }} />
                               </div>
                             </div>
                             <div className="flex items-center justify-end gap-4">
                               <button onClick={()=>{if(confirm('撤销此合同？')) apiRequest('deleteContract', { method: 'POST', body: JSON.stringify({ contractId: cid }) }).then(fetchProducts);}} className="p-5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-[1.5rem] transition-all"><Trash2 size={24}/></button>
                             </div>
                           </div>
                           <table className="w-full">
                             <tbody className="divide-y divide-slate-50">
                               {items.map(p => (
                                 <tr key={p.id} className="hover:bg-slate-50 transition-all group/row">
                                   <td className="px-10 py-6">
                                      <div className="font-black text-slate-800 text-base uppercase italic tracking-tight">{p.name}</div>
                                      <div className="text-[10px] text-slate-400 font-black mt-1 uppercase">库单号: {p.id}</div>
                                   </td>
                                   <td className="px-10 py-6">
                                      <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em]">
                                        <span className="text-slate-950 bg-slate-100 px-2 py-0.5 rounded mr-2">{Math.round(p.sales_quantity)}</span> 
                                        单位 @ ¥{formatMoney(p.selling_price)} 
                                        <span className="ml-4 text-emerald-600 italic">销项税 {Math.round(p.sales_tax_amount)}%</span>
                                      </div>
                                   </td>
                                   <td className="px-10 py-6 text-right">
                                      <div className="flex items-center justify-end gap-6">
                                        <div className="flex flex-col items-end gap-2">
                                          {p.shipped ? <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase italic flex items-center gap-1.5"><Truck size={10}/> {p.shipped_date}</span> : <span className="text-[9px] text-slate-300 font-black uppercase">待发货</span>}
                                          {p.paid ? <span className="bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-[9px] font-black uppercase italic flex items-center gap-1.5"><CheckCircle2 size={10}/> {p.payment_date}</span> : <span className="text-[9px] text-slate-300 font-black uppercase">待回款</span>}
                                        </div>
                                        <button onClick={()=>{setEditingProduct(p); setIsModalOpen(true);}} className="p-3 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-xl transition-all opacity-0 group-hover/row:opacity-100 shadow-sm"><Edit3 size={14}/></button>
                                      </div>
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       )}
                    </div>
                  );
                })}
                
                {/* 新增：合同分页控制条 */}
                <div className="flex items-center justify-between px-10 py-6 bg-white rounded-[2.5rem] border border-slate-200 shadow-lg text-slate-500 font-medium text-sm mt-8">
                  <div className="flex items-center gap-6"><span>共 {contractGroups.length} 个合同单据</span></div>
                  <div className="flex items-center gap-2">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 hover:bg-slate-100 rounded-full disabled:opacity-30 transition-all"><ChevronLeft size={20} /></button>
                    <div className="flex items-center gap-1 font-black text-xs">
                       <span className="bg-slate-900 text-white w-8 h-8 rounded-xl flex items-center justify-center shadow-lg">{currentPage}</span>
                       <span className="text-slate-300 mx-3 italic text-lg">/</span>
                       <span className="text-slate-400 text-base">{totalContractPages}</span>
                    </div>
                    <button disabled={currentPage === totalContractPages} onClick={() => setCurrentPage(p => p + 1)} className="p-2 hover:bg-slate-100 rounded-full disabled:opacity-30 transition-all"><ChevronRight size={20} /></button>
                  </div>
                </div>
                </>
                ) : (
                  <div className="py-40 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100">
                    <Briefcase className="text-slate-100 mx-auto mb-6" size={80}/>
                    <p className="text-slate-200 font-black text-2xl uppercase italic tracking-widest">暂无活跃合同数据</p>
                  </div>
                )}
             </div>
           )}

           {activeTab === 'dashboard' && (
              <div className="animate-in slide-in-from-bottom-8 duration-700 space-y-10 pb-40">
                <div className="bg-slate-950 rounded-[3.5rem] p-16 text-white border border-white/5 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/15 blur-[120px] rounded-full -mr-64 -mt-64"></div>
                    
                    {/* 核心数据区域：含税 vs 未税 */}
                    <div className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-20">
                      {/* 左侧：业绩详情双列布局 */}
                      <div className="flex flex-col gap-12 justify-center">
                          
                          {/* 含税业绩 (维持原蓝色系) */}
                          <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 backdrop-blur-md relative overflow-hidden group hover:bg-white/10 transition-colors">
                              <div className="absolute right-0 top-0 p-6 opacity-10"><ShieldCheck size={80}/></div>
                              <div className="space-y-4 relative z-10">
                                <p className="text-blue-400 text-[11px] font-black uppercase tracking-[0.5em] flex items-center gap-3"><Flame size={16} className="text-orange-500"/> 含税净利 (已扣除进/销项税)</p>
                                <h3 className="text-6xl font-black tracking-tighter tabular-nums italic -ml-1 text-white">¥{formatMoney(stats.netProfit)}</h3>
                                <div className="flex gap-6 mt-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">含税毛利</span>
                                        <span className="text-2xl font-black text-emerald-400 italic">{stats.margin.toFixed(2)}%</span>
                                    </div>
                                    <div className="w-px bg-white/10 h-10"></div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">含税 ROI</span>
                                        <span className="text-2xl font-black text-indigo-400 italic">{stats.roi.toFixed(2)}%</span>
                                    </div>
                                </div>
                              </div>
                          </div>

                          {/* 未税业绩 (新粉/紫色系) */}
                          <div className="p-8 bg-purple-500/10 rounded-[2.5rem] border border-purple-500/20 backdrop-blur-md relative overflow-hidden group hover:bg-purple-500/20 transition-colors">
                              <div className="absolute right-0 top-0 p-6 opacity-10 text-purple-400"><Zap size={80}/></div>
                              <div className="space-y-4 relative z-10">
                                <p className="text-purple-400 text-[11px] font-black uppercase tracking-[0.5em] flex items-center gap-3"><Zap size={16} className="text-yellow-400"/> 未税净利 (纯收/不含税)</p>
                                <h3 className="text-6xl font-black tracking-tighter tabular-nums italic -ml-1 text-purple-100">¥{formatMoney(stats.netProfitNoTax)}</h3>
                                <div className="flex gap-6 mt-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-purple-300/50 uppercase tracking-widest">未税毛利</span>
                                        <span className="text-2xl font-black text-pink-400 italic">{stats.marginNoTax.toFixed(2)}%</span>
                                    </div>
                                    <div className="w-px bg-purple-500/20 h-10"></div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-purple-300/50 uppercase tracking-widest">未税 ROI</span>
                                        <span className="text-2xl font-black text-fuchsia-400 italic">{stats.roiNoTax.toFixed(2)}%</span>
                                    </div>
                                </div>
                              </div>
                          </div>

                      </div>

                      {/* 右侧：图表区域 (保持不变) */}
                      <div className="bg-white/5 border border-white/10 p-12 rounded-[3rem] backdrop-blur-2xl flex flex-col justify-center">
                        <div className="flex justify-between items-center mb-10"><h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-3"><PieChart size={16} className="text-blue-500"/> 品类纯利贡献分析 (含税)</h4></div>
                        <div className="space-y-8">
                          {stats.categoryChart.slice(0, 5).map((c, i) => {
                            const max = stats.categoryChart[0].profit || 1;
                            const perc = (c.profit / max) * 100;
                            return (
                              <div key={i} className="space-y-3">
                                <div className="flex justify-between text-[11px] font-black uppercase"><span>{c.name}</span><span className="text-white/80 italic">¥{formatMoney(c.profit)}</span></div>
                                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                  <div className={`h-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-1000`} style={{width: `${perc}%`}}></div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { label: '已售资产采购成本', val: stats.tCost, color: 'text-slate-950', icon: <ArrowDownCircle className="text-slate-300" size={24}/> },
                        { label: '累计资金回笼', val: stats.realCashIn, color: 'text-emerald-600', icon: <Banknote className="text-emerald-300" size={24}/> },
                        { label: '待回收应收账款', val: stats.receivables, color: 'text-rose-600', icon: <ShieldAlert className="text-rose-300" size={24}/> },
                        { label: '在库资产沉淀价值', val: stats.totalStockValue, color: 'text-blue-600', icon: <Database className="text-blue-300" size={24}/> }
                    ].map((card, i) => (
                        <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl hover:-translate-y-2 transition-all group">
                            <div className="flex items-center justify-between mb-8"><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{card.label}</p>{card.icon}</div>
                            <h4 className={`text-3xl font-black tabular-nums tracking-tighter italic ${card.color}`}>¥{formatMoney(card.val)}</h4>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-[3.5rem] p-12 border border-slate-200 shadow-2xl">
                   <div className="flex items-center justify-between mb-12"><h4 className="text-2xl font-black italic tracking-tighter flex items-center gap-4"><Landmark className="text-blue-600"/> 渠道采购绩效排名 (按纯利贡献)</h4></div>
                   <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
                     {stats.channelChart.map((c, i) => {
                       const style = getChannelStyles(c.name);
                       return (
                         <div key={i} className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 flex flex-col gap-6 group hover:bg-white hover:border-blue-500 hover:shadow-2xl transition-all">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white ${style.accent} italic text-xl shadow-lg`}>{i+1}</div>
                            <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2">{c.name}</p><p className="text-2xl font-black italic">¥{formatMoney(c.profit)}</p></div>
                         </div>
                       )
                     })}
                   </div>
                </div>
              </div>
           )}
        </div>
      </main>

      {/* 弹窗: 编辑/登记 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-xl bg-white h-screen shadow-2xl p-12 border-l-[12px] border-slate-950 overflow-y-auto animate-in slide-in-from-right duration-500">
             <div className="flex items-center justify-between mb-16"><h3 className="text-4xl font-black italic tracking-tighter">{editingProduct ? '更新资产档案' : '新资产入库'}</h3><button onClick={()=>setIsModalOpen(false)} className="p-4 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><X size={28}/></button></div>
             <form onSubmit={handleSave} className="space-y-12 pb-32">
                <section className="space-y-8"><p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-50 pb-3 flex items-center gap-3"><LayersIcon size={16}/> 1. 资产身份信息</p>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase">资产名称</label><input name="name" required defaultValue={editingProduct?.name} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black focus:bg-white focus:border-blue-600 outline-none transition-all" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase">品类分类</label><input list="categories" name="category" defaultValue={editingProduct?.category} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black focus:bg-white focus:border-blue-600 outline-none transition-all" /><datalist id="categories">{existingCategories.map(c=><option key={c} value={c}/>)}</datalist></div>
                </section>
                <section className="space-y-8"><p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.3em] border-b-2 border-slate-50 pb-3 flex items-center gap-3"><ShoppingBag size={16}/> 2. 采购及进项指标</p>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase">采购单价 (¥)</label><input name="purchasePrice" type="number" step="any" required defaultValue={editingProduct?.purchase_price} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black italic outline-none focus:bg-white" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase">进项税率 (%)</label><input name="purchaseTax" type="number" step="1" required defaultValue={editingProduct?.purchase_tax_amount ?? 13} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none focus:bg-white" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase">入库数量</label><input name="purchaseQuantity" type="number" step="any" required defaultValue={editingProduct?.purchase_quantity || 1} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none focus:bg-white" /></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase">渠道/供应商</label><input list="channels" name="purchaseChannel" defaultValue={editingProduct?.purchase_channel} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none focus:bg-white" /><datalist id="channels">{existingChannels.map(c=><option key={c} value={c}/>)}</datalist></div>
                  </div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase">入库/开票日期</label><input name="purchaseDate" type="date" defaultValue={editingProduct?.purchase_invoice_date} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none focus:bg-white" /></div>
                </section>
                {editingProduct?.sales_contract_id ? (
                  <section className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 space-y-8">
                    <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] border-b pb-3 flex items-center gap-3"><Shield size={16}/> 3. 销售履约信息 (已锁定)</p>
                    <input type="hidden" name="salesContractId" value={editingProduct?.sales_contract_id} />
                    <input type="hidden" name="customerName" value={editingProduct?.customer_name} />
                    <input type="hidden" name="salesInvoiceDate" value={editingProduct?.sales_invoice_date} />
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2"><label className="text-[10px] font-black text-indigo-400 uppercase">成交单价 (¥)</label><input name="sellingPrice" type="number" step="any" value={modalSellingPrice} onChange={e=>setModalSellingPrice(e.target.value)} className="w-full p-5 bg-white border-2 border-indigo-100 rounded-3xl font-black italic outline-none focus:border-indigo-500" /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-indigo-400 uppercase">销项税率 (%)</label><input name="salesTax" type="number" step="1" value={modalSalesTax} onChange={e=>setModalSalesTax(e.target.value)} className="w-full p-5 bg-white border-2 border-indigo-100 rounded-3xl font-black outline-none focus:border-indigo-500" /></div>
                    </div>
                    <input type="hidden" name="salesQuantity" value={modalSalesQuantity} />
                    <div className="bg-white p-6 rounded-[1.5rem] border border-indigo-100 flex justify-between items-center shadow-sm"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">含税总价值</span><span className="text-3xl font-black text-indigo-600 italic">¥{formatMoney(modalTotalSale)}</span></div>
                  </section>
                ) : (
                  <section className="space-y-8"><p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] border-b-2 border-slate-50 pb-3 flex items-center gap-3"><TrendingUp size={16}/> 3. 销售预设 (可选)</p>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase">预估出货价 (¥)</label><input name="sellingPrice" type="number" step="any" defaultValue={editingProduct?.selling_price} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black italic outline-none" /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase">默认销项税 (%)</label><input name="salesTax" type="number" step="1" defaultValue={editingProduct?.sales_tax_amount ?? 13} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black outline-none" /></div>
                    </div>
                    <input type="hidden" name="salesQuantity" value="0" />
                  </section>
                )}
                <div className="fixed bottom-0 right-0 w-full max-w-xl p-10 bg-white/90 backdrop-blur-xl border-t-2 border-slate-50 shadow-2xl z-50">
                  <button disabled={isActionLoading} className="w-full bg-slate-950 text-white font-black py-7 rounded-[2.5rem] shadow-xl hover:bg-black uppercase tracking-[0.3em] transition-all italic active:scale-95">
                    {isActionLoading ? <Loader2 className="animate-spin inline-block mr-3"/> : editingProduct ? '保存档案更新' : '确认录入系统'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* 合同出库分配 模态框 */}
      {isContractModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl" onClick={()=>setIsContractModalOpen(false)}></div>
          <div className="relative w-full max-w-4xl bg-white rounded-[4rem] shadow-2xl p-16 overflow-y-auto max-h-[90vh] custom-scroll animate-in zoom-in border border-white/10">
            <div className="flex justify-between items-center mb-16"><h3 className="text-5xl font-black italic tracking-tighter uppercase">生成销售合同明细</h3><button onClick={()=>setIsContractModalOpen(false)} className="text-slate-300 hover:text-slate-950"><X size={48}/></button></div>
            <form onSubmit={async (e)=>{
              e.preventDefault(); setIsActionLoading(true);
              const fd = new FormData(e.currentTarget); const data = Object.fromEntries(fd);
              const assignments = selectedIds.map(id => ({ id, qty: data[`qty_${id}`], price: data[`price_${id}`], tax: data[`tax_${id}`] }));
              try { await apiRequest('assignToContract', { method: 'POST', body: JSON.stringify({ contractId: data.contractId, customerName: data.customerName, salesDate: data.salesDate, assignments }) }); setIsContractModalOpen(false); setSelectedIds([]); setActiveTab('contracts'); fetchProducts(); }
              catch(e:any){ alert(e.message); } finally { setIsActionLoading(false); }
            }} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <input name="contractId" required placeholder="合同流水号" className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black italic outline-none focus:border-indigo-500" />
                <input name="customerName" required placeholder="客户全称" className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold outline-none focus:border-indigo-500" />
                <input name="salesDate" type="date" required className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-3xl font-bold outline-none focus:border-indigo-500" />
              </div>
              <div className="space-y-6">
                {selectedIds.map(id => {
                  const p = products.find(x => x.id === id);
                  return (
                    <div key={id} className="p-10 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-10 items-center">
                      <div className="space-y-2"><span className="text-xl font-black italic text-slate-900">{p?.name}</span><span className="block text-[10px] font-black bg-white px-3 py-1 rounded-full text-slate-400 border border-slate-100 uppercase w-fit">当前库存: {Math.round(p?.purchase_quantity)}</span></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">合同分配量</label><input name={`qty_${id}`} type="number" step="1" defaultValue={Math.round(p?.purchase_quantity)} max={p?.purchase_quantity} required className="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 font-black text-indigo-600 outline-none" /></div>
                        <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">成交单价</label><input name={`price_${id}`} type="number" step="any" defaultValue={p?.selling_price} required className="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 font-black italic outline-none" /></div>
                      </div>
                      <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase">销项税率 (%)</label><input name={`tax_${id}`} type="number" step="1" defaultValue={p?.sales_tax_amount || 13} required className="w-full p-4 bg-white rounded-2xl border-2 border-slate-100 font-black outline-none" /></div>
                    </div>
                  );
                })}
              </div>
              <button disabled={isActionLoading} className="w-full bg-blue-600 text-white font-black py-8 rounded-[3rem] uppercase tracking-[0.4em] shadow-2xl hover:bg-blue-700 transition-all italic text-xl active:scale-95">{isActionLoading ? <Loader2 className="animate-spin inline-block mr-3"/> : '确认生成销售合同档案'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<InventoryApp />);