export function statusBadgeClass(status: string) {
  switch (status) {
    case "Active":
      return "bg-emerald-900/80 text-emerald-300 border-emerald-800/50";
    case "Pending":
      return "bg-amber-900/80 text-amber-300 border-amber-800/50";
    case "Revoked":
    case "Suspended":
      return "bg-red-900/80 text-red-300 border-red-800/50";
    default:
      return "bg-gray-800/80 text-gray-300 border-gray-700";
  }
}
