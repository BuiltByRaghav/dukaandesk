import { useState } from 'react'
import * as api from '../api'
import './PriceEditor.css'

function PriceEditor({ products, onSaved }) {
  // What the shopkeeper has typed so far, per product id
  const [edits, setEdits] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [error, setError] = useState('')

  async function save(product) {
    const typed = edits[product.id]
    const price = Number(typed)

    if (typed === '' || !Number.isFinite(price) || price <= 0) {
      setError(`Enter a valid price for ${product.name}.`)
      return
    }

    setSavingId(product.id)
    setError('')

    try {
      const data = await api.updateProductPrice(product.id, price)
      onSaved(data.product)
      setEdits((prev) => {
        const next = { ...prev }
        delete next[product.id]
        return next
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="card price-editor">
      <h3>Product prices</h3>
      <p className="price-unit" style={{ marginBottom: 12 }}>
        New prices apply to new orders only. Existing orders keep their old price.
      </p>

      {error && <p className="price-error">{error}</p>}

      {products.map((product) => {
        const typed = edits[product.id]
        const changed = typed !== undefined && Number(typed) !== product.price

        return (
          <div key={product.id} className="price-row">
            <span className="price-name">
              <span className="emoji">{product.emoji}</span> {product.name}{' '}
              <span className="price-unit">/ {product.unit}</span>
            </span>

            <span className="price-input-wrap">
              ₹
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={typed !== undefined ? typed : product.price}
                onChange={(e) => setEdits((prev) => ({ ...prev, [product.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && changed) save(product)
                }}
                aria-label={`Price of ${product.name}`}
              />
            </span>

            <button
              className="btn btn-primary"
              onClick={() => save(product)}
              disabled={!changed || savingId === product.id}
            >
              {savingId === product.id ? '...' : 'Save'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default PriceEditor