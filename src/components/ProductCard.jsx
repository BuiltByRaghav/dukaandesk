import { AnimatePresence, motion } from 'framer-motion'

function ProductCard({ product, inOrder, onAdd }) {
  return (
    <motion.article
      className="product-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Small badge showing how many are in the current order */}
      <AnimatePresence>
        {inOrder > 0 && (
          <motion.span
            key={inOrder}
            className="product-badge"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {inOrder}
          </motion.span>
        )}
      </AnimatePresence>

      <div className="product-emoji emoji">{product.emoji}</div>
      <h3 className="product-name">{product.name}</h3>
      <p className="product-unit">per {product.unit}</p>

      <div className="product-footer">
        <span className="product-price">₹{product.price}</span>
        <button
          className="add-btn"
          onClick={() => onAdd(product)}
          aria-label={`Add ${product.name} to order`}
        >
          +
        </button>
      </div>
    </motion.article>
  )
}

export default ProductCard