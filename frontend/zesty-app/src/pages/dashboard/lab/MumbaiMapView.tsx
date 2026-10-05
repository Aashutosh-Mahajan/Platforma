import React, { useMemo, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, Tooltip as LTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { labAPI, type MumbaiArea } from '../../../api/lab';
import { ErrorBanner, Panel, Segmented, SkeletonRows } from '../../../components/dashboard/primitives';
import { useLoad } from '../../../components/dashboard/intelligenceUtils';
import { NotReady } from '../../../components/dashboard/intelligence';
import { LabPage, MiniTable, Reading, Stat, StatRow, Swatch } from './labKit';
import { T, W, num, pctOf, rupees, seriesColor, sequentialColor } from './labUtils';

type ColorBy = 'cluster' | 'orders_placed' | 'demand_per_kitchen' | 'avg_order_value';
const COLOR_BY: { value: ColorBy; label: string }[] = [
  { value: 'cluster', label: 'Cluster' },
  { value: 'orders_placed', label: 'Orders' },
  { value: 'demand_per_kitchen', label: 'Supply gap' },
  { value: 'avg_order_value', label: 'Order value' },
];
const OPPORTUNITY_COLOR = { undersupplied: '#e11d48', oversupplied: '#2a78d6', balanced: '#6b6a63' } as const;
const MUMBAI_CENTRE: [number, number] = [19.075, 72.875];

const MumbaiMapView: React.FC = () => {
  const state = useLoad(() => labAPI.mumbaiMap(), []);
  const [colorBy, setColorBy] = useState<ColorBy>('cluster');
  const [layers, setLayers] = useState({ areas: true, restaurants: true, venues: true, hotspots: false });
  const [selected, setSelected] = useState<string | null>(null);
  const [sort, setSort] = useState<keyof MumbaiArea>('orders_placed');

  const payload = state.data?.areas;
  const areas = useMemo(() => payload?.areas ?? [], [payload]);
  const clusters = payload?.clusters ?? [];
  const range = useMemo(() => {
    if (colorBy === 'cluster' || !areas.length) return [0, 1];
    const v = areas.map((a) => Number(a[colorBy]));
    return [Math.min(...v), Math.max(...v)];
  }, [areas, colorBy]);
  const colorOf = (a: MumbaiArea) =>
    colorBy === 'cluster' ? seriesColor(a.cluster) : sequentialColor((Number(a[colorBy]) - range[0]) / (range[1] - range[0] || 1));
  const maxOrders = Math.max(1, ...areas.map((a) => a.orders_placed));
  const sel = areas.find((a) => a.area === selected) ?? null;
  const selCluster = sel ? clusters.find((c) => c.cluster === sel.cluster) : null;
  const sorted = [...areas].sort((a, b) => Number(b[sort]) - Number(a[sort]));

  const zones = useMemo(() => {
    const out: Record<string, { areas: number; residents: number; orders: number; restaurants: number; revenue: number }> = {};
    for (const a of areas) {
      const z = (out[a.zone] ??= { areas: 0, residents: 0, orders: 0, restaurants: 0, revenue: 0 });
      z.areas += 1; z.residents += a.residents; z.orders += a.orders_placed; z.restaurants += a.restaurants; z.revenue += a.revenue;
    }
    return Object.entries(out);
  }, [areas]);

  const toggle = (k: keyof typeof layers) => setLayers((l) => ({ ...l, [k]: !l[k] }));

  return (
    <LabPage
      eyebrow="Mumbai · Intelligence"
      title="Mumbai demand map"
      intro="Every Mumbai locality clustered on what its residents order, what they spend and how many kitchens and venues serve them. Click an area for its profile."
      model={state.data?.model}
      concepts={[
        { term: 'Area features', meaning: 'Residents, orders placed, orders per resident, average order value, local restaurants, resident orders per local kitchen, delivery time and event bookings, standardised to z-scores.' },
        { term: 'K-Means on areas', meaning: 'Each locality is a point in 7-dimensional feature space; K-Means groups nearby points. k is chosen by silhouette (the elbow chart is on the Area & customer clusters page).' },
        { term: 'Supply gap', meaning: 'Orders placed by residents per restaurant located in the area. High values mean people order from far away: a place to recruit kitchens.' },
        { term: 'Hotspots', meaning: 'A separate model: restaurants clustered on their coordinates, weighted by demand, flagged under- or over-supplied.' },
      ]}
    >
      {state.error && <ErrorBanner world={W} message={state.error} onRetry={state.reload} />}
      {state.loading && !state.data ? (
        <Panel world={W}><SkeletonRows world={W} rows={8} /></Panel>
      ) : !payload ? (
        <NotReady world={W} model={state.data?.model} what="area clusters" />
      ) : (
        <>
          <StatRow cols={5}>
            <Stat label="Localities" value={num(payload.totals.areas, 0)} note={`${Object.keys(payload.zones).length} zones`} />
            <Stat label="Customers" value={num(payload.totals.residents, 0)} />
            <Stat label="Orders" value={num(payload.totals.orders, 0)} />
            <Stat label="Restaurants · venues" value={`${num(payload.totals.restaurants, 0)} · ${num(payload.totals.venues, 0)}`} />
            <Stat label="Clusters (k)" value={payload.k} strong note="chosen by silhouette" />
          </StatRow>

          <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
            <Panel
              world={W}
              flush
              title={<span className="inline-flex items-center gap-2"><MapPin className={`h-5 w-5 ${T.accentText}`} aria-hidden="true" />Mumbai</span>}
              action={<Segmented world={W} label="Colour areas by" value={colorBy} onChange={setColorBy} options={COLOR_BY} />}
            >
              <div className={`flex flex-wrap gap-x-5 gap-y-2 border-b px-5 py-3 text-sm sm:px-6 ${T.hairline}`}>
                {([['areas', 'Area clusters'], ['restaurants', 'Restaurants'], ['venues', 'Venues'], ['hotspots', 'Demand hotspots']] as const).map(([k, label]) => (
                  <label key={k} className="inline-flex cursor-pointer items-center gap-2">
                    <input type="checkbox" className={T.checkbox} checked={layers[k]} onChange={() => toggle(k)} /> {label}
                  </label>
                ))}
              </div>
              <div className="relative isolate h-[620px]">
                <MapContainer center={MUMBAI_CENTRE} zoom={11} minZoom={10} maxZoom={16} scrollWheelZoom className="h-full w-full"
                  maxBounds={[[18.82, 72.68], [19.36, 73.08]]}>
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {layers.hotspots && state.data?.hotspots.map((h, i) => (
                    <Circle key={`h${i}`} center={[h.lat, h.lng]} radius={Math.max(400, h.radius_km * 500)}
                      pathOptions={{ color: OPPORTUNITY_COLOR[h.opportunity], weight: 2, dashArray: '6 4', fillOpacity: 0.06 }}>
                      <LTooltip>{h.domain === 'zesty' ? 'Food' : 'Events'} hotspot · {h.label}: {num(h.demand, 0)} demand, {h.supply} outlets ({h.opportunity})</LTooltip>
                    </Circle>
                  ))}
                  {layers.restaurants && state.data?.points?.restaurants.map((r) => (
                    <CircleMarker key={`r${r.id}`} center={[r.lat, r.lng]} radius={3 + Math.min(5, Math.sqrt((r.orders ?? 0) / 60))}
                      pathOptions={{ color: '#ffffff', weight: 1, fillColor: '#141414', fillOpacity: 0.75 }}>
                      <LTooltip>{r.name} · {r.area} · {r.cuisine} · {num(r.orders, 0)} orders</LTooltip>
                    </CircleMarker>
                  ))}
                  {layers.venues && state.data?.points?.venues.map((v) => (
                    <CircleMarker key={`v${v.id}`} center={[v.lat, v.lng]} radius={6}
                      pathOptions={{ color: '#4a3aa7', weight: 2.5, fillColor: '#ffffff', fillOpacity: 1 }}>
                      <LTooltip>{v.name} · {v.area} · {num(v.bookings, 0)} bookings</LTooltip>
                    </CircleMarker>
                  ))}
                  {layers.areas && areas.map((a) => (
                    <CircleMarker key={a.area} center={[a.lat, a.lng]} radius={7 + 15 * Math.sqrt(a.orders_placed / maxOrders)}
                      eventHandlers={{ click: () => setSelected(a.area) }}
                      pathOptions={{ color: selected === a.area ? '#0d0d0d' : '#ffffff', weight: selected === a.area ? 3 : 2,
                        fillColor: colorOf(a), fillOpacity: 0.62 }}>
                      <LTooltip direction="top">{a.area} · {a.cluster_name}</LTooltip>
                      <Popup>
                        <strong>{a.area}</strong> ({a.zone})<br />
                        {a.cluster_name}<br />
                        {num(a.residents, 0)} residents · {num(a.orders_placed, 0)} orders<br />
                        {num(a.restaurants, 0)} restaurants · {rupees(a.avg_order_value)} avg order
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              </div>
              <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-t px-5 py-3 sm:px-6 ${T.hairline}`}>
                {colorBy === 'cluster'
                  ? clusters.map((c) => <Swatch key={c.cluster} color={seriesColor(c.cluster)} label={`${c.name} (${c.size})`} />)
                  : (
                    <span className="inline-flex items-center gap-2 text-xs">
                      {num(range[0], 1)}
                      <span className="h-2.5 w-40 rounded-full" style={{ background: `linear-gradient(90deg, ${sequentialColor(0)}, ${sequentialColor(1)})` }} />
                      {num(range[1], 1)} · {COLOR_BY.find((c) => c.value === colorBy)?.label}
                    </span>
                  )}
                <span className={`ml-auto inline-flex gap-4 text-xs ${T.muted}`}>
                  <Swatch color="#141414" label="Restaurant" />
                  <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-[#4a3aa7] bg-white" />Venue</span>
                  <span>Circle size = orders</span>
                </span>
              </div>
            </Panel>

            <div className="space-y-6">
              <Panel world={W} title={sel ? sel.area : 'Pick an area'} description={sel ? `${sel.zone} · ${sel.district} · ${sel.pincode}` : 'Click a circle on the map.'}>
                {sel && selCluster ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl p-4 text-sm" style={{ background: `${seriesColor(sel.cluster)}1f` }}>
                      <Swatch color={seriesColor(sel.cluster)} label={<span className="font-semibold">{sel.cluster_name}</span>} />
                      <p className={`mt-1.5 ${T.muted}`}>{selCluster.action}</p>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                      {([
                        ['Residents', num(sel.residents, 0)], ['Orders placed', num(sel.orders_placed, 0)],
                        ['Orders / resident', num(sel.orders_per_resident, 2)], ['Avg order', rupees(sel.avg_order_value)],
                        ['Restaurants', num(sel.restaurants, 0)], ['Orders / kitchen', num(sel.demand_per_kitchen, 0)],
                        ['Orders cooked here', num(sel.orders_served, 0)], ['Avg delivery', `${num(sel.avg_delivery_min, 1)} min`],
                        ['Cancel rate', pctOf(sel.cancel_rate)], ['Venues · bookings', `${sel.venues} · ${num(sel.bookings, 0)}`],
                        ['Top cuisine', sel.top_cuisine || '—'], ['Affluence index', num(sel.affluence, 2)],
                      ] as [string, string][]).map(([k, v]) => (
                        <div key={k}><dt className={`text-xs ${T.muted}`}>{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>
                      ))}
                    </dl>
                    <p className={`text-xs ${T.faint}`}>Distance to its cluster centre: {num(sel.distance_to_centroid, 2)} (standardised units).</p>
                  </div>
                ) : (
                  <p className={`text-sm ${T.muted}`}>Each circle is a locality; its size is the orders its residents placed and its colour is its cluster.</p>
                )}
              </Panel>
              <Panel world={W} title="By zone" flush>
                <div className="px-5 pb-4 pt-2 sm:px-6">
                  <MiniTable rows={zones} rowKey={([z]) => z} cols={[
                    { key: 'z', label: 'Zone', render: ([z]) => z },
                    { key: 'o', label: 'Orders', align: 'right', render: ([, v]) => num(v.orders, 0) },
                    { key: 'r', label: 'Kitchens', align: 'right', render: ([, v]) => num(v.restaurants, 0) },
                    { key: 'k', label: 'Orders/kitchen', align: 'right', render: ([, v]) => num(v.orders / Math.max(1, v.restaurants), 0) },
                  ]} />
                </div>
              </Panel>
            </div>
          </div>

          <Panel world={W} title="Cluster profiles" description="Average of each cluster's areas, and what to do there">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {clusters.map((c) => (
                <div key={c.cluster} className={`rounded-2xl border p-4 ${T.hairline}`}>
                  <Swatch color={seriesColor(c.cluster)} label={<span className="text-base font-semibold">{c.name}</span>} />
                  <p className={`mt-1 text-xs ${T.muted}`}>{c.size} areas: {c.areas.join(', ')}</p>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div><dt className={T.muted}>Orders / resident</dt><dd className="font-semibold tabular-nums">{num(c.means.orders_per_resident, 2)}</dd></div>
                    <div><dt className={T.muted}>Avg order</dt><dd className="font-semibold tabular-nums">{rupees(c.means.avg_order_value)}</dd></div>
                    <div><dt className={T.muted}>Kitchens</dt><dd className="font-semibold tabular-nums">{num(c.means.restaurants, 1)}</dd></div>
                    <div><dt className={T.muted}>Orders / kitchen</dt><dd className="font-semibold tabular-nums">{num(c.means.demand_per_kitchen, 0)}</dd></div>
                    <div><dt className={T.muted}>Delivery</dt><dd className="font-semibold tabular-nums">{num(c.means.avg_delivery_min, 1)} min</dd></div>
                    <div><dt className={T.muted}>Bookings</dt><dd className="font-semibold tabular-nums">{num(c.means.bookings, 0)}</dd></div>
                  </dl>
                  <Reading>{c.action}</Reading>
                </div>
              ))}
            </div>
          </Panel>

          <Panel world={W} title="All localities" description="Click a column to sort" flush>
            <div className="px-5 pb-5 pt-2 sm:px-6">
              <MiniTable rows={sorted} rowKey={(a) => a.area} cols={[
                { key: 'area', label: 'Area', render: (a) => <button type="button" className="font-medium hover:underline" onClick={() => setSelected(a.area)}>{a.area}</button> },
                { key: 'zone', label: 'Zone', render: (a) => <span className={T.muted}>{a.zone}</span> },
                { key: 'cl', label: 'Cluster', render: (a) => <Swatch color={seriesColor(a.cluster)} label={a.cluster_name} /> },
                ...(([
                  ['residents', 'Residents', (a: MumbaiArea) => num(a.residents, 0)],
                  ['orders_placed', 'Orders', (a: MumbaiArea) => num(a.orders_placed, 0)],
                  ['avg_order_value', 'Avg order', (a: MumbaiArea) => rupees(a.avg_order_value)],
                  ['restaurants', 'Kitchens', (a: MumbaiArea) => num(a.restaurants, 0)],
                  ['demand_per_kitchen', 'Orders/kitchen', (a: MumbaiArea) => num(a.demand_per_kitchen, 0)],
                  ['avg_delivery_min', 'Delivery', (a: MumbaiArea) => `${num(a.avg_delivery_min, 1)} m`],
                  ['bookings', 'Bookings', (a: MumbaiArea) => num(a.bookings, 0)],
                ]) as [keyof MumbaiArea, string, (a: MumbaiArea) => string][]).map(([key, label, render]) => ({
                  key: String(key), align: 'right' as const,
                  label: <button type="button" onClick={() => setSort(key)} className={sort === key ? `font-semibold ${T.strong}` : ''}>{label}{sort === key ? ' ↓' : ''}</button>,
                  render,
                })),
              ]} />
            </div>
          </Panel>
        </>
      )}
    </LabPage>
  );
};

export default MumbaiMapView;
