import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { AlertTriangleIcon, RefreshCwIcon, CartIcon } from '@/components/ui/Icons';
import { FadeIn } from '@/components/ui/Motion';

export default function PaymentFailed() {
  const [params] = useSearchParams();
  const orderId  = params.get('order_id');

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4 text-center">
      <FadeIn className="flex flex-col items-center">
        <div
          className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-50"
          style={{ animation: 'scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          <AlertTriangleIcon size={48} className="text-red-500" />
        </div>

        <h1 className="text-3xl font-bold text-neutral-900">Payment failed</h1>
        <p className="mt-3 max-w-sm text-neutral-500">
          Your payment could not be processed. Your order has been saved — you can retry the payment at any time.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {orderId && (
            <Link to={`/orders`}>
              <Button leftIcon={<RefreshCwIcon size={16} />}>
                Retry payment
              </Button>
            </Link>
          )}
          <Link to="/cart">
            <Button variant="outline" leftIcon={<CartIcon size={16} />}>Back to cart</Button>
          </Link>
        </div>

        <Link to="/orders" className="mt-6 text-sm text-neutral-400 hover:text-primary transition-colors">
          View all my orders
        </Link>
      </FadeIn>
    </div>
  );
}
