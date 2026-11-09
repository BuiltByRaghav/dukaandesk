// Product catalogue (same products as the React app).
// Uses module.exports because the server uses require().
const categories = ['All', 'Fruits', 'Vegetables', 'Dairy', 'Staples', 'Snacks', 'Drinks']

const products = [
  // Fruits
  { id: 1, name: 'Apple', emoji: '🍎', price: 180, unit: 'kg', category: 'Fruits' },
  { id: 2, name: 'Banana', emoji: '🍌', price: 60, unit: 'dozen', category: 'Fruits' },
  { id: 3, name: 'Grapes', emoji: '🍇', price: 120, unit: 'kg', category: 'Fruits' },
  { id: 4, name: 'Mango', emoji: '🥭', price: 150, unit: 'kg', category: 'Fruits' },
  { id: 5, name: 'Orange', emoji: '🍊', price: 90, unit: 'kg', category: 'Fruits' },
  { id: 6, name: 'Watermelon', emoji: '🍉', price: 40, unit: 'kg', category: 'Fruits' },

  // Vegetables
  { id: 7, name: 'Tomato', emoji: '🍅', price: 40, unit: 'kg', category: 'Vegetables' },
  { id: 8, name: 'Potato', emoji: '🥔', price: 30, unit: 'kg', category: 'Vegetables' },
  { id: 9, name: 'Onion', emoji: '🧅', price: 35, unit: 'kg', category: 'Vegetables' },
  { id: 10, name: 'Carrot', emoji: '🥕', price: 50, unit: 'kg', category: 'Vegetables' },
  { id: 11, name: 'Corn', emoji: '🌽', price: 20, unit: 'piece', category: 'Vegetables' },
  { id: 12, name: 'Spinach', emoji: '🥬', price: 25, unit: 'bunch', category: 'Vegetables' },

  // Dairy
  { id: 13, name: 'Milk', emoji: '🥛', price: 56, unit: 'litre', category: 'Dairy' },
  { id: 14, name: 'Cheese', emoji: '🧀', price: 120, unit: '200g', category: 'Dairy' },
  { id: 15, name: 'Butter', emoji: '🧈', price: 58, unit: '100g', category: 'Dairy' },
  { id: 16, name: 'Eggs', emoji: '🥚', price: 84, unit: 'dozen', category: 'Dairy' },

  // Staples
  { id: 17, name: 'Rice', emoji: '🍚', price: 70, unit: 'kg', category: 'Staples' },
  { id: 18, name: 'Bread', emoji: '🍞', price: 45, unit: 'loaf', category: 'Staples' },
  { id: 19, name: 'Wheat Flour', emoji: '🌾', price: 48, unit: 'kg', category: 'Staples' },
  { id: 20, name: 'Honey', emoji: '🍯', price: 220, unit: '250g', category: 'Staples' },
  { id: 21, name: 'Salt', emoji: '🧂', price: 22, unit: 'kg', category: 'Staples' },

  // Snacks
  { id: 22, name: 'Biscuits', emoji: '🍪', price: 30, unit: 'pack', category: 'Snacks' },
  { id: 23, name: 'Chocolate', emoji: '🍫', price: 50, unit: 'bar', category: 'Snacks' },
  { id: 24, name: 'Popcorn', emoji: '🍿', price: 40, unit: 'pack', category: 'Snacks' },

  // Drinks
  { id: 25, name: 'Tea', emoji: '☕', price: 140, unit: '250g', category: 'Drinks' },
  { id: 26, name: 'Juice', emoji: '🧃', price: 25, unit: 'pack', category: 'Drinks' },
  { id: 27, name: 'Cold Drink', emoji: '🥤', price: 40, unit: 'bottle', category: 'Drinks' },
  { id: 28, name: 'Water', emoji: '💧', price: 20, unit: 'bottle', category: 'Drinks' },
]

module.exports = { categories, products }