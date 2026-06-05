import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ordersApi } from '@/api/orders.api';
import { paymentsApi } from '@/api/payments.api';
import { useCartStore } from '@/stores/cart.store';
import { FadeIn } from '@/components/ui/Motion';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  MapPinIcon, CreditCardIcon, ImageIcon, ChevronLeftIcon,
} from '@/components/ui/Icons';
import { SecureCheckoutBanner } from '@/components/trust/SecureCheckoutBanner';
import { SecurePaymentFooter }  from '@/components/trust/SecurePaymentFooter';
import { HTTPSNotice }          from '@/components/trust/HTTPSNotice';

const schema = z.object({
  street:     z.string().min(5,  'Enter your street address'),
  city:       z.string().min(2,  'Enter your city'),
  state:      z.string().min(2,  'Enter your state'),
  country:    z.string().min(2,  'Enter your country'),
  postalCode: z.string().min(3,  'Enter a valid postal code'),
});

type FormData = z.infer<typeof schema>;

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, itemCount, clearCart } = useCartStore();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const shippingFee  = total >= 50 ? 0 : 5.99;
  const orderTotal   = total + shippingFee;

  const onSubmit = async (data: FormData) => {
    setServerError('');
    try {
      const orderRes = await ordersApi.create({
        street:     data.street,
        city:       data.city,
        state:      data.state,
        country:    data.country,
        postalCode: data.postalCode,
      });
      const order = orderRes.data.data;
      if (!order) throw new Error('Order creation failed');

      const payRes = await paymentsApi.initiate(order.order_id);
      const { paymentUrl } = payRes.data.data ?? {};

      if (paymentUrl) {
        clearCart();
        window.location.href = paymentUrl;
      } else {
        navigate(`/order-confirmation/${order.order_id}`);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setServerError(msg ?? 'Something went wrong. Please try again.');
    }
  };

  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <p className="text-lg font-semibold text-neutral-700">Your cart is empty</p>
      <Link to="/products">
        <Button variant="outline" size="sm" className="mt-4">Browse products</Button>
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link to="/cart" className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-primary transition-colors">
          <ChevronLeftIcon size={16} /> Back to cart
        </Link>

        <h1 className="mb-4 text-2xl font-bold text-neutral-900">Checkout</h1>
        <div className="mb-6 space-y-2">
          <SecureCheckoutBanner />
          <HTTPSNotice />
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Shipping form */}
            <FadeIn>
              <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <MapPinIcon className="text-primary" />
                  <h2 className="text-lg font-bold text-neutral-900">Shipping address</h2>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Street address"
                    placeholder="123 Lagos Road, Flat 4B"
                    error={errors.street?.message}
                    {...register('street')}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="City"
                      placeholder="Abuja"
                      error={errors.city?.message}
                      {...register('city')}
                    />
                    <Input
                      label="State / Province"
                      placeholder="FCT"
                      error={errors.state?.message}
                      {...register('state')}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Country"
                      placeholder="Nigeria"
                      error={errors.country?.message}
                      {...register('country')}
                    />
                    <Input
                      label="Postal code"
                      placeholder="900211"
                      error={errors.postalCode?.message}
                      {...register('postalCode')}
                    />
                  </div>
                </div>

                {serverError && (
                  <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                    {serverError}
                  </p>
                )}
              </div>
            </FadeIn>

            {/* Order summary */}
            <FadeIn delay={80}>
              <div className="sticky top-24 space-y-4">
                <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-base font-bold text-neutral-900">
                    Order ({itemCount} item{itemCount !== 1 ? 's' : ''})
                  </h2>

                  <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
                    {items.map((item) => (
                      <div key={item.cart_item_id} className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-50">
                          {item.product.image_url ? (
                            <img src={item.product.image_url} alt={item.product.name} loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-neutral-300">
                              <ImageIcon size={18} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium text-neutral-900">{item.product.name}</p>
                          <p className="text-xs text-neutral-500">Qty: {item.quantity}</p>
                        </div>
                        <span className="text-sm font-semibold text-neutral-800">
                          ${(Number(item.product.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 space-y-2 border-t border-neutral-100 pt-4 text-sm">
                    <div className="flex justify-between text-neutral-600">
                      <span>Subtotal</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Shipping</span>
                      {shippingFee === 0
                        ? <span className="font-medium text-green-600">Free</span>
                        : <span>${shippingFee.toFixed(2)}</span>
                      }
                    </div>
                    <div className="flex justify-between border-t border-neutral-100 pt-2 text-base font-bold text-neutral-900">
                      <span>Total</span>
                      <span className="text-primary">${orderTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={isSubmitting}
                  leftIcon={<CreditCardIcon size={18} />}
                >
                  Pay ${orderTotal.toFixed(2)}
                </Button>

                <SecurePaymentFooter />
              </div>
            </FadeIn>
          </div>
        </form>
      </div>
    </div>
  );
}
