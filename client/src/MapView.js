import React from "react";
import { ComposableMap, Geographies, Geography, Marker, Line } from "react-simple-maps";
import { cityCoords } from "./cityCoords";

const geoUrl =
  "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

export default function MapView({ dcs, stores, shipments, highlight }) {
  // Helper to get coordinates for a city
  const getCoords = (city) => cityCoords[city] || [-98, 39]; // fallback: center of US

  return (
    <ComposableMap projection="geoAlbersUsa" width={900} height={500}>
      <Geographies geography={geoUrl}>
        {({ geographies }) =>
          geographies.map(geo => (
            <Geography key={geo.rsmKey} geography={geo} fill="#EAEAEC" stroke="#D6D6DA" />
          ))
        }
      </Geographies>
      {/* Distribution Centers */}
      {dcs.map(dc => (
        <Marker key={dc.dc_id} coordinates={getCoords(dc.location)}>
          <circle r={7} fill={highlight?.id === dc.dc_id ? "#f59e0b" : "#2563eb"} stroke="#fff" strokeWidth={2} />
          <text textAnchor="middle" y={-15} style={{ fontSize: 10, fontWeight: 600 }}>{dc.name}</text>
        </Marker>
      ))}
      {/* Stores */}
      {stores.map(store => (
        <Marker key={store.store_id} coordinates={getCoords(store.location)}>
          <circle r={5} fill={highlight?.id === store.store_id ? "#10b981" : "#34d399"} stroke="#fff" strokeWidth={1.5} />
          <text textAnchor="middle" y={-12} style={{ fontSize: 8 }}>{store.name}</text>
        </Marker>
      ))}
      {/* Shipments/Routes (optional) */}
      {shipments.map((sh, i) => {
        const from = stores.find(s => s.store_id === sh.from) || dcs.find(d => d.dc_id === sh.from);
        const to = stores.find(s => s.store_id === sh.to) || dcs.find(d => d.dc_id === sh.to);
        if (!from || !to) return null;
        return (
          <Line
            key={i}
            from={getCoords(from.location)}
            to={getCoords(to.location)}
            stroke={highlight?.id === sh.shipment_id ? "#f87171" : "#888"}
            strokeWidth={2}
          />
        );
      })}
    </ComposableMap>
  );
}