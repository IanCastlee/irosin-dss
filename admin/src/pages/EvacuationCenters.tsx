import React, { useEffect, useState } from "react";
import { Plus, Edit2, Trash2, Home, Phone, RefreshCw } from "lucide-react";
import { Api } from "../services/api";
import { EvacuationCenter, Barangay } from "../types";
import { Modal } from "../components/Common/Modal";
import { CardSkeleton } from "../components/Common/LoadingSpinner";

const statusColors: Record<string, string> = {
  OPEN: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  CLOSED: "bg-slate-700 text-slate-400 border-slate-600",
  FULL: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  TEMPORARILY_UNAVAILABLE: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  STANDBY: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const facilityIcons: Record<string, string> = {
  water: "💧",
  food: "🍚",
  medical: "🏥",
  restrooms: "🚻",
  electricity: "⚡",
  sleepingArea: "🛏",
  pwdAccessible: "♿",
  generator: "🔋",
  kitchen: "🍳",
  toilets: "🚻",
  "medical aid": "🏥",
  classrooms: "🏫",
  "first aid": "🩹",
};

const emptyForm = {
  name: "",
  barangayId: "brgy-2",
  barangayName: "San Agustin",
  address: "",
  latitude: 12.7042,
  longitude: 124.0371,
  contactPerson: "",
  contactPhone: "",
  capacity: 100,
  currentOccupancy: 0,
  status: "OPEN",
  description: "",
  facilities: {
    water: true,
    food: true,
    medical: false,
    restrooms: true,
    electricity: true,
    sleepingArea: true,
    pwdAccessible: false,
  },
};

export const EvacuationCenters: React.FC = () => {
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [barangays, setBarangays] = useState<Barangay[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<EvacuationCenter | null>(null);
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [centerRes, brgyRes] = await Promise.all([
        Api.getCenters(),
        Api.getBarangays().catch(() => ({ barangays: [] })),
      ]);
      setCenters(centerRes.evacuationCenters || []);
      setBarangays(brgyRes.barangays || []);
    } catch (err: any) {
      console.error("Failed to load centers:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      barangayId: barangays[0]?.id || "brgy-2",
      barangayName: barangays[0]?.name || "San Agustin",
    });
    setIsModalOpen(true);
  };

  const openEdit = (c: EvacuationCenter) => {
    setEditing(c);
    const facilitiesObj =
      typeof c.facilities === "object" &&
      !Array.isArray(c.facilities) &&
      c.facilities !== null
        ? { ...emptyForm.facilities, ...c.facilities }
        : { ...emptyForm.facilities };

    setForm({
      name: c.name || "",
      barangayId: c.barangayId || "brgy-2",
      barangayName: c.barangayName || "",
      address: c.address || "",
      latitude: Number(c.latitude) || 12.7042,
      longitude: Number(c.longitude) || 124.0371,
      contactPerson: c.contactPerson || "",
      contactPhone: c.contactPhone || "",
      capacity: Number(c.capacity) || 100,
      currentOccupancy: Number(c.currentOccupancy) || 0,
      status: c.status || "OPEN",
      description: c.description || "",
      facilities: facilitiesObj,
    });
    setIsModalOpen(true);
  };

  const handleBarangayChange = (brgyId: string) => {
    const selected = barangays.find((b) => b.id === brgyId);
    setForm((prev) => ({
      ...prev,
      barangayId: brgyId,
      barangayName: selected ? selected.name : prev.barangayName,
      latitude: selected?.latitude || prev.latitude,
      longitude: selected?.longitude || prev.longitude,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        barangayId: form.barangayId,
        barangayName: form.barangayName,
        address: form.address.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        contactPerson: form.contactPerson.trim() || "MDRRMO Evac Officer",
        contactPhone: form.contactPhone.trim() || "N/A",
        capacity: Number(form.capacity) || 100,
        currentOccupancy: Number(form.currentOccupancy) || 0,
        status: form.status,
        description: form.description.trim(),
        facilities: form.facilities,
      };

      if (editing) {
        const res = await Api.updateCenter(editing.id, payload);
        const updatedItem = res.evacuationCenter || { ...editing, ...payload };
        setCenters((prev) =>
          prev.map((c) => (c.id === editing.id ? updatedItem : c)),
        );
      } else {
        const res = await Api.createCenter(payload);
        setCenters((prev) => [res.evacuationCenter, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(
        `Hindi mai-save: ${err?.message || "Pakisuri ang koneksyon sa server"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Sigurado ka bang nais mong tanggalin ang evacuation center na ito?",
      )
    )
      return;
    setDeletingId(id);
    try {
      await Api.deleteCenter(id);
      setCenters((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(`Delete failed: ${err?.message || "Network error"}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Helper to render facilities safely whether stored as Array or Object
  const renderFacilityBadges = (facilities: any) => {
    if (!facilities) return null;

    if (Array.isArray(facilities)) {
      return facilities.map((item: string, idx: number) => {
        const iconKey = item.toLowerCase();
        const icon = facilityIcons[iconKey] || "✅";
        return (
          <span
            key={idx}
            className="px-2 py-0.5 rounded-lg text-[11px] font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          >
            {icon} {item}
          </span>
        );
      });
    }

    if (typeof facilities === "object") {
      return Object.entries(facilities).map(([key, val]) => (
        <span
          key={key}
          className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${
            val
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-slate-800 text-slate-500 border-slate-700 line-through"
          }`}
        >
          {facilityIcons[key.toLowerCase()] || "🏷️"} {key}
        </span>
      ));
    }

    return null;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100 leading-tight">
            Evacuation Centers
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5 sm:mt-1">
            Pamahalaan ang mga opisyal na evacuation shelter, kapasidad, at pasilidad sa bawat barangay ng Irosin.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={loadData}
            className="p-2 sm:p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700 shrink-0"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-sky-600/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Center</span>
          </button>
        </div>
      </div>

      {loading ? (
        <CardSkeleton count={4} />
      ) : centers.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400 text-sm">
          No evacuation centers registered. Click "+ Add Center" to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {centers.map((c) => {
            const cap = c.capacity || 1;
            const occ = c.currentOccupancy || 0;
            const occupancyPct = Math.min(100, Math.round((occ / cap) * 100));
            return (
              <div key={c.id} className="glass-panel p-4 sm:p-5 space-y-3.5 sm:space-y-4">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div className="p-2 sm:p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0 mt-0.5">
                      <Home className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-slate-100 text-sm sm:text-base leading-tight break-words">
                        {c.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 break-words">
                        {c.barangayName ? `Brgy. ${c.barangayName}` : "Irosin"}{" "}
                        • {c.address}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border uppercase shrink-0 ${
                      statusColors[c.status] || statusColors.OPEN
                    }`}
                  >
                    {c.status || "OPEN"}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>
                      Occupancy: {occ} / {cap}
                    </span>
                    <span
                      className={
                        occupancyPct > 80
                          ? "text-amber-400 font-bold"
                          : "text-emerald-400"
                      }
                    >
                      {occupancyPct}% full
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        occupancyPct > 80 ? "bg-amber-400" : "bg-emerald-500"
                      }`}
                      style={{ width: `${occupancyPct}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {renderFacilityBadges(c.facilities)}
                </div>

                {c.description ? (
                  <p className="text-xs text-slate-400 line-clamp-2 bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/80">
                    {c.description}
                  </p>
                ) : null}

                <div className="flex items-center gap-2 text-xs text-slate-400 border-t border-slate-800 pt-2.5">
                  <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate">
                    {c.contactPerson || "Camp Manager"} —{" "}
                    {c.contactPhone || "N/A"}
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
                  >
                    {deletingId === c.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? "Edit Evacuation Center" : "Add Evacuation Center"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Center Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Irosin Central School Multi-Purpose Center"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Barangay
              </label>
              <select
                value={form.barangayId}
                onChange={(e) => handleBarangayChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              >
                {barangays.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
                {barangays.length === 0 && (
                  <>
                    <option value="brgy-1">Monbon</option>
                    <option value="brgy-2">San Agustin</option>
                    <option value="brgy-3">Gabao</option>
                    <option value="brgy-4">San Julian</option>
                    <option value="brgy-5">Buenavista</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({ ...p, status: e.target.value }))
                }
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500"
              >
                {[
                  "OPEN",
                  "CLOSED",
                  "FULL",
                  "STANDBY",
                  "TEMPORARILY_UNAVAILABLE",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Address / Exact Location
            </label>
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) =>
                setForm((p) => ({ ...p, address: e.target.value }))
              }
              placeholder="e.g. National Highway, Brgy. San Agustin"
              className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Latitude
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={form.latitude}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    latitude: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Longitude
              </label>
              <input
                type="number"
                step="0.0001"
                required
                value={form.longitude}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    longitude: parseFloat(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Max Capacity
              </label>
              <input
                type="number"
                required
                min={1}
                value={form.capacity}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    capacity: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Current Occupancy
              </label>
              <input
                type="number"
                min={0}
                value={form.currentOccupancy}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    currentOccupancy: parseInt(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Contact Person / Camp Manager
              </label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) =>
                  setForm((p) => ({ ...p, contactPerson: e.target.value }))
                }
                placeholder="e.g. Principal Santos"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Contact Phone
              </label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, contactPhone: e.target.value }))
                }
                placeholder="+63 9XX XXX XXXX"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Structure notes, generator availability, accessibility..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Available Facilities
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(form.facilities).map(([key, val]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        facilities: {
                          ...p.facilities,
                          [key]: e.target.checked,
                        },
                      }))
                    }
                    className="rounded bg-slate-800 text-sky-600 focus:ring-0"
                  />
                  <span className="capitalize">
                    {facilityIcons[key.toLowerCase()] || "🏷️"} {key}
                  </span>
                </label>
              ))}
            </div>
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
              className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
              {editing ? "Save Changes" : "Create Center"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
