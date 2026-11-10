import { AnimatePresence, motion } from 'framer-motion'

const links = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'products', label: 'Products', icon: '🥬' },
  { id: 'orders', label: 'Orders', icon: '🧾' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

function Sidebar({ page, onNavigate, isOpen, onClose, activeCount }) {
  function handleClick(id) {
    onNavigate(id)
    onClose() // closes the sidebar on mobile
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="overlay sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <img src="src/assets/logo.png" alt="DukaanDesk logo" />
          <span>DukaanDesk</span>
        </div>

        <nav className="nav">
          {links.map((link) => (
            <button
              key={link.id}
              className={`nav-item ${page === link.id ? 'active' : ''}`}
              onClick={() => handleClick(link.id)}
            >
              {page === link.id && (
                <motion.span
                  className="nav-pill"
                  layoutId="nav-pill"
                  transition={{ type: 'tween', duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                />
              )}
              <span className="nav-icon emoji">{link.icon}</span>
              <span>{link.label}</span>
              {link.id === 'orders' && activeCount > 0 && (
                <span className="nav-count">{activeCount}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-tip">
          <strong>
            Tip <span className="emoji">💡</span>
          </strong>
          <p>Create a separate order for every customer, then tap Done when it's packed.</p>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
