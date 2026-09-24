import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { MenuItem, Restaurant, CartItem } from '../types';
import { useAuth } from './AuthContext';
import { cartAPI, type BackendCart } from '../api/zesty';

interface CartContextType {
  items: CartItem[];
  restaurant: Restaurant | null;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  loading: boolean;
  /** True once the cart has loaded for the current auth state. Pages that
   *  redirect on an empty cart (checkout) must wait for this. */
  ready: boolean;
  addItem: (menuItem: MenuItem, quantity: number, restaurant: Restaurant) => Promise<void>;
  updateQuantity: (menuItemId: number, quantity: number) => Promise<void>;
  removeItem: (menuItemId: number) => Promise<void>;
  clearCart: () => void;
  setRestaurant: (restaurant: Restaurant | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'zesty_cart';

/**
 * Two backing stores, chosen by auth state:
 *  - authenticated: the backend Cart API (persists across sessions/devices —
 *    this is what FR-Z3 actually asks for).
 *  - guest: sessionStorage, exactly as before. The backend Cart model
 *    requires a logged-in customer, so a guest cart has nowhere server-side
 *    to live; sessionStorage keeps browsing/cart-building working without
 *    forcing a login before a customer has even decided what they want.
 *
 * Switching from guest to authenticated (login) intentionally does NOT
 * merge the two — the backend cart (if any) simply takes over. Merging
 * a local guest cart into a fresh backend cart is a reasonable future
 * enhancement, not implemented here.
 */
export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [restaurant, setRestaurantState] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(false);
  // Which auth state the loaded cart belongs to (null = nothing loaded yet).
  // Comparing against the live value means `ready` flips to false in the same
  // render that sign-in completes, before the server cart has arrived.
  const [loadedFor, setLoadedFor] = useState<boolean | null>(null);
  const ready = loadedFor === isAuthenticated;
  // menu_item id -> backend CartItem id, needed to address PATCH/DELETE
  // /cart/items/{id} — only ever populated on the authenticated path.
  const [cartItemIds, setCartItemIds] = useState<Record<number, number>>({});

  const applyBackendCart = useCallback((cart: BackendCart) => {
    const ids: Record<number, number> = {};
    const nextItems: CartItem[] = cart.items.map((ci) => {
      ids[ci.menu_item] = ci.id;
      return { menuItem: ci.menu_item_detail, quantity: ci.quantity };
    });
    setCartItemIds(ids);
    setItems(nextItems);
    setRestaurantState(cart.restaurant_detail || null);
  }, []);

  // ---- Load on mount / whenever auth state changes ----
  useEffect(() => {
    if (isAuthenticated) {
      setLoading(true);
      cartAPI
        .get()
        .then(applyBackendCart)
        .catch((error) => console.error('Failed to load cart:', error))
        .finally(() => {
          setLoading(false);
          setLoadedFor(true);
        });
    } else {
      const savedCart = sessionStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        try {
          const { items: savedItems, restaurant: savedRestaurant } = JSON.parse(savedCart);
          setItems(savedItems);
          setRestaurantState(savedRestaurant);
        } catch (error) {
          console.error('Failed to load cart from storage:', error);
        }
      }
      setLoadedFor(false);
    }
  }, [isAuthenticated, applyBackendCart]);

  // ---- Persist to sessionStorage only on the guest path — the
  // authenticated path is already persisted server-side on every mutation. ----
  useEffect(() => {
    if (!isAuthenticated) {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ items, restaurant }));
    }
  }, [items, restaurant, isAuthenticated]);

  const subtotal = items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const deliveryFee = restaurant?.delivery_fee || 0;
  const tax = subtotal * 0.05; // 5% GST
  const total = subtotal + deliveryFee + tax;

  const addItem = async (menuItem: MenuItem, quantity: number, newRestaurant: Restaurant) => {
    if (isAuthenticated) {
      // The cross-restaurant warning dialog (see RestaurantDetailPage) has
      // already asked the user before addItem is ever called with a
      // conflicting restaurant — so if we get here with one, it's already
      // confirmed and safe to tell the backend to go ahead and switch.
      const switching = !!(restaurant && restaurant.id !== newRestaurant.id);
      const cart = await cartAPI.addItem(menuItem.id, quantity, switching);
      applyBackendCart(cart);
      return;
    }

    // Guest path — unchanged local-only behavior.
    if (restaurant && restaurant.id !== newRestaurant.id) {
      setItems([]);
      setRestaurantState(newRestaurant);
    } else if (!restaurant) {
      setRestaurantState(newRestaurant);
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

  const updateQuantity = async (menuItemId: number, quantity: number) => {
    if (quantity <= 0) {
      await removeItem(menuItemId);
      return;
    }

    if (isAuthenticated) {
      const cartItemId = cartItemIds[menuItemId];
      if (cartItemId == null) return;
      const cart = await cartAPI.updateItem(cartItemId, quantity);
      applyBackendCart(cart);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, quantity } : item
      )
    );
  };

  const removeItem = async (menuItemId: number) => {
    if (isAuthenticated) {
      const cartItemId = cartItemIds[menuItemId];
      if (cartItemId == null) return;
      await cartAPI.removeItem(cartItemId);
      // The DELETE response has no body (and the backend clears
      // cart.restaurant server-side once the last item is gone), so
      // re-fetch rather than guess the resulting state locally.
      const cart = await cartAPI.get();
      applyBackendCart(cart);
      return;
    }

    setItems((prevItems) => prevItems.filter((item) => item.menuItem.id !== menuItemId));
  };

  const clearCart = () => {
    // Used after an order is placed. The backend cart clears itself as a
    // side effect of order creation (each item is consumed), so this is
    // just resetting local state to match, same as the guest path.
    setItems([]);
    setRestaurantState(null);
    setCartItemIds({});
    sessionStorage.removeItem(CART_STORAGE_KEY);
  };

  const setRestaurant = (newRestaurant: Restaurant | null) => {
    setRestaurantState(newRestaurant);
  };

  const value: CartContextType = {
    items,
    restaurant,
    subtotal,
    deliveryFee,
    tax,
    total,
    loading,
    ready,
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
