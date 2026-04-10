import { create } from 'zustand';

export type CartRestaurantId = number | string;

export type CartItem = {
    id: number | string;
    name: string;
    price: number;
    quantity: number;
};

type CartState = {
    restaurantId: CartRestaurantId | null;
    items: CartItem[];
    addItem: (restaurantId: CartRestaurantId, item: CartItem) => void;
    removeItem: (id: CartItem['id']) => void;
    clearCart: () => void;
    getSubtotal: () => number;
};

export const useCartStore = create<CartState>((set, get) => ({
    restaurantId: null,
    items: [],

    addItem: (incomingRestaurantId, incomingItem) => {
        set((state) => {
            const quantityToAdd = Number.isFinite(incomingItem.quantity) && incomingItem.quantity > 0
                ? incomingItem.quantity
                : 1;

            if (state.restaurantId !== null && state.restaurantId !== incomingRestaurantId) {
                return {
                    restaurantId: incomingRestaurantId,
                    items: [
                        {
                            ...incomingItem,
                            quantity: quantityToAdd,
                        },
                    ],
                };
            }

            const existingIndex = state.items.findIndex((item) => item.id === incomingItem.id);

            if (existingIndex === -1) {
                return {
                    restaurantId: incomingRestaurantId,
                    items: [
                        ...state.items,
                        {
                            ...incomingItem,
                            quantity: quantityToAdd,
                        },
                    ],
                };
            }

            const nextItems = [...state.items];
            nextItems[existingIndex] = {
                ...nextItems[existingIndex],
                quantity: nextItems[existingIndex].quantity + quantityToAdd,
            };

            return {
                restaurantId: incomingRestaurantId,
                items: nextItems,
            };
        });
    },

    removeItem: (id) => {
        set((state) => {
            const nextItems = state.items
                .map((item) => {
                    if (item.id !== id) {
                        return item;
                    }

                    return {
                        ...item,
                        quantity: item.quantity - 1,
                    };
                })
                .filter((item) => item.quantity > 0);

            return {
                restaurantId: nextItems.length ? state.restaurantId : null,
                items: nextItems,
            };
        });
    },

    clearCart: () => {
        set({
            restaurantId: null,
            items: [],
        });
    },

    getSubtotal: () => {
        const subtotal = get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        return Number(subtotal.toFixed(2));
    },
}));