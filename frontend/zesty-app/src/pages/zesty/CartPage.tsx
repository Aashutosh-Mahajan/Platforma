import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, restaurant, subtotal, deliveryFee, tax, total, updateQuantity, removeItem, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="theme-zesty theme-zesty-page min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Your cart is empty
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Add some delicious items to get started!
          </p>
          <button
            onClick={() => navigate('/zesty')}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Browse Restaurants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-zesty theme-zesty-page min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Your Cart
          </h1>
          {restaurant && (
            <p className="text-gray-600 dark:text-gray-400">
              From {restaurant.name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              {/* Clear Cart Button */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Items ({items.length})
                </h2>
                <button
                  onClick={clearCart}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                >
                  Clear Cart
                </button>
              </div>

              {/* Items List */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {items.map(item => (
                  <div key={item.menuItem.id} className="p-4 flex gap-4">
                    {/* Item Image */}
                    <div className="w-20 h-20 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                      {item.menuItem.image ? (
                        <img
                          src={item.menuItem.image}
                          alt={item.menuItem.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-gray-400 text-2xl">🍽️</span>
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {item.menuItem.name}
                        {item.menuItem.is_vegetarian && <span className="ml-2 text-green-600">🌱</span>}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        ₹{item.menuItem.price} each
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-gray-900 dark:text-white font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeItem(item.menuItem.id)}
                          className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Item Total */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        ₹{(item.menuItem.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Order Summary
              </h2>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Delivery Fee</span>
                  <span>₹{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700 dark:text-gray-300">
                  <span>Tax (5%)</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
                <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/zesty/checkout')}
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Proceed to Checkout
              </button>

              <button
                onClick={() => navigate('/zesty')}
                className="w-full mt-3 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Add More Items
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
