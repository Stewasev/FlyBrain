const COLORS = new Set(["superclass", "nt", "dimorphism", "fruDsx"]);

export function parseHash(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  const params = new URLSearchParams(raw);
  const tour = params.get("t");
  const stepRaw = params.get("s");
  const idRaw = params.get("id");
  const color = params.get("c");
  const type = params.get("type");
  const live = params.get("live");
  const embed = params.get("embed") === "1";
  const step = stepRaw === null || stepRaw === "" ? null : Number(stepRaw);
  const id = idRaw === null || idRaw === "" ? null : Number(idRaw);
  return {
    tour: tour || null,
    step: Number.isFinite(step) ? step : null,
    id: Number.isFinite(id) ? id : null,
    color: COLORS.has(color) ? color : null,
    type: type || null,
    live: live || null,
    embed,
  };
}

export function serializeHash({
  tour = null,
  step = null,
  id = null,
  color = null,
  type = null,
  live = null,
} = {}) {
  const params = new URLSearchParams();
  if (live) {
    params.set("live", live);
  } else if (tour) {
    params.set("t", tour);
    if (step != null && Number.isFinite(Number(step))) params.set("s", String(step));
  } else if (type) {
    params.set("type", type);
  }
  if (id) params.set("id", String(id));
  if (color && color !== "superclass" && COLORS.has(color)) params.set("c", color);
  const q = params.toString();
  return q ? `#${q}` : "";
}
