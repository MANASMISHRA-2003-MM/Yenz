import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from './AuthContext';
import { useMode } from './ModeContext';
import { toast } from 'sonner';

const CartContext = createContext();

const initialSingleCart = {
  items: [],
  subtotal: 0,
  restaurantId: null,
  vendorId: null,
  restaurant: null,
  discount: 0,
  couponCode: '',
  shoppingMode: 'CRAVINGS'
};

export function CartProvider({ children }) {
  const { user } = useAuth();
  const { isFresh } = useMode();
  const currentModeKey = isFresh ? 'FRESH_MANDI' : 'CRAVINGS';

  const [carts, setCarts] = useState({
    CRAVINGS: { ...initialSingleCart, shoppingMode: 'CRAVINGS' },
    FRESH_MANDI: { ...initialSingleCart, shoppingMode: 'FRESH_MANDI' }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setCarts({
        CRAVINGS: { ...initialSingleCart, shoppingMode: 'CRAVINGS' },
        FRESH_MANDI: { ...initialSingleCart, shoppingMode: 'FRESH_MANDI' }
      });
    }
  }, [user]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await API.get('/cart');
      if (res.data.success && res.data.carts) {
        setCarts({
          CRAVINGS: res.data.carts.CRAVINGS || { ...initialSingleCart, shoppingMode: 'CRAVINGS' },
          FRESH_MANDI: res.data.carts.FRESH_MANDI || { ...initialSingleCart, shoppingMode: 'FRESH_MANDI' }
        });
      }
    } catch (err) {
      console.error('Fetch cart error:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (foodId, quantity = 1, selectedWeight = null, targetMode = null) => {
    if (!user) {
      toast.error('Please log in to add items to your cart', {
        description: 'Create an account or login to proceed'
      });
      return { success: false, unauthenticated: true };
    }

    try {
      const activeMode = targetMode || (isFresh ? 'FRESH_MANDI' : 'CRAVINGS');
      const res = await API.post('/cart/add', {
        foodId,
        quantity,
        selectedWeight,
        shoppingMode: activeMode
      });

      if (res.data.success) {
        if (res.data.carts) {
          setCarts({
            CRAVINGS: res.data.carts.CRAVINGS || { ...initialSingleCart, shoppingMode: 'CRAVINGS' },
            FRESH_MANDI: res.data.carts.FRESH_MANDI || { ...initialSingleCart, shoppingMode: 'FRESH_MANDI' }
          });
        }
        return { success: true, message: res.data.message };
      }
    } catch (err) {
      if (err.response?.data?.requiresClear) {
        const modeLabel = targetMode === 'FRESH_MANDI' || isFresh ? 'Fresh Mandi' : 'Cravings';
        toast.error(`Your ${modeLabel} cart contains items from another store!`, {
          description: 'You can only order from 1 restaurant per cart.',
          duration: 6000,
          action: {
            label: 'Clear & Add',
            onClick: async () => {
              await clearCart(targetMode || (isFresh ? 'FRESH_MANDI' : 'CRAVINGS'));
              await addToCart(foodId, quantity, selectedWeight, targetMode);
              toast.success('Cart replaced with new store items!');
            }
          }
        });
        return {
          requiresClear: true,
          message: err.response.data.message,
          shoppingMode: err.response.data.shoppingMode || (isFresh ? 'FRESH_MANDI' : 'CRAVINGS')
        };
      }
      const errMsg = err.response?.data?.message || 'Failed to add item to cart';
      toast.error(errMsg);
      return { success: false };
    }
  };

  const updateQuantity = async (foodId, quantity, selectedWeight = null, targetMode = null) => {
    try {
      const activeMode = targetMode || (isFresh ? 'FRESH_MANDI' : 'CRAVINGS');
      const res = await API.put('/cart/update', {
        foodId,
        quantity,
        selectedWeight,
        shoppingMode: activeMode
      });

      if (res.data.success && res.data.carts) {
        setCarts({
          CRAVINGS: res.data.carts.CRAVINGS || { ...initialSingleCart, shoppingMode: 'CRAVINGS' },
          FRESH_MANDI: res.data.carts.FRESH_MANDI || { ...initialSingleCart, shoppingMode: 'FRESH_MANDI' }
        });
      }
    } catch (err) {
      console.error('Update quantity error:', err);
      toast.error('Failed to update cart item quantity');
    }
  };

  const clearCart = async (targetMode = null) => {
    try {
      const activeMode = targetMode || (isFresh ? 'FRESH_MANDI' : 'CRAVINGS');
      const res = await API.delete(`/cart?mode=${activeMode}`);
      if (res.data.success && res.data.carts) {
        setCarts({
          CRAVINGS: res.data.carts.CRAVINGS || { ...initialSingleCart, shoppingMode: 'CRAVINGS' },
          FRESH_MANDI: res.data.carts.FRESH_MANDI || { ...initialSingleCart, shoppingMode: 'FRESH_MANDI' }
        });
      }
    } catch (err) {
      console.error('Clear cart error:', err);
    }
  };

  const applyCoupon = async (code, targetMode = null) => {
    try {
      const activeMode = targetMode || (isFresh ? 'FRESH_MANDI' : 'CRAVINGS');
      const res = await API.post('/cart/coupon', { code, shoppingMode: activeMode });
      if (res.data.success && res.data.carts) {
        setCarts({
          CRAVINGS: res.data.carts.CRAVINGS || { ...initialSingleCart, shoppingMode: 'CRAVINGS' },
          FRESH_MANDI: res.data.carts.FRESH_MANDI || { ...initialSingleCart, shoppingMode: 'FRESH_MANDI' }
        });
        toast.success(`Coupon ${code} applied successfully!`);
        return { success: true, message: res.data.message };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to apply coupon';
      toast.error(msg);
      return { success: false, message: msg };
    }
  };

  // Active cart derived from ModeContext
  const activeCart = carts[currentModeKey] || { ...initialSingleCart, shoppingMode: currentModeKey };

  const itemCount = activeCart.items && Array.isArray(activeCart.items)
    ? activeCart.items.reduce((acc, item) => acc + (item.quantity || 0), 0)
    : 0;

  const cravingsCount = carts.CRAVINGS?.items && Array.isArray(carts.CRAVINGS.items)
    ? carts.CRAVINGS.items.reduce((acc, item) => acc + (item.quantity || 0), 0)
    : 0;

  const freshCount = carts.FRESH_MANDI?.items && Array.isArray(carts.FRESH_MANDI.items)
    ? carts.FRESH_MANDI.items.reduce((acc, item) => acc + (item.quantity || 0), 0)
    : 0;

  const subtotal = activeCart.items && Array.isArray(activeCart.items) && activeCart.items.length > 0
    ? activeCart.items.reduce((acc, item) => acc + (Number(item.price) || 0) * (item.quantity || 0), 0)
    : 0;

  return (
    <CartContext.Provider
      value={{
        carts,
        cart: activeCart,
        cravingsCart: carts.CRAVINGS,
        freshCart: carts.FRESH_MANDI,
        itemCount,
        cravingsCount,
        freshCount,
        subtotal,
        loading,
        fetchCart,
        addToCart,
        updateQuantity,
        clearCart,
        applyCoupon
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
