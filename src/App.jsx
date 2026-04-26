import { useState, useEffect } from 'react'

const SUPABASE_URL = 'https://fuhsrteersmcnoocgkfj.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1aHNydGVlcnNtY25vb2Nna2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxNjE1MzUsImV4cCI6MjA5MjczNzUzNX0.4vR8qaDCxpwWScqPen11HsOKmqhpwD9rdnsVpLiOg-w'
const api = {
  headers: (t) => ({ 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${t || SUPABASE_KEY}` }),
  signUp: async (e, p) => (await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY }, body: JSON.stringify({ email: e, password: p }) })).json(),
  signIn: async (e, p) => (await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY }, body: JSON.stringify({ email: e, password: p }) })).json(),
  select: async (tbl, t) => (await fetch(`${SUPABASE_URL}/rest/v1/${tbl}?select=*&order=created_at.desc`, { headers: api.headers(t) })).json(),
  insert: async (tbl, d, t) => (await fetch(`${SUPABASE_URL}/rest/v1/${tbl}`, { method: 'POST', headers: { ...api.headers(t), 'Prefer': 'return=representation' }, body: JSON.stringify(d) })).json(),
  delete: async (tbl, id, t) => (await fetch(`${SUPABASE_URL}/rest/v1/${tbl}?id=eq.${id}`, { method: 'DELETE', headers: api.headers(t) })).ok,
}

export default function App() {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [tab, setTab] = useState('home')
  const [data, setData] = useState({ customers: [], products: [], inventory: [], purchaseInvoices: [], salesInvoices: [], shippingCosts: [] })
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({})
  const [msg, setMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [salesItems, setSalesItems] = useState([])
  const [salesInvoice, setSalesInvoice] = useState({})
  const [extracting, setExtracting] = useState(false)
  const [extractedItems, setExtractedItems] = useState([])

  const loadData = async () => {
    if (!token) return
    setIsLoading(true)
    const [c, p, i, pu, s, sh] = await Promise.all([api.select('customers', token), api.select('products', token), api.select('inventory', token), api.select('purchase_invoices', token), api.select('sales_invoices', token), api.select('shipping_costs', token)])
    setData({ customers: Array.isArray(c) ? c : [], products: Array.isArray(p) ? p : [], inventory: Array.isArray(i) ? i : [], purchaseInvoices: Array.isArray(pu) ? pu : [], salesInvoices: Array.isArray(s) ? s : [], shippingCosts: Array.isArray(sh) ? sh : [] })
    setIsLoading(false)
  }

  useEffect(() => { if (token) loadData() }, [token])

  const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const handleLogin = async () => {
    setAuthLoading(true); setAuthError('')
    const r = await api.signIn(authForm.email, authForm.password)
    if (r.access_token) { setToken(r.access_token); setUser(r.user); notify('✅ تم تسجيل الدخول') }
    else setAuthError(r.error_description || 'خطأ في البيانات')
    setAuthLoading(false)
  }

  const handleSignUp = async () => {
    setAuthLoading(true); setAuthError('')
    const r = await api.signUp(authForm.email, authForm.password)
    if (r.access_token) { setToken(r.access_token); setUser(r.user); notify('✅ تم إنشاء الحساب') }
    else if (r.id) { notify('✅ تم! سجل دخول الآن'); setAuthMode('login') }
    else setAuthError(r.error_description || r.msg || 'خطأ')
    setAuthLoading(false)
  }

  // PDF Upload & Extract
// PDF Upload & Extract
// PDF Upload & Extract
const handlePdfUpload = async (file, type) => {
  setExtracting(true)
  try {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64, fileType: file.type, type })
      });
      const result = await res.json();
      if (type === 'purchase') {
        setForm({ invoiceNo: result.invoice_no || '', supplier: result.supplier || '', date: result.date || new Date().toISOString().split('T')[0], total: result.total || '', currency: result.currency || 'USD' });
        setExtractedItems(result.items || []);
      } else {
        setForm({ invoiceNo: result.invoice_no || '', company: result.company || '', date: result.date || new Date().toISOString().split('T')[0], total: result.total || '', currency: result.currency || 'TRY', shipmentRef: result.shipment_ref || '', route: result.route || '', weight: result.weight || '', packages: result.packages || '' });
      }
      notify('✅ تم استخراج البيانات!');
      setExtracting(false);
    };
    reader.readAsDataURL(file);
  } catch (e) {
    console.error('Error:', e);
    notify('❌ خطأ في القراءة');
    setExtracting(false);
  }
}

  const addCustomer = async () => { if (!form.name) return notify('❌ أدخل الاسم'); setIsLoading(true); await api.insert('customers', { user_id: user.id, name: form.name, country: form.country || '' }, token); await loadData(); setModal(null); setForm({}); notify('✅ تم'); setIsLoading(false) }
  const addProduct = async () => { if (!form.name) return notify('❌ أدخل الاسم'); setIsLoading(true); await api.insert('products', { user_id: user.id, code: form.code || '', name: form.name, price: parseFloat(form.price) || 0, currency: form.currency || 'USD' }, token); await loadData(); setModal(null); setForm({}); notify('✅ تم'); setIsLoading(false) }
  const addInventory = async () => { if (!form.name) return notify('❌ أدخل الاسم'); setIsLoading(true); await api.insert('inventory', { user_id: user.id, code: form.code || '', name: form.name, qty: parseInt(form.qty) || 0, location: 'Muratbey Antrepo' }, token); await loadData(); setModal(null); setForm({}); notify('✅ تم'); setIsLoading(false) }
  
  const addPurchase = async () => { 
    if (!form.invoiceNo) return notify('❌ أدخل الرقم')
    setIsLoading(true)
    await api.insert('purchase_invoices', { user_id: user.id, invoice_no: form.invoiceNo, supplier: form.supplier || '', date: form.date, currency: form.currency || 'USD', total: parseFloat(form.total) || 0 }, token)
    // Add items to products & inventory
    for (const item of extractedItems) {
      await api.insert('products', { user_id: user.id, code: item.code || '', name: item.name, price: parseFloat(item.price) || 0, currency: form.currency || 'USD' }, token)
      await api.insert('inventory', { user_id: user.id, code: item.code || '', name: item.name, qty: parseInt(item.qty) || 0, location: 'Muratbey Antrepo' }, token)
    }
    await loadData()
    setModal(null); setForm({}); setExtractedItems([])
    notify('✅ تم')
    setIsLoading(false)
  }

  const addShipping = async () => { if (!form.company) return notify('❌ أدخل الشركة'); setIsLoading(true); await api.insert('shipping_costs', { user_id: user.id, invoice_no: form.invoiceNo || '', company: form.company, date: form.date, currency: form.currency || 'TRY', total: parseFloat(form.total) || 0, shipment_ref: form.shipmentRef || '', route: form.route || '', weight: form.weight || '', packages: form.packages || '' }, token); await loadData(); setModal(null); setForm({}); notify('✅ تم'); setIsLoading(false) }
  
  const saveSale = async () => { if (!salesInvoice.customerName || salesItems.length === 0) return notify('❌ أكمل البيانات'); setIsLoading(true); const total = salesItems.reduce((s, i) => s + i.qty * i.price, 0); await api.insert('sales_invoices', { user_id: user.id, invoice_no: salesInvoice.invoiceNo, customer_name: salesInvoice.customerName, date: salesInvoice.date, currency: 'USD', total, items: salesItems }, token); await loadData(); setModal(null); notify('✅ تم'); setIsLoading(false) }
  const deleteItem = async (tbl, id) => { if (!confirm('حذف؟')) return; setIsLoading(true); await api.delete(tbl, id, token); await loadData(); notify('🗑️ تم'); setIsLoading(false) }

  const stats = { purchases: data.purchaseInvoices.reduce((s, p) => s + Number(p.total || 0), 0), sales: data.salesInvoices.reduce((s, p) => s + Number(p.total || 0), 0), shipping: data.shippingCosts.reduce((s, p) => s + Number(p.total || 0), 0) }
  stats.profit = stats.sales - stats.purchases - stats.shipping

  const tabs = [{ id: 'home', i: '🏠', l: 'الرئيسية' }, { id: 'customers', i: '👥', l: 'العملاء' }, { id: 'purchases', i: '📥', l: 'الشراء' }, { id: 'sales', i: '📤', l: 'البيع' }, { id: 'products', i: '📦', l: 'الأصناف' }, { id: 'inventory', i: '🏭', l: 'المخزون' }, { id: 'shipping', i: '🚚', l: 'الشحن' }, { id: 'reports', i: '📊', l: 'التقارير' }]

  if (!user) return (
    <div dir="rtl" style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Arial' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 30, width: '100%', maxWidth: 340, boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}><div style={{ fontSize: 48 }}>🌍</div><h1 style={{ margin: 0, color: '#1e3a8a', fontSize: 20 }}>Golden Sand</h1><p style={{ color: '#666', fontSize: 12, margin: 4 }}>نظام إدارة التجارة</p></div>
        <div style={{ display: 'flex', marginBottom: 12, background: '#f3f4f6', borderRadius: 8, padding: 3 }}>
          <button onClick={() => setAuthMode('login')} style={{ flex: 1, padding: 8, border: 'none', borderRadius: 6, fontWeight: 'bold', fontSize: 12, background: authMode === 'login' ? '#1e3a8a' : 'transparent', color: authMode === 'login' ? '#fff' : '#666', cursor: 'pointer' }}>دخول</button>
          <button onClick={() => setAuthMode('signup')} style={{ flex: 1, padding: 8, border: 'none', borderRadius: 6, fontWeight: 'bold', fontSize: 12, background: authMode === 'signup' ? '#1e3a8a' : 'transparent', color: authMode === 'signup' ? '#fff' : '#666', cursor: 'pointer' }}>حساب جديد</button>
        </div>
        {authError && <div style={{ background: '#fee2e2', color: '#dc2626', padding: 8, borderRadius: 6, marginBottom: 10, fontSize: 11 }}>{authError}</div>}
        <input type="email" placeholder="البريد الإلكتروني" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} style={{ width: '100%', padding: 10, border: '2px solid #e5e7eb', borderRadius: 8, marginBottom: 8, boxSizing: 'border-box', fontSize: 13 }} />
        <input type="password" placeholder="كلمة المرور" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} style={{ width: '100%', padding: 10, border: '2px solid #e5e7eb', borderRadius: 8, marginBottom: 10, boxSizing: 'border-box', fontSize: 13 }} />
        <button onClick={authMode === 'login' ? handleLogin : handleSignUp} disabled={authLoading} style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 'bold', cursor: 'pointer', opacity: authLoading ? 0.7 : 1 }}>{authLoading ? '⏳' : authMode === 'login' ? '🔐 دخول' : '✨ إنشاء'}</button>
      </div>
    </div>
  )

  return (
    <div dir="rtl" style={{ fontFamily: 'Arial', minHeight: '100vh', background: '#f3f4f6' }}>
      {isLoading && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}><div style={{ color: '#fff' }}>⏳ جاري التحميل...</div></div>}
      {extracting && <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}><div style={{ fontSize: 40, marginBottom: 10 }}>🤖</div><div style={{ color: '#fff', fontSize: 16 }}>Claude يقرأ الفاتورة...</div></div>}
      {msg && <div style={{ position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', background: msg.includes('❌') ? '#dc2626' : '#22c55e', color: '#fff', padding: '8px 16px', borderRadius: 8, zIndex: 100, fontSize: 12 }}>{msg}</div>}
      <div style={{ background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', color: '#fff', padding: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h1 style={{ margin: 0, fontSize: 16 }}>🌍 Golden Sand</h1><p style={{ margin: 0, fontSize: 10, opacity: 0.8 }}>{user.email}</p></div>
          <button onClick={() => { setUser(null); setToken(null) }} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>خروج</button>
        </div>
      </div>
      <div style={{ display: 'flex', overflowX: 'auto', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: '8px 10px', border: 'none', background: tab === t.id ? '#eff6ff' : '#fff', color: tab === t.id ? '#2563eb' : '#666', fontWeight: tab === t.id ? 'bold' : 'normal', borderBottom: tab === t.id ? '2px solid #2563eb' : 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 11 }}>{t.i} {t.l}</button>)}
      </div>
      <div style={{ padding: 10 }}>
        {tab === 'home' && <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)', borderRadius: 8, padding: 12, color: '#fff' }}><p style={{ margin: 0, fontSize: 10 }}>💰 المشتريات</p><p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 'bold' }}>${stats.purchases.toLocaleString()}</p></div>
            <div style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', borderRadius: 8, padding: 12, color: '#fff' }}><p style={{ margin: 0, fontSize: 10 }}>📈 المبيعات</p><p style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 'bold' }}>${stats.sales.toLocaleString()}</p></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button onClick={() => { setForm({ date: new Date().toISOString().split('T')[0], currency: 'USD' }); setExtractedItems([]); setModal('purchase') }} style={{ background: '#f97316', color: '#fff', border: 'none', padding: 12, borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>📥 شراء</button>
            <button onClick={() => { setSalesInvoice({ invoiceNo: 'GS-' + Date.now(), date: new Date().toISOString().split('T')[0] }); setSalesItems([]); setModal('sale') }} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: 12, borderRadius: 8, fontWeight: 'bold', cursor: 'pointer' }}>📤 بيع</button>
          </div>
        </div>}
        {tab === 'customers' && <Card title="👥 العملاء" count={data.customers.length} onAdd={() => { setForm({}); setModal('customer') }} color="#a855f7"><Table cols={['الاسم', 'الدولة', '']} rows={data.customers.map(c => [c.name, c.country || '-', <Btn key={c.id} onClick={() => deleteItem('customers', c.id)}>🗑️</Btn>])} /></Card>}
        {tab === 'purchases' && <Card title="📥 فواتير الشراء" count={data.purchaseInvoices.length} onAdd={() => { setForm({ date: new Date().toISOString().split('T')[0], currency: 'USD' }); setExtractedItems([]); setModal('purchase') }} color="#f97316"><Table cols={['الفاتورة', 'المورد', 'المبلغ', '']} rows={data.purchaseInvoices.map(p => [p.invoice_no, p.supplier, <span key="t" style={{ color: '#f97316' }}>{Number(p.total).toLocaleString()} {p.currency}</span>, <Btn key={p.id} onClick={() => deleteItem('purchase_invoices', p.id)}>🗑️</Btn>])} /></Card>}
        {tab === 'sales' && <Card title="📤 فواتير البيع" count={data.salesInvoices.length} onAdd={() => { setSalesInvoice({ invoiceNo: 'GS-' + Date.now(), date: new Date().toISOString().split('T')[0] }); setSalesItems([]); setModal('sale') }} color="#22c55e"><Table cols={['الفاتورة', 'العميل', 'المبلغ', '']} rows={data.salesInvoices.map(s => [s.invoice_no, s.customer_name, <span key="t" style={{ color: '#22c55e' }}>{Number(s.total).toLocaleString()} {s.currency}</span>, <Btn key={s.id} onClick={() => deleteItem('sales_invoices', s.id)}>🗑️</Btn>])} /></Card>}
        {tab === 'products' && <Card title="📦 الأصناف" count={data.products.length} onAdd={() => { setForm({ currency: 'USD' }); setModal('product') }} color="#3b82f6"><Table cols={['الكود', 'الاسم', 'السعر', '']} rows={data.products.map(p => [p.code || '-', p.name, `${p.price} ${p.currency}`, <Btn key={p.id} onClick={() => deleteItem('products', p.id)}>🗑️</Btn>])} /></Card>}
        {tab === 'inventory' && <Card title="🏭 المخزون" count={data.inventory.length} onAdd={() => { setForm({}); setModal('inventory') }} color="#eab308"><Table cols={['الكود', 'المنتج', 'الكمية', '']} rows={data.inventory.map(i => [i.code || '-', i.name, <span key="q" style={{ color: i.qty > 0 ? '#22c55e' : '#dc2626', fontWeight: 'bold' }}>{i.qty}</span>, <Btn key={i.id} onClick={() => deleteItem('inventory', i.id)}>🗑️</Btn>])} /></Card>}
        {tab === 'shipping' && <Card title="🚚 الشحن" count={data.shippingCosts.length} onAdd={() => { setForm({ date: new Date().toISOString().split('T')[0], currency: 'TRY' }); setModal('shipping') }} color="#8b5cf6"><Table cols={['الشركة', 'التاريخ', 'المبلغ', '']} rows={data.shippingCosts.map(s => [s.company, s.date, <span key="t" style={{ color: '#8b5cf6' }}>{Number(s.total).toLocaleString()} {s.currency}</span>, <Btn key={s.id} onClick={() => deleteItem('shipping_costs', s.id)}>🗑️</Btn>])} /></Card>}
        {tab === 'reports' && <div><h3 style={{ margin: '0 0 10px', fontSize: 14 }}>📊 التقارير</h3><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}><StatBox label="💰 المشتريات" value={`$${stats.purchases.toLocaleString()}`} color="#f97316" /><StatBox label="📈 المبيعات" value={`$${stats.sales.toLocaleString()}`} color="#22c55e" /><StatBox label="🚚 الشحن" value={stats.shipping.toLocaleString()} color="#8b5cf6" /><StatBox label={stats.profit >= 0 ? "💵 الربح" : "📉 الخسارة"} value={`$${Math.abs(stats.profit).toLocaleString()}`} color={stats.profit >= 0 ? "#10b981" : "#ef4444"} /></div></div>}
      </div>
      {modal === 'customer' && <Modal title="👥 عميل جديد" onClose={() => setModal(null)} onSave={addCustomer}><Input label="الاسم *" value={form.name || ''} onChange={v => setForm({ ...form, name: v })} /><Input label="الدولة" value={form.country || ''} onChange={v => setForm({ ...form, country: v })} /></Modal>}
      {modal === 'product' && <Modal title="📦 صنف جديد" onClose={() => setModal(null)} onSave={addProduct}><Input label="الكود" value={form.code || ''} onChange={v => setForm({ ...form, code: v })} /><Input label="الاسم *" value={form.name || ''} onChange={v => setForm({ ...form, name: v })} /><Input label="السعر" type="number" value={form.price || ''} onChange={v => setForm({ ...form, price: v })} /></Modal>}
      {modal === 'inventory' && <Modal title="🏭 مخزون جديد" onClose={() => setModal(null)} onSave={addInventory}><Input label="الكود" value={form.code || ''} onChange={v => setForm({ ...form, code: v })} /><Input label="الاسم *" value={form.name || ''} onChange={v => setForm({ ...form, name: v })} /><Input label="الكمية" type="number" value={form.qty || ''} onChange={v => setForm({ ...form, qty: v })} /></Modal>}
      
      {modal === 'purchase' && <Modal title="📥 فاتورة شراء" onClose={() => setModal(null)} onSave={addPurchase} wide>
        <div style={{ background: '#fef3c7', padding: 10, borderRadius: 8, marginBottom: 10 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 'bold' }}>📄 رفع فاتورة PDF/صورة:</p>
          <input type="file" accept="image/*,.pdf" onChange={e => e.target.files[0] && handlePdfUpload(e.target.files[0], 'purchase')} style={{ fontSize: 11 }} />
        </div>
        <Input label="رقم الفاتورة *" value={form.invoiceNo || ''} onChange={v => setForm({ ...form, invoiceNo: v })} />
        <Input label="المورد" value={form.supplier || ''} onChange={v => setForm({ ...form, supplier: v })} />
        <Input label="التاريخ" type="date" value={form.date || ''} onChange={v => setForm({ ...form, date: v })} />
        <Input label="المبلغ الإجمالي" type="number" value={form.total || ''} onChange={v => setForm({ ...form, total: v })} />
        {extractedItems.length > 0 && <div style={{ marginTop: 10, background: '#f0fdf4', padding: 10, borderRadius: 8 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 'bold', color: '#16a34a' }}>📦 الأصناف المستخرجة ({extractedItems.length}):</p>
          {extractedItems.map((item, i) => <div key={i} style={{ fontSize: 11, padding: 4, background: '#fff', marginBottom: 4, borderRadius: 4 }}>{item.code} - {item.name} | الكمية: {item.qty} | السعر: {item.price}</div>)}
        </div>}
      </Modal>}

      {modal === 'shipping' && <Modal title="🚚 فاتورة شحن" onClose={() => setModal(null)} onSave={addShipping} wide>
        <div style={{ background: '#fef3c7', padding: 10, borderRadius: 8, marginBottom: 10 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 'bold' }}>📄 رفع فاتورة PDF/صورة:</p>
          <input type="file" accept="image/*,.pdf" onChange={e => e.target.files[0] && handlePdfUpload(e.target.files[0], 'shipping')} style={{ fontSize: 11 }} />
        </div>
        <Input label="شركة الشحن *" value={form.company || ''} onChange={v => setForm({ ...form, company: v })} />
        <Input label="التاريخ" type="date" value={form.date || ''} onChange={v => setForm({ ...form, date: v })} />
        <Input label="المبلغ" type="number" value={form.total || ''} onChange={v => setForm({ ...form, total: v })} />
        <Input label="رقم الشحنة" value={form.shipmentRef || ''} onChange={v => setForm({ ...form, shipmentRef: v })} />
        <Input label="المسار" value={form.route || ''} onChange={v => setForm({ ...form, route: v })} />
      </Modal>}

      {modal === 'sale' && <Modal title="📤 فاتورة بيع" onClose={() => setModal(null)} onSave={saveSale} wide><Input label="رقم الفاتورة" value={salesInvoice.invoiceNo || ''} readOnly /><Input label="العميل *" value={salesInvoice.customerName || ''} onChange={v => setSalesInvoice({ ...salesInvoice, customerName: v })} /><Input label="التاريخ" type="date" value={salesInvoice.date || ''} onChange={v => setSalesInvoice({ ...salesInvoice, date: v })} /><div style={{ marginTop: 10 }}><div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontWeight: 'bold', fontSize: 12 }}>📦 الأصناف</span><button onClick={() => setSalesItems([...salesItems, { id: Date.now(), name: '', qty: 1, price: 0 }])} style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: 4, fontSize: 10, cursor: 'pointer' }}>➕</button></div>{salesItems.map((it, idx) => <div key={it.id} style={{ display: 'flex', gap: 4, marginBottom: 4 }}><input placeholder="الاسم" value={it.name} onChange={e => { const items = [...salesItems]; items[idx].name = e.target.value; setSalesItems(items) }} style={{ flex: 1, padding: 6, border: '1px solid #ddd', borderRadius: 4, fontSize: 11 }} /><input type="number" placeholder="كمية" value={it.qty} onChange={e => { const items = [...salesItems]; items[idx].qty = parseInt(e.target.value) || 0; setSalesItems(items) }} style={{ width: 50, padding: 6, border: '1px solid #ddd', borderRadius: 4, fontSize: 11 }} /><input type="number" placeholder="سعر" value={it.price} onChange={e => { const items = [...salesItems]; items[idx].price = parseFloat(e.target.value) || 0; setSalesItems(items) }} style={{ width: 60, padding: 6, border: '1px solid #ddd', borderRadius: 4, fontSize: 11 }} /><button onClick={() => setSalesItems(salesItems.filter((_, i) => i !== idx))} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0 6px', borderRadius: 4, cursor: 'pointer' }}>✕</button></div>)}{salesItems.length > 0 && <div style={{ textAlign: 'left', fontWeight: 'bold', marginTop: 6, fontSize: 12 }}>الإجمالي: ${salesItems.reduce((s, i) => s + i.qty * i.price, 0).toLocaleString()}</div>}</div></Modal>}
    </div>
  )
}

const Card = ({ title, count, onAdd, color, children }) => <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden' }}><div style={{ padding: 10, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}><h3 style={{ margin: 0, fontSize: 13 }}>{title} ({count})</h3><button onClick={onAdd} style={{ background: color, color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, fontSize: 10, cursor: 'pointer' }}>➕</button></div>{children}</div>
const Table = ({ cols, rows }) => <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}><thead style={{ background: '#f9fafb' }}><tr>{cols.map((c, i) => <th key={i} style={{ padding: 8, textAlign: 'right' }}>{c}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={cols.length} style={{ padding: 20, textAlign: 'center', color: '#999' }}>لا توجد بيانات</td></tr> : rows.map((r, i) => <tr key={i} style={{ borderTop: '1px solid #eee' }}>{r.map((c, j) => <td key={j} style={{ padding: 8 }}>{c}</td>)}</tr>)}</tbody></table></div>
const Btn = ({ onClick, children }) => <button onClick={onClick} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '3px 6px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>{children}</button>
const StatBox = ({ label, value, color }) => <div style={{ background: `linear-gradient(135deg,${color},${color}dd)`, borderRadius: 8, padding: 12, color: '#fff' }}><p style={{ margin: 0, fontSize: 10 }}>{label}</p><p style={{ margin: '4px 0 0', fontSize: 16, fontWeight: 'bold' }}>{value}</p></div>
const Modal = ({ title, onClose, onSave, children, wide }) => <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 10 }}><div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: wide ? 400 : 320, maxHeight: '85vh', overflow: 'auto' }}><div style={{ padding: 10, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}><span style={{ fontWeight: 'bold', fontSize: 13 }}>{title}</span><button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer' }}>✕</button></div><div style={{ padding: 12 }}>{children}<button onClick={onSave} style={{ width: '100%', marginTop: 10, background: '#2563eb', color: '#fff', border: 'none', padding: 10, borderRadius: 6, fontWeight: 'bold', cursor: 'pointer' }}>✓ حفظ</button></div></div></div>
const Input = ({ label, value, onChange, type = 'text', readOnly }) => <div style={{ marginBottom: 8 }}><label style={{ display: 'block', fontSize: 11, marginBottom: 3, color: '#666' }}>{label}</label><input type={type} value={value} onChange={e => onChange && onChange(e.target.value)} readOnly={readOnly} style={{ width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 6, fontSize: 12, boxSizing: 'border-box', background: readOnly ? '#f9fafb' : '#fff' }} /></div>
