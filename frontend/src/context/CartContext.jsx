import { createContext, useState, useEffect } from "react";

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem("foodCart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  const [orderNotes, setOrderNotes] = useState(() => {
    return localStorage.getItem("foodOrderNotes") || "";
  });

  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const saved = localStorage.getItem("foodCoupon");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    localStorage.setItem("foodCart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("foodOrderNotes", orderNotes);
  }, [orderNotes]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem("foodCoupon", JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem("foodCoupon");
    }
  }, [appliedCoupon]);

  const addToCart = (item, quantity = 1) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (cartItem) => cartItem._id === item._id
      );
      if (existingIndex > -1) {
        return prevCart.map((cartItem, idx) =>
          idx === existingIndex
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      }
      return [
        ...prevCart,
        {
          _id: item._id,
          name: item.name,
          price: Number(item.price),
          image: item.image,
          description: item.description,
          quantity: Math.max(1, quantity),
        },
      ];
    });
  };

  const removeFromCart = (itemId) => {
    setCart((prevCart) => prevCart.filter((item) => item._id !== itemId));
  };

  const updateQuantity = (itemId, amount) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item._id === itemId) {
            const newQty = item.quantity + amount;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const setItemQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prevCart) =>
      prevCart.map((item) =>
        item._id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const getItemQuantity = (itemId) => {
    const item = cart.find((i) => i._id === itemId);
    return item ? item.quantity : 0;
  };

  const clearCart = () => {
    setCart([]);
    setAppliedCoupon(null);
    setOrderNotes("");
    localStorage.removeItem("foodCart");
    localStorage.removeItem("foodCoupon");
    localStorage.removeItem("foodOrderNotes");
  };

  const reorderItems = (items) => {
    if (!Array.isArray(items)) return;
    const formatted = items.map((i) => ({
      _id: i.menuItemId?._id || i.menuItemId || i._id,
      name: i.name,
      price: Number(i.price),
      image: i.image || i.menuItemId?.image || "",
      description: i.description || i.menuItemId?.description || "",
      quantity: Number(i.quantity) || 1,
    }));
    setCart(formatted);
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartTotal = () => {
    return Math.round(getSubtotal() * 100) / 100;
  };

  const subtotal = getSubtotal();
  const deliveryFee = subtotal === 0 || subtotal >= 25 || appliedCoupon?.isFreeShipping ? 0 : 3.99;
  
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount) {
      discountAmount = appliedCoupon.discount;
    } else if (appliedCoupon.discountPercent) {
      discountAmount = Math.round(subtotal * (appliedCoupon.discountPercent / 100) * 100) / 100;
    }
  }

  const finalTotal = Math.max(0, Math.round((subtotal + deliveryFee - discountAmount) * 100) / 100);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        setItemQuantity,
        getItemQuantity,
        clearCart,
        reorderItems,
        getCartTotal,
        subtotal,
        deliveryFee,
        discountAmount,
        finalTotal,
        totalItemCount,
        orderNotes,
        setOrderNotes,
        appliedCoupon,
        setAppliedCoupon,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
