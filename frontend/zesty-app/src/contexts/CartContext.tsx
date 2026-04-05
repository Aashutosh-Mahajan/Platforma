import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { MenuItem, Restaurant, CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  restaurant: Restaurant | null;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  addItem: (menuItem: MenuItem, quantity: number, restaurant: Restaurant) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  removeItem: (menuItemId: number) => void;
  clearCart: () => void;
  setRestaurant: (restaurant: Restaurant | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'zesty_cart';

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);

  // Load cart from sessionStorage on mount
  useEffect(() => {
    const savedCart = sessionStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        const { items: savedItems, restaurant: savedRestaurant } = JSON.parse(savedCart);
        setItems(savedItems);
        setRestaurant(savedRestaurant);
      } catch (error) {
        console.error('Failed to load cart from storage:', error);
      }
    }
  }, []);

  // Save cart to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items, restaurant }));
  }, [items, restaurant]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const deliveryFee = restaurant?.delivery_fee || 0;
  const tax = subtotal * 0.05; // 5% GST
  const total = subtotal + deliveryFee + tax;

  const addItem = (menuItem: MenuItem, quantity: number, newRestaurant: Restaurant) => {
    // If adding from a different restaurant, clear the cart
    if (restaurant && restaurant.id !== newRestaurant.id) {
      setItems([]);
      setRestaurant(newRestaurant);
    } else if (!restaurant) {
      setRestaurant(newRestaurant);
    }

    setItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.menuItem.id === menuItem.id);
      if (existingItem) {
        return prevItems.map((item) =>
          item.menuItem.id === menuItem.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prevItems, { menuItem, quantity }];
    });
  };

  const updateQuantity = (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, quantity } : item
      )
    );
  };

  const removeItem = (menuItemId: number) => {
    setItems((prevItems) => prevItems.filter((item) => item.menuItem.id !== menuItemId));
  };

  const clearCart = () => {
    setItems([]);
    setRestaurant(null);
    sessionStorage.removeItem(CART_STORAGE_KEY);
  };

  const value: CartContextType = {
    items,
    restaurant,
    subtotal,
    deliveryFee,
    tax,
    total,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    setRestaurant,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
