import { useMeasurementStore } from "../../store/measurementStore";

// ─── Helpers ────────────────────────────────────────────────────────────────

function blockQuantity(block: ReturnType<typeof useMeasurementStore.getState>["blocks"][number]) {
  let total = 0;
  for (const mi of block.major_items) {
    for (const dr of mi.dimension_rows) {
      let q = 1;
      let hasValue = false;
      if (dr.number > 0)  { q *= dr.number;  hasValue = true; }
      if (dr.length > 0)  { q *= dr.length;  hasValue = true; }
      if (dr.breadth > 0) { q *= dr.breadth; hasValue = true; }
      if (dr.depth > 0)   { q *= dr.depth;   hasValue = true; }
      if (hasValue) total += q;
    }
  }
  return total;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AbstractSheet() {
  const blocks = useMeasurementStore((s) => s.blocks);

  if (blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card px-6 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No measurement blocks yet. Add blocks on the Measurement Sheet tab first.
        </p>
      </div>
    );
  }

  // Derive rows
  const rows = blocks.map((block) => {
    const qty = blockQuantity(block);
    const isCustom = !block.ssr_item_id;
    const description = isCustom
      ? (block.custom_description ?? "—")
      : (block.ssr_item?.description ?? "—");
    const unit = isCustom ? (block.custom_unit ?? "—") : (block.ssr_item?.unit ?? "—");
    const rate = isCustom
      ? (block.custom_rate ?? 0)
      : (block.ssr_item?.completed_rate_inr ?? 0);
    const amount = qty * rate;
    return { block, description, unit, qty, rate, amount };
  });

  const grandTotal = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              {/* Col order matches govt reference: Unit | Qty | Item No | Item | Rate | Amount */}
              <th className="px-3 py-3 text-center font-semibold text-foreground border-r border-border w-16">
                Unit
              </th>
              <th className="px-3 py-3 text-right font-semibold text-foreground border-r border-border w-24">
                Quantity
              </th>
              <th className="px-3 py-3 text-center font-semibold text-foreground border-r border-border w-16">
                Item<br />No
              </th>
              <th className="px-4 py-3 text-left font-semibold text-foreground border-r border-border">
                Item
              </th>
              <th className="px-3 py-3 text-right font-semibold text-foreground border-r border-border w-28">
                Rate (₹)
              </th>
              <th className="px-3 py-3 text-right font-semibold text-foreground w-32">
                Amount (₹)
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.block.id}
                className={`border-b border-border transition-colors hover:bg-accent/40 ${
                  idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                }`}
              >
                {/* Unit */}
                <td className="px-3 py-3 text-center text-muted-foreground border-r border-border font-mono text-xs">
                  {row.unit}
                </td>
                {/* Quantity */}
                <td className="px-3 py-3 text-right tabular-nums border-r border-border font-medium">
                  {fmt(row.qty)}
                </td>
                {/* Item No */}
                <td className="px-3 py-3 text-center text-muted-foreground border-r border-border">
                  {row.block.sequence_number}
                </td>
                {/* Item description */}
                <td className="px-4 py-3 border-r border-border leading-relaxed">
                  {row.description}
                </td>
                {/* Rate */}
                <td className="px-3 py-3 text-right tabular-nums border-r border-border text-muted-foreground">
                  {fmt(row.rate)}
                </td>
                {/* Amount */}
                <td className="px-3 py-3 text-right tabular-nums font-semibold text-primary">
                  {fmt(row.amount)}
                </td>
              </tr>
            ))}
          </tbody>

          {/* Grand Total */}
          <tfoot>
            {/* "Total" label row */}
            <tr className="border-t-2 border-border bg-emerald-50 dark:bg-emerald-950/20">
              <td colSpan={3} className="border-r border-border" />
              <td
                colSpan={2}
                className="px-4 py-3 text-right font-bold text-foreground border-r border-border text-base"
              >
                Total
              </td>
              <td className="px-3 py-3 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400 text-base">
                ₹{fmt(grandTotal)}
              </td>
            </tr>
            {/* "Say" rounded row */}
            <tr className="bg-emerald-50 dark:bg-emerald-950/20">
              <td colSpan={3} className="border-r border-border" />
              <td
                colSpan={2}
                className="px-4 py-2 text-right font-semibold text-muted-foreground border-r border-border text-xs"
              >
                Say
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-muted-foreground text-xs">
                ₹{fmt(Math.round(grandTotal))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
