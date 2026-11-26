import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  fetchAccountantTransactions,
  fetchAccountantRequests,
  fetchAccountantStats,
} from "@/store/admin/accountant-slice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate, shortId } from "@/components/accountant-view/format";

export default function AccountantDashboard() {
  const dispatch = useDispatch();
  const { transactions, requests, stats } = useSelector((state) => state.accountant);

  useEffect(() => {
    dispatch(fetchAccountantTransactions());
    dispatch(fetchAccountantRequests());
    dispatch(fetchAccountantStats());
  }, [dispatch]);

  const cards = [
    { title: "Paid Transactions", value: stats.totalTransactions || 0 },
    { title: "Pending Requests", value: stats.totalRequests || 0 },
    { title: "Awaiting Payment", value: stats.pendingPayments || 0 },
    { title: "Total Revenue", value: formatCurrency(stats.totalRevenue) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Accountant Overview</h1>
          <p className="text-sm text-muted-foreground">
            Paid orders and stock requests across all stores.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/accountant/transactions"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all transactions
          </Link>
          <Link
            to="/accountant/requests"
            className="text-sm font-medium text-primary hover:underline"
          >
            View requests
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid transactions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 5).map((order) => (
                  <TableRow key={order._id}>
                    <TableCell>{shortId(order._id)}</TableCell>
                    <TableCell>{order.userId?.userName || "—"}</TableCell>
                    <TableCell>{order.store?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge>{order.orderStatus}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(order.totalAmount)}</TableCell>
                    <TableCell>{formatDate(order.paymentPaidAt || order.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending stock requests.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.slice(0, 5).map((request) => (
                  <TableRow key={request._id}>
                    <TableCell>{shortId(request._id)}</TableCell>
                    <TableCell>{request.product?.title || "—"}</TableCell>
                    <TableCell>{request.requestedBy?.userName || "—"}</TableCell>
                    <TableCell>{request.quantity}</TableCell>
                    <TableCell>
                      <Badge>{request.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(request.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
