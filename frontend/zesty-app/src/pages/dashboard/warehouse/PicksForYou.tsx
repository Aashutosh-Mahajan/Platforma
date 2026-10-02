import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Sparkles, Star } from 'lucide-react';
import { miningAPI } from '../../../api/warehouse';
import { Panel, SkeletonRows } from '../../../components/dashboard/primitives';
import { useLoad } from '../../../components/dashboard/intelligenceUtils';
import { formatDate, humanize, themes } from '../../../components/dashboard/theme';
import { eventImage } from '../../../components/eventra/BookingFlow';
import { fallbackFoodImage } from '../../../utils/foodImagery';
import { formatCuisines } from '../../../utils/cuisine';

/**
 * Personal picks for a customer hub: restaurants on Zesty, upcoming events
 * on Eventra. Falls back to what's popular when there's no history yet.
 * Renders nothing if there is nothing to suggest.
 */
const PicksForYou: React.FC<{ kind: 'food' | 'events' }> = ({ kind }) => {
  const world = kind === 'food' ? 'zesty' : 'eventra';
  const t = themes[world];
  const { data, loading } = useLoad(() => miningAPI.recommendations(), []);
  const items = kind === 'food' ? data?.restaurants ?? [] : data?.events ?? [];

  if (loading && !data) return <Panel world={world}><SkeletonRows world={world} rows={2} /></Panel>;
  if (!items.length) return null;

  return (
    <Panel
      world={world}
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className={`h-5 w-5 ${t.accentText}`} aria-hidden="true" />
          {data?.personalised ? 'Picked for you' : kind === 'food' ? 'Popular right now' : 'Coming up'}
        </span>
      }
      description={data?.personalised
        ? kind === 'food' ? 'Kitchens similar to the ones you order from' : 'Events like the ones you book, and ones people with your taste in food enjoy'
        : undefined}
    >
      <ul className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
        {kind === 'food'
          ? data!.restaurants.map((r) => (
            <li key={r.id} className="w-56 shrink-0 snap-start">
              <Link to={`/zesty/restaurants/${r.id}`} className={`group block overflow-hidden rounded-2xl ring-1 transition-shadow hover:shadow-lg ${t.dark ? 'ring-white/10' : 'ring-black/5'}`}>
                <img src={r.image_url || r.banner || r.image || fallbackFoodImage(r.id)} alt="" className="h-28 w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                <div className="p-3">
                  <p className="truncate font-semibold">{r.name}</p>
                  <p className={`mt-0.5 flex items-center gap-1 text-xs ${t.muted}`}>
                    {Number(r.rating) > 0 && <><Star className="h-3 w-3 fill-current text-amber-500" aria-hidden="true" />{Number(r.rating).toFixed(1)} · </>}
                    <span className="truncate">{formatCuisines(r.cuisine_types || r.cuisine, 2)}</span>
                  </p>
                  <p className={`mt-1.5 line-clamp-2 text-xs ${t.faint}`}>{r.reason}</p>
                </div>
              </Link>
            </li>
          ))
          : data!.events.map((e) => (
            <li key={e.id} className="w-60 shrink-0 snap-start">
              <Link to={`/eventra/events/${e.id}`} className={`group block overflow-hidden rounded-2xl ring-1 transition-shadow hover:shadow-lg ${t.dark ? 'ring-white/10' : 'ring-black/5'}`}>
                <img src={eventImage(e)} alt="" className="h-28 w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                <div className="p-3">
                  <p className="truncate font-semibold">{e.name}</p>
                  <p className={`mt-0.5 flex items-center gap-1 text-xs ${t.muted}`}>
                    <CalendarDays className="h-3 w-3" aria-hidden="true" />{formatDate(e.event_date)} · {humanize(e.category)}
                  </p>
                  <p className={`mt-1.5 line-clamp-2 text-xs ${t.faint}`}>{e.reason}</p>
                </div>
              </Link>
            </li>
          ))}
      </ul>
    </Panel>
  );
};

export default PicksForYou;
