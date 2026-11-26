import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAccountantTransactions } from "@/store/admin/accountant-slice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/components/accountant-view/format";

const monthKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

export default function AccountantReports() {
  const dispatch = useDispatch();
  const { transactions, loading, error } = useSelector((state) => state.accountant);

  useEffect(() => {
    dispatch(fetchAccountantTransactions());
  }, [dispatch]);

  const report = useMemo(() => {
    const revenue = transactions.reduce(
      (sum, order) => sum + Number(order.totalAmount || 0),
      0
    );

    const byMonth = {};
    const byStore = {};
    const byMethod = {};

    for (const order of transactions) {
      const amount = Number(order.totalAmount || 0);
      const month = monthKey(order.paymentPaidAt || order.createdAt);
      byMonth[month] = (byMonth[month] || 0) + amount;

      const store = order.store?.name || "Unassigned";
      byStore[store] = (byStore[store] || 0) + amount;

      const method = order.paymentMethod || "unknown";
      byMethod[method] = (byMethod[method] || 0) + amount;
    }

    const months = Object.entries(byMonth).sort(([a], [b]) => b.localeCompare(a));
    const stores = Object.entries(byStore).sort(([, a], [, b]) => b - a);
    const methods = Object.entries(byMethod).sort(([, a], [, b]) => b - a);
    const average = transactions.length ? revenue / transactions.length : 0;

    return { revenue, months, stores, methods, average };
  }, [transactions]);

  const maxMonth = Math.max(...report.months.map(([, value]) => value), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Financial Reports</h1>
        <p className="text-sm text-muted-foreground">
          Based on {transactions.length} paid order(s).
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.revenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.average)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Stores Selling</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.stores.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : report.months.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paid orders yet.</p>
            ) : (
              <div className="space-y-3">
                {report.months.map(([month, value]) => (
                  <div key={month}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{month}</span>
                      <span className="font-medium">{formatCurrency(value)}</span>
                    </div>
                    <div className="h-2 rounded bg-muted">
                      <div
                        className="h-2 rounded bg-primary"
                        style={{ width: `${Math.max((value / maxMonth) * 100, 4)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue by Store</CardTitle>
          </CardHeader>
          <CardContent>
            {report.stores.length === 0 ? (
              <p className="text-sm text-muted-foreground">No store revenue yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.stores.map(([store, value]) => (
                    <TableRow key={store}>
                      <TableCell>{store}</TableCell>
                      <TableCell className="text-right">{formatCurrency(value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          {report.methods.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payment data yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.methods.map(([method, value]) => (
                  <TableRow key={method}>
                    <TableCell className="capitalize">{method}</TableCell>
                    <TableCell className="text-right">{formatCurrency(value)}</TableCell>
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
