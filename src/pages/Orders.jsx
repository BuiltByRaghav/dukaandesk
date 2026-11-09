import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import OrderCard from '../components/OrderCard'

function Orders({ activeOrders, completedOrders, onDone }) {
  const [tab, setTab] = useState('active')
  const list = tab === 'active' ? activeOrders : completedOrders

  return (
    <div className="page">
      <h2 className="page-title">Orders</h2>

      <div className="toolbar">
        <div className="chips">
          <button
            className={`chip ${tab === 'active' ? 'active' : ''}`}
            onClick={() => setTab('active')}
          >
            Active ({activeOrders.length})
          </button>
          <button
            className={`chip ${tab === 'done' ? 'active' : ''}`}
            onClick={() => setTab('done')}
          >
            Completed ({completedOrders.length})
          </button>
        </div>
      </div>

      <motion.div
        key={tab}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        {list.length === 0 && (
          <div className="card empty">
            <span className="emoji">{tab === 'active' ? '🎉' : '🧾'}</span>
            <p>
              {tab === 'active'
                ? 'No active orders right now.'
                : 'No completed orders yet.'}
            </p>
          </div>
        )}

        <div className="order-grid">
          <AnimatePresence initial={false}>
            {list.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onDone={tab === 'active' ? onDone : undefined}
              />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default Orders