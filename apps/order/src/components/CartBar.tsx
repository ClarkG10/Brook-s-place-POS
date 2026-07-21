import { Button } from '@brooks/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { money } from '../lib/format';
import { cartCount, cartSubtotal, useCart } from '../store/cart';

export function CartBar() {
  const lines = useCart((s) => s.lines);
  const navigate = useNavigate();
  const count = cartCount(lines);

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="pointer-events-none fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-2xl p-4"
        >
          <Button
            size="lg"
            className="pointer-events-auto w-full justify-between text-base shadow-lg"
            onClick={() => navigate('/cart')}
          >
            <span className="inline-flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-white/20 text-xs font-bold tabular-nums">
                {count}
              </span>
              View Cart
            </span>
            <span className="inline-flex items-center gap-2 tabular-nums">
              {money(cartSubtotal(lines))}
              <ShoppingBag className="size-5" aria-hidden />
            </span>
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
