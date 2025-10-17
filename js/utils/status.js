const lower = (value) => String(value || "").toLowerCase();

export function normalizeStatus(value) {
  const status = lower(value);
  if (status === "inprogress" || status === "progress" || status === "in progress") {
    return "progress";
  }
  if (status === "onhold" || status === "hold" || status === "on hold") {
    return "hold";
  }
  if (status === "blocked") {
    return "blocked";
  }
  if (status === "active") {
    return "active";
  }
  return "other";
}

export function getStatusDisplayName(value) {
  const status = normalizeStatus(value);
  switch (status) {
    case "active":
      return "Active";
    case "progress":
      return "In Progress";
    case "blocked":
      return "Blocked";
    case "hold":
      return "On Hold";
    default:
      return "All";
  }
}

export function badgeClass(value) {
  const raw = lower(value);
  if (raw === "archived" || raw === "closed" || raw === "done") {
    return "gray";
  }

  const status = normalizeStatus(value);
  if (status === "active") return "green";
  if (status === "progress") return "blue";
  if (status === "blocked") return "red";
  if (status === "hold") return "amber";
  return "blue";
}
