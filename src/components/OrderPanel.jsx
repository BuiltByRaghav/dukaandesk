import { AnimatePresence, motion } from 'framer-motion'

// The slide-in drawer where the shopkeeper builds a new order.
function OrderPanel({
  isOpen,
  items,
  customerName,
  onCustomerChange,
  onChangeQty,
  onRemove,
  onClear,
  onClose,
  onConfirm,
}) {
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="panel-overlay"
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />
      )}

      {isOpen && (
        <motion.aside
          key="panel"
          className="drawer"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="drawer-head">
            <h2>
              New Order <span className="emoji">🧺</span>
            </h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close panel">
              ✕
            </button>
          </div>

          <div className="drawer-customer">
            <input
              type="text"
              placeholder="Customer name (optional)"
              value={customerName}
              onChange={(e) => onCustomerChange(e.target.value)}
            />
          </div>

          <div className="drawer-body">
            {items.length === 0 ? (
              <div className="empty">
                <span className="emoji">🛒</span>
                <p>No items yet. Tap + on any product to add it.</p>
              </div>
            ) : (
              <ul className="draft-list">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.li
                      key={item.productId}
                      layout
                      className="draft-item"
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 30 }}
                      transition={{ duration: 0.22 }}
                    >
                      <span className="draft-emoji emoji">{item.emoji}</span>
                      <div className="draft-info">
                        <p className="draft-name">{item.name}</p>
                        <p className="draft-price">
                        ₹{item.price} × {item.qty} = ₹{Math.round(item.price * item.qty * 100) / 100}
                        </p>
                      </div>
                      <div className="qty">
                        <button
                          onClick={() => onChangeQty(item.productId, -1)}
                          aria-label={`Decrease ${item.name}`}
                        >
                          −
                        </button>
                        <span>{item.qty}</span>
                        <button
                          onClick={() => onChangeQty(item.productId, 1)}
                          aria-label={`Increase ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="draft-remove"
                        onClick={() => onRemove(item.productId)}
                        aria-label={`Remove ${item.name}`}
                      >
                        ✕
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>

          <div className="drawer-foot">
            <div className="total-row">
              <span>Total</span>
              <strong>₹{total.toLocaleString('en-IN')}</strong>
            </div>
            <div className="drawer-actions">
              <button
                className="btn btn-danger-soft"
                onClick={onClear}
                disabled={items.length === 0}
              >
                Clear
              </button>
              <button
                className="btn btn-primary"
                onClick={onConfirm}
                disabled={items.length === 0}
              >
                Confirm Order
              </button>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

export default OrderPanel