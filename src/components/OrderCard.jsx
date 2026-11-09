import { motion } from 'framer-motion'

const formatPrice = (n) => `₹${n.toLocaleString('en-IN')}`

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })

// Shows one order. Pass `onDone` only for active orders.
function OrderCard({ order, onDone }) {
  const isDone = order.status === 'done'
  const itemCount = order.items.reduce((sum, item) => sum + item.qty, 0)

  return (
    <motion.article
      layout
      className={`order-card ${isDone ? 'done' : ''}`}
      // Completed cards slide in from the left, new cards rise up
      initial={isDone ? { opacity: 0, x: -40 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      // When marked Done, an active card slides away to the right
      exit={{ opacity: 0, x: 120 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="order-top">
        <div>
          <p className="order-id">{order.id}</p>
          <p className="order-meta">
            {order.customer} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
          <p className="order-meta">
            {isDone
              ? `Completed at ${formatTime(order.completedAt)}`
              : `Placed at ${formatTime(order.createdAt)}`}
          </p>
        </div>
        <span className={`badge ${isDone ? 'badge-done' : 'badge-active'}`}>
          {isDone ? 'Done' : 'Active'}
        </span>
      </div>

      <ul className="order-items">
        {order.items.map((item) => (
          <li key={item.productId} className="order-line">
            <span className="order-line-name">
              <span className="emoji">{item.emoji}</span>
              {item.name} × {item.qty}
            </span>
            <span>{formatPrice(item.price * item.qty)}</span>
          </li>
        ))}
      </ul>

      <div className="order-bottom">
        <div>
          <p className="order-total-label">Total</p>
          <p className="order-total">{formatPrice(order.total)}</p>
        </div>
        {!isDone && onDone && (
          <button className="btn btn-primary" onClick={() => onDone(order.id)}>
            ✓ Mark as Done
          </button>
        )}
      </div>
    </motion.article>
  )
}

export default OrderCard