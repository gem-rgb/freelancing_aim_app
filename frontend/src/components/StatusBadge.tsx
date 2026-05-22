import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type StatusType = 'Accepted' | 'Pending' | 'Declined' | 'Released' | 'Escrow' | 'Disputed' | 'Active' | 'Draft';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  
  let colorClass = "bg-slate-500/10 text-slate-500 border-slate-500/20";
  
  switch (normalizedStatus) {
    case 'Accepted':
    case 'Released':
    case 'Active':
      colorClass = "bg-green-500/10 text-green-500 border-green-500/20";
      break;
    case 'Pending':
    case 'Escrow':
    case 'Draft':
      colorClass = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      break;
    case 'Declined':
    case 'Disputed':
    case 'Refunded':
      colorClass = "bg-red-500/10 text-red-500 border-red-500/20";
      break;
  }

  return (
    <Badge variant="outline" className={cn("rounded-full px-3 py-1 font-bold text-[10px] uppercase tracking-wider", colorClass, className)}>
      {normalizedStatus}
    </Badge>
  );
}
