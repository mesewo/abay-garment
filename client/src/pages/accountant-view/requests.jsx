import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAccountantRequests } from "@/store/admin/accountant-slice";
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
import { formatDate, shortId } from "@/components/accountant-view/format";

export default function AccountantRequests() {
  const dispatch = useDispatch();
  const { requests, loading, error } = useSelector((state) => state.accountant);
  const [query, setQuery] = useState("");

  useEffect(() => {
    dispatch(fetchAccountantRequests());
  }, [dispatch]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return requests;
    return requests.filter((request) =>
      [
        request._id,
        request.product?.title,
        request.requestedBy?.userName,
        request.store?.name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [requests, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pending Requests</h1>
          <p className="text-sm text-muted-foreground">
            Stock requests waiting for a storekeeper decision.
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product, requester, store..."
            className="sm:w-72"
          />
          <Button variant="outline" onClick={() => dispatch(fetchAccountantRequests())}>
            Refresh
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Open Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading requests...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((request) => (
                  <TableRow key={request._id}>
                    <TableCell className="font-mono text-xs">{shortId(request._id)}</TableCell>
                    <TableCell>{request.product?.title || "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {request.requestedBy?.userName || "—"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {request.requestedBy?.email || ""}
                      </div>
                    </TableCell>
                    <TableCell>{request.store?.name || "—"}</TableCell>
                    <TableCell>{request.quantity}</TableCell>
                    <TableCell>{request.isBulk ? "Bulk" : "Single"}</TableCell>
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
