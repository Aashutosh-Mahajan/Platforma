import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clapperboard, Drama, Mic, Music, Presentation, Search, Trophy, UtensilsCrossed, X, type LucideIcon } from 'lucide-react';
import { eventAPI, type EventTypeGroup } from '../../api/eventra';

const GROUP_ICONS: Record<string, LucideIcon> = {
  concert: Music,
  sports: Trophy,
  movie: Clapperboard,
  theater: Drama,
  comedy: Mic,
  expo: Presentation,
  dining: UtensilsCrossed,
};

// How seats get laid out for each category, so organizers know what the
// choice means before they build a seat map.
const SEATING_NOTE: Record<string, string> = {
  concert: 'Zoned standing and seated areas',
  sports: 'Stadium stands',
  movie: 'Cinema rows',
  theater: 'Auditorium rows',
  comedy: 'Club tables and zones',
  expo: 'Entry passes by zone',
  dining: 'Tables and seatings',
};

let cachedGroups: EventTypeGroup[] | null = null;

export const useEventTypes = () => {
  const [groups, setGroups] = useState<EventTypeGroup[]>(cachedGroups ?? []);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (cachedGroups) return;
    let alive = true;
    eventAPI
      .getEventTypes()
      .then((data) => {
        cachedGroups = data;
        if (alive) setGroups(data);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  return { groups, failed };
};

interface Props {
  value: string;
  category: string;
  onChange: (next: { event_type: string; category: string }) => void;
  error?: string;
}

/**
 * Two-step chooser: pick the broad kind of event, then the exact type
 * (cricket match, stand-up, food festival...). Search jumps across groups.
 */
export const EventTypePicker: React.FC<Props> = ({ value, category, onChange, error }) => {
  const { groups, failed } = useEventTypes();
  const [openGroup, setOpenGroup] = useState(category || 'concert');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (category) setOpenGroup(category);
  }, [category]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      q
        ? groups.flatMap((g) =>
            g.types.filter((type) => type.label.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)).map((type) => ({ ...type, group: g }))
          )
        : [],
    [groups, q]
  );

  const selectedLabel = groups.flatMap((g) => g.types).find((type) => type.value === value)?.label;
  const active = groups.find((g) => g.category === openGroup) ?? groups[0];

  const choose = (event_type: string, cat: string) => {
    onChange({ event_type, category: cat });
    setQuery('');
  };

  if (failed) {
    return <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">Couldn't load event types. Close this form and try again.</p>;
  }

  if (!groups.length) {
    return <div className="h-40 animate-pulse rounded-xl bg-white/[0.04]" aria-label="Loading event types" />;
  }

  const chip = (selected: boolean) =>
    `inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8824a] ${
      selected ? 'border-[#e8824a] bg-[#e8824a] font-semibold text-[#1a0d05]' : 'border-white/12 bg-white/[0.03] text-[#e8e8e8] hover:border-white/30'
    }`;

  return (
    <fieldset className="min-w-0 space-y-3" aria-describedby={error ? 'event-type-error' : undefined}>
      <legend className="sr-only">Type of event</legend>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#b8b8b8]">
          {selectedLabel ? (
            <>
              Selected: <span className="font-semibold text-[#f0a070]">{selectedLabel}</span>
            </>
          ) : (
            'Pick the closest match. It sets how seating works.'
          )}
        </p>
        <label className="relative w-full sm:w-56">
          <span className="sr-only">Search event types</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9a9a9a]" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search, e.g. cricket"
            className="h-10 w-full rounded-full border border-white/12 bg-white/[0.03] pl-9 pr-9 text-sm text-white placeholder:text-[#8a8a8a] focus:border-[#e8824a] focus:outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-[#9a9a9a] hover:text-white" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
      </div>

      {q ? (
        <div className="min-h-[7rem] rounded-2xl border border-white/[0.08] bg-black/20 p-3">
          {matches.length === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-[#9a9a9a]">No event type matches "{query}". Try a broader word like "music" or "sports".</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {matches.map((m) => (
                <button key={m.value} type="button" aria-pressed={m.value === value} onClick={() => choose(m.value, m.group.category)} className={chip(m.value === value)}>
                  {m.value === value && <Check className="h-4 w-4" aria-hidden="true" />}
                  {m.label}
                  <span className={m.value === value ? 'text-[#1a0d05]/70' : 'text-[#8a8a8a]'}>· {m.group.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Event categories">
            {groups.map((g) => {
              const Icon = GROUP_ICONS[g.category] ?? Music;
              const isOpen = g.category === active.category;
              const holdsValue = g.types.some((type) => type.value === value);
              return (
                <button
                  key={g.category}
                  type="button"
                  role="tab"
                  aria-selected={isOpen}
                  onClick={() => setOpenGroup(g.category)}
                  className={`relative flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8824a] ${
                    isOpen ? 'border-[#c4621a]/70 bg-[#c4621a]/15 text-white' : 'border-white/[0.08] text-[#b8b8b8] hover:border-white/25 hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isOpen ? 'text-[#e8824a]' : ''}`} aria-hidden="true" />
                  {g.label}
                  {holdsValue && <span className="h-1.5 w-1.5 rounded-full bg-[#e8824a]" aria-label="(selected)" />}
                </button>
              );
            })}
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-3" role="tabpanel" aria-label={active.label}>
            <p className="mb-3 px-1 text-xs text-[#9a9a9a]">Seating: {SEATING_NOTE[active.category] ?? 'Flexible'}</p>
            <div className="flex flex-wrap gap-2">
              {active.types.map((type) => (
                <button key={type.value} type="button" aria-pressed={type.value === value} onClick={() => choose(type.value, active.category)} className={chip(type.value === value)}>
                  {type.value === value && <Check className="h-4 w-4" aria-hidden="true" />}
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {error && (
        <p id="event-type-error" className="text-sm text-red-300">
          {error}
        </p>
      )}
    </fieldset>
  );
};

export default EventTypePicker;
