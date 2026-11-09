import { motion } from 'framer-motion'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function Header({ onMenuClick, draftQty, onOpenPanel }) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-btn" onClick={onMenuClick} aria-label="Open menu">
          ☰
        </button>
        <div>
          <h1 className="header-title">
            {getGreeting()}, Shopkeeper <span className="emoji">👋</span>
          </h1>
          <p className="header-sub">{today}</p>
        </div>
      </div>

      <div className="header-right">
        <button className="btn btn-primary new-order-btn" onClick={onOpenPanel}>
          <span className="emoji">🧺</span>
          <span className="new-order-label">New Order</span>
          {draftQty > 0 && (
            <motion.span
              key={draftQty}
              className="cart-badge"
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {draftQty}
            </motion.span>
          )}
        </button>
      </div>
    </header>
  )
}

export default Header