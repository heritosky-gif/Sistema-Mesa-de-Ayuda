export default function ChartTooltip({ x, y, title, value }) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-white px-3 py-2 shadow-md"
      style={{ left: x, top: y - 10 }}
    >
      <p className="text-[11px] font-medium text-slate-500">{title}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}
