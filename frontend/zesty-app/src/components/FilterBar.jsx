import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../contexts";

const LOCATION_DETAIL_MAP = {
  Bandra: "Bandra West, Mumbai",
  Andheri: "Andheri East, Mumbai",
  Juhu: "Juhu Beach, Mumbai",
  Colaba: "Colaba Causeway, Mumbai",
  Dadar: "Dadar TT, Mumbai",
  Powai: "Hiranandani, Powai, Mumbai",
  Worli: "Worli Sea Face, Mumbai",
  Churchgate: "Churchgate Station, Mumbai",
  Thane: "Thane West, Mumbai",
  Borivali: "Borivali West, Mumbai",
};

export default function FilterBar({
  areas = [],
  filters = { search: "", area: "", foodPreference: "all" },
  onFilterChange,
  currentLocation = "",
}) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isLocationMenuOpen, setIsLocationMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const updateFilter = (key, value) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const selectedManualLocation = useMemo(() => {
    if (!filters.area) {
      return null;
    }

    return {
      title: filters.area,
      subtitle: LOCATION_DETAIL_MAP[filters.area] || `${filters.area}, Mumbai`,
    };
  }, [filters.area]);

  const autoLocation = useMemo(() => {
    const locationText = currentLocation && currentLocation !== "Location unavailable"
      ? currentLocation
      : "Detecting location";
    const locationParts = locationText.split(",").map((part) => part.trim()).filter(Boolean);

    return {
      title: locationParts[0] || "Mumbai",
      subtitle:
        locationParts.length > 1
          ? locationParts.slice(1).join(", ")
          : currentLocation === "Location unavailable"
            ? "Location permission denied"
            : "Fetching your delivery area",
    };
  }, [currentLocation]);

  const locationTitle = selectedManualLocation?.title || autoLocation.title;
  const locationSubtitle = selectedManualLocation?.subtitle || autoLocation.subtitle;

  const handleLocationSelect = (areaValue) => {
    updateFilter("area", areaValue);
    setIsLocationMenuOpen(false);
  };

  const isVegOnlyActive = filters.foodPreference !== "non-veg";
  const foodPreferenceLabel = isVegOnlyActive ? "VEG" : "NON-VEG";
  const userDisplayName = `${user?.first_name || ""} ${user?.last_name || ""}`.trim()
    || user?.first_name
    || "Account";

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout();
    navigate("/");
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <div className="relative z-20 w-full">
      <div className="w-full px-4 py-4 text-white md:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="relative min-w-0">
            <button
              type="button"
              onClick={() => setIsLocationMenuOpen((value) => !value)}
              className="text-left"
            >
              <div className="flex items-start gap-2">
                <span aria-hidden="true" className="pt-0.5">📍</span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-2xl font-black tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
                    <span className="truncate">{locationTitle}</span>
                    <span className="text-lg" aria-hidden="true">▾</span>
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-white/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
                    {locationSubtitle}
                  </p>
                </div>
              </div>
            </button>

            {isLocationMenuOpen && (
              <div className="absolute left-0 top-full z-20 mt-2 w-[320px] max-w-[90vw] overflow-hidden rounded-2xl border border-[#F0E0E0] bg-white text-[#1C1C1C] shadow-[0_18px_30px_rgba(0,0,0,0.18)]">
                <button
                  type="button"
                  onClick={() => handleLocationSelect("")}
                  className="block w-full border-b border-[#F5F5F5] px-4 py-3 text-left hover:bg-[#FFF7F7]"
                >
                  <p className="text-sm font-semibold">Use current location</p>
                  <p className="mt-0.5 text-xs text-[#696969]">{autoLocation.subtitle}</p>
                </button>

                <div className="max-h-64 overflow-y-auto">
                  {areas.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => handleLocationSelect(area)}
                      className={`block w-full border-b border-[#F5F5F5] px-4 py-3 text-left last:border-b-0 hover:bg-[#FFF7F7] ${
                        filters.area === area ? "bg-[#FFF7F7]" : ""
                      }`}
                    >
                      <p className="text-sm font-semibold">{area}</p>
                      <p className="mt-0.5 text-xs text-[#696969]">
                        {LOCATION_DETAIL_MAP[area] || `${area}, Mumbai`}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Link
              to="/eventra"
              className="inline-flex items-center rounded-full bg-[#4F46E5] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(79,70,229,0.35)] transition-transform duration-200 hover:-translate-y-0.5"
            >
              Eventra
            </Link>

            <button
              type="button"
              className="rounded-full bg-[#FEECEF] px-4 py-2 text-sm font-semibold text-[#8F1F2E] shadow-[0_8px_16px_rgba(0,0,0,0.16)]"
            >
              Zesty Money
            </button>

            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-2 py-1.5">
              <span className="text-sm font-black tracking-[0.08em] text-white">{foodPreferenceLabel}</span>
              <button
                type="button"
                role="switch"
                aria-checked={isVegOnlyActive}
                onClick={() => updateFilter("foodPreference", isVegOnlyActive ? "non-veg" : "veg")}
                className={`relative h-7 w-14 overflow-hidden rounded-full transition-colors duration-200 ${
                  isVegOnlyActive ? "bg-[#00C853]" : "bg-[#FF5252]"
                }`}
              >
                <span
                  className={`absolute left-[2px] top-[2px] h-6 w-6 rounded-full bg-white shadow-[0_4px_10px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
                    isVegOnlyActive ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {isAuthenticated && (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-[#1F1F1F] shadow-[0_8px_16px_rgba(0,0,0,0.16)]"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <span className="uppercase tracking-[0.04em]">{userDisplayName}</span>
                  <span aria-hidden="true">▾</span>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full z-30 mt-2 w-52 overflow-hidden rounded-xl border border-[#F0E0E0] bg-white text-[#1C1C1C] shadow-[0_16px_28px_rgba(0,0,0,0.2)]">
                    <div className="border-b border-[#F5F5F5] px-4 py-3">
                      <p className="truncate text-sm font-semibold">{userDisplayName}</p>
                      <p className="mt-0.5 truncate text-xs text-[#696969]">{user?.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full px-4 py-3 text-left text-sm font-semibold text-[#C62828] hover:bg-[#FFF5F5]"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
