import { useState } from 'react'
import * as api from '../api'
import './ProductManager.css'

// The removable "words you can say" chips for one product
function AliasChips({ product, disabled, onRemove }) {
  const list = product.aliases || []
  if (list.length === 0) return null

  return (
    <div className="pm-chips">
      {list.map((alias) => (
        <span key={alias.id} className="pm-chip">
          {alias.alias}
          <button
            type="button"
            onClick={() => onRemove(product, alias)}
            disabled={disabled}
            aria-label={`Remove ${alias.alias}`}
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  )
}

function ProductManager({ products, onChanged }) {
  const custom = products.filter((p) => p.custom)
  const taughtBuiltIn = products.filter((p) => !p.custom && (p.aliases || []).length > 0)
  const categoryNames = [...new Set(products.map((p) => p.category))]

  const [form, setForm] = useState({ name: '', price: '', unit: '', category: '' })
  const [editingId, setEditingId] = useState(null)
  const [edit, setEdit] = useState({})
  const [aliasInputs, setAliasInputs] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  // Runs one server call, then refreshes the product list. Returns true if it worked.
  async function run(id, action) {
    setBusyId(id)
    setError('')
    try {
      await action()
      await onChanged()
      return true
    } catch (err) {
      setError(err.message)
      return false
    } finally {
      setBusyId(null)
    }
  }

  async function handleAdd(event) {
    event.preventDefault()
    if (busyId) return

    const ok = await run('new', () =>
      api.createProduct({
        name: form.name,
        price: Number(form.price),
        unit: form.unit,
        category: form.category,
      }),
    )
    if (ok) setForm({ name: '', price: '', unit: '', category: '' })
  }

  function startEdit(product) {
    setEditingId(product.id)
    setEdit({
      name: product.name,
      price: String(product.price),
      unit: product.unit,
      category: product.category,
    })
  }

  async function saveEdit(product) {
    const ok = await run(product.id, () =>
      api.updateProduct(product.id, {
        name: edit.name,
        price: Number(edit.price),
        unit: edit.unit,
        category: edit.category,
      }),
    )
    if (ok) setEditingId(null)
  }

  function handleDelete(product) {
    if (!window.confirm(`Delete "${product.name}"? Past orders keep it.`)) return
    run(product.id, () => api.deleteProduct(product.id))
  }

  async function addAlias(product) {
    const text = (aliasInputs[product.id] || '').trim()
    if (!text) return

    const ok = await run(product.id, () => api.addProductAlias(product.id, text))
    if (ok) setAliasInputs((prev) => ({ ...prev, [product.id]: '' }))
  }

  function removeAlias(product, alias) {
    run(product.id, () => api.removeProductAlias(product.id, alias.id))
  }

  return (
    <div className="card pm">
      <h3>Your own products</h3>
      <p className="pm-hint">
        Add products that aren't in the built-in list. Only name and price are required.
      </p>

      <form className="pm-form" onSubmit={handleAdd}>
        <input
          type="text"
          placeholder="Product name"
          value={form.name}
          maxLength={60}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Price ₹"
          min="0.01"
          step="0.01"
          inputMode="decimal"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="Unit (kg, packet…)"
          value={form.unit}
          maxLength={20}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
        />
        <input
          type="text"
          list="pm-categories"
          placeholder="Category"
          value={form.category}
          maxLength={30}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        />
        <datalist id="pm-categories">
          {categoryNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <button className="btn btn-primary" type="submit" disabled={busyId === 'new'}>
          {busyId === 'new' ? '...' : 'Add'}
        </button>
      </form>

      {error && <p className="pm-error">{error}</p>}

      {custom.length === 0 && <p className="pm-hint">You haven't added any products yet.</p>}

      {custom.map((product) => (
        <div key={product.id} className="pm-row">
          <div className="pm-row-top">
            <span className="pm-name">
              {product.name}{' '}
              <span className="pm-meta">
                ₹{product.price} / {product.unit} · {product.category}
              </span>
            </span>
            <span className="pm-actions">
              <button
                className="btn btn-soft"
                onClick={() => (editingId === product.id ? setEditingId(null) : startEdit(product))}
                disabled={busyId === product.id}
              >
                {editingId === product.id ? 'Cancel' : 'Edit'}
              </button>
              <button
                className="btn btn-danger-soft"
                onClick={() => handleDelete(product)}
                disabled={busyId === product.id}
              >
                Delete
              </button>
            </span>
          </div>

          {editingId === product.id && (
            <>
              <div className="pm-edit">
                <input
                  type="text"
                  value={edit.name}
                  maxLength={60}
                  aria-label="Name"
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={edit.price}
                  aria-label="Price"
                  onChange={(e) => setEdit({ ...edit, price: e.target.value })}
                />
                <input
                  type="text"
                  value={edit.unit}
                  maxLength={20}
                  aria-label="Unit"
                  onChange={(e) => setEdit({ ...edit, unit: e.target.value })}
                />
                <input
                  type="text"
                  list="pm-categories"
                  value={edit.category}
                  maxLength={30}
                  aria-label="Category"
                  onChange={(e) => setEdit({ ...edit, category: e.target.value })}
                />
              </div>
              <p style={{ marginTop: 8 }}>
                <button
                  className="btn btn-primary"
                  onClick={() => saveEdit(product)}
                  disabled={busyId === product.id}
                >
                  Save changes
                </button>
              </p>
            </>
          )}

          <div className="pm-aliases">
            <AliasChips product={product} disabled={busyId === product.id} onRemove={removeAlias} />
            <div className="pm-alias-add">
              <input
                type="text"
                placeholder="Add a word you say for it (e.g. पनीर, panir)"
                value={aliasInputs[product.id] || ''}
                maxLength={40}
                onChange={(e) => setAliasInputs((prev) => ({ ...prev, [product.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addAlias(product)
                }}
              />
              <button
                className="btn btn-soft"
                onClick={() => addAlias(product)}
                disabled={busyId === product.id}
              >
                Add word
              </button>
            </div>
          </div>
        </div>
      ))}

      {taughtBuiltIn.length > 0 && (
        <>
          <h4>Words you taught for built-in products</h4>
          {taughtBuiltIn.map((product) => (
            <div key={product.id} className="pm-row">
              <strong>
                <span className="emoji">{product.emoji}</span> {product.name}
              </strong>
              <AliasChips product={product} disabled={busyId === product.id} onRemove={removeAlias} />
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export default ProductManager