import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  MapMouseEvent,
  Pin,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  Compass,
  Flag,
  Layers,
  LocateFixed,
  MapPin,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { SECTS } from '../../game/data';
import { GuildInfo, PlayerState } from '../../game/types';

const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || '';

const ATTRIBUTION_IDS: string[] = ['gmp_mcp_codeassist_v1_aistudio'];
const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 35.6762, lng: 139.6503 };
const DEFAULT_ZOOM = 12;

type MapStyleMode = 'roadmap' | 'satellite' | 'terrain' | 'hybrid';

interface PlaceMarkerItem {
  id: string;
  name: string;
  address: string;
  position: google.maps.LatLngLiteral;
  rating?: number | null;
  userRatingCount?: number | null;
  businessStatus?: string | null;
}

interface RallyPinItem {
  id: string;
  label: string;
  note: string;
  position: google.maps.LatLngLiteral;
}

interface GoogleMapsModalProps {
  player: PlayerState;
  guild: GuildInfo | null;
  onClose: () => void;
  onNotify?: (msg: string) => void;
}

function isQuotaError(err: unknown): boolean {
  const text = String(err ?? '');
  return (
    text.includes('429') ||
    text.includes('RESOURCE_EXHAUSTED') ||
    text.includes('OVER_QUERY_LIMIT') ||
    text.includes('OverQuotaMapError') ||
    text.includes('QuotaExceededError')
  );
}

interface PlaceAdvancedMarkerProps {
  place: PlaceMarkerItem;
  isSelected: boolean;
  onSelect: () => void;
  onCloseInfo: () => void;
}

const PlaceAdvancedMarker: React.FC<PlaceAdvancedMarkerProps> = ({
  place,
  isSelected,
  onSelect,
  onCloseInfo,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={place.position}
        title={place.name}
        onClick={onSelect}
        zIndex={isSelected ? 50 : 20}
      >
        <Pin
          background={isSelected ? '#F5D061' : '#B91C1C'}
          borderColor={isSelected ? '#78350F' : '#FEF3C7'}
          glyphColor={isSelected ? '#1A120C' : '#FEF3C7'}
          scale={isSelected ? 1.25 : 1.05}
        />
      </AdvancedMarker>
      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={260} onCloseClick={onCloseInfo}>
          <div className="p-1 text-[#1A1410]">
            <div className="text-sm font-bold text-[#7F1D1D]">{place.name}</div>
            {place.address && (
              <div className="mt-1 text-xs leading-snug text-[#4B3F33]">{place.address}</div>
            )}
            {typeof place.rating === 'number' && (
              <div className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-[#B45309]">
                <span>★ {place.rating.toFixed(1)}</span>
                {typeof place.userRatingCount === 'number' && (
                  <span className="font-normal text-[#6B5E50]">
                    ({place.userRatingCount} đánh giá)
                  </span>
                )}
              </div>
            )}
            <div className="mt-1 font-mono text-[10px] text-[#786B5D]">
              {place.position.lat.toFixed(5)}, {place.position.lng.toFixed(5)}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface RallyAdvancedMarkerProps {
  pin: RallyPinItem;
  isSelected: boolean;
  onSelect: () => void;
  onCloseInfo: () => void;
  onDelete: () => void;
}

const RallyAdvancedMarker: React.FC<RallyAdvancedMarkerProps> = ({
  pin,
  isSelected,
  onSelect,
  onCloseInfo,
  onDelete,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={pin.position}
        title={pin.label}
        onClick={onSelect}
        zIndex={isSelected ? 60 : 35}
      >
        <Pin
          background="#D97706"
          borderColor="#FEF08A"
          glyphColor="#1C140E"
          scale={isSelected ? 1.3 : 1.1}
        />
      </AdvancedMarker>
      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={250} onCloseClick={onCloseInfo}>
          <div className="p-1 text-[#1A1410]">
            <div className="text-sm font-bold text-[#92400E]">{pin.label}</div>
            <div className="mt-1 text-xs text-[#4B3F33]">{pin.note}</div>
            <div className="mt-1 font-mono text-[10px] text-[#786B5D]">
              {pin.position.lat.toFixed(5)}, {pin.position.lng.toFixed(5)}
            </div>
            <button
              type="button"
              onClick={onDelete}
              className="mt-2 rounded bg-[#991B1B] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#B91C1C] cursor-pointer"
            >
              Gỡ cờ tụ nghĩa
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

interface InteractiveMapWorkspaceProps {
  player: PlayerState;
  guild: GuildInfo | null;
  onNotify?: (msg: string) => void;
}

const InteractiveMapWorkspace: React.FC<InteractiveMapWorkspaceProps> = ({
  player,
  guild,
  onNotify,
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');

  const [mapType, setMapType] = useState<MapStyleMode>('roadmap');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [searchResults, setSearchResults] = useState<PlaceMarkerItem[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [rallyPins, setRallyPins] = useState<RallyPinItem[]>([]);
  const [selectedRallyId, setSelectedRallyId] = useState<string | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const sect = SECTS[player.sect];

  const resetAutocompleteSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
  }, []);

  // Fetch live AutocompleteSuggestion predictions using Places API (New)
  useEffect(() => {
    if (!placesLib) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        const request: google.maps.places.AutocompleteRequest = {
          input: trimmed,
          sessionToken: sessionTokenRef.current,
        };
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        if (!cancelled) {
          setSuggestions(res?.suggestions || []);
        }
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        if (!cancelled) {
          setSuggestions([]);
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placesLib, query]);

  const focusPosition = useCallback(
    (pos: google.maps.LatLngLiteral, zoom = 15) => {
      if (!map) return;
      map.panTo(pos);
      map.setZoom(zoom);
    },
    [map]
  );

  // Select an autocomplete prediction -> convert to Place -> fetchFields -> resetSession
  const handleSelectSuggestion = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!placesLib || !suggestion.placePrediction) return;
      setIsSearching(true);
      setStatusMessage(null);
      try {
        const place = suggestion.placePrediction.toPlace();
        await place.fetchFields({
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'businessStatus',
          ],
        });
        resetAutocompleteSession();

        if (!place.location) {
          setStatusMessage('Không tìm thấy tọa độ cho địa điểm này.');
          return;
        }
        const position: google.maps.LatLngLiteral = {
          lat: place.location.lat(),
          lng: place.location.lng(),
        };
        const item: PlaceMarkerItem = {
          id: place.id || `place_${Date.now()}`,
          name: place.displayName || suggestion.placePrediction.text.text,
          address: place.formattedAddress || '',
          position,
          rating: place.rating ?? null,
          userRatingCount: place.userRatingCount ?? null,
          businessStatus: place.businessStatus ?? null,
        };
        setQuery(item.name);
        setSearchResults([item]);
        setSelectedPlaceId(item.id);
        setSelectedRallyId(null);
        focusPosition(position, 16);
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          setStatusMessage('Đã chạm giới hạn truy vấn Google Maps Platform.');
        } else {
          setStatusMessage('Không thể tải chi tiết địa điểm. Vui lòng thử lại.');
        }
      } finally {
        setIsSearching(false);
      }
    },
    [focusPosition, placesLib, resetAutocompleteSession]
  );

  // Submit free-text search using Place.searchByText (Places API New)
  const handleTextSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed || !placesLib) return;

      setIsSearching(true);
      setStatusMessage(null);
      resetAutocompleteSession();

      try {
        const { Place } = placesLib;
        const center = map?.getCenter();
        const request: google.maps.places.SearchByTextRequest & {
          internalUsageAttributionIds?: string[];
        } = {
          textQuery: trimmed,
          fields: [
            'id',
            'displayName',
            'formattedAddress',
            'location',
            'rating',
            'userRatingCount',
            'businessStatus',
          ],
          maxResultCount: 8,
          ...(center ? { locationBias: { lat: center.lat(), lng: center.lng() } } : {}),
          internalUsageAttributionIds: ATTRIBUTION_IDS,
        };

        const response = await Place.searchByText(request);
        const places = response?.places ?? [];

        const mapped: PlaceMarkerItem[] = [];
        for (const p of places) {
          if (!p.location) continue;
          mapped.push({
            id: p.id || `p_${mapped.length}_${Date.now()}`,
            name: p.displayName || 'Địa điểm chưa đặt tên',
            address: p.formattedAddress || '',
            position: { lat: p.location.lat(), lng: p.location.lng() },
            rating: p.rating ?? null,
            userRatingCount: p.userRatingCount ?? null,
            businessStatus: p.businessStatus ?? null,
          });
        }

        setSearchResults(mapped);
        setSelectedRallyId(null);

        if (mapped.length === 0) {
          setSelectedPlaceId(null);
          setStatusMessage('Không tìm thấy địa điểm phù hợp với từ khóa vừa nhập.');
          return;
        }

        setSelectedPlaceId(mapped[0].id);
        if (map && mapped.length > 1 && window.google?.maps?.LatLngBounds) {
          const bounds = new window.google.maps.LatLngBounds();
          mapped.forEach((m) => bounds.extend(m.position));
          map.fitBounds(bounds, 48);
        } else {
          focusPosition(mapped[0].position, 15);
        }
      } catch (err) {
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          setStatusMessage('Đã chạm giới hạn truy vấn Google Maps Platform.');
        } else {
          setStatusMessage('Không thể tìm kiếm địa điểm vào lúc này.');
        }
      } finally {
        setIsSearching(false);
      }
    },
    [focusPosition, map, placesLib, query, resetAutocompleteSession]
  );

  // Explicit user-consented geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Trình duyệt hiện tại không hỗ trợ định vị GPS.');
      return;
    }
    setIsLocating(true);
    setStatusMessage(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: google.maps.LatLngLiteral = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLocation(coords);
        focusPosition(coords, 15);
        setIsLocating(false);
        onNotify?.('Đã định vị vị trí hiện tại trên Google Maps.');
      },
      () => {
        setIsLocating(false);
        setStatusMessage('Không thể lấy vị trí hiện tại (quyền định vị bị từ chối hoặc không khả dụng).');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Click on map to plant a Guild Rally Pin when pinMode is active
  const handleMapClick = (event: MapMouseEvent) => {
    const latLng = event.detail.latLng;
    if (!pinMode || !latLng) return;

    const index = rallyPins.length + 1;
    const newPin: RallyPinItem = {
      id: `rally_${Date.now()}`,
      label: guild ? `Tụ Nghĩa [${guild.name}] #${index}` : `Điểm Hẹn Giang Hồ #${index}`,
      note: `Cắm cờ bởi ${player.name} (${sect.name} · Lv.${player.level})`,
      position: { lat: latLng.lat, lng: latLng.lng },
    };
    setRallyPins((prev) => [newPin, ...prev]);
    setSelectedRallyId(newPin.id);
    setSelectedPlaceId(null);
    setPinMode(false);
    onNotify?.(`Đã cắm cờ [${newPin.label}] trên bản đồ!`);
  };

  return (
    <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-12">
      {/* Left Sidebar: Places Search, Controls & Rally Pins */}
      <aside className="flex flex-col gap-3 overflow-y-auto border-b border-[#33251A] bg-[#15100D] p-4 lg:col-span-4 lg:border-r lg:border-b-0">
        {/* Search Form */}
        <form onSubmit={handleTextSearch} className="relative">
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[#9A8C78]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm địa danh, quán trà, võ đường..."
                className="w-full rounded border border-[#493624] bg-[#1E1712] py-2 pr-3 pl-8 text-xs text-[#FEF3C7] placeholder-[#8A7D6B] focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="rounded bg-[#8F1D1D] px-3 py-2 text-xs font-semibold text-[#FEF3C7] hover:bg-[#A62121] disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {isSearching ? 'Đang tìm...' : 'Tìm'}
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {suggestions.length > 0 && (
            <ul className="absolute right-0 left-0 z-30 mt-1 max-h-52 overflow-y-auto rounded border border-[#5A422B] bg-[#1B1410] shadow-xl">
              {suggestions.map((sug, idx) => (
                <li key={sug.placePrediction?.placeId || idx}>
                  <button
                    type="button"
                    onClick={() => handleSelectSuggestion(sug)}
                    className="flex w-full items-start gap-2 border-b border-[#2B2017] px-3 py-2 text-left text-xs text-[#E5D8C0] hover:bg-[#2A2018] hover:text-[#F5D061] cursor-pointer"
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D4AF37]" />
                    <span className="line-clamp-2">{sug.placePrediction?.text.text}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        {/* Quick Map Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={isLocating}
            className="flex items-center justify-center gap-1.5 rounded border border-[#3E3224] bg-[#1C1510] px-2.5 py-2 text-xs font-semibold text-[#7DD3FC] hover:border-[#38BDF8] hover:bg-[#17222B] disabled:opacity-50 cursor-pointer"
          >
            <LocateFixed className="h-3.5 w-3.5" />
            <span>{isLocating ? 'Đang định vị...' : 'Vị Trí Của Tôi'}</span>
          </button>

          <button
            type="button"
            onClick={() => setPinMode((v) => !v)}
            className={`flex items-center justify-center gap-1.5 rounded border px-2.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              pinMode
                ? 'border-[#F5D061] bg-[#5C3A12] text-[#FEF08A]'
                : 'border-[#3E3224] bg-[#1C1510] text-[#F5D061] hover:border-[#D4AF37]'
            }`}
          >
            <Flag className="h-3.5 w-3.5" />
            <span>{pinMode ? 'Nhấp Bản Đồ...' : 'Cắm Cờ Tụ Nghĩa'}</span>
          </button>
        </div>

        {/* Map Type Switcher */}
        <div className="rounded border border-[#2E2319] bg-[#19130F] p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-[#C9A86A]">
            <Layers className="h-3.5 w-3.5" />
            <span>CHẾ ĐỘ BẢN ĐỒ</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {(
              [
                { id: 'roadmap', label: 'Đường phố' },
                { id: 'terrain', label: 'Địa hình' },
                { id: 'satellite', label: 'Vệ tinh' },
                { id: 'hybrid', label: 'Kết hợp' },
              ] as { id: MapStyleMode; label: string }[]
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setMapType(mode.id)}
                className={`rounded py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                  mapType === mode.id
                    ? 'bg-[#8F1D1D] text-[#FEF3C7]'
                    : 'bg-[#231B15] text-[#B5A68E] hover:text-[#FEF3C7]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {pinMode && (
          <div className="rounded border border-[#D4AF37]/70 bg-[#291E11] px-3 py-2 text-xs text-[#FDE68A]">
            Nhấp vào bất kỳ điểm nào trên bản đồ để cắm cờ tụ nghĩa cho{' '}
            <strong>{guild ? guild.name : player.name}</strong>.
          </div>
        )}

        {statusMessage && (
          <div className="rounded border border-[#5B4527] bg-[#211811] px-3 py-2 text-xs text-[#FDE68A]">
            {statusMessage}
          </div>
        )}

        {/* Search Results List */}
        {searchResults.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-[#C9A86A]">
              <span>KẾT QUẢ TÌM KIẾM ({searchResults.length})</span>
              <button
                type="button"
                onClick={() => {
                  setSearchResults([]);
                  setSelectedPlaceId(null);
                }}
                className="text-[10px] font-normal text-[#9A8C78] hover:text-[#FEF3C7] cursor-pointer"
              >
                Xóa kết quả
              </button>
            </div>
            <div className="space-y-1.5">
              {searchResults.map((place) => {
                const active = selectedPlaceId === place.id;
                return (
                  <button
                    key={place.id}
                    type="button"
                    onClick={() => {
                      setSelectedPlaceId(place.id);
                      setSelectedRallyId(null);
                      focusPosition(place.position, 16);
                    }}
                    className={`w-full rounded border p-2.5 text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-[#D4AF37] bg-[#241A12]'
                        : 'border-[#2E2319] bg-[#19130F] hover:border-[#5A422B]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-[#FEF3C7]">{place.name}</span>
                      {typeof place.rating === 'number' && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 font-mono text-[11px] text-[#F5D061] tabular-nums">
                          <Star className="h-3 w-3 fill-[#F5D061] text-[#F5D061]" />
                          {place.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {place.address && (
                      <div className="mt-0.5 line-clamp-2 text-[11px] text-[#A89B86]">
                        {place.address}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Guild Rally Pins List */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold tracking-wider text-[#C9A86A]">
            CỜ TỤ NGHĨA ĐÃ CẮM ({rallyPins.length})
          </div>
          {rallyPins.length === 0 ? (
            <div className="rounded border border-dashed border-[#34271B] bg-[#17110E] p-3 text-xs text-[#9A8C78]">
              Chưa có cờ tụ nghĩa nào. Nhấn <strong>Cắm Cờ Tụ Nghĩa</strong> rồi chọn điểm trên bản
              đồ để đánh dấu điểm hẹn bang hội.
            </div>
          ) : (
            <div className="space-y-1.5">
              {rallyPins.map((pin) => {
                const active = selectedRallyId === pin.id;
                return (
                  <div
                    key={pin.id}
                    className={`flex items-start justify-between gap-2 rounded border p-2.5 ${
                      active
                        ? 'border-[#F5D061] bg-[#261B11]'
                        : 'border-[#2E2319] bg-[#19130F]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRallyId(pin.id);
                        setSelectedPlaceId(null);
                        focusPosition(pin.position, 15);
                      }}
                      className="min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="truncate text-xs font-bold text-[#F5D061]">{pin.label}</div>
                      <div className="mt-0.5 text-[11px] text-[#C7B89E]">{pin.note}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-[#8D7D67] tabular-nums">
                        {pin.position.lat.toFixed(4)}, {pin.position.lng.toFixed(4)}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRallyPins((prev) => prev.filter((x) => x.id !== pin.id));
                        if (selectedRallyId === pin.id) setSelectedRallyId(null);
                      }}
                      title="Gỡ cờ"
                      className="rounded p-1 text-[#9A8C78] hover:bg-[#2F1A1A] hover:text-[#FCA5A5] cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* End User Terms Notice */}
        <div className="mt-auto border-t border-[#2B2017] pt-2.5 text-[10px] leading-relaxed text-[#8D7D67]">
          Tích hợp Google Maps Platform. Sử dụng tính năng bản đồ tuân theo{' '}
          <a
            href="https://maps.google.com/help/terms_maps/?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[#DFD3BE]"
          >
            Điều khoản Người dùng Google Maps
          </a>{' '}
          và{' '}
          <a
            href="https://policies.google.com/privacy?utm_campaign=gmp_mcp_codeassist_v1_aistudio"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[#DFD3BE]"
          >
            Chính sách Quyền riêng tư
          </a>
          .
        </div>
      </aside>

      {/* Right Canvas: Explicit-Height Google Map */}
      <div className="relative h-[440px] w-full bg-[#0E0B09] lg:col-span-8 lg:h-full lg:min-h-[520px]">
        <GoogleMap
          mapId="DEMO_MAP_ID"
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          mapTypeId={mapType}
          gestureHandling="greedy"
          streetViewControl={false}
          mapTypeControl={false}
          internalUsageAttributionIds={ATTRIBUTION_IDS}
          onClick={handleMapClick}
          className="h-full w-full"
        >
          {searchResults.map((place) => (
            <PlaceAdvancedMarker
              key={place.id}
              place={place}
              isSelected={selectedPlaceId === place.id}
              onSelect={() => {
                setSelectedPlaceId(place.id);
                setSelectedRallyId(null);
              }}
              onCloseInfo={() => setSelectedPlaceId(null)}
            />
          ))}

          {rallyPins.map((pin) => (
            <RallyAdvancedMarker
              key={pin.id}
              pin={pin}
              isSelected={selectedRallyId === pin.id}
              onSelect={() => {
                setSelectedRallyId(pin.id);
                setSelectedPlaceId(null);
              }}
              onCloseInfo={() => setSelectedRallyId(null)}
              onDelete={() => {
                setRallyPins((prev) => prev.filter((x) => x.id !== pin.id));
                setSelectedRallyId(null);
              }}
            />
          ))}

          {userLocation && (
            <AdvancedMarker position={userLocation} title="Vị trí hiện tại của bạn" zIndex={70}>
              <Pin
                background="#0284C7"
                borderColor="#E0F2FE"
                glyphColor="#FFFFFF"
                scale={1.15}
              />
            </AdvancedMarker>
          )}
        </GoogleMap>
      </div>
    </div>
  );
};

export const GoogleMapsModal: React.FC<GoogleMapsModalProps> = ({
  player,
  guild,
  onClose,
  onNotify,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4">
      <div className="kt-window flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden text-[#F4E8CD]">
        {/* Header */}
        <div className="kt-titlebar flex shrink-0 items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <Compass className="h-5 w-5 text-[#F7DA85]" />
            <div>
              <h2 className="font-wuxia text-2xl font-bold text-[#F7DA85]">
                Địa Đồ Thế Giới · Google Maps
              </h2>
              <p className="text-[11px] text-[#CBB894]">
                Tìm kiếm địa điểm thực tế, định vị và cắm cờ tụ nghĩa cùng huynh đệ bang hội
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="kt-btn-bronze p-1.5 cursor-pointer"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {!GOOGLE_MAPS_API_KEY ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#5A422B] bg-[#1F1711]">
              <MapPin className="h-7 w-7 text-[#F5D061]" />
            </div>
            <h3 className="mt-4 font-wuxia text-2xl font-bold text-[#F5D061]">
              Chưa Kết Nối Khóa Google Maps Platform
            </h3>
            <p className="mt-2 max-w-lg text-xs leading-relaxed text-[#C7B89E]">
              Tính năng Địa Đồ Thực Tế sử dụng Google Maps JavaScript API và Places API (New). Hiện
              môi trường chưa có biến môi trường{' '}
              <code className="rounded bg-[#241B14] px-1.5 py-0.5 font-mono text-[#FDE68A]">
                VITE_GOOGLE_MAPS_API_KEY
              </code>
              . Bạn có thể thiết lập lại khóa trong bảng cài đặt Google Maps của AI Studio (nếu khu
              vực và tài khoản Google Cloud của bạn được hỗ trợ) để kích hoạt bản đồ tương tác.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 rounded bg-[#8F1D1D] px-5 py-2 text-xs font-semibold text-[#FEF3C7] hover:bg-[#A62121] cursor-pointer"
            >
              Quay Lại Giang Hồ
            </button>
          </div>
        ) : (
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['places', 'marker']}>
            <InteractiveMapWorkspace player={player} guild={guild} onNotify={onNotify} />
          </APIProvider>
        )}
      </div>
    </div>
  );
};
