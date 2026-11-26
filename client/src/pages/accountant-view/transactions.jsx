import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAccountantTransactions } from "@/store/admin/accountant-slice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function AccountantTransactions() {
  const dispatch = useDispatch();
  const { transactions, loading, error } = useSelector((state) => state.accountant);
  const [query, setQuery] = useState("");

  useEffect(() => {
    dispatch(fetchAccountantTransactions());
  }, [dispatch]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return transactions;
    return transactions.filter((order) =>
      [
        order._id,
        order.userId?.userName,
        order.userId?.email,
        order.store?.name,
        order.orderStatus,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [transactions, query]);

  const exportCsv = () => {
    const rows = [
      ["Order ID", "Customer", "Email", "Store", "Type", "Status", "Amount", "Paid at"],
      ...filtered.map((order) => [
        order._id,
        order.userId?.userName || "",
        order.userId?.email || "",
        order.store?.name || "",
        order.type,
        order.orderStatus,
        order.totalAmount,
        order.paymentPaidAt || order.createdAt,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const total = filtered.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} paid order(s) · {formatCurrency(total)}
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search order, customer, store..."
            className="sm:w-72"
          />
          <Button variant="outline" onClick={() => dispatch(fetchAccountantTransactions())}>
            Refresh
          </Button>
          <Button onClick={exportCsv} disabled={!filtered.length}>
            Export CSV
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Paid Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading transactions...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions match your search.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
                  <TableRow key={order._id}>
                    <TableCell className="font-mono text-xs">{shortId(order._id)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{order.userId?.userName || "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {order.userId?.email || ""}
                      </div>
                    </TableCell>
                    <TableCell>{order.store?.name || "—"}</TableCell>
                    <TableCell className="capitalize">{order.type}</TableCell>
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
    </div>
  );
}
