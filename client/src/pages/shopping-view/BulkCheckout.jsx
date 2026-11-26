import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import img from "../../assets/account.jpg";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import Address from "@/components/shopping-view/address";
import { fetchBulkCartItems, clearBulkCart } from "@/store/shop/bulkcart-slice";

const BULK_DISCOUNT_PERCENT = 10; // indicative discount shown before a quote

export default function BulkCheckout() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { currentSelectedAddress: reduxSelectedAddress } = useSelector(
    (state) => state.shopCart
  );
  const { bulkCartItems } = useSelector((state) => state.bulkCart);

  const [currentSelectedAddress, setCurrentSelectedAddress] = useState(
    reduxSelectedAddress || null
  );
  const [addressInfo, setAddressInfo] = useState({
    address: reduxSelectedAddress?.address || "",
    city: reduxSelectedAddress?.city || "",
    pincode: reduxSelectedAddress?.pincode || "",
    phone: reduxSelectedAddress?.phone || "",
    notes: reduxSelectedAddress?.notes || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchBulkCartItems(user.id));
    }
  }, [dispatch, user?.id]);

  const handleAddressSelect = (addressObj) => {
    setCurrentSelectedAddress(addressObj);
    setAddressInfo({
      address: addressObj?.address || "",
      city: addressObj?.city || "",
      pincode: addressObj?.pincode || "",
      phone: addressObj?.phone || "",
      notes: addressObj?.notes || "",
    });
  };

  const isAddressValid =
    addressInfo.address && addressInfo.city && addressInfo.pincode && addressInfo.phone;

  const subtotal = bulkCartItems.reduce(
    (sum, item) =>
      sum + (item.salePrice > 0 ? item.salePrice : item.price) * item.quantity,
    0
  );
  const discount = (subtotal * BULK_DISCOUNT_PERCENT) / 100;
  const estimate = subtotal - discount;

  const handleSubmitRequest = async () => {
    if (!bulkCartItems.length) {
      return toast({ title: "Your bulk cart is empty.", variant: "destructive" });
    }
    if (!user?.id) {
      return toast({ title: "Please login to continue.", variant: "destructive" });
    }
    if (!isAddressValid) {
      return toast({
        title: "Please fill in all required address fields.",
        variant: "destructive",
      });
    }

    setIsSubmitting(true);
    try {
      for (const item of bulkCartItems) {
        await axios.post("/api/product-requests/request", {
          productId: item.productId,
          quantity: item.quantity,
          isBulk: true,
          addressInfo,
        });
      }

      dispatch(clearBulkCart());
      setSubmitted(true);
    } catch (error) {
      toast({
        title:
          error.response?.data?.message ||
          error.message ||
          "Failed to submit your request.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="container mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
        <div className="mb-4 rounded-full bg-green-100 p-4">
          <svg
            className="h-10 w-10 text-green-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">Bulk request submitted</h1>
        <p className="mt-2 text-muted-foreground">
          Our team will review your request and contact you with a final quote and
          delivery options.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Questions? Call{" "}
          <a className="font-medium underline" href="tel:0941889430">
            0941889430
          </a>{" "}
          or email{" "}
          <a
            className="font-medium underline"
            href="mailto:eyayutiger@gmail.com"
          >
            eyayutiger@gmail.com
          </a>
          .
        </p>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => navigate("/shop/home")}>Continue shopping</Button>
          <Button variant="outline" onClick={() => navigate("/shop/account")}>
            My account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto w-full px-2 py-8 sm:px-4">
      <div className="relative h-[240px] w-full overflow-hidden rounded-lg">
        <img src={img} className="h-full w-full object-cover" alt="" />
      </div>
      <h1 className="mb-2 mt-6 text-center text-3xl font-bold">Bulk Order Request</h1>
      <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-muted-foreground">
        Bulk orders are handled as a quote request. Submit your items and our team
        will confirm availability, the final discount and delivery.
      </p>

      {bulkCartItems.length === 0 ? (
        <div className="text-center text-muted-foreground">Your bulk cart is empty.</div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-5 p-2 sm:grid-cols-2 sm:p-5">
          <div>
            <Address
              selectedId={currentSelectedAddress}
              setCurrentSelectedAddress={handleAddressSelect}
            />
          </div>
          <div className="flex flex-col gap-4">
            <ul className="mb-2">
              {bulkCartItems.map((item) => (
                <li key={item.productId} className="mb-2 flex justify-between">
                  <span>
                    {item.title}{" "}
                    <span className="text-muted-foreground">x {item.quantity}</span>
                  </span>
                  <span>
                    Br
                    {(
                      (item.salePrice > 0 ? item.salePrice : item.price) *
                      item.quantity
                    ).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t pt-4">
              <div className="mb-2 flex justify-between">
                <span>Subtotal</span>
                <span>Br{subtotal.toLocaleString()}</span>
              </div>
              <div className="mb-2 flex justify-between text-green-600">
                <span>Indicative bulk discount ({BULK_DISCOUNT_PERCENT}%)</span>
                <span>-Br{discount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Estimated total</span>
                <span>Br{estimate.toLocaleString()}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Final pricing is confirmed by our team after reviewing your request.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={handleSubmitRequest}
              disabled={!isAddressValid || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit bulk request"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
