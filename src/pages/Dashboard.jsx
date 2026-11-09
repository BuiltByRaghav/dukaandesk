import { AnimatePresence } from 'framer-motion'
import ProductCard from '../components/ProductCard'
import OrderCard from '../components/OrderCard'

function Dashboard({
  products,
  quantities,
  activeOrders,
  completedOrders,
  onAdd,
  onDone,
  onNavigate,
}) {
  const sales = completedOrders.reduce((sum, order) => sum + order.total, 0)
  const featured = products.slice(0, 8)
  const recent = completedOrders.slice(0, 3)

  return (
    <div className="page">
      {/* Hero banner (pure CSS decoration + emojis) */}
      <section className="hero">
        <div className="hero-text">
          <h2>Fresh day, fresh orders</h2>
          <p>Keep every customer's order separate, tidy and on time.</p>
          <button className="btn hero-btn" onClick={() => onNavigate('products')}>
            Browse products →
          </button>
        </div>
        <div className="hero-art emoji" aria-hidden="true">
          <span>🥕</span>
          <span>🍎</span>
          <span>🥛</span>
        </div>
      </section>

      {/* Overview numbers: these update automatically */}
      <section className="stats">
        <div className="card stat">
          <div className="stat-icon amber emoji">⏳</div>
          <div>
            <p className="stat-label">Active orders</p>
            <p className="stat-value">{activeOrders.length}</p>
          </div>
        </div>
        <div className="card stat">
          <div className="stat-icon green emoji">✅</div>
          <div>
            <p className="stat-label">Completed orders</p>
            <p className="stat-value">{completedOrders.length}</p>
          </div>
        </div>
        <div className="card stat">
          <div className="stat-icon mint emoji">💰</div>
          <div>
            <p className="stat-label">Sales (completed)</p>
            <p className="stat-value">₹{sales.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </section>

      {/* Active orders */}
      <section className="section">
        <div className="section-head">
          <h2>
            Active Orders <span className="count-pill">{activeOrders.length}</span>
          </h2>
          <button className="link-btn" onClick={() => onNavigate('orders')}>
            View all
          </button>
        </div>

        {activeOrders.length === 0 && (
          <div className="card empty">
            <span className="emoji">🎉</span>
            <p>All caught up! No pending orders.</p>
          </div>
        )}

        <div className="order-grid">
          <AnimatePresence initial={false}>
            {activeOrders.map((order) => (
              <OrderCard key={order.id} order={order} onDone={onDone} />
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Fresh picks */}
      <section className="section">
        <div className="section-head">
          <h2>Fresh Picks</h2>
          <button className="link-btn" onClick={() => onNavigate('products')}>
            See all products
          </button>
        </div>
        <div className="product-grid">
          {featured.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              inOrder={quantities[product.id] || 0}
              onAdd={onAdd}
            />
          ))}
        </div>
      </section>

      {/* Recently completed */}
      <section className="section">
        <div className="section-head">
          <h2>
            Recently Completed <span className="count-pill">{completedOrders.length}</span>
          </h2>
          <button className="link-btn" onClick={() => onNavigate('orders')}>
            View history
          </button>
        </div>

        {recent.length === 0 && (
          <div className="card empty">
            <span className="emoji">🧾</span>
            <p>Completed orders will appear here.</p>
          </div>
        )}

        <div className="order-grid">
          <AnimatePresence initial={false}>
            {recent.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </AnimatePresence>
        </div>
      </section>
    </div>
  )
}

export default Dashboard