"use client";

import { useEffect, useState } from "react";

export default function FilterBar({ areas = [], cuisines = [], onFilterChange }) {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [cuisine, setCuisine] = useState("");

  useEffect(() => {
    onFilterChange({ search, area, cuisine });
  }, [search, area, cuisine, onFilterChange]);

  return (
    <div className="sticky top-0 z-10 border-b border-[#F0E0E0] bg-white/95 backdrop-blur">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 md:px-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search restaurants..."
            className="w-full rounded-xl border border-[#F0E0E0] bg-white px-3 py-2.5 text-sm text-[#1B1B1B] outline-none transition-colors duration-200 placeholder:text-[#8F6F6E] focus:border-[#E23744] focus:ring-2 focus:ring-[#E23744]/15"
          />

          <select
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className="w-full rounded-xl border border-[#F0E0E0] bg-white px-3 py-2.5 text-sm text-[#1B1B1B] outline-none transition-colors duration-200 focus:border-[#E23744] focus:ring-2 focus:ring-[#E23744]/15"
          >
            <option value="">All Areas</option>
            {areas.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={cuisine}
            onChange={(event) => setCuisine(event.target.value)}
            className="w-full rounded-xl border border-[#F0E0E0] bg-white px-3 py-2.5 text-sm text-[#1B1B1B] outline-none transition-colors duration-200 focus:border-[#E23744] focus:ring-2 focus:ring-[#E23744]/15"
          >
            <option value="">All Cuisines</option>
            {cuisines.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}