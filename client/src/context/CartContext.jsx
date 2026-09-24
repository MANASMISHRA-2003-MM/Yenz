import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState({ items: [], subtotal: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && user.role === 'consumer') {
      fetchCart();
    } else {
      setCart({ items: [], subtotal: 0 });
    }
  }, [user]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await API.get('/cart');
      if (res.data.success) {
        setCart(res.data.cart);
      }
    } catch (err) {
      console.error('Fetch cart error:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (foodId, quantity = 1, selectedWeight = null) => {
    try {
      const res = await API.post('/cart/add', { foodId, quantity, selectedWeight });
      if (res.data.success) {
        setCart(res.data.cart);
        return { success: true, message: res.data.message };
      }
    } catch (err) {
      if (err.response?.data?.requiresClear) {
        return { requiresClear: true, message: err.response.data.message };
      }
      console.error('Add to cart error:', err);
      alert(err.response?.data?.message || 'Failed to add item');
      return { success: false };
    }
  };

  const updateQuantity = async (foodId, quantity, selectedWeight = null) => {
    try {
      const res = await API.put('/cart/update', { foodId, quantity, selectedWeight });
      if (res.data.success) {
        setCart(res.data.cart);
      }
    } catch (err) {
      console.error('Update quantity error:', err);
    }
  };

  const clearCart = async () => {
    try {
      const res = await API.delete('/cart/clear');
      if (res.data.success) {
        setCart({ items: [], subtotal: 0 });
      }
    } catch (err) {
      console.error('Clear cart error:', err);
    }
  };

  const applyCoupon = async (code) => {
    try {
      const res = await API.post('/cart/coupon', { code });
      if (res.data.success) {
        setCart(res.data.cart);
        return { success: true, message: res.data.message };
      }
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Failed to apply coupon' };
    }
  };

  const itemCount = cart.items ? cart.items.reduce((acc, item) => acc + item.quantity, 0) : 0;
  
  const subtotal = cart.items
    ? cart.items.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0)
    : 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
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
