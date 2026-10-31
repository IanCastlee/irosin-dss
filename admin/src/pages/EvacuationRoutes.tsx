import React, { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Navigation, AlertTriangle, CheckCircle, ShieldCheck, Loader2, MapPin, RotateCcw, Trash, Check } from 'lucide-react';
import { Api } from '../services/api';
import { EvacuationRoute, EvacuationCenter, Barangay } from '../types';
import { Modal } from '../components/Common/Modal';
import { CardSkeleton } from '../components/Common/LoadingSpinner';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  TEMPORARILY_CLOSED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  UNDER_REVIEW: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
};

// Calculate Haversine distance between two coordinates in km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const EvacuationRoutes: React.FC = () => {
  const [routes, setRoutes] = useState<EvacuationRoute[]>([]);
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<EvacuationRoute | null>(null);

  const [form, setForm] = useState({
    routeName: '',
    originDescription: '',
    destinationCenterId: '',
    barangayId: '',
    status: 'ACTIVE' as const,
    instructions: '',
    hazardWarningsStr: '',
    distanceKm: 1.0,
    estimatedMinutes: 15,
  });

  const [waypoints, setWaypoints] = useState<{ lat: number; lng: number }[]>([]);
  const mapInstanceRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const centerMarkerRef = useRef<any>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [routesRes, centersRes, brgysRes] = await Promise.all([
        Api.getRoutes(),
        Api.getCenters(),
        Api.getBarangays(),
      ]);
      setRoutes(routesRes.evacuationRoutes || []);
      setCenters(centersRes.evacuationCenters || []);
      setBarangays(brgysRes.barangays || []);
    } catch (err: any) {
      console.error('Failed to load initial evacuation routes data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    const initialCenterId = centers[0]?.id || '';
    const initialBrgyId = barangays[0]?.id || '';
    setForm({
      routeName: '',
      originDescription: '',
      destinationCenterId: initialCenterId,
      barangayId: initialBrgyId,
      status: 'ACTIVE',
      instructions: '',
      hazardWarningsStr: '',
      distanceKm: 1.0,
      estimatedMinutes: 15,
    });
    setWaypoints([]);
    setIsModalOpen(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    const warningsArr = Array.isArray(r.hazardWarnings) ? r.hazardWarnings : [];
    const wpList = Array.isArray(r.waypoints) ? r.waypoints : [];

    setForm({
      routeName: r.routeName || '',
      originDescription: r.originDescription || '',
      destinationCenterId: r.destinationCenterId || centers[0]?.id || '',
      barangayId: r.barangayId || barangays[0]?.id || '',
      status: r.status || 'ACTIVE',
      instructions: r.instructions || '',
      hazardWarningsStr: warningsArr.join('\n'),
      distanceKm: r.distanceKm || (r.distance ? parseFloat(r.distance) || 1.0 : 1.0),
      estimatedMinutes: r.estimatedMinutes || (r.estimatedTime ? parseInt(r.estimatedTime) || 15 : 15),
    });
    setWaypoints(wpList);
    setIsModalOpen(true);
  };

  // Initialize and update Leaflet map when modal is open
  useEffect(() => {
    if (!isModalOpen) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      const L = (window as any).L;
      const container = document.getElementById('route-leaflet-canvas');
      if (!L || !container) return;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      // Initialize pure Leaflet map on Irosin town center
      const map = L.map('route-leaflet-canvas').setView([12.7042, 124.0371], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      const markersGroup = L.featureGroup().addTo(map);
      const polyline = L.polyline([], {
        color: '#0284c7',
        weight: 5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      mapInstanceRef.current = map;
      polylineRef.current = polyline;
      markersGroupRef.current = markersGroup;

      // Handle map clicks to manually add route lining points
      map.on('click', (e: any) => {
        const newPt = {
          lat: Number(e.latlng.lat.toFixed(6)),
          lng: Number(e.latlng.lng.toFixed(6)),
        };
        setWaypoints((prev) => {
          const updated = [...prev, newPt];
          recalculateDistance(updated);
          return updated;
        });
      });

      renderMapLayers(map, markersGroup, polyline, waypoints, form.destinationCenterId);
    }, 250);

    return () => clearTimeout(timer);
  }, [isModalOpen]);

  // Sync destination center marker and waypoints on map whenever changed
  useEffect(() => {
    if (mapInstanceRef.current && markersGroupRef.current && polylineRef.current) {
      renderMapLayers(
        mapInstanceRef.current,
        markersGroupRef.current,
        polylineRef.current,
        waypoints,
        form.destinationCenterId,
      );
    }
  }, [waypoints, form.destinationCenterId, centers]);

  const recalculateDistance = (pts: { lat: number; lng: number }[]) => {
    if (pts.length < 2) return;
    let totalKm = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      totalKm += haversineDistance(pts[i].lat, pts[i].lng, pts[i + 1].lat, pts[i + 1].lng);
    }
    const cleanDist = Number(totalKm.toFixed(2));
    const mins = Math.max(5, Math.round((cleanDist / 4.5) * 60)); // 4.5 km/h walking speed
    setForm((p) => ({ ...p, distanceKm: cleanDist, estimatedMinutes: mins }));
  };

  const renderMapLayers = (
    map: any,
    markersGroup: any,
    polyline: any,
    pts: { lat: number; lng: number }[],
    selectedCenterId: string,
  ) => {
    const L = (window as any).L;
    if (!L) return;

    markersGroup.clearLayers();

    // 1. Plot the selected Destination Evacuation Center with a distinct Green Shelter Pin
    const targetCenter = centers.find((c) => c.id === selectedCenterId);
    if (targetCenter && targetCenter.latitude && targetCenter.longitude) {
      const shelterIcon = L.divIcon({
        className: 'custom-leaflet-shelter',
        html: `<div style="background:#059669;color:#ffffff;width:34px;height:34px;border-radius:50%;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 6px rgba(0,0,0,0.4);font-size:18px;">🏛️</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 34],
      });
      const cMarker = L.marker([targetCenter.latitude, targetCenter.longitude], { icon: shelterIcon }).bindPopup(
        `<b>${targetCenter.name}</b><br/>Destinasyon ng Ruta`,
      );
      markersGroup.addLayer(cMarker);
    }

    // 2. Draw the manual waypoints connecting polyline
    const latlngs = pts.map((pt) => [pt.lat, pt.lng]);
    polyline.setLatLngs(latlngs);

    // 3. Add numbered node badges for each manually plotted waypoint
    pts.forEach((pt, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === pts.length - 1 && pts.length > 1;
      const bg = isStart ? '#0284c7' : isEnd ? '#10b981' : '#475569';
      const label = isStart ? 'S' : isEnd ? 'E' : `${idx + 1}`;

      const wpIcon = L.divIcon({
        className: 'custom-wp-pin',
        html: `<div style="background:${bg};color:#ffffff;width:24px;height:24px;border-radius:50%;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.4);">${label}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      const m = L.marker([pt.lat, pt.lng], { icon: wpIcon });
      markersGroup.addLayer(m);
    });

    if (pts.length > 0) {
      const allBounds = L.latLngBounds(latlngs);
      if (targetCenter && targetCenter.latitude) {
        allBounds.extend([targetCenter.latitude, targetCenter.longitude]);
      }
      map.fitBounds(allBounds.pad(0.2));
    }
  };

  const handleUndoPoint = () => {
    setWaypoints((prev) => {
      const updated = prev.slice(0, -1);
      recalculateDistance(updated);
      return updated;
    });
  };

  const handleClearLining = () => {
    setWaypoints([]);
    setForm((p) => ({ ...p, distanceKm: 0.5, estimatedMinutes: 10 }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedBrgy = barangays.find((b) => b.id === form.barangayId);
    const selectedCenter = centers.find((c) => c.id === form.destinationCenterId);

    const payload = {
      ...form,
      barangayName: selectedBrgy?.name || 'Irosin',
      destinationCenterName: selectedCenter?.name || 'Designated Shelter',
      waypoints,
      hazardWarnings: form.hazardWarningsStr.split('\n').map((s) => s.trim()).filter(Boolean),
      lastVerifiedDate: new Date().toISOString().split('T')[0],
    };
    delete (payload as any).hazardWarningsStr;

    setSaving(true);
    try {
      if (editing) {
        const res = await Api.updateRoute(editing.id, payload);
        setRoutes((prev) => prev.map((r) => (r.id === editing.id ? res.evacuationRoute : r)));
      } else {
        const res = await Api.createRoute(payload);
        setRoutes((prev) => [...prev, res.evacuationRoute]);
      }
      setIsModalOpen(false);
    } catch {
      alert('Could not save route. Please check backend connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this evacuation route?')) return;
    setDeletingId(id);
    try {
      await Api.deleteRoute(id);
      setRoutes((prev) => prev.filter((r) => r.id !== id));
    } catch {
      alert('Delete failed.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-100">Evacuation Route Management</h2>
          <p className="text-sm text-slate-400 mt-1">Official MDRRMO-verified safe evacuation routes with manual Leaflet lining</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl transition shadow-lg shadow-sky-600/20"
        >
          <Plus className="w-4 h-4" /> Add Route (Manual Lining)
        </button>
      </div>

      <div className="p-4 bg-sky-500/10 border border-sky-500/30 rounded-xl flex items-start gap-3 text-sm text-sky-300">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <strong>Leaflet-Only Navigation:</strong> Lahat ng evacuation routes ay ginagawa gamit ang manual na lining sa Leaflet map upang masiguro na hindi dadaanan ang mga delikadong ilog o landslide cuts.
        </div>
      </div>

      {loading ? (
        <CardSkeleton count={3} />
      ) : routes.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm">
          No evacuation routes registered. Click "+ Add Route" to map one manually.
        </div>
      ) : (
        <div className="space-y-4">
          {routes.map((r: any) => {
            const warnings = Array.isArray(r.hazardWarnings) ? r.hazardWarnings : [];
            const waypointsCount = Array.isArray(r.waypoints) ? r.waypoints.length : 0;
            const distDisplay = r.distanceKm ? `${r.distanceKm} km` : (r.distance || '1.5 km');
            const timeDisplay = r.estimatedMinutes ? `${r.estimatedMinutes} min` : (r.estimatedTime || '10 min');
            const instrDisplay = r.instructions || r.originDescription || 'Follow designated directional signage.';

            return (
              <div key={r.id} className="glass-panel p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
                      <Navigation className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-100 leading-tight">{r.routeName}</p>
                      <p className="text-xs text-slate-400">
                        {r.barangayName || 'Irosin'} → {r.destinationCenterName || 'Evacuation Center'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase ${statusColors[r.status] || statusColors.ACTIVE}`}>
                      {r.status || 'ACTIVE'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-center">
                    <p className="text-slate-400">Distance</p>
                    <p className="font-bold text-slate-200 text-base">{distDisplay}</p>
                  </div>
                  <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-center">
                    <p className="text-slate-400">Est. Time</p>
                    <p className="font-bold text-slate-200 text-base">{timeDisplay}</p>
                  </div>
                  <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800 text-center">
                    <p className="text-slate-400">Manual Waypoints</p>
                    <p className="font-bold text-sky-400 text-base">{waypointsCount} pts</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-300 uppercase">Instructions / Details</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{instrDisplay}</p>
                </div>

                {warnings.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Hazard Warnings
                    </p>
                    <ul className="space-y-0.5">
                      {warnings.map((w: string, i: number) => (
                        <li key={i} className="text-xs text-amber-300/80">• {w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Last verified: {r.lastVerifiedDate || 'Recent'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Lining
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
                    >
                      {deletingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Route Modal with Interactive Leaflet Manual Lining */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? 'Edit Evacuation Route (Manual Lining)' : 'Add Evacuation Route (Manual Lining)'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Route Name</label>
            <input
              type="text"
              value={form.routeName}
              onChange={(e) => setForm((p) => ({ ...p, routeName: e.target.value }))}
              placeholder="Hal. Brgy. San Julian papuntang Irosin Central Evacuation Center"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Barangay</label>
              <select
                value={form.barangayId}
                onChange={(e) => setForm((p) => ({ ...p, barangayId: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              >
                {barangays.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Destination Shelter</label>
              <select
                value={form.destinationCenterId}
                onChange={(e) => setForm((p) => ({ ...p, destinationCenterId: e.target.value }))}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              >
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 🗺️ Interactive Leaflet Map Route Lining Tool */}
          <div className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span>Manual na Pag-drawing ng Lining (Leaflet Map)</span>
              </label>
              <span className="text-[11px] font-bold text-slate-300">
                Points: <span className="text-sky-400">{waypoints.length}</span> | Dist: <span className="text-emerald-400">{form.distanceKm} km</span>
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-snug">
              I-click sa mapa ang bawat liko o daan patungo sa evacuation center upang manual na buuin ang lining ng ligtas na ruta.
            </p>

            {/* Map Canvas */}
            <div id="route-leaflet-canvas" className="w-full h-64 rounded-xl border border-slate-700 bg-slate-950 relative overflow-hidden" />

            {/* Map Tool Actions */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUndoPoint}
                  disabled={waypoints.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition disabled:opacity-40"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo Last Point</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearLining}
                  disabled={waypoints.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950 text-slate-400 hover:text-red-300 text-xs font-semibold transition disabled:opacity-40"
                >
                  <Trash className="w-3.5 h-3.5" />
                  <span>Clear Lining</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400">
                {waypoints.length > 0 ? '✓ May active lining' : 'Wala pang points'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Distance (KM)</label>
              <input
                type="number"
                step="0.05"
                value={form.distanceKm}
                onChange={(e) => setForm((p) => ({ ...p, distanceKm: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Est. Walking Minutes</label>
              <input
                type="number"
                value={form.estimatedMinutes}
                onChange={(e) => setForm((p) => ({ ...p, estimatedMinutes: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Origin / Start Description</label>
            <input
              type="text"
              value={form.originDescription}
              onChange={(e) => setForm((p) => ({ ...p, originDescription: e.target.value }))}
              placeholder="Hal. Barangay Hall o Simbahan ng San Julian"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Official Safe Instructions</label>
            <textarea
              value={form.instructions}
              onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
              rows={2}
              placeholder="Sundin ang signage sa Provincial Road at umiwas sa tulay..."
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Hazard Warnings (1 bawat linya)</label>
            <textarea
              value={form.hazardWarningsStr}
              onChange={(e) => setForm((p) => ({ ...p, hazardWarningsStr: e.target.value }))}
              rows={2}
              placeholder="Mataas na tubig sa creek tuwing malakas ang ulan..."
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>{editing ? 'Save Changes' : 'Create Route'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
