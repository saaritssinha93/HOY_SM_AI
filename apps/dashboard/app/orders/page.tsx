export const dynamic = "force-dynamic";

export default function OrdersPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">Orders</h1>
      <div className="border border-ink/10 rounded-md bg-white p-8 text-center text-ink/60">
        <p>Wired in Phase 2 — Operations Head + Shopify Admin API sync.</p>
        <p className="text-xs mt-2">
          Until then, check Shopify directly for order details.
        </p>
      </div>
    </div>
  );
}
