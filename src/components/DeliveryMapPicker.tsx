// Source: Adapted from Google Maps Platform Code Assist (@vis.gl/react-google-maps & Places API New)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMap,
  useMapsLibrary,
  useApiLoadingStatus,
  APILoadingStatus,
  MapMouseEvent
} from '@vis.gl/react-google-maps';
import { MapPin, Search, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  BUSINESS_INFO,
  SHIPPING_RATE_PER_KM,
  calculateShippingPromo
} from '../data/products';
import { formatRupiah } from '../utils/formatters';

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface SelectedDeliveryLocation {
  lat: number;
  lng: number;
  displayName?: string;
  formattedAddress?: string;
  googleMapsUrl: string;
  distanceKm: number;
  originalShippingFee: number;
}

interface PlaceInstance {
  displayName?: string | null;
  formattedAddress?: string | null;
  googleMapsURI?: string | null;
  location?: {
    lat: () => number;
    lng: () => number;
  } | null;
  viewport?: unknown;
  fetchFields: (options: { fields: string[] }) => Promise<{ place: PlaceInstance }>;
}

interface PlacePredictionItem {
  placeId: string;
  text: {
    text: string;
  };
  toPlace: () => PlaceInstance;
}

interface AutocompleteSuggestionItem {
  placePrediction?: PlacePredictionItem | null;
}

interface DeliveryMapPickerProps {
  onLocationSelect: (location: SelectedDeliveryLocation) => void;
}

function isQuotaError(err: unknown): boolean {
  const msg = String(err);
  return (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('429') ||
    msg.includes('OverQuotaMapError') ||
    msg.includes('QuotaExceededError')
  );
}

interface InnerMapWorkspaceProps {
  selectedPos: LatLngPoint | null;
  selectedLabel: string | null;
  originalShippingFee: number;
  onSelectLocation: (loc: SelectedDeliveryLocation) => void;
}

const InnerMapWorkspace: React.FC<InnerMapWorkspaceProps> = ({
  selectedPos,
  selectedLabel,
  originalShippingFee,
  onSelectLocation
}) => {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const apiStatus = useApiLoadingStatus();

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestionItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const sessionTokenRef = useRef<unknown>(null);

  useEffect(() => {
    if (!placesLib) return;

    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(() => {
      const lib = placesLib as unknown as {
        AutocompleteSessionToken: new () => unknown;
        AutocompleteSuggestion: {
          fetchAutocompleteSuggestions: (req: Record<string, unknown>) => Promise<{
            suggestions: AutocompleteSuggestionItem[];
          }>;
        };
      };

      // Reuse the same session token across keystrokes until a place is selected.
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new lib.AutocompleteSessionToken();
      }

      setIsSearching(true);
      setSearchError(null);

      const request: Record<string, unknown> = {
        input: trimmed,
        sessionToken: sessionTokenRef.current,
        includedRegionCodes: ['id'],
        language: 'id',
        locationBias: {
          center: BUSINESS_INFO.defaultMapCenter,
          radius: 35000
        }
      };

      lib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
        .then((res: { suggestions: AutocompleteSuggestionItem[] }) => {
          setSuggestions(res.suggestions || []);
          setActiveIndex(-1);
          setIsSearching(false);
        })
        .catch((err: unknown) => {
          setIsSearching(false);
          if (isQuotaError(err)) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
          setSearchError(
            'Pencarian alamat otomatis gagal dimuat. Anda tetap dapat mengklik peta Bali atau menempelkan tautan secara manual.'
          );
        });
    }, 220);

    return () => clearTimeout(timer);
  }, [placesLib, searchQuery]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: AutocompleteSuggestionItem) => {
      if (!placesLib || !suggestion.placePrediction) return;

      try {
        setIsSearching(true);
        const place = suggestion.placePrediction.toPlace();

        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'viewport', 'googleMapsURI']
        });

        // Reset the session token after consuming the session with fetchFields.
        sessionTokenRef.current = null;
        setSuggestions([]);
        setIsSearching(false);

        if (place.location) {
          const lat = place.location.lat();
          const lng = place.location.lng();
          const pos = { lat, lng };

          if (map) {
            if (place.viewport) {
              (map as unknown as { fitBounds: (vp: unknown) => void }).fitBounds(place.viewport);
            } else {
              map.setCenter(pos);
              map.setZoom(15);
            }
          }

          const mapsUrl =
            place.googleMapsURI ||
            `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

          const promo = calculateShippingPromo(pos, mapsUrl);

          setSearchQuery(place.displayName || place.formattedAddress || '');
          onSelectLocation({
            lat,
            lng,
            displayName: place.displayName || undefined,
            formattedAddress: place.formattedAddress || undefined,
            googleMapsUrl: mapsUrl,
            distanceKm: promo.distanceKm,
            originalShippingFee: promo.originalShippingFee
          });
        }
      } catch (err: unknown) {
        setIsSearching(false);
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        setSearchError('Gagal memuat detail lokasi terpilih. Silakan klik titik langsung pada peta.');
      }
    },
    [placesLib, map, onSelectLocation]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      void handleSelectSuggestion(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  };

  const handleMapClick = useCallback(
    (ev: MapMouseEvent) => {
      const latLng = ev.detail.latLng;
      if (!latLng) return;

      const lat = latLng.lat;
      const lng = latLng.lng;
      const mapsUrl = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
      const promo = calculateShippingPromo({ lat, lng }, mapsUrl);

      onSelectLocation({
        lat,
        lng,
        displayName: `Titik Koordinat Bali (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
        googleMapsUrl: mapsUrl,
        distanceKm: promo.distanceKm,
        originalShippingFee: promo.originalShippingFee
      });
    },
    [onSelectLocation]
  );

  if (apiStatus === APILoadingStatus.FAILED || apiStatus === APILoadingStatus.AUTH_FAILURE) {
    return (
      <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#21191A]/25 text-xs text-[#21191A] space-y-3">
        <div className="flex items-start gap-2 text-[#710014] font-bold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Pilih Area Lokasi Pengantaran Bali:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Tanah Lot (Tabanan)', lat: -8.6212, lng: 115.0868 },
            { label: 'Denpasar Utara', lat: -8.6356, lng: 115.2126 },
            { label: 'Canggu', lat: -8.6478, lng: 115.1385 },
            { label: 'Tabanan Kota', lat: -8.5405, lng: 115.1253 },
            { label: 'Denpasar Kota', lat: -8.6705, lng: 115.2126 }
          ].map(area => {
            const mapsUrl = `https://www.google.com/maps?q=${area.lat.toFixed(6)},${area.lng.toFixed(6)}`;
            const promo = calculateShippingPromo({ lat: area.lat, lng: area.lng }, mapsUrl);
            const isSelected =
              selectedPos &&
              Math.abs(selectedPos.lat - area.lat) < 0.001 &&
              Math.abs(selectedPos.lng - area.lng) < 0.001;
            return (
              <button
                key={area.label}
                type="button"
                onClick={() =>
                  onSelectLocation({
                    lat: area.lat,
                    lng: area.lng,
                    displayName: area.label,
                    googleMapsUrl: mapsUrl,
                    distanceKm: promo.distanceKm,
                    originalShippingFee: promo.originalShippingFee
                  })
                }
                className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold text-xs border transition-colors ${
                  isSelected
                    ? 'bg-[#710014] text-white border-[#710014]'
                    : 'bg-white text-[#21191A] border-[#21191A]/25 hover:border-[#710014]'
                }`}
              >
                {area.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs font-semibold text-[#710014] pt-1">
          Pengantaran prioritas sekitar area Tanah Lot, Denpasar Utara dan Canggu (tidak menerima pengiriman diluar jangkauan tersebut).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
          <label
            htmlFor="gmp-place-search"
            className="block text-xs font-bold uppercase tracking-wider text-[#21191A]"
          >
            Cari Lokasi Pengantaran di Bali (Tabanan &amp; Denpasar) <span className="text-[#710014]">*</span>
          </label>
        </div>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#524346] absolute left-3.5 pointer-events-none" />
          <input
            id="gmp-place-search"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik nama jalan, banjar, atau area di Tabanan & Denpasar, Bali..."
            autoComplete="off"
            role="combobox"
            aria-expanded={suggestions.length > 0}
            aria-autocomplete="list"
            aria-controls="gmp-suggestions-list"
            className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-xl border border-[#21191A]/35 bg-white text-sm text-[#21191A] placeholder:text-[#524346]/75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#710014]"
          />
        </div>

        {isSearching && (
          <div className="mt-1.5 text-xs font-medium text-[#524346]" role="status">
            Mencari saran alamat di Bali dari Google Maps...
          </div>
        )}

        {searchError && (
          <div className="mt-1.5 text-xs font-medium text-[#710014]" role="alert">
            {searchError}
          </div>
        )}

        {suggestions.length > 0 && (
          <ul
            id="gmp-suggestions-list"
            role="listbox"
            className="absolute z-30 left-0 right-0 mt-1 bg-white border border-[#21191A]/30 rounded-xl shadow-lg max-h-60 overflow-y-auto divide-y divide-[#21191A]/10"
          >
            {suggestions.map((suggestion, index) => {
              const prediction = suggestion.placePrediction;
              if (!prediction) return null;
              const isSelected = index === activeIndex;

              return (
                <li key={prediction.placeId || index} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => void handleSelectSuggestion(suggestion)}
                    className={`w-full min-h-[44px] px-3.5 py-2.5 text-left text-xs sm:text-sm flex items-start gap-2.5 transition-colors ${
                      isSelected
                        ? 'bg-[#F2F1ED] text-[#710014] font-bold'
                        : 'text-[#21191A] hover:bg-[#F2F1ED]'
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-[#710014] shrink-0 mt-0.5" />
                    <span className="leading-snug">{prediction.text.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-xl overflow-hidden border border-[#21191A]/25 bg-[#E5E3DC]">
        <div className="h-60 sm:h-68 w-full relative">
          {apiStatus === APILoadingStatus.LOADING ? (
            <div className="w-full h-full flex items-center justify-center p-4 text-xs font-semibold text-[#21191A]">
              Memuat peta interaktif Bali (Tabanan &amp; Denpasar)...
            </div>
          ) : (
            <Map
              mapId="DEMO_MAP_ID"
              defaultCenter={BUSINESS_INFO.defaultMapCenter}
              defaultZoom={13}
              gestureHandling="cooperative"
              onClick={handleMapClick}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Default CHICKCHAU Store Point Marker */}
              <AdvancedMarker position={BUSINESS_INFO.defaultMapCenter}>
                <Pin
                  background="#21191A"
                  borderColor="#F2F1ED"
                  glyphColor="#F2F1ED"
                />
              </AdvancedMarker>

              {/* Customer Selected Delivery Marker */}
              {selectedPos && (
                <AdvancedMarker position={selectedPos} title="Lokasi Pengantaran Anda">
                  <Pin
                    background="#710014"
                    borderColor="#21191A"
                    glyphColor="#FFFFFF"
                  />
                </AdvancedMarker>
              )}
            </Map>
          )}
        </div>

        <div className="px-3.5 py-2.5 bg-[#FAF9F6] border-t border-[#21191A]/15 space-y-2 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            {selectedPos ? (
              <div className="flex items-center gap-1.5 text-[#21191A] font-semibold truncate">
                <CheckCircle2 className="w-4 h-4 text-[#710014] shrink-0" />
                <span className="truncate">
                  Titik lokasi terpilih: {selectedLabel || `${selectedPos.lat.toFixed(5)}, ${selectedPos.lng.toFixed(5)}`}
                </span>
              </div>
            ) : (
              <span className="text-[#524346] font-medium">
                Klik langsung pada peta Bali untuk memilih titik lokasi pengantaran Anda.
              </span>
            )}
          </div>

          {selectedPos && (
            <div className="pt-2 border-t border-[#21191A]/10 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[#21191A]">
                <MapPin className="w-3.5 h-3.5 text-[#710014] shrink-0" />
                <span className="font-semibold">Total Pengiriman</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="line-through text-[#524346] font-semibold tabular-nums">
                  {formatRupiah(originalShippingFee)}
                </span>
                <span className="font-black text-[#14532D] tabular-nums">
                  Rp0
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#710014]">
                  · Discount 100% Special Offer
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs font-semibold text-[#710014] flex items-start gap-1.5 px-1">
        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          Pengantaran prioritas sekitar area Tanah Lot, Denpasar Utara dan Canggu (tidak menerima pengiriman diluar jangkauan tersebut).
        </span>
      </p>
    </div>
  );
};

export const DeliveryMapPicker: React.FC<DeliveryMapPickerProps> = ({
  onLocationSelect
}) => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || '';
  const [selectedPos, setSelectedPos] = useState<LatLngPoint | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [originalShippingFee, setOriginalShippingFee] = useState<number>(SHIPPING_RATE_PER_KM);

  const handleSelectLocation = useCallback(
    (loc: SelectedDeliveryLocation) => {
      setSelectedPos({ lat: loc.lat, lng: loc.lng });
      setSelectedLabel(loc.displayName || loc.formattedAddress || null);
      setOriginalShippingFee(loc.originalShippingFee);
      onLocationSelect(loc);
    },
    [onLocationSelect]
  );

  if (!apiKey) {
    return (
      <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#21191A]/25 text-xs text-[#21191A] space-y-3">
        <p className="font-bold text-[#21191A]">
          Pilih Lokasi Pengantaran (Area Tabanan &amp; Denpasar, Bali) <span className="text-[#710014]">*</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Tanah Lot (Tabanan)', lat: -8.6212, lng: 115.0868 },
            { label: 'Denpasar Utara', lat: -8.6356, lng: 115.2126 },
            { label: 'Canggu', lat: -8.6478, lng: 115.1385 },
            { label: 'Tabanan Kota', lat: -8.5405, lng: 115.1253 },
            { label: 'Denpasar Kota', lat: -8.6705, lng: 115.2126 }
          ].map(area => {
            const mapsUrl = `https://www.google.com/maps?q=${area.lat.toFixed(6)},${area.lng.toFixed(6)}`;
            const promo = calculateShippingPromo({ lat: area.lat, lng: area.lng }, mapsUrl);
            const isSelected =
              selectedPos &&
              Math.abs(selectedPos.lat - area.lat) < 0.001 &&
              Math.abs(selectedPos.lng - area.lng) < 0.001;
            return (
              <button
                key={area.label}
                type="button"
                onClick={() =>
                  handleSelectLocation({
                    lat: area.lat,
                    lng: area.lng,
                    displayName: area.label,
                    googleMapsUrl: mapsUrl,
                    distanceKm: promo.distanceKm,
                    originalShippingFee: promo.originalShippingFee
                  })
                }
                className={`min-h-[44px] px-3.5 py-2 rounded-xl font-bold text-xs border transition-colors ${
                  isSelected
                    ? 'bg-[#710014] text-white border-[#710014]'
                    : 'bg-white text-[#21191A] border-[#21191A]/25 hover:border-[#710014]'
                }`}
              >
                {area.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs font-semibold text-[#710014] pt-1">
          Pengantaran prioritas sekitar area Tanah Lot, Denpasar Utara dan Canggu (tidak menerima pengiriman diluar jangkauan tersebut).
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey} language="id" region="ID">
      <InnerMapWorkspace
        selectedPos={selectedPos}
        selectedLabel={selectedLabel}
        originalShippingFee={originalShippingFee}
        onSelectLocation={handleSelectLocation}
      />
    </APIProvider>
  );
};
