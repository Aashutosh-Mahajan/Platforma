import { CalendarDays, MapPin } from 'lucide-react';

export interface EventCardProps {
  image: string;
  category: string;
  title: string;
  price: string;
  date: string;
  time: string;
  venue: string;
  categoryColor: string;
}

export default function EventCard({
  image,
  category,
  title,
  price,
  date,
  time,
  venue,
  categoryColor,
}: EventCardProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-zinc-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="relative h-44 overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white ${categoryColor}`}
        >
          {category}
        </span>
      </div>

      <div className="space-y-2 p-4 font-eventra-body">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
          <p className="text-sm font-bold text-eventra-amber">{price}</p>
        </div>

        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{date} • {time}</span>
        </p>

        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{venue}</span>
        </p>

        <button
          type="button"
          className="mt-3 w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-800 transition-colors duration-200 hover:bg-eventra-amber hover:text-white"
        >
          Buy Ticket
        </button>
      </div>
    </article>
  );
}
