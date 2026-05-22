'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { Package, Plus } from 'lucide-react';

interface Listing {
  id: string;
  title: string;
  price: number;
  status: string;
  view_count: number;
  purchase_count: number;
}

export default function SellerProductsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await apiService.getMyListings();
      setRows(res.data.results || res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Product management</h1>
          <p className="text-sm text-muted-foreground">Listings owned by @{user?.username}</p>
        </div>
        <Button className="rounded-full bg-blue-500 font-bold" asChild>
          <Link href="/dashboard/create">
            <Plus className="w-4 h-4 mr-2" />
            New listing
          </Link>
        </Button>
      </div>
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-black text-white">
            <Package className="w-5 h-5 text-blue-500" />
            Inventory
          </CardTitle>
          <CardDescription>Edit or retire listings. Same data as the command center table.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
          {!loading && rows.length === 0 && <p className="text-muted-foreground text-sm">No listings yet.</p>}
          {!loading && rows.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5">
                  <TableHead className="text-white font-black uppercase text-[10px]">Title</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px]">Price</TableHead>
                  <TableHead className="text-white font-black uppercase text-[10px]">Status</TableHead>
                  <TableHead className="text-right text-white font-black uppercase text-[10px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((l) => (
                  <TableRow key={l.id} className="border-white/5">
                    <TableCell className="font-bold text-white">{l.title}</TableCell>
                    <TableCell>₦{Number(l.price).toLocaleString()}</TableCell>
                    <TableCell>
                      <StatusBadge status={l.status === 'active' ? 'Accepted' : l.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="border-white/15" asChild>
                        <Link href={`/dashboard/edit/${l.id}`}>Edit</Link>
                      </Button>
                    </TableCell>
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
