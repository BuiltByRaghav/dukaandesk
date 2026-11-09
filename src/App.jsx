import { useState, useEffect } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import OrderPanel from './components/OrderPanel'
import Modal from './components/Modal'
import VoiceOrderModal from './components/VoiceOrderModal'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Orders from './pages/Orders'
import { products as localProducts } from './data/products'
import PriceEditor from './components/PriceEditor'
import ProductManager from './components/ProductManager'
import * as api from './api'

/* ---------- Helper functions ---------- */

// Turns a product into an order line item
function toItem(product, qty = 1) {
  return {
    productId: product.id,
    name: product.name,
    emoji: product.emoji,
    price: product.price,
    unit: product.unit,
    qty,
  }
}

function calcTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0)
}

/* ---------- Main App ---------- */

function App({onLogout}) {
  const [page, setPage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Starts with the built-in list, then prices are refreshed from the server
  const [products, setProducts] = useState(localProducts)

  // The order currently being built (not yet confirmed)
  const [draft, setDraft] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [voiceOpen, setVoiceOpen] = useState(false)

  // ALL orders come from the server
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [actionError, setActionError] = useState('')

  /* ----- Load orders from the server ----- */
  function loadOrders() {
    setLoading(true)
    setLoadError('')
    api
      .fetchOrders()
      .then((data) => setOrders(data.orders))
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false))
  }

  // Runs once when the app opens
  useEffect(() => {
    loadOrders()
  }, [])

  // Loads the shop's full catalogue (built-in + custom) and keeps the draft order in step:
  // removed products disappear from it and changed prices refresh.
  async function loadProducts() {
    try {
      const data = await api.fetchProducts()
      setProducts(data.products)
      setDraft((prev) =>
        prev
          .filter((item) => data.products.some((p) => p.id === item.productId))
          .map((item) => {
            const fresh = data.products.find((p) => p.id === item.productId)
            return { ...item, name: fresh.name, price: fresh.price, unit: fresh.unit }
          }),
      )
    } catch (err) {
      // Keep what we have; the server still charges the correct prices
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  /* ----- Values calculated from state (they update automatically) ----- */
  const activeOrders = orders
    .filter((o) => o.status === 'active')
    .sort((a, b) => b.createdAt - a.createdAt)

  const completedOrders = orders
    .filter((o) => o.status === 'done')
    .sort((a, b) => b.completedAt - a.completedAt)

  const draftQty = draft.reduce((sum, item) => sum + item.qty, 0)
  const draftTotal = calcTotal(draft)

  // Example: { 7: 2, 13: 1 } means 2 of product 7 and 1 of product 13 are in the draft
  const quantities = {}
  draft.forEach((item) => {
    quantities[item.productId] = item.qty
  })

  /* ----- Draft (order creation) actions ----- */
  function addToDraft(product) {
    setDraft((prev) => {
      const exists = prev.find((item) => item.productId === product.id)
      if (exists) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, qty: item.qty + 1 } : item,
        )
      }
      return [...prev, toItem(product)]
    })
  }

  // Adds the items understood from a voice sentence into the draft order
  function addVoiceItems(voiceItems) {
    setDraft((prev) => {
      const next = [...prev]

      voiceItems.forEach((voiceItem) => {
        const index = next.findIndex((item) => item.productId === voiceItem.productId)
        if (index >= 0) {
          // Already in the draft: increase the quantity (max 100, same as the server)
          next[index] = {
            ...next[index],
           qty: Math.min(100, Math.round((next[index].qty + voiceItem.qty) * 1000) / 1000),
          }
        } else {
          next.push({ ...voiceItem })
        }
      })

      return next
    })

    setVoiceOpen(false)
    setPanelOpen(true) // show the order drawer so the shopkeeper can review it
  }

  // Called after a price is saved on the Settings page
  function handlePriceSaved(updated) {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, price: updated.price } : p)))
    setDraft((prev) =>
      prev.map((item) => (item.productId === updated.id ? { ...item, price: updated.price } : item)),
    )
  }

  function changeQty(productId, change) {
    setDraft((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, qty: Math.max(1, item.qty + change) }
          : item,
      ),
    )
  }

  function removeFromDraft(productId) {
    setDraft((prev) => prev.filter((item) => item.productId !== productId))
  }

  function clearDraft() {
    setDraft([])
    setCustomerName('')
  }

  /* ----- Creating and completing orders (talks to the server) ----- */
  async function createOrder() {
    setSaving(true)
    setModalError('')

    try {
      const data = await api.createOrder({
        customer: customerName.trim(),
        items: draft.map((item) => ({ productId: item.productId, qty: item.qty })),
      })

      // The server sends back the saved order (with its unique ID)
      setOrders((prev) => [data.order, ...prev])
      clearDraft()
      setConfirmOpen(false)
      setPanelOpen(false)
      setPage('dashboard')
    } catch (err) {
      setModalError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function markDone(orderId) {
    setActionError('')

    try {
      const data = await api.markOrderDone(orderId)

      // Swap the old version of the order for the updated one
      setOrders((prev) => prev.map((order) => (order.id === orderId ? data.order : order)))
    } catch (err) {
      setActionError(err.message)
    }
  }

  /* ----- Which page to show ----- */
  function renderPage() {
    switch (page) {
      case 'products':
        return <Products products={products} quantities={quantities} onAdd={addToDraft} />
      case 'orders':
        return (
          <Orders
            activeOrders={activeOrders}
            completedOrders={completedOrders}
            onDone={markDone}
          />
        )
      case 'settings':
        return (
          <div className="page">
            <h2 className="page-title">Settings</h2>
            <ProductManager products={products} onChanged={loadProducts} />
            <PriceEditor products={products} onSaved={handlePriceSaved} />
            <div className="card empty" style={{ marginTop: 16 }}>
              <button className="btn btn-soft" onClick={onLogout}>
                Log out
              </button>
            </div>
          </div>
        )
      default:
        return (
          <Dashboard
            products={products}
            quantities={quantities}
            activeOrders={activeOrders}
            completedOrders={completedOrders}
            onAdd={addToDraft}
            onDone={markDone}
            onNavigate={setPage}
          />
        )
    }
  }

  // Small red message box used for errors
  const errorBoxStyle = {
    background: 'var(--red-100)',
    color: 'var(--red-600)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-4)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  }

  return (
    // reducedMotion="user" turns off movement for people who prefer less animation
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <Sidebar
          page={page}
          onNavigate={setPage}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          activeCount={activeOrders.length}
        />

        <main className="main">
          <Header
            onMenuClick={() => setSidebarOpen(true)}
            draftQty={draftQty}
            onOpenPanel={() => setPanelOpen(true)}
          />

          {loading && (
            <div className="card empty" style={{ marginBottom: 16 }}>
              <span className="emoji">⏳</span>
              <p>Loading orders...</p>
            </div>
          )}

          {loadError && (
            <div style={errorBoxStyle}>
              <span>{loadError}</span>
              <button className="btn btn-soft" onClick={loadOrders}>
                Try again
              </button>
            </div>
          )}

          {actionError && (
            <div style={errorBoxStyle}>
              <span>{actionError}</span>
              <button className="btn btn-soft" onClick={() => setActionError('')}>
                Dismiss
              </button>
            </div>
          )}

          {/* Smooth page transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Floating microphone button */}
        <button
          className="voice-fab emoji"
          onClick={() => setVoiceOpen(true)}
          aria-label="Create an order by voice"
        >
          🎤
        </button>

        <VoiceOrderModal
          isOpen={voiceOpen}
          onClose={() => setVoiceOpen(false)}
          onAddItems={addVoiceItems}
          products={products}
          onAliasesChanged={loadProducts}
        />

        <OrderPanel
          isOpen={panelOpen}
          items={draft}
          customerName={customerName}
          onCustomerChange={setCustomerName}
          onChangeQty={changeQty}
          onRemove={removeFromDraft}
          onClear={clearDraft}
          onClose={() => setPanelOpen(false)}
          onConfirm={() => {
            setModalError('')
            setConfirmOpen(true)
          }}
        />

        <Modal
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          title="Confirm this order?"
        >
          <p className="order-meta" style={{ marginBottom: 12 }}>
            Customer: {customerName.trim() || 'Walk-in customer'}
          </p>
          <ul className="summary-list">
            {draft.map((item) => (
              <li key={item.productId} className="summary-line">
                <span>
                  <span className="emoji">{item.emoji}</span> {item.name} × {item.qty}
                </span>
                <span>₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
              </li>
            ))}
          </ul>
          <div className="total-row">
            <span>Total</span>
            <strong>₹{draftTotal.toLocaleString('en-IN')}</strong>
          </div>

          {modalError && (
            <p style={{ color: 'var(--red-600)', marginTop: 12 }}>{modalError}</p>
          )}

          <div className="modal-actions">
            <button
              className="btn btn-soft"
              onClick={() => setConfirmOpen(false)}
              disabled={saving}
            >
              Go back
            </button>
            <button className="btn btn-primary" onClick={createOrder} disabled={saving}>
              {saving ? 'Saving...' : 'Create Order'}
            </button>
          </div>
        </Modal>
      </div>
    </MotionConfig>
  )
}

export default App