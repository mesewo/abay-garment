import { useState, useEffect } from "react";
import axios from "axios";
import Address from "@/components/shopping-view/address";
import img from "../../assets/account.jpg";
import { useDispatch, useSelector } from "react-redux";
import UserCartItemsContent from "@/components/shopping-view/cart-items-content";
import { Button } from "@/components/ui/button";
import { createNewOrder } from "@/store/shop/order-slice";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export default function ShoppingCheckout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cartItems } = useSelector((state) => state.shopCart);
  const { user } = useSelector((state) => state.auth);
  const { approvalURL, error: orderError } = useSelector(
    (state) => state.shopOrder
  );
  const [currentSelectedAddress, setCurrentSelectedAddress] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBulkCheckout = useSelector((state) => state.shopCart.isBulk);
  const { toast } = useToast();

  useEffect(() => {
    if (!cartItems?.items?.length) {
      navigate("/");
    }
  }, [cartItems, navigate]);

  const totalCartAmount =
    cartItems?.items?.reduce(
      (sum, itm) =>
        sum + (itm.salePrice > 0 ? itm.salePrice : itm.price) * itm.quantity,
      0
    ) || 0;

  const handlePlaceOrder = async () => {
    if (!cartItems?.items?.length) {
      return toast({ title: "Your cart is empty.", variant: "destructive" });
    }
    if (!currentSelectedAddress) {
      return toast({
        title: "Select an address to proceed.",
        variant: "destructive",
      });
    }
    if (!user?.id) {
      return toast({
        title: "User not found. Please login.",
        variant: "destructive",
      });
    }

    setIsSubmitting(true);

    try {
      const orderData = {
        cartId: cartItems._id,
        cartItems: cartItems.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          storeId: i.storeId,
        })),
        addressInfo: {
          addressId: currentSelectedAddress._id,
          address: currentSelectedAddress.address,
          city: currentSelectedAddress.city,
          pincode: currentSelectedAddress.pincode,
          phone: currentSelectedAddress.phone,
          notes: currentSelectedAddress.notes,
        },
        paymentMethod: "chapa",
        ...(isBulkCheckout && { isBulk: true }),
      };

      const orderResponse = await dispatch(createNewOrder(orderData)).unwrap();

      const orderId = Array.isArray(orderResponse.orderIds)
        ? orderResponse.orderIds[0]
        : orderResponse.orderId;
      if (!orderId) {
        toast({
          title: "Order ID not found after order creation.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const tx_ref = orderResponse.tx_refs?.[0];

      const { data } = await axios.post("/api/payment/initiate", { orderId });

      if (data.data?.checkout_url) {
        if (tx_ref) localStorage.setItem("last_tx_ref", tx_ref);
        window.location.href = data.data.checkout_url;
      } else {
        toast({
          title: "Failed to initiate payment.",
          variant: "destructive",
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      toast({
        title: error.message || "Failed to place order.",
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  };

  if (approvalURL) window.location.href = approvalURL;

  return (
    <div className="flex flex-col">
      <div className="relative h-[300px] w-full overflow-hidden">
        <img src={img} className="h-full w-full object-cover" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5 p-5">
        <Address
          selectedId={currentSelectedAddress}
          setCurrentSelectedAddress={setCurrentSelectedAddress}
        />
        <div className="flex flex-col gap-4">
          {cartItems?.items?.map((item) => (
            <UserCartItemsContent key={item.productId} cartItem={item} />
          ))}
          <div className="mt-8 space-y-4">
            <div className="flex justify-between">
              <span className="font-bold">Total</span>
              <span className="font-bold">Br{totalCartAmount}</span>
            </div>
          </div>
          <div className="mt-4 w-full">
            <Button
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Placing Order..." : "Place Order with Chapa"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
