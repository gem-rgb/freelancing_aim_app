'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Bell } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function BuyerNotificationsPage() {
  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white font-black">
            <Bell className="w-5 h-5 text-cyan-400" />
            Notifications center
          </CardTitle>
          <CardDescription>
            Server-driven notification feeds can plug in here. Until an endpoint exists, this screen documents the contract and shows skeleton states.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-14 w-full rounded-xl bg-white/5" />
          <Skeleton className="h-14 w-full rounded-xl bg-white/5" />
          <Skeleton className="h-14 w-full rounded-xl bg-white/5" />
        </CardContent>
      </Card>
    </div>
  );
}
