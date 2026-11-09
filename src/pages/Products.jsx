import { useState } from 'react'
import ProductCard from '../components/ProductCard'
import { categories as baseCategories } from '../data/products'

function Products({ products, quantities, onAdd }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')

  // Built-in categories first, then any category the shopkeeper created
  const extra = [...new Set(products.map((p) => p.category))].filter(
    (c) => !baseCategories.includes(c),
  )
  const categories = [...baseCategories, ...extra]
  const activeCategory = categories.includes(category) ? category : 'All'

  const filtered = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.trim().toLowerCase())
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="page">
      <h2 className="page-title">Products</h2>

      <div className="toolbar">
        <div className="search">
          <span className="search-icon emoji">🔍</span>
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="chips">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`chip ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty">
          <span className="emoji">🤔</span>
          <p>No products found. Try a different search.</p>
        </div>
      ) : (
        <div className="product-grid">
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              inOrder={quantities[product.id] || 0}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Products