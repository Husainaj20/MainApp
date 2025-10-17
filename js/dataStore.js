// Embedded project data
const projectsSeed = [
  {
    id: 1,
    name: "Highway 101 Bridge Replacement",
    status: "Active",
    total: 45,
    done: 32,
    updated: "Oct 12, 2025",
    description: "Complete replacement of the aging bridge structure on Highway 101 with modern seismic-resistant design.",
    team: ["Sarah Chen", "Mike Rodriguez", "Jennifer Kim"]
  },
  {
    id: 2,
    name: "Downtown Traffic Signal Upgrade",
    status: "In Progress",
    total: 28,
    done: 15,
    updated: "Oct 10, 2025",
    description: "Modernization of 12 traffic signals in the downtown corridor.",
    team: ["David Park", "Lisa Thompson", "Carlos Martinez"]
  },
  {
    id: 3,
    name: "Regional Transit Center Expansion",
    status: "Blocked",
    total: 67,
    done: 23,
    updated: "Oct 8, 2025",
    description: "Expansion of the regional transit center to accommodate increased ridership.",
    team: ["Jennifer Kim", "Sarah Chen", "Tom Anderson"]
  },
  {
    id: 4,
    name: "City Park Bridge Maintenance",
    status: "Active",
    total: 22,
    done: 18,
    updated: "Oct 13, 2025",
    description: "Routine maintenance and safety improvements for the pedestrian bridge at City Park.",
    team: ["Mike Rodriguez", "Emily Davis", "Mark Wilson"]
  },
  {
    id: 5,
    name: "Highway 280 Sound Barriers",
    status: "On Hold",
    total: 38,
    done: 12,
    updated: "Oct 6, 2025",
    description: "Installation of sound barrier walls along 3 miles of Highway 280.",
    team: ["Lisa Thompson", "Tom Anderson", "Sarah Chen"]
  },
  {
    id: 6,
    name: "Smart Traffic Control System",
    status: "In Progress",
    total: 45,
    done: 27,
    updated: "Oct 14, 2025",
    description: "Implementation of AI-powered traffic control system across 15 intersections.",
    team: ["David Park", "Carlos Martinez", "Jennifer Kim"]
  }
];

let projects = [...projectsSeed];

export function getProjects() {
  return projects;
}

export function setProjects(newProjects) {
  projects = Array.isArray(newProjects) ? [...newProjects] : [];
  return projects;
}

export function resetProjects() {
  projects = [...projectsSeed];
  return projects;
}

export function addProject(project) {
  projects = [...projects, project];
  return projects;
}

export function getInitialProjects() {
  return projectsSeed;
}

export function ensureProjectsLoaded() {
  return Promise.resolve(projects);
}
