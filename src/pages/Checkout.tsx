import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { 
  CreditCard, 
  MapPin, 
  User, 
  Mail, 
  Phone,
  Lock,
  CheckCircle
} from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';

interface CheckoutForm {
  // Shipping Address
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  
  // Payment
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardName: string;
  
  // Options
  sameAsBilling: boolean;
  saveInfo: boolean;
}

const Checkout: React.FC = () => {
  const { items, getCartTotal, clearCart } = useCartStore();
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<CheckoutForm>({
    defaultValues: {
      sameAsBilling: true,
      saveInfo: false
    }
  });

  useEffect(() => {
    if (!user || items.length === 0) {
      navigate('/cart');
      return;
    }

    // Pre-fill form with user data
    if (profile) {
      setValue('fullName', profile.full_name || '');
      setValue('email', profile.email);
      setValue('phone', profile.phone || '');
      setValue('address', profile.address || '');
      setValue('city', profile.city || '');
      setValue('country', profile.country || '');
    }
  }, [user, profile, items, navigate, setValue]);

  const onSubmit = async (data: CheckoutForm) => {
    setLoading(true);
    try {
      const total = getCartTotal() * 1.1; // Including tax

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id,
          total_amount: total,
          shipping_address: `${data.address}, ${data.city}, ${data.country}`,
          billing_address: data.sameAsBilling ? `${data.address}, ${data.city}, ${data.country}` : null,
          payment_method: 'Credit Card',
          payment_status: 'completed',
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: (item.product?.price || 0) + (item.variant?.price_adjustment || 0)
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Clear cart
      await clearCart();

      setOrderComplete(true);
    } catch (error) {
      console.error('Error processing order:', error);
      alert('There was an error processing your order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Confirmed!</h1>
          <p className="text-gray-600 mb-8">
            Thank you for your purchase. Your order has been confirmed and will be processed shortly.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => navigate('/orders')}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-2xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-300"
            >
              View Orders
            </button>
            <button
              onClick={() => navigate('/products')}
              className="w-full border-2 border-emerald-200 text-emerald-600 py-3 rounded-2xl font-semibold hover:bg-emerald-50 transition-all duration-300"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = getCartTotal();
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Complete your purchase</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Shipping Information */}
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-emerald-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <MapPin className="w-6 h-6 mr-3 text-emerald-600" />
                  Shipping Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        {...register('fullName', { required: 'Full name is required' })}
                        type="text"
                        className="w-full pl-10 pr-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="John Doe"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        {...register('email', { required: 'Email is required' })}
                        type="email"
                        className="w-full pl-10 pr-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="john@example.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        {...register('phone', { required: 'Phone is required' })}
                        type="tel"
                        className="w-full pl-10 pr-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country *
                    </label>
                    <select
                      {...register('country', { required: 'Country is required' })}
                      className="w-full px-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">Select Country</option>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="UK">United Kingdom</option>
                      <option value="AU">Australia</option>
                    </select>
                    {errors.country && (
                      <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address *
                    </label>
                    <input
                      {...register('address', { required: 'Address is required' })}
                      type="text"
                      className="w-full px-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="123 Main Street"
                    />
                    {errors.address && (
                      <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      {...register('city', { required: 'City is required' })}
                      type="text"
                      className="w-full px-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="New York"
                    />
                    {errors.city && (
                      <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-emerald-100">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <CreditCard className="w-6 h-6 mr-3 text-emerald-600" />
                  Payment Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Card Number *
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        {...register('cardNumber', { required: 'Card number is required' })}
                        type="text"
                        className="w-full pl-10 pr-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="1234 5678 9012 3456"
                      />
                    </div>
                    {errors.cardNumber && (
                      <p className="mt-1 text-sm text-red-600">{errors.cardNumber.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Date *
                    </label>
                    <input
                      {...register('expiryDate', { required: 'Expiry date is required' })}
                      type="text"
                      className="w-full px-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="MM/YY"
                    />
                    {errors.expiryDate && (
                      <p className="mt-1 text-sm text-red-600">{errors.expiryDate.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CVV *
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        {...register('cvv', { required: 'CVV is required' })}
                        type="text"
                        className="w-full pl-10 pr-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="123"
                      />
                    </div>
                    {errors.cvv && (
                      <p className="mt-1 text-sm text-red-600">{errors.cvv.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cardholder Name *
                    </label>
                    <input
                      {...register('cardName', { required: 'Cardholder name is required' })}
                      type="text"
                      className="w-full px-4 py-3 bg-white/80 border border-emerald-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="John Doe"
                    />
                    {errors.cardName && (
                      <p className="mt-1 text-sm text-red-600">{errors.cardName.message}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      {...register('sameAsBilling')}
                      type="checkbox"
                      className="w-5 h-5 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">Billing address same as shipping</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      {...register('saveInfo')}
                      type="checkbox"
                      className="w-5 h-5 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500"
                    />
                    <span className="text-sm text-gray-700">Save information for next time</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-emerald-100 sticky top-24">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Order Summary</h2>
                
                <div className="space-y-4 mb-6">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3">
                      <img
                        src={item.product?.images?.[0]?.image_url || 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=100'}
                        alt={item.product?.name}
                        className="w-12 h-12 object-cover rounded-xl"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product?.name}</p>
                        <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium">
                        ${((item.product?.price || 0) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <hr className="border-emerald-200 mb-6" />
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">Free</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">${tax.toFixed(2)}</span>
                  </div>
                  <hr className="border-emerald-200" />
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span className="text-emerald-600">${total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 rounded-2xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>Complete Order</span>
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Your payment information is secure and encrypted
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;