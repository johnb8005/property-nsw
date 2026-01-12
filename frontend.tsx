import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Types
interface Sale {
  id: string;
  address: string;
  suburb: string;
  postcode: string;
  land_area: number;
  settlement_date: string;
  price: number;
  zone_code: string;
  price_per_sqm: number | null;
  coords?: { lat: number; lng: number };
}

interface SuburbStats {
  suburb: string;
  postcode: string;
  sales_count: number;
  total_value: number;
  median_price: number;
  avg_price: number;
  min_price: number;
  max_price: number;
  avg_price_per_sqm: number | null;
  growth_1yr: number;
  momentum_score: number | null;
  coords?: { lat: number; lng: number };
}

interface SuburbDetail {
  stats: SuburbStats;
  recentSales: Sale[];
  priceTrend: { month: string; sales_count: number; avg_price: number }[];
  coords: { lat: number; lng: number };
}

interface Outlier extends Sale {
  expected_price_per_sqm: number;
  z_score: number;
  outlier_type: 'underpriced' | 'overpriced';
  deviation_pct: number;
}

interface OutliersResponse {
  outliers: Outlier[];
  totalOutliers: number;
  underpricedCount: number;
  overpricedCount: number;
}

// Mobile detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// Helpers
function formatPrice(price: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatPriceShort(price: number) {
  if (price >= 1000000) return `$${(price / 1000000).toFixed(1)}M`;
  if (price >= 1000) return `$${(price / 1000).toFixed(0)}K`;
  return formatPrice(price);
}

function formatDate(dateStr: string) {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(6, 8)}/${dateStr.slice(4, 6)}/${dateStr.slice(0, 4)}`;
}

function getPriceColor(price: number, min: number, max: number) {
  const range = max - min;
  const normalized = range > 0 ? (price - min) / range : 0.5;
  if (normalized < 0.25) return "#22c55e";
  if (normalized < 0.5) return "#eab308";
  if (normalized < 0.75) return "#f97316";
  return "#ef4444";
}

function getGrowthColor(growth: number) {
  if (growth > 10) return "#22c55e";
  if (growth > 5) return "#84cc16";
  if (growth > 0) return "#eab308";
  if (growth > -5) return "#f97316";
  return "#ef4444";
}

function getMomentumColor(score: number | null) {
  if (score === null) return "#64748b";
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#84cc16";
  if (score >= 40) return "#eab308";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}

function exportToCSV(suburbs: SuburbStats[], filename: string) {
  const headers = ['Suburb', 'Postcode', 'Median Price', 'Growth 1yr %', 'Sales Count', '$/m²', 'Momentum', 'Total Value'];
  const rows = suburbs.map(s => [
    s.suburb,
    s.postcode,
    s.median_price,
    s.growth_1yr.toFixed(1),
    s.sales_count,
    s.avg_price_per_sqm || '',
    s.momentum_score || '',
    s.total_value,
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Navigation
function Nav({ page, setPage, isMobile }: { page: string; setPage: (p: string) => void; isMobile: boolean }) {
  const pages = [
    { id: "map", label: "Map", icon: "🗺" },
    { id: "rankings", label: "Rankings", icon: "📊" },
    { id: "outliers", label: "Outliers", icon: "🎯" },
  ];
  return (
    <nav style={{
      display: "flex",
      gap: "4px",
      background: "#1e293b",
      padding: "4px",
      borderRadius: "8px",
    }}>
      {pages.map((p) => (
        <button
          key={p.id}
          onClick={() => setPage(p.id)}
          style={{
            padding: isMobile ? "8px 10px" : "8px 16px",
            background: page === p.id ? "#3b82f6" : "transparent",
            border: "none",
            borderRadius: "6px",
            color: page === p.id ? "#fff" : "#94a3b8",
            cursor: "pointer",
            fontSize: isMobile ? "12px" : "13px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          {isMobile ? p.icon : p.label}
        </button>
      ))}
    </nav>
  );
}

// Map Page
function MapPage({ onSuburbClick, isMobile }: { onSuburbClick: (suburb: string, postcode: string) => void; isMobile: boolean }) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [suburbs, setSuburbs] = useState<SuburbStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxPrice, setMaxPrice] = useState(10000000);
  const [searchText, setSearchText] = useState("");
  const [mapMode, setMapMode] = useState<"sales" | "suburbs">("suburbs");
  const [colorBy, setColorBy] = useState<"price" | "growth" | "momentum">("price");
  const [showControls, setShowControls] = useState(!isMobile);

  useEffect(() => {
    Promise.all([
      fetch("/api/sales").then((r) => r.json()),
      fetch("/api/suburbs?limit=2500").then((r) => r.json()),
    ]).then(([salesData, suburbsData]) => {
      setSales(salesData);
      setSuburbs(suburbsData);
      setLoading(false);
    });
  }, []);

  const filteredSales = useMemo(() => {
    const search = searchText.toLowerCase();
    return sales.filter((s) => {
      const inPrice = s.price <= maxPrice;
      const matchSearch = !search ||
        s.address.toLowerCase().includes(search) ||
        s.suburb.toLowerCase().includes(search) ||
        s.postcode.includes(search);
      return inPrice && matchSearch;
    });
  }, [sales, maxPrice, searchText]);

  const mapCenter = useMemo((): [number, number] => {
    if (mapMode === "suburbs") {
      const valid = suburbs.filter((s) => s.coords);
      if (valid.length === 0) return [-33.8688, 151.2093];
      let lat = 0, lng = 0;
      for (const s of valid) {
        lat += s.coords!.lat;
        lng += s.coords!.lng;
      }
      return [lat / valid.length, lng / valid.length];
    }
    const valid = filteredSales.filter((s) => s.coords);
    if (valid.length === 0) return [-33.8688, 151.2093];
    let lat = 0, lng = 0;
    for (const s of valid) {
      lat += s.coords!.lat;
      lng += s.coords!.lng;
    }
    return [lat / valid.length, lng / valid.length];
  }, [filteredSales, suburbs, mapMode]);

  const getSuburbColor = (suburb: SuburbStats) => {
    if (colorBy === "price") {
      if (!suburb.avg_price_per_sqm) return "#64748b";
      return getPriceColor(suburb.avg_price_per_sqm, suburbSqmRange.min, suburbSqmRange.max);
    } else if (colorBy === "growth") {
      if (suburb.sales_count < 10) return "#64748b";
      return getGrowthColor(suburb.growth_1yr);
    } else {
      return getMomentumColor(suburb.momentum_score);
    }
  };

  const getSuburbValue = (suburb: SuburbStats) => {
    if (colorBy === "price") {
      return suburb.avg_price_per_sqm ? `$${suburb.avg_price_per_sqm.toLocaleString()}/m²` : "-";
    } else if (colorBy === "growth") {
      return `${suburb.growth_1yr > 0 ? "+" : ""}${suburb.growth_1yr.toFixed(1)}%`;
    } else {
      return suburb.momentum_score !== null ? `${suburb.momentum_score}` : "-";
    }
  };

  const suburbSqmRange = useMemo(() => {
    let min = Infinity, max = -Infinity;
    for (const s of suburbs) {
      if (s.avg_price_per_sqm && s.avg_price_per_sqm < min) min = s.avg_price_per_sqm;
      if (s.avg_price_per_sqm && s.avg_price_per_sqm > max) max = s.avg_price_per_sqm;
    }
    return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 10000 : max };
  }, [suburbs]);

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading sales data...</div>;
  }

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, flexDirection: isMobile ? "column" : "row" }}>
      {/* Mobile toggle button */}
      {isMobile && (
        <button
          onClick={() => setShowControls(!showControls)}
          style={{
            position: "absolute",
            top: "70px",
            left: "10px",
            zIndex: 1000,
            padding: "8px 12px",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "6px",
            color: "#e2e8f0",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {showControls ? "Hide" : "Filters"} ⚙
        </button>
      )}

      {/* Controls */}
      {showControls && (
        <aside style={{
          width: isMobile ? "100%" : "280px",
          background: "#111827",
          borderRight: isMobile ? "none" : "1px solid #1e293b",
          borderBottom: isMobile ? "1px solid #1e293b" : "none",
          padding: isMobile ? "12px" : "16px",
          display: "flex",
          flexDirection: isMobile ? "row" : "column",
          flexWrap: isMobile ? "wrap" : "nowrap",
          gap: isMobile ? "12px" : "20px",
          overflowY: isMobile ? "visible" : "auto",
          maxHeight: isMobile ? "auto" : "none",
        }}>
          <div style={{ minWidth: isMobile ? "120px" : "auto" }}>
            <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>View</div>
            <div style={{ display: "flex", gap: "4px", background: "#0f172a", padding: "4px", borderRadius: "6px" }}>
              {(["suburbs", "sales"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setMapMode(mode)}
                  style={{
                    flex: 1,
                    padding: "6px",
                    background: mapMode === mode ? "#3b82f6" : "transparent",
                    border: "none",
                    borderRadius: "4px",
                    color: mapMode === mode ? "#fff" : "#64748b",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "500",
                    textTransform: "capitalize",
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {mapMode === "suburbs" && (
            <div style={{ minWidth: isMobile ? "140px" : "auto", flex: isMobile ? 1 : "none" }}>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>Color by</div>
              <select
                value={colorBy}
                onChange={(e) => setColorBy(e.target.value as any)}
                style={{
                  width: "100%",
                  padding: isMobile ? "8px" : "10px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  color: "#e2e8f0",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                <option value="price">$/m²</option>
                <option value="growth">YoY Growth</option>
                <option value="momentum">Momentum</option>
              </select>
            </div>
          )}

          {mapMode === "sales" && (
            <>
              <div style={{ minWidth: isMobile ? "150px" : "auto", flex: isMobile ? 1 : "none" }}>
                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>Search</div>
                <input
                  type="text"
                  placeholder="Address, suburb..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: isMobile ? "8px" : "10px",
                    background: "#1e293b",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    color: "#e2e8f0",
                    fontSize: "12px",
                  }}
                />
              </div>

              {!isMobile && (
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
                    Max Price: {formatPrice(maxPrice)}
                  </div>
                  <input
                    type="range"
                    min={100000}
                    max={10000000}
                    step={100000}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                    style={{ width: "100%", accentColor: "#3b82f6" }}
                  />
                </div>
              )}
            </>
          )}

          <div style={{
            background: "#1e293b",
            padding: isMobile ? "8px 12px" : "12px",
            borderRadius: "8px",
            display: "flex",
            alignItems: isMobile ? "center" : "flex-start",
            flexDirection: isMobile ? "row" : "column",
            gap: isMobile ? "8px" : "0",
          }}>
            <div style={{ fontSize: isMobile ? "16px" : "24px", fontWeight: "700", color: "#f8fafc" }}>
              {mapMode === "suburbs" ? suburbs.length.toLocaleString() : filteredSales.length.toLocaleString()}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b" }}>
              {mapMode === "suburbs" ? "suburbs" : "sales"}
            </div>
          </div>

          {!isMobile && mapMode === "suburbs" && (
            <div>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
                Legend
              </div>
              {colorBy === "price" && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px" }}>
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ color: "#64748b", flex: 1 }}>Cheap</span>
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#eab308" }} />
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f97316" }} />
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444" }} />
                  <span style={{ color: "#64748b" }}>Expensive</span>
                </div>
              )}
              {colorBy === "growth" && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px" }}>
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444" }} />
                  <span style={{ color: "#64748b", flex: 1 }}>&lt;-5%</span>
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f97316" }} />
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#eab308" }} />
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#84cc16" }} />
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ color: "#64748b" }}>&gt;10%</span>
                </div>
              )}
              {colorBy === "momentum" && (
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px" }}>
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444" }} />
                  <span style={{ color: "#64748b", flex: 1 }}>0</span>
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#f97316" }} />
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#eab308" }} />
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#84cc16" }} />
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#22c55e" }} />
                  <span style={{ color: "#64748b" }}>100</span>
                </div>
              )}
            </div>
          )}
        </aside>
      )}

      <div style={{ flex: 1, position: "relative" }}>
        <MapContainer
          center={mapCenter}
          zoom={10}
          style={{ height: "100%", width: "100%", background: "#0a0f1a" }}
        >
          <TileLayer
            attribution='&copy; CARTO'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <MapController center={mapCenter} zoom={10} />
          {mapMode === "suburbs" && suburbs.map((suburb) => {
            if (!suburb.coords) return null;
            const color = getSuburbColor(suburb);
            const value = getSuburbValue(suburb);

            return (
              <CircleMarker
                key={`${suburb.suburb}-${suburb.postcode}`}
                center={[suburb.coords.lat, suburb.coords.lng]}
                radius={Math.min(14, Math.max(8, Math.sqrt(suburb.sales_count) * 1.5))}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.85,
                  color: "#000",
                  weight: 1,
                }}
              >
                <Popup>
                  <div style={{ fontFamily: "monospace", fontSize: "12px", minWidth: "200px" }}>
                    <div style={{ fontWeight: "700", marginBottom: "4px" }}>{suburb.suburb}</div>
                    <div style={{ color: "#666", marginBottom: "8px" }}>{suburb.postcode}</div>
                    <div style={{ fontSize: "18px", fontWeight: "700", color }}>{value}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "11px", marginTop: "8px" }}>
                      <div>Sales: {suburb.sales_count}</div>
                      <div>Median: {formatPriceShort(suburb.median_price)}</div>
                      <div>$/m²: {suburb.avg_price_per_sqm ? `$${suburb.avg_price_per_sqm.toLocaleString()}` : "-"}</div>
                      <div style={{ color: getGrowthColor(suburb.growth_1yr) }}>
                        Growth: {suburb.growth_1yr > 0 ? "+" : ""}{suburb.growth_1yr.toFixed(1)}%
                      </div>
                    </div>
                    <button
                      onClick={() => onSuburbClick(suburb.suburb, suburb.postcode)}
                      style={{
                        marginTop: "10px",
                        width: "100%",
                        padding: "8px",
                        background: "#3b82f6",
                        border: "none",
                        borderRadius: "4px",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "500",
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
          {mapMode === "sales" && filteredSales.slice(0, 5000).map((sale) =>
            sale.coords ? (
              <CircleMarker
                key={sale.id}
                center={[sale.coords.lat, sale.coords.lng]}
                radius={7}
                pathOptions={{
                  fillColor: sale.price_per_sqm
                    ? getPriceColor(sale.price_per_sqm, suburbSqmRange.min, suburbSqmRange.max)
                    : "#64748b",
                  fillOpacity: 0.8,
                  color: "#1e293b",
                  weight: 1,
                }}
              >
                <Popup>
                  <div style={{ fontFamily: "monospace", fontSize: "12px", minWidth: "200px" }}>
                    <div style={{ fontWeight: "700", marginBottom: "4px" }}>{sale.address}</div>
                    <div style={{ color: "#666", marginBottom: "8px" }}>{sale.suburb} {sale.postcode}</div>
                    <div style={{ fontSize: "18px", fontWeight: "700", color: "#3b82f6" }}>{formatPrice(sale.price)}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "11px", marginTop: "8px" }}>
                      <div>Land: {sale.land_area}m²</div>
                      <div>$/m²: {sale.price_per_sqm ? `$${sale.price_per_sqm}` : "-"}</div>
                      <div>Zone: {sale.zone_code}</div>
                      <div>Date: {formatDate(sale.settlement_date)}</div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            ) : null
          )}
        </MapContainer>
        {mapMode === "sales" && filteredSales.length > 5000 && (
          <div style={{
            position: "absolute", bottom: "16px", left: "16px",
            background: "rgba(0,0,0,0.8)", padding: "8px 12px", borderRadius: "4px",
            fontSize: "12px", color: "#f97316",
          }}>
            Showing 5,000 of {filteredSales.length.toLocaleString()} on map
          </div>
        )}
      </div>
    </div>
  );
}

// Rankings Page - Mobile Card Component
function SuburbCard({ suburb, rank, onClick, sqmRange }: { suburb: SuburbStats; rank: number; onClick: () => void; sqmRange: { min: number; max: number } }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#111827",
        borderRadius: "8px",
        padding: "12px",
        cursor: "pointer",
        border: "1px solid #1e293b",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div>
          <div style={{ fontWeight: "600", color: "#f8fafc", fontSize: "14px" }}>{suburb.suburb}</div>
          <div style={{ fontSize: "11px", color: "#64748b" }}>{suburb.postcode}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "11px", color: "#64748b" }}>#{rank}</span>
          {suburb.momentum_score !== null && (
            <span style={{
              padding: "2px 6px",
              borderRadius: "4px",
              background: getMomentumColor(suburb.momentum_score) + "20",
              color: getMomentumColor(suburb.momentum_score),
              fontWeight: "700",
              fontSize: "11px",
            }}>
              {suburb.momentum_score}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
        <div>
          <div style={{ color: "#64748b", fontSize: "10px" }}>Median</div>
          <div style={{ fontWeight: "600", color: "#94a3b8" }}>{formatPriceShort(suburb.median_price)}</div>
        </div>
        <div>
          <div style={{ color: "#64748b", fontSize: "10px" }}>Growth</div>
          <div style={{ fontWeight: "600", color: getGrowthColor(suburb.growth_1yr) }}>
            {suburb.growth_1yr > 0 ? "+" : ""}{suburb.growth_1yr.toFixed(1)}%
          </div>
        </div>
        <div>
          <div style={{ color: "#64748b", fontSize: "10px" }}>Sales</div>
          <div style={{ color: "#94a3b8" }}>{suburb.sales_count}</div>
        </div>
        <div>
          <div style={{ color: "#64748b", fontSize: "10px" }}>$/m²</div>
          <div style={{ fontWeight: "600", color: suburb.avg_price_per_sqm ? getPriceColor(suburb.avg_price_per_sqm, sqmRange.min, sqmRange.max) : "#64748b" }}>
            {suburb.avg_price_per_sqm ? `$${suburb.avg_price_per_sqm.toLocaleString()}` : "-"}
          </div>
        </div>
      </div>
    </div>
  );
}

// Rankings Page
function RankingsPage({
  onSuburbClick,
  onCompare,
  selectedForCompare,
  onToggleCompare,
  isMobile,
}: {
  onSuburbClick: (suburb: string, postcode: string) => void;
  onCompare: () => void;
  selectedForCompare: Set<string>;
  onToggleCompare: (key: string) => void;
  isMobile: boolean;
}) {
  const [suburbs, setSuburbs] = useState<SuburbStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("momentum_score");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [searchText, setSearchText] = useState("");
  const [minSales, setMinSales] = useState(10);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/suburbs?sortBy=${sortBy}&order=${sortOrder}&limit=2000`)
      .then((r) => r.json())
      .then((data) => {
        setSuburbs(data);
        setLoading(false);
      });
  }, [sortBy, sortOrder]);

  const filteredSuburbs = useMemo(() => {
    const search = searchText.toLowerCase();
    return suburbs.filter((s) => {
      const matchSearch = !search || s.suburb.toLowerCase().includes(search) || s.postcode.includes(search);
      const hasMinSales = s.sales_count >= minSales;
      return matchSearch && hasMinSales;
    });
  }, [suburbs, searchText, minSales]);

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === "DESC" ? "ASC" : "DESC");
    } else {
      setSortBy(col);
      setSortOrder("DESC");
    }
  };

  const sqmRange = useMemo(() => {
    if (filteredSuburbs.length === 0) return { min: 0, max: 10000 };
    let min = Infinity, max = -Infinity;
    for (const s of filteredSuburbs) {
      if (s.avg_price_per_sqm && s.avg_price_per_sqm < min) min = s.avg_price_per_sqm;
      if (s.avg_price_per_sqm && s.avg_price_per_sqm > max) max = s.avg_price_per_sqm;
    }
    return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 10000 : max };
  }, [filteredSuburbs]);

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading suburb rankings...</div>;
  }

  const SortHeader = ({ col, label, align = "right" }: { col: string; label: string; align?: string }) => (
    <th
      onClick={() => handleSort(col)}
      style={{
        padding: "12px 16px",
        textAlign: align as any,
        color: sortBy === col ? "#3b82f6" : "#64748b",
        fontWeight: "600",
        fontSize: "11px",
        textTransform: "uppercase",
        cursor: "pointer",
        borderBottom: "1px solid #1e293b",
        background: "#111827",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      {label} {sortBy === col && (sortOrder === "DESC" ? "↓" : "↑")}
    </th>
  );

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, flexDirection: "column" }}>
      {/* Filters */}
      <div style={{
        display: "flex",
        gap: isMobile ? "8px" : "16px",
        padding: isMobile ? "12px" : "16px 24px",
        background: "#111827",
        borderBottom: "1px solid #1e293b",
        alignItems: "center",
        flexWrap: "wrap",
      }}>
        <input
          type="text"
          placeholder={isMobile ? "Search..." : "Search suburb or postcode..."}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            padding: "10px 14px",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "6px",
            color: "#e2e8f0",
            fontSize: "13px",
            width: isMobile ? "100%" : "250px",
            flex: isMobile ? "1 1 100%" : "none",
          }}
        />

        {isMobile && (
          <div style={{ display: "flex", gap: "8px", width: "100%", flexWrap: "wrap" }}>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setSortOrder("DESC"); }}
              style={{
                padding: "8px",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "6px",
                color: "#e2e8f0",
                fontSize: "12px",
                flex: 1,
              }}
            >
              <option value="momentum_score">Momentum</option>
              <option value="median_price">Median</option>
              <option value="growth_1yr">Growth</option>
              <option value="sales_count">Sales</option>
              <option value="avg_price_per_sqm">$/m²</option>
            </select>
            <select
              value={minSales}
              onChange={(e) => setMinSales(parseInt(e.target.value))}
              style={{
                padding: "8px",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "6px",
                color: "#e2e8f0",
                fontSize: "12px",
              }}
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>Min {n}</option>
              ))}
            </select>
          </div>
        )}

        {!isMobile && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "#64748b" }}>Min sales:</span>
              <select
                value={minSales}
                onChange={(e) => setMinSales(parseInt(e.target.value))}
                style={{
                  padding: "8px 12px",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  color: "#e2e8f0",
                  fontSize: "13px",
                }}
              >
                {[5, 10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }} />

            {selectedForCompare.size > 0 && (
              <button
                onClick={onCompare}
                style={{
                  padding: "8px 16px",
                  background: "#8b5cf6",
                  border: "none",
                  borderRadius: "6px",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                Compare ({selectedForCompare.size})
              </button>
            )}

            <button
              onClick={() => exportToCSV(filteredSuburbs, 'suburb-rankings.csv')}
              style={{
                padding: "8px 16px",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "6px",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "500",
              }}
            >
              Export CSV
            </button>
          </>
        )}

        <div style={{ fontSize: "13px", color: "#64748b", marginLeft: isMobile ? "auto" : 0 }}>
          {filteredSuburbs.length} suburbs
        </div>
      </div>

      {/* Mobile: Card view */}
      {isMobile ? (
        <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {filteredSuburbs.map((suburb, idx) => (
            <SuburbCard
              key={`${suburb.suburb}-${suburb.postcode}`}
              suburb={suburb}
              rank={idx + 1}
              onClick={() => onSuburbClick(suburb.suburb, suburb.postcode)}
              sqmRange={sqmRange}
            />
          ))}
        </div>
      ) : (
        /* Desktop: Table view */
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                <th style={{ width: "40px", padding: "12px", background: "#111827", borderBottom: "1px solid #1e293b", position: "sticky", top: 0, zIndex: 10, color: "#64748b" }}></th>
                <th style={{ width: "40px", padding: "12px", background: "#111827", borderBottom: "1px solid #1e293b", position: "sticky", top: 0, zIndex: 10, color: "#64748b" }}>#</th>
                <SortHeader col="suburb" label="Suburb" align="left" />
                <SortHeader col="momentum_score" label="Momentum" />
                <SortHeader col="median_price" label="Median" />
                <SortHeader col="growth_1yr" label="Growth" />
                <SortHeader col="sales_count" label="Sales" />
                <SortHeader col="avg_price_per_sqm" label="$/m²" />
              </tr>
            </thead>
            <tbody>
              {filteredSuburbs.map((suburb, idx) => {
                const key = `${suburb.suburb}-${suburb.postcode}`;
                const isSelected = selectedForCompare.has(key);
                return (
                  <tr
                    key={key}
                    style={{
                      cursor: "pointer",
                      background: isSelected ? "#1e3a5f" : (idx % 2 === 0 ? "#0f172a" : "#111827"),
                    }}
                    onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = "#1e3a5f"; }}
                    onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = idx % 2 === 0 ? "#0f172a" : "#111827"; }}
                  >
                    <td style={{ padding: "12px", textAlign: "center", borderBottom: "1px solid #1e293b" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          onToggleCompare(key);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ accentColor: "#8b5cf6", cursor: "pointer" }}
                      />
                    </td>
                    <td
                      style={{ padding: "12px", textAlign: "center", color: "#64748b", borderBottom: "1px solid #1e293b" }}
                      onClick={() => onSuburbClick(suburb.suburb, suburb.postcode)}
                    >
                      {idx + 1}
                    </td>
                    <td
                      style={{ padding: "12px 16px", borderBottom: "1px solid #1e293b" }}
                      onClick={() => onSuburbClick(suburb.suburb, suburb.postcode)}
                    >
                      <div style={{ fontWeight: "600", color: "#f8fafc" }}>{suburb.suburb}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{suburb.postcode}</div>
                    </td>
                    <td
                      style={{ padding: "12px 16px", textAlign: "right", borderBottom: "1px solid #1e293b" }}
                      onClick={() => onSuburbClick(suburb.suburb, suburb.postcode)}
                    >
                      {suburb.momentum_score !== null ? (
                        <span style={{
                          display: "inline-block",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          background: getMomentumColor(suburb.momentum_score) + "20",
                          color: getMomentumColor(suburb.momentum_score),
                          fontWeight: "700",
                          fontSize: "12px",
                        }}>
                          {suburb.momentum_score}
                        </span>
                      ) : "-"}
                    </td>
                    <td
                      style={{ padding: "12px 16px", textAlign: "right", fontWeight: "600", color: "#94a3b8", borderBottom: "1px solid #1e293b" }}
                      onClick={() => onSuburbClick(suburb.suburb, suburb.postcode)}
                    >
                      {formatPrice(suburb.median_price)}
                    </td>
                    <td
                      style={{ padding: "12px 16px", textAlign: "right", fontWeight: "600", color: getGrowthColor(suburb.growth_1yr), borderBottom: "1px solid #1e293b" }}
                      onClick={() => onSuburbClick(suburb.suburb, suburb.postcode)}
                    >
                      {suburb.growth_1yr > 0 ? "+" : ""}{suburb.growth_1yr.toFixed(1)}%
                    </td>
                    <td
                      style={{ padding: "12px 16px", textAlign: "right", color: "#94a3b8", borderBottom: "1px solid #1e293b" }}
                      onClick={() => onSuburbClick(suburb.suburb, suburb.postcode)}
                    >
                      {suburb.sales_count}
                    </td>
                    <td
                      style={{ padding: "12px 16px", textAlign: "right", fontWeight: "600", color: suburb.avg_price_per_sqm ? getPriceColor(suburb.avg_price_per_sqm, sqmRange.min, sqmRange.max) : "#64748b", borderBottom: "1px solid #1e293b" }}
                      onClick={() => onSuburbClick(suburb.suburb, suburb.postcode)}
                    >
                      {suburb.avg_price_per_sqm ? `$${suburb.avg_price_per_sqm.toLocaleString()}` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Suburb Detail Page
function SuburbDetailPage({ suburb, postcode, onBack, isMobile }: { suburb: string; postcode: string; onBack: () => void; isMobile: boolean }) {
  const [detail, setDetail] = useState<SuburbDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/suburbs/${encodeURIComponent(suburb)}/${postcode}`)
      .then((r) => r.json())
      .then((data) => {
        setDetail(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [suburb, postcode]);

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading suburb details...</div>;
  }

  if (!detail || !detail.stats) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <div style={{ color: "#ef4444", marginBottom: "16px" }}>Suburb not found</div>
        <button onClick={onBack} style={{ padding: "8px 16px", background: "#3b82f6", border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer" }}>
          Back to Rankings
        </button>
      </div>
    );
  }

  const { stats, recentSales, priceTrend } = detail;
  const priceRange = recentSales.length > 0
    ? { min: Math.min(...recentSales.map(s => s.price)), max: Math.max(...recentSales.map(s => s.price)) }
    : { min: 0, max: 5000000 };

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, flexDirection: isMobile ? "column" : "row", overflowY: isMobile ? "auto" : "hidden" }}>
      {/* Stats Panel */}
      <div style={{
        width: isMobile ? "100%" : "400px",
        background: "#111827",
        borderRight: isMobile ? "none" : "1px solid #1e293b",
        borderBottom: isMobile ? "1px solid #1e293b" : "none",
        padding: isMobile ? "16px" : "24px",
        overflowY: isMobile ? "visible" : "auto",
      }}>
        <button
          onClick={onBack}
          style={{
            padding: "6px 12px",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "4px",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: "12px",
            marginBottom: "16px",
          }}
        >
          ← Back
        </button>

        <h1 style={{ fontSize: isMobile ? "22px" : "28px", fontWeight: "700", color: "#f8fafc", marginBottom: "4px" }}>
          {stats.suburb}
        </h1>
        <div style={{ fontSize: "14px", color: "#64748b", marginBottom: "20px" }}>
          {stats.postcode} · NSW
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          <div style={{ background: "#1e293b", padding: isMobile ? "12px" : "16px", borderRadius: "8px" }}>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Median</div>
            <div style={{ fontSize: isMobile ? "18px" : "24px", fontWeight: "700", color: "#3b82f6" }}>{formatPriceShort(stats.median_price)}</div>
          </div>
          <div style={{ background: "#1e293b", padding: isMobile ? "12px" : "16px", borderRadius: "8px" }}>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Growth</div>
            <div style={{ fontSize: isMobile ? "18px" : "24px", fontWeight: "700", color: getGrowthColor(stats.growth_1yr) }}>
              {stats.growth_1yr > 0 ? "+" : ""}{stats.growth_1yr.toFixed(1)}%
            </div>
          </div>
          <div style={{ background: "#1e293b", padding: isMobile ? "12px" : "16px", borderRadius: "8px" }}>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Sales</div>
            <div style={{ fontSize: isMobile ? "18px" : "24px", fontWeight: "700", color: "#f8fafc" }}>{stats.sales_count}</div>
          </div>
          <div style={{ background: "#1e293b", padding: isMobile ? "12px" : "16px", borderRadius: "8px" }}>
            <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>$/m²</div>
            <div style={{ fontSize: isMobile ? "18px" : "24px", fontWeight: "700", color: "#f8fafc" }}>
              {stats.avg_price_per_sqm ? `$${stats.avg_price_per_sqm.toLocaleString()}` : "-"}
            </div>
          </div>
        </div>

        {!isMobile && (
          <>
            <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px", marginBottom: "24px" }}>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginBottom: "12px" }}>Price Range</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Min</div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#22c55e" }}>{formatPriceShort(stats.min_price)}</div>
                </div>
                <div style={{ flex: 1, height: "4px", background: "linear-gradient(to right, #22c55e, #eab308, #ef4444)", margin: "0 16px", borderRadius: "2px" }} />
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Max</div>
                  <div style={{ fontSize: "16px", fontWeight: "600", color: "#ef4444" }}>{formatPriceShort(stats.max_price)}</div>
                </div>
              </div>
            </div>

            <div style={{ background: "#1e293b", padding: "16px", borderRadius: "8px" }}>
              <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>Total Value</div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#8b5cf6" }}>{formatPriceShort(stats.total_value)}</div>
            </div>

            {priceTrend.length > 1 && (
              <div style={{ marginTop: "24px" }}>
                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", marginBottom: "12px" }}>Monthly Trend</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "80px" }}>
                  {priceTrend.slice(-12).map((pt, idx, arr) => {
                    const maxAvg = Math.max(...arr.map(p => p.avg_price));
                    const height = (pt.avg_price / maxAvg) * 100;
                    return (
                      <div key={pt.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{
                          width: "100%",
                          height: `${height}%`,
                          background: idx === arr.length - 1 ? "#3b82f6" : "#334155",
                          borderRadius: "2px 2px 0 0",
                        }} />
                        <div style={{ fontSize: "8px", color: "#64748b", marginTop: "4px" }}>
                          {pt.month.slice(4)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sales List */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ padding: isMobile ? "12px" : "16px 24px", borderBottom: "1px solid #1e293b", background: "#111827" }}>
          <h2 style={{ fontSize: isMobile ? "14px" : "16px", fontWeight: "600", color: "#f8fafc", margin: 0 }}>
            Recent Sales ({recentSales.length})
          </h2>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {isMobile ? (
            // Mobile: Card view for sales
            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentSales.map((sale, idx) => (
                <div key={sale.id} style={{ background: idx % 2 === 0 ? "#0f172a" : "#111827", padding: "12px", borderRadius: "6px" }}>
                  <div style={{ fontWeight: "500", color: "#f8fafc", marginBottom: "4px", fontSize: "13px" }}>{sale.address}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: getPriceColor(sale.price, priceRange.min, priceRange.max) }}>
                      {formatPriceShort(sale.price)}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{formatDate(sale.settlement_date)}</div>
                  </div>
                  <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "11px", color: "#94a3b8" }}>
                    <span>{sale.land_area > 0 ? `${sale.land_area}m²` : "-"}</span>
                    <span>{sale.price_per_sqm ? `$${sale.price_per_sqm}/m²` : ""}</span>
                    <span>{sale.zone_code}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Desktop: Table view
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b", background: "#0f172a", position: "sticky", top: 0 }}>Address</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b", background: "#0f172a", position: "sticky", top: 0 }}>Price</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b", background: "#0f172a", position: "sticky", top: 0 }}>Land</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b", background: "#0f172a", position: "sticky", top: 0 }}>$/m²</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b", background: "#0f172a", position: "sticky", top: 0 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentSales.map((sale, idx) => (
                  <tr key={sale.id} style={{ background: idx % 2 === 0 ? "#0f172a" : "#111827" }}>
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid #1e293b" }}>
                      <div style={{ fontWeight: "500", color: "#f8fafc" }}>{sale.address}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{sale.zone_code}</div>
                    </td>
                    <td style={{
                      padding: "12px 16px", textAlign: "right", fontWeight: "600",
                      color: getPriceColor(sale.price, priceRange.min, priceRange.max),
                      borderBottom: "1px solid #1e293b",
                    }}>
                      {formatPrice(sale.price)}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#94a3b8", borderBottom: "1px solid #1e293b" }}>
                      {sale.land_area > 0 ? `${sale.land_area.toLocaleString()}m²` : "-"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#94a3b8", borderBottom: "1px solid #1e293b" }}>
                      {sale.price_per_sqm ? `$${sale.price_per_sqm.toLocaleString()}` : "-"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", borderBottom: "1px solid #1e293b" }}>
                      {formatDate(sale.settlement_date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// Outliers Page
function OutliersPage({ isMobile }: { isMobile: boolean }) {
  const [data, setData] = useState<OutliersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'underpriced' | 'overpriced'>('all');
  const [threshold, setThreshold] = useState(2.0);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/outliers?threshold=${threshold}&limit=500`)
      .then((r) => r.json())
      .then((result) => {
        setData(result);
        setLoading(false);
      });
  }, [threshold]);

  if (loading || !data) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Analyzing price outliers...</div>;
  }

  const filteredOutliers = data.outliers.filter((o) => {
    if (filter === 'all') return true;
    return o.outlier_type === filter;
  });

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, flexDirection: "column" }}>
      {/* Filters */}
      <div style={{
        display: "flex",
        gap: isMobile ? "8px" : "16px",
        padding: isMobile ? "12px" : "16px 24px",
        background: "#111827",
        borderBottom: "1px solid #1e293b",
        alignItems: "center",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", gap: "4px", background: "#0f172a", padding: "4px", borderRadius: "6px" }}>
          {(['all', 'underpriced', 'overpriced'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: isMobile ? "6px 8px" : "8px 12px",
                background: filter === f ? (f === 'underpriced' ? '#22c55e' : f === 'overpriced' ? '#ef4444' : '#3b82f6') : 'transparent',
                border: "none",
                borderRadius: "4px",
                color: filter === f ? "#fff" : "#64748b",
                cursor: "pointer",
                fontSize: isMobile ? "11px" : "12px",
                fontWeight: "500",
                textTransform: "capitalize",
              }}
            >
              {isMobile ? (f === 'underpriced' ? '↓' : f === 'overpriced' ? '↑' : 'All') : f}
            </button>
          ))}
        </div>

        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "#64748b" }}>Threshold (σ):</span>
            <select
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              style={{
                padding: "8px 12px",
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "6px",
                color: "#e2e8f0",
                fontSize: "13px",
              }}
            >
              {[1.5, 2.0, 2.5, 3.0].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", gap: isMobile ? "8px" : "16px", fontSize: isMobile ? "11px" : "13px" }}>
          <div>
            <span style={{ color: "#22c55e", fontWeight: "600" }}>{data.underpricedCount}</span>
            <span style={{ color: "#64748b" }}> {isMobile ? "↓" : "underpriced"}</span>
          </div>
          <div>
            <span style={{ color: "#ef4444", fontWeight: "600" }}>{data.overpricedCount}</span>
            <span style={{ color: "#64748b" }}> {isMobile ? "↑" : "overpriced"}</span>
          </div>
        </div>
      </div>

      {/* Outliers List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {isMobile ? (
          // Mobile: Card view
          <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {filteredOutliers.map((outlier, idx) => (
              <div key={outlier.id} style={{ background: idx % 2 === 0 ? "#0f172a" : "#111827", padding: "12px", borderRadius: "6px", borderLeft: `3px solid ${outlier.outlier_type === 'underpriced' ? '#22c55e' : '#ef4444'}` }}>
                <div style={{ fontWeight: "500", color: "#f8fafc", marginBottom: "4px", fontSize: "13px" }}>{outlier.address}</div>
                <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "8px" }}>{outlier.suburb} {outlier.postcode}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#94a3b8" }}>{formatPriceShort(outlier.price)}</div>
                    <div style={{ fontSize: "11px", color: outlier.outlier_type === 'underpriced' ? "#22c55e" : "#ef4444" }}>
                      ${outlier.price_per_sqm?.toLocaleString()}/m²
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: outlier.outlier_type === 'underpriced' ? "#22c55e" : "#ef4444" }}>
                      {outlier.deviation_pct > 0 ? "+" : ""}{outlier.deviation_pct}%
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{formatDate(outlier.settlement_date)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Desktop: Table view
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b", background: "#0f172a", position: "sticky", top: 0, zIndex: 10 }}>Address</th>
                <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b", background: "#0f172a", position: "sticky", top: 0, zIndex: 10 }}>Price</th>
                <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b", background: "#0f172a", position: "sticky", top: 0, zIndex: 10 }}>$/m²</th>
                <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b", background: "#0f172a", position: "sticky", top: 0, zIndex: 10 }}>Expected</th>
                <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b", background: "#0f172a", position: "sticky", top: 0, zIndex: 10 }}>Deviation</th>
                <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b", background: "#0f172a", position: "sticky", top: 0, zIndex: 10 }}>Z-Score</th>
                <th style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", fontWeight: "500", borderBottom: "1px solid #1e293b", background: "#0f172a", position: "sticky", top: 0, zIndex: 10 }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredOutliers.map((outlier, idx) => (
                <tr key={outlier.id} style={{ background: idx % 2 === 0 ? "#0f172a" : "#111827" }}>
                  <td style={{ padding: "12px 16px", borderBottom: "1px solid #1e293b" }}>
                    <div style={{ fontWeight: "500", color: "#f8fafc" }}>{outlier.address}</div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>{outlier.suburb} {outlier.postcode}</div>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "600", color: "#94a3b8", borderBottom: "1px solid #1e293b" }}>
                    {formatPrice(outlier.price)}
                  </td>
                  <td style={{
                    padding: "12px 16px", textAlign: "right", fontWeight: "600",
                    color: outlier.outlier_type === 'underpriced' ? "#22c55e" : "#ef4444",
                    borderBottom: "1px solid #1e293b",
                  }}>
                    ${outlier.price_per_sqm?.toLocaleString() || "-"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", borderBottom: "1px solid #1e293b" }}>
                    ${outlier.expected_price_per_sqm?.toLocaleString()}
                  </td>
                  <td style={{
                    padding: "12px 16px", textAlign: "right", fontWeight: "600",
                    color: outlier.outlier_type === 'underpriced' ? "#22c55e" : "#ef4444",
                    borderBottom: "1px solid #1e293b",
                  }}>
                    {outlier.deviation_pct > 0 ? "+" : ""}{outlier.deviation_pct}%
                  </td>
                  <td style={{
                    padding: "12px 16px", textAlign: "right", fontWeight: "600",
                    color: outlier.outlier_type === 'underpriced' ? "#22c55e" : "#ef4444",
                    borderBottom: "1px solid #1e293b",
                  }}>
                    {outlier.z_score > 0 ? "+" : ""}{outlier.z_score}σ
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", color: "#64748b", borderBottom: "1px solid #1e293b" }}>
                    {formatDate(outlier.settlement_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Compare Page
function ComparePage({
  suburbKeys,
  onBack,
  onRemove,
  isMobile,
}: {
  suburbKeys: string[];
  onBack: () => void;
  onRemove: (key: string) => void;
  isMobile: boolean;
}) {
  const [suburbs, setSuburbs] = useState<SuburbStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (suburbKeys.length === 0) {
      setSuburbs([]);
      setLoading(false);
      return;
    }

    fetch(`/api/suburbs?limit=3000`)
      .then((r) => r.json())
      .then((allSuburbs: SuburbStats[]) => {
        const selected = allSuburbs.filter((s) =>
          suburbKeys.includes(`${s.suburb}-${s.postcode}`)
        );
        setSuburbs(selected);
        setLoading(false);
      });
  }, [suburbKeys]);

  if (loading) {
    return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading comparison...</div>;
  }

  if (suburbs.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center" }}>
        <div style={{ color: "#64748b", marginBottom: "16px" }}>No suburbs selected for comparison</div>
        <button onClick={onBack} style={{ padding: "8px 16px", background: "#3b82f6", border: "none", borderRadius: "6px", color: "#fff", cursor: "pointer" }}>
          Back to Rankings
        </button>
      </div>
    );
  }

  const metrics = [
    { key: 'momentum_score', label: 'Momentum', format: (v: number | null) => v !== null ? v.toString() : '-', color: (v: number | null) => getMomentumColor(v), higherBetter: true },
    { key: 'median_price', label: 'Median', format: formatPriceShort, color: () => '#94a3b8', higherBetter: false },
    { key: 'growth_1yr', label: 'Growth', format: (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`, color: getGrowthColor, higherBetter: true },
    { key: 'sales_count', label: 'Sales', format: (v: number) => v.toLocaleString(), color: () => '#94a3b8', higherBetter: true },
    { key: 'avg_price_per_sqm', label: '$/m²', format: (v: number | null) => v ? `$${v.toLocaleString()}` : '-', color: () => '#94a3b8', higherBetter: false },
  ];

  const getBestValue = (metricKey: string, higherBetter: boolean) => {
    const values = suburbs.map((s) => (s as any)[metricKey]).filter((v) => v !== null && v !== undefined);
    if (values.length === 0) return null;
    return higherBetter ? Math.max(...values) : Math.min(...values);
  };

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0, flexDirection: "column" }}>
      <div style={{
        display: "flex", gap: "16px", padding: isMobile ? "12px" : "16px 24px",
        background: "#111827", borderBottom: "1px solid #1e293b", alignItems: "center",
      }}>
        <button
          onClick={onBack}
          style={{
            padding: "6px 12px",
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: "4px",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          ← Back
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: "14px", color: "#f8fafc", fontWeight: "600" }}>
          Comparing {suburbs.length}
        </div>
      </div>

      <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", padding: isMobile ? "12px" : "24px" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? `100px repeat(${suburbs.length}, 1fr)` : `200px repeat(${suburbs.length}, 1fr)`,
          gap: "1px",
          background: "#1e293b",
          borderRadius: "8px",
          overflow: "hidden",
          minWidth: isMobile ? `${100 + suburbs.length * 100}px` : "auto",
        }}>
          {/* Header Row */}
          <div style={{ background: "#111827", padding: isMobile ? "10px" : "16px", fontWeight: "600", color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>
            Metric
          </div>
          {suburbs.map((s) => (
            <div key={`${s.suburb}-${s.postcode}`} style={{ background: "#111827", padding: isMobile ? "10px" : "16px", textAlign: "center" }}>
              <div style={{ fontWeight: "700", color: "#f8fafc", fontSize: isMobile ? "12px" : "14px" }}>{s.suburb}</div>
              <div style={{ fontSize: "10px", color: "#64748b" }}>{s.postcode}</div>
              <button
                onClick={() => onRemove(`${s.suburb}-${s.postcode}`)}
                style={{
                  marginTop: "6px",
                  padding: "2px 6px",
                  background: "#ef4444",
                  border: "none",
                  borderRadius: "4px",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "9px",
                }}
              >
                Remove
              </button>
            </div>
          ))}

          {/* Metric Rows */}
          {metrics.map((metric, idx) => {
            const bestValue = getBestValue(metric.key, metric.higherBetter);
            return (
              <React.Fragment key={metric.key}>
                <div style={{ background: idx % 2 === 0 ? "#0f172a" : "#111827", padding: isMobile ? "10px" : "16px", color: "#94a3b8", fontSize: isMobile ? "11px" : "13px", fontWeight: "500" }}>
                  {metric.label}
                </div>
                {suburbs.map((s) => {
                  const value = (s as any)[metric.key];
                  const isBest = value !== null && value !== undefined && value === bestValue;
                  return (
                    <div
                      key={`${s.suburb}-${s.postcode}-${metric.key}`}
                      style={{
                        background: idx % 2 === 0 ? "#0f172a" : "#111827",
                        padding: isMobile ? "10px" : "16px",
                        textAlign: "center",
                        fontWeight: "600",
                        fontSize: isMobile ? "12px" : "14px",
                        color: metric.color(value),
                        border: isBest ? "2px solid #22c55e" : "none",
                        borderRadius: isBest ? "4px" : "0",
                      }}
                    >
                      {metric.format(value)}
                      {isBest && <span style={{ marginLeft: "4px", color: "#22c55e" }}>★</span>}
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Main App
function App() {
  const [page, setPage] = useState("rankings");
  const [selectedSuburb, setSelectedSuburb] = useState<{ suburb: string; postcode: string } | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  const handleSuburbClick = (suburb: string, postcode: string) => {
    setSelectedSuburb({ suburb, postcode });
    setPage("detail");
  };

  const handleBack = () => {
    setSelectedSuburb(null);
    setPage("rankings");
  };

  const handleToggleCompare = (key: string) => {
    setSelectedForCompare((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else if (newSet.size < 5) {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleCompare = () => {
    if (selectedForCompare.size >= 2) {
      setPage("compare");
    }
  };

  const handleRemoveFromCompare = (key: string) => {
    setSelectedForCompare((prev) => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  };

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      background: "#0a0f1a",
      color: "#e2e8f0",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <header style={{
        background: "linear-gradient(180deg, #111827 0%, #0a0f1a 100%)",
        borderBottom: "1px solid #1e293b",
        padding: isMobile ? "10px 12px" : "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <div style={{
            width: isMobile ? "32px" : "36px",
            height: isMobile ? "32px" : "36px",
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            borderRadius: "8px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: isMobile ? "16px" : "18px",
            flexShrink: 0,
          }}>
            🏠
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: isMobile ? "14px" : "16px", fontWeight: "700", color: "#f8fafc", margin: 0, whiteSpace: "nowrap" }}>
              NSW Property
            </h1>
            {!isMobile && (
              <p style={{ fontSize: "11px", color: "#64748b", margin: 0 }}>
                Data from{" "}
                <a
                  href="https://valuation.property.nsw.gov.au/embed/propertySalesInformation"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#3b82f6", textDecoration: "none" }}
                >
                  NSW Valuer General
                </a>
              </p>
            )}
          </div>
        </div>
        {page !== "detail" && page !== "compare" && <Nav page={page} setPage={setPage} isMobile={isMobile} />}
        {(page === "detail" || page === "compare") && selectedSuburb && !isMobile && (
          <div style={{ fontSize: "14px", color: "#94a3b8" }}>
            {selectedSuburb.suburb} · {selectedSuburb.postcode}
          </div>
        )}
      </header>

      {page === "map" && <MapPage onSuburbClick={handleSuburbClick} isMobile={isMobile} />}
      {page === "rankings" && (
        <RankingsPage
          onSuburbClick={handleSuburbClick}
          onCompare={handleCompare}
          selectedForCompare={selectedForCompare}
          onToggleCompare={handleToggleCompare}
          isMobile={isMobile}
        />
      )}
      {page === "outliers" && <OutliersPage isMobile={isMobile} />}
      {page === "compare" && (
        <ComparePage
          suburbKeys={Array.from(selectedForCompare)}
          onBack={() => setPage("rankings")}
          onRemove={handleRemoveFromCompare}
          isMobile={isMobile}
        />
      )}
      {page === "detail" && selectedSuburb && (
        <SuburbDetailPage
          suburb={selectedSuburb.suburb}
          postcode={selectedSuburb.postcode}
          onBack={handleBack}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
