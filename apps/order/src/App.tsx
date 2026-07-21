import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from './store/cart';
import { WelcomePage } from './pages/WelcomePage';
import { MenuPage } from './pages/MenuPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderStatusPage } from './pages/OrderStatusPage';

/** QR entry: /order/table/:table captures the table, then jumps to the menu. */
function TableEntry() {
  const { table } = useParams();
  const setTable = useCart((s) => s.setTable);
  const navigate = useNavigate();
  useEffect(() => {
    setTable(table ?? null);
    navigate('/', { replace: true });
  }, [table, setTable, navigate]);
  return null;
}

export function App() {
  return (
    <div className="mx-auto min-h-full w-full max-w-2xl">
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/order/table/:table" element={<TableEntry />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/status/:orderNumber" element={<OrderStatusPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
