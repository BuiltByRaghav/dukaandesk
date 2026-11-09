import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const languages = ['English']

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function Header({ language, onLanguageChange, onMenuClick, draftQty, onOpenPanel }) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close the dropdown when clicking anywhere outside it
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        <div className="dropdown" ref={dropdownRef}>
          <button
            className="dropdown-trigger"
            onClick={() => setDropdownOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
          >
            <span className="emoji">🌐</span>
            <span>{language}</span>
            <span className={`chevron ${dropdownOpen ? 'open' : ''}`}>▾</span>
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.ul
                className="dropdown-menu"
                role="listbox"
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                {languages.map((lang) => (
                  <li key={lang}>
                    <button
                      className={`dropdown-option ${lang === language ? 'selected' : ''}`}
                      onClick={() => {
                        onLanguageChange(lang)
                        setDropdownOpen(false)
                      }}
                    >
                      {lang}
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

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