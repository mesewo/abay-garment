import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { clearCart } from "@/store/shop/cart-slice";
import { clearBulkCart } from "@/store/shop/bulkcart-slice";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Verifying payment...");
  const [error, setError] = useState(null);
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      const reference =
        searchParams.get("tx_ref") || localStorage.getItem("last_tx_ref");

      if (!reference) {
        setError("Missing transaction reference.");
        setStatus(null);
        return;
      }

      try {
        const { data } = await axios.post("/api/payment/verify", { reference });
        if (cancelled) return;

        if (!data.success || !data.orderId) {
          setError(data.error || "We could not verify this payment.");
          setStatus(null);
          return;
        }

        setOrderId(data.orderId);
        setStatus(null);
        localStorage.removeItem("last_tx_ref");
        dispatch(clearCart());
        dispatch(clearBulkCart());
      } catch (err) {
        if (cancelled) return;
        setError(
          err.response?.data?.error || "Failed to verify payment. Please contact support."
        );
        setStatus(null);
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [dispatch, searchParams]);

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-bold text-destructive">Payment verification failed</h1>
        <p className="mt-3 text-muted-foreground">{error}</p>
        <Button className="mt-6" onClick={() => navigate("/shop/account")}>
          View my orders
        </Button>
      </div>
    );
  }

  if (status) {
    return <div className="p-8 text-center text-muted-foreground">{status}</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h1 className="mb-2 text-2xl font-bold">Payment Successful!</h1>
      <p className="mb-6 max-w-md text-center text-muted-foreground">
        Show this QR code at the branch to collect your order. You can also find it
        later under Account &gt; Orders.
      </p>
      <div className="rounded-xl bg-white p-4 shadow-md">
        <QRCode
          value={String(orderId)}
          style={{ height: "auto", maxWidth: "220px", width: "100%" }}
        />
      </div>
      <p className="mt-3 font-mono text-xs text-muted-foreground">
        Order {String(orderId).slice(-8)}
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => navigate("/shop/account")}>View my orders</Button>
        <Button variant="outline" onClick={() => navigate("/shop/home")}>
          Continue shopping
        </Button>
      </div>
    </div>
  );
}
