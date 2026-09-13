function typeMatches(typeName, ql) {
  const tl = typeName.toLowerCase();
  if (tl === ql || tl.startsWith(ql)) return true;
  if (tl.includes(`_${ql}`) || tl.includes(` ${ql}`)) return true;
  return ql.length >= 4 && tl.includes(ql);
}

export function searchCatalog(neurons, strings, q, maxTypes = 25) {
  const query = String(q || "").trim();
  if (!query) return { exact: null, types: [] };
  if (/^\d+$/.test(query)) {
    const id = Number(query);
    const n = neurons.find((cell) => cell.id === id) || null;
    return { exact: n, types: [] };
  }
  const ql = query.toLowerCase();
  const byType = new Map();
  for (const n of neurons) {
    const t = strings.type[n.type] || "";
    if (!t || !typeMatches(t, ql)) continue;
    let rec = byType.get(t);
    if (!rec) {
      rec = { type: t, count: 0, soma: 0 };
      byType.set(t, rec);
    }
    rec.count += 1;
    if (n.hasSoma) rec.soma += 1;
  }
  const types = [...byType.values()].sort((a, b) => b.soma - a.soma || b.count - a.count).slice(0, maxTypes);
  return { exact: null, types };
}

export function neuronsOfType(neurons, strings, typeName) {
  return neurons.filter((n) => n.hasSoma && (strings.type[n.type] || "") === typeName);
}
