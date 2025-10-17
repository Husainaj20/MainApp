// Global variables for filter state
var currentFilter = null; // null = all projects, or specific status
var selectedTeamMembers = []; // Array of selected team member names
var currentSearchTerm = "";
var projects = [];

// Navigation state
var filterHistory = [];
var savedFilters = [];
var currentPage = "dashboard";

(function () {
  function es(s) {
    return String(s == null ? "" : s);
  }
  function num(n) {
    n = Number(n);
    return isFinite(n) ? n : 0;
  }
  function lc(s) {
    return String(s || "").toLowerCase();
  }

  // Team member dropdown state
  var teamDropdownOpen = false;

  function badgeClass(s) {
    s = lc(s);
    if (s === "active") return "green";
    if (s === "in progress" || s === "inprogress" || s === "progress")
      return "blue";
    if (s === "blocked") return "red";
    if (s === "on hold" || s === "onhold" || s === "hold") return "amber";
    if (s === "archived" || s === "closed" || s === "done") return "gray";
    return "blue";
  }

  function normalizeStatus(s) {
    s = lc(s);
    if (s === "inprogress" || s === "progress" || s === "in progress")
      return "progress";
    else if (s === "onhold" || s === "hold" || s === "on hold") return "hold";
    else if (s === "blocked") return "blocked";
    else if (s === "active") return "active";
    else return "other";
  }

  function getStatusDisplayName(status) {
    switch (status) {
      case "active":
        return "Active";
      case "progress":
        return "In Progress";
      case "blocked":
        return "Blocked";
      case "hold":
        return "On Hold";
      case "other":
        return "Other";
      default:
        return "All";
    }
  }

  function updateDisplay() {
    var filteredProjects = currentFilter
      ? projects.filter(function (p) {
          return normalizeStatus(p.status) === currentFilter;
        })
      : projects;

    // Update card count
    activeSummary.textContent = filteredProjects.length;

    // Update meta text based on filter status
    var metaEl = document.getElementById("projectsMeta");
    if (currentFilter) {
      metaEl.textContent = getStatusDisplayName(currentFilter);
      metaEl.style.display = "";
    } else {
      metaEl.style.display = "none";
    }

    // Update grid with filtered projects
    renderProjectCards(filteredProjects);

    // Update tasks card to reflect filtered projects
    updateTasksCard(filteredProjects);

    // Update activity log
    updateActivityLog();

    // Update wheel visual state
    updateWheelState();
  }

  function updateActivityLog() {
    // Generate activities for filtered projects
    var activities = [];

    // Get currently filtered projects
    var filteredProjects = projects;
    if (currentFilter) {
      filteredProjects = filteredProjects.filter(function (p) {
        return normalizeStatus(p.status) === currentFilter;
      });
    }
    if (currentSearchTerm) {
      filteredProjects = filteredProjects.filter(function (p) {
        var searchText = (
          (p.name || "") +
          " " +
          (p.description || "") +
          " " +
          (p.status || "")
        ).toLowerCase();
        return searchText.includes(currentSearchTerm.toLowerCase());
      });
    }

    // Generate activities for each filtered project
    filteredProjects.forEach(function (project) {
      var projectActivities = generateProjectActivities(project);
      activities = activities.concat(projectActivities);
    });

    // Apply team member filter to activities (optional - show activities assigned to selected members)
    if (selectedTeamMembers.length > 0) {
      activities = activities.filter(function (activity) {
        // Show activity if it's assigned to a selected team member
        return (
          activity.assignedTo &&
          selectedTeamMembers.includes(activity.assignedTo)
        );
      });
    }

    // Sort all activities by date (most recent first)
    activities.sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Take the 4 most recent
    var recentActivities = activities.slice(0, 4);

    var activityList = document.getElementById("activityList");
    activityList.innerHTML = "";

    recentActivities.forEach(function (activity, index) {
      var item = document.createElement("div");
      item.className = "activity-item";
      item.style.cursor = "pointer";
      item.title = "Click to view " + activity.projectName;

      // Add click handler to navigate to project
      item.addEventListener("click", function () {
        // Clear any existing filters to ensure the project is visible
        currentFilter = null;
        currentSearchTerm = "";
        selectedTeamMembers = [];

        // Update UI to reflect cleared filters
        var searchInput = document.getElementById("searchInput");
        var clearButton = document.getElementById("clearSearch");
        var statusDropdown = document.getElementById("statusFilter");

        if (searchInput) searchInput.value = "";
        if (clearButton) clearButton.style.display = "none";
        if (statusDropdown) statusDropdown.value = "";

        // Update dropdown texts
        updateTeamDropdownText();

        // Clear team checkboxes
        var teamCheckboxes = document.querySelectorAll(
          '#teamOptionsContainer input[type="checkbox"]'
        );
        teamCheckboxes.forEach(function (cb) {
          cb.checked = false;
        });

        // Update the display
        updateFilter();

        // Scroll to the specific project card after a brief delay
        setTimeout(function () {
          var projectCards = document.querySelectorAll(".card");
          projectCards.forEach(function (card) {
            var titleElement = card.querySelector(".title");
            if (
              titleElement &&
              titleElement.textContent.trim() === activity.projectName.trim()
            ) {
              card.scrollIntoView({ behavior: "smooth", block: "center" });
              // Add a subtle highlight effect
              card.style.transform = "scale(1.02)";
              card.style.boxShadow = "0 8px 32px rgba(59, 130, 246, 0.3)";
              setTimeout(function () {
                card.style.transform = "";
                card.style.boxShadow = "";
              }, 2000);
            }
          });
        }, 100);
      });

      var dot = document.createElement("div");
      dot.className =
        "activity-dot " +
        (index === 0
          ? "recent"
          : index === 1
          ? "medium"
          : index <= 2
          ? "older"
          : "oldest");

      var content = document.createElement("div");
      content.className = "activity-content";

      var actionText = document.createElement("p");
      actionText.className = "activity-project";
      actionText.textContent = es(activity.action);
      actionText.title = es(activity.action);

      var projectText = document.createElement("p");
      projectText.className = "activity-date";
      var projectInfo = es(activity.projectName) + " • " + es(activity.timeAgo);
      if (activity.assignedTo) {
        projectInfo += " • " + es(activity.assignedTo);
      }
      projectText.textContent = projectInfo;

      content.appendChild(actionText);
      content.appendChild(projectText);
      item.appendChild(dot);
      item.appendChild(content);

      activityList.appendChild(item);
    });

    // Show empty state if no activities
    if (recentActivities.length === 0) {
      var emptyItem = document.createElement("div");
      emptyItem.className = "activity-item";
      emptyItem.innerHTML =
        '<div class="activity-content"><p class="activity-project" style="color: var(--muted); font-style: italic;">No recent activities found</p></div>';
      activityList.appendChild(emptyItem);
    }
  }

  function generateProjectActivities(project) {
    var activities = [];
    var activityTypes = [
      "Project created",
      "Status updated",
      "Task completed",
      "Budget approved",
      "Review completed",
      "Documents uploaded",
      "Team assigned",
      "Milestone reached",
      "Progress updated",
    ];

    // Generate 1-5 activities per project
    var numActivities = Math.floor(Math.random() * 5) + 1;
    var baseDate = new Date(project.updated || "2025-10-14");

    for (var i = 0; i < numActivities; i++) {
      // Create activities going backwards in time
      var activityDate = new Date(
        baseDate.getTime() - i * Math.random() * 7 * 24 * 60 * 60 * 1000
      ); // Up to 7 days ago

      // Assign team member from project team (or random if no team)
      var assignedMember = null;
      if (
        project.team &&
        Array.isArray(project.team) &&
        project.team.length > 0
      ) {
        assignedMember =
          project.team[Math.floor(Math.random() * project.team.length)];
      }

      activities.push({
        action: activityTypes[Math.floor(Math.random() * activityTypes.length)],
        projectName: project.name,
        projectId: project.id,
        timestamp: activityDate,
        timeAgo: getTimeAgo(activityDate),
        assignedTo: assignedMember,
      });
    }

    return activities;
  }

  function getTimeAgo(date) {
    var now = new Date();
    var diffMs = now - date;
    var diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    var diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24)
      return diffHours + " hour" + (diffHours === 1 ? "" : "s") + " ago";
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return diffDays + " days ago";

    return (
      Math.floor(diffDays / 7) +
      " week" +
      (Math.floor(diffDays / 7) === 1 ? "" : "s") +
      " ago"
    );
  }

  function updateTasksCard(filteredProjects) {
    // Calculate task totals for currently visible projects
    var totals = filteredProjects.reduce(
      function (acc, p) {
        acc.total += num(p.total);
        acc.done += num(p.done);
        return acc;
      },
      { total: 0, done: 0 }
    );

    var pctAll = totals.total
      ? Math.round((100 * totals.done) / totals.total)
      : 0;

    document.getElementById("tasksSummary").textContent = totals.total;
    document.getElementById("tasksMeta").textContent =
      totals.done + " / " + totals.total + " done";
    document.getElementById("tasksBar").style.width = pctAll + "%";

    // Generate activities for filtered projects
    var activities = [];
    filteredProjects.forEach(function (project) {
      var projectActivities = generateProjectActivities(project);
      activities = activities.concat(projectActivities);
    });

    // Apply team member filter to activities (optional - show activities assigned to selected members)
    if (selectedTeamMembers.length > 0) {
      activities = activities.filter(function (activity) {
        // Show activity if it's assigned to a selected team member
        return (
          activity.assignedTo &&
          selectedTeamMembers.includes(activity.assignedTo)
        );
      });
    }

    // Sort all activities by date (most recent first)
    activities.sort(function (a, b) {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Take the 4 most recent
    var recentActivities = activities.slice(0, 4);

    var activityList = document.getElementById("activityList");
    activityList.innerHTML = "";

    recentActivities.forEach(function (activity, index) {
      var item = document.createElement("div");
      item.className = "activity-item";
      item.style.cursor = "pointer";
      item.title = "Click to view " + activity.projectName;

      // Add click handler to navigate to project
      item.addEventListener("click", function () {
        // Clear any existing filters to ensure the project is visible
        currentFilter = null;
        currentSearchTerm = "";
        selectedTeamMembers = [];

        // Update UI to reflect cleared filters
        var searchInput = document.getElementById("searchInput");
        var clearButton = document.getElementById("clearSearch");
        var statusDropdown = document.getElementById("statusFilter");

        if (searchInput) searchInput.value = "";
        if (clearButton) clearButton.style.display = "none";
        if (statusDropdown) statusDropdown.value = "";

        // Update dropdown texts
        updateTeamDropdownText();

        // Clear team checkboxes
        var teamCheckboxes = document.querySelectorAll(
          '#teamOptionsContainer input[type="checkbox"]'
        );
        teamCheckboxes.forEach(function (cb) {
          cb.checked = false;
        });

        // Update the display
        updateFilter();

        // Scroll to the specific project card after a brief delay
        setTimeout(function () {
          var projectCards = document.querySelectorAll(".card");
          projectCards.forEach(function (card) {
            var titleElement = card.querySelector(".title");
            if (
              titleElement &&
              titleElement.textContent.trim() === activity.projectName
            ) {
              card.scrollIntoView({ behavior: "smooth", block: "center" });

              // Add temporary highlight effect
              card.style.transform = "scale(1.02)";
              card.style.boxShadow = "0 8px 25px rgba(59, 130, 246, 0.3)";
              card.style.transition = "all 0.3s ease";

              setTimeout(function () {
                card.style.transform = "";
                card.style.boxShadow = "";
              }, 2000);
            }
          });
        }, 100);
      });

      var dot = document.createElement("div");
      dot.className =
        "activity-dot " +
        (index === 0
          ? "recent"
          : index === 1
          ? "medium"
          : index <= 2
          ? "older"
          : "oldest");

      var content = document.createElement("div");
      content.className = "activity-content";

      var actionText = document.createElement("p");
      actionText.className = "activity-project";
      actionText.textContent = es(activity.action);
      actionText.title = es(activity.action);

      var projectText = document.createElement("p");
      projectText.className = "activity-date";
      var projectInfo = es(activity.projectName) + " • " + es(activity.timeAgo);
      if (activity.assignedTo) {
        projectInfo += " • " + es(activity.assignedTo);
      }
      projectText.textContent = projectInfo;

      content.appendChild(actionText);
      content.appendChild(projectText);
      item.appendChild(dot);
      item.appendChild(content);

      activityList.appendChild(item);
    });

    // Show empty state if no activities
    if (recentActivities.length === 0) {
      var emptyItem = document.createElement("div");
      emptyItem.className = "activity-item";
      emptyItem.innerHTML =
        '<div class="activity-content"><p class="activity-project" style="color: var(--muted); font-style: italic;">No recent activities found</p></div>';
      activityList.appendChild(emptyItem);
    }
  }

  function updateWheelState() {
    // Remove active class from all arcs
    [activeArc, progressArc, blockedArc, holdArc, otherArc].forEach(function (
      arc
    ) {
      arc.classList.remove("arc-active");
    });

    // Add active class to current filter
    if (currentFilter === "active") activeArc.classList.add("arc-active");
    else if (currentFilter === "progress")
      progressArc.classList.add("arc-active");
    else if (currentFilter === "blocked")
      blockedArc.classList.add("arc-active");
    else if (currentFilter === "hold") holdArc.classList.add("arc-active");
    else if (currentFilter === "other") otherArc.classList.add("arc-active");
  }

  function renderProjectCards(projectsToRender) {
    grid.innerHTML = "";
    var controlsSection = document.querySelector(".controls-section");

    if (!projectsToRender.length) {
      empty.style.display = "";

      // Update empty state message based on active filters
      var emptyTitle = empty.querySelector(".empty-state-title");
      var emptyDesc = empty.querySelector(".empty-state-description");

      if (
        currentFilter ||
        currentSearchTerm ||
        selectedTeamMembers.length > 0
      ) {
        emptyTitle.textContent = "No matching projects found";
        emptyDesc.textContent =
          "We couldn't find any projects matching your current filters. Try adjusting your search criteria or clearing filters to see all projects.";
      } else {
        emptyTitle.textContent = "No projects available";
        emptyDesc.textContent =
          "There are no projects to display at the moment. Projects will appear here once they are added to the system.";
      }

      grid.classList.remove("single-card", "two-cards");
      controlsSection.classList.remove("single-card", "two-cards");
    } else {
      empty.style.display = "none";

      // Add appropriate class based on number of projects
      grid.classList.remove("single-card", "two-cards");
      controlsSection.classList.remove("single-card", "two-cards");
      if (projectsToRender.length === 1) {
        grid.classList.add("single-card");
        controlsSection.classList.add("single-card");
      } else if (projectsToRender.length === 2) {
        grid.classList.add("two-cards");
        controlsSection.classList.add("two-cards");
      }

      projectsToRender.forEach(function (p) {
        var total = num(p.total),
          done = num(p.done),
          pct = total ? Math.round((100 * done) / total) : 0;

        var card = document.createElement("div");
        card.className = "card";
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
        card.setAttribute(
          "aria-label",
          `Project: ${p.name}, Status: ${p.status}, ${done} of ${total} tasks complete`
        );

        var titleRow = document.createElement("div");
        titleRow.className = "title-row";

        var title = document.createElement("div");
        title.className = "title";
        title.title = es(p.name || "Untitled Project");
        title.textContent = es(p.name || "Untitled Project");

        var status = document.createElement("div");
        status.className = "badge " + badgeClass(p.status);
        status.textContent = es(p.status || "Active");

        titleRow.appendChild(title);
        titleRow.appendChild(status);

        var meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent =
          done + " / " + total + " tasks • Updated " + es(p.updated || "—");

        var bar = document.createElement("div");
        bar.className = "progress";
        bar.setAttribute("role", "progressbar");
        bar.setAttribute("aria-valuenow", pct);
        bar.setAttribute("aria-valuemin", "0");
        bar.setAttribute("aria-valuemax", "100");
        bar.setAttribute("aria-label", `${pct}% complete`);

        var fill = document.createElement("span");
        fill.style.width = pct + "%";
        bar.appendChild(fill);

        var desc = document.createElement("div");
        desc.className = "desc";
        desc.textContent = es(p.description || "");

        card.appendChild(titleRow);
        card.appendChild(meta);
        card.appendChild(bar);
        card.appendChild(desc);

        // Enhanced click handler with keyboard support
        function handleCardClick() {
          var id = p && p.id != null ? String(p.id) : "";
          var url =
            "fmp://$/template.fmp12?script=project%20-%20open&param=" +
            encodeURIComponent(id);
          window.location.href = url;
        }

        card.addEventListener("click", handleCardClick);
        card.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCardClick();
          }
        });

        grid.appendChild(card);
      });
    }
  }

  // Update filter function to include search
  function updateFilter() {
    var filteredProjects = projects;

    // Apply status filter using the same logic as original updateDisplay
    if (currentFilter) {
      filteredProjects = filteredProjects.filter(function (p) {
        return normalizeStatus(p.status) === currentFilter;
      });
    }

    // Apply search filter
    if (currentSearchTerm) {
      filteredProjects = filteredProjects.filter(function (p) {
        var searchText = (
          (p.name || "") +
          " " +
          (p.description || "") +
          " " +
          (p.status || "")
        ).toLowerCase();
        return searchText.includes(currentSearchTerm.toLowerCase());
      });
    }

    // Apply team member filter
    if (selectedTeamMembers.length > 0) {
      filteredProjects = filteredProjects.filter(function (p) {
        if (!p.team || !Array.isArray(p.team)) return false;
        return selectedTeamMembers.some(function (selectedMember) {
          return p.team.includes(selectedMember);
        });
      });
    }

    // Update project count in top card (exactly like original)
    activeSummary.textContent = filteredProjects.length;

    // Update meta text based on filter status
    var metaEl = document.getElementById("projectsMeta");
    if (currentFilter) {
      metaEl.textContent = getStatusDisplayName(currentFilter);
      metaEl.style.display = "";
    } else {
      metaEl.style.display = "none";
    }

    // Update all components
    renderProjectCards(filteredProjects);
    updateTasksCard(filteredProjects);
    updateWheelState();
  }

  // Update existing wheel click handlers to sync with dropdown
  function handleArcClick(status) {
    if (currentFilter === status) {
      currentFilter = null;
    } else {
      currentFilter = status;
    }

    // Update dropdown to match
    var statusDropdown = document.getElementById("statusFilter");
    if (statusDropdown) {
      if (currentFilter === null) {
        statusDropdown.value = "";
      } else {
        statusDropdown.value = currentFilter;
      }
    }

    updateFilter();
  }

  // Team member filtering functionality
  function initializeTeamDropdown() {
    // Collect all unique team members from projects
    var allTeamMembers = [];
    projects.forEach(function (project) {
      if (project.team && Array.isArray(project.team)) {
        project.team.forEach(function (member) {
          if (allTeamMembers.indexOf(member) === -1) {
            allTeamMembers.push(member);
          }
        });
      }
    });

    // Sort team members alphabetically
    allTeamMembers.sort();

    // Populate dropdown menu options container
    var teamOptionsContainer = document.getElementById("teamOptionsContainer");
    if (!teamOptionsContainer) {
      return;
    }
    teamOptionsContainer.innerHTML = "";

    allTeamMembers.forEach(function (member) {
      var option = document.createElement("div");
      option.className = "team-option";
      option.innerHTML =
        '<input type="checkbox" id="team-' +
        member.replace(/\s+/g, "-") +
        '" data-member="' +
        member +
        '"> <label for="team-' +
        member.replace(/\s+/g, "-") +
        '">' +
        member +
        "</label>";
      teamOptionsContainer.appendChild(option);
    });

    // Add search functionality
    var teamSearchInput = document.getElementById("teamSearchInput");
    if (teamSearchInput) {
      teamSearchInput.addEventListener("input", function (e) {
        var searchTerm = e.target.value.toLowerCase();
        var options = teamOptionsContainer.querySelectorAll(".team-option");

        options.forEach(function (option) {
          var label = option.querySelector("label").textContent.toLowerCase();
          option.style.display = label.includes(searchTerm) ? "flex" : "none";
        });
      });
    }
  }

  function updateTeamDropdownText() {
    var teamDropdownText = document.getElementById("teamDropdownText");
    var teamCount = document.getElementById("teamCount");

    if (selectedTeamMembers.length === 0) {
      teamDropdownText.textContent = "All Team Members";
      teamCount.style.display = "none";
    } else if (selectedTeamMembers.length === 1) {
      teamDropdownText.textContent = selectedTeamMembers[0];
      teamCount.style.display = "none";
    } else {
      teamDropdownText.textContent = "Team Members";
      teamCount.textContent = selectedTeamMembers.length;
      teamCount.style.display = "inline-block";
    }
  }

  // Responsive dropdown text functionality
  function updateDropdownText() {
    var dropdown = document.getElementById("statusFilter");
    if (!dropdown || dropdown.options.length < 5) {
      return;
    }

    var screenWidth = window.innerWidth;

    if (screenWidth <= 640) {
      // Very small screens - use short text
      dropdown.options[0].text = "All";
      dropdown.options[1].text = "Active";
      dropdown.options[2].text = "Progress";
      dropdown.options[3].text = "Blocked";
      dropdown.options[4].text = "Hold";
    } else if (screenWidth <= 900) {
      // Medium screens - use abbreviated text
      dropdown.options[0].text = "All";
      dropdown.options[1].text = "Active";
      dropdown.options[2].text = "Progress";
      dropdown.options[3].text = "Blocked";
      dropdown.options[4].text = "Hold";
    } else {
      // Large screens - use full text
      dropdown.options[0].text = "All Projects";
      dropdown.options[1].text = "Active";
      dropdown.options[2].text = "In Progress";
      dropdown.options[3].text = "Blocked";
      dropdown.options[4].text = "On Hold";
    }
  }

  /* Read Projects JSON */
  var dataNode = document.getElementById("data");
  var raw = dataNode ? dataNode.textContent || "[]" : "[]";
  try {
    projects = JSON.parse(raw);
  } catch (e) {
    projects = [];
  }

  /* DOM refs */
  var grid = document.getElementById("grid");
  var empty = document.getElementById("empty");
  var mainCard = document.getElementById("mainCard");
  var activeSummary = document.getElementById("activeSummary");

  // Status wheel arcs
  var activeArc = document.getElementById("activeArc");
  var progressArc = document.getElementById("progressArc");
  var blockedArc = document.getElementById("blockedArc");
  var holdArc = document.getElementById("holdArc");
  var otherArc = document.getElementById("otherArc");

  var tasksCard = document.getElementById("tasksCard");
  var tasksSummary = document.getElementById("tasksSummary");
  var tasksMeta = document.getElementById("tasksMeta");
  var tasksBar = document.getElementById("tasksBar");

  grid.innerHTML = "";

  /* 🔹 Total Projects summary with status breakdown wheel */
  if (projects.length > 0) {
    // Count projects by status
    var counts = { active: 0, progress: 0, blocked: 0, hold: 0, other: 0 };
    projects.forEach(function (p) {
      var s = normalizeStatus(p.status);
      counts[s] += 1;
    });

    // Calculate arc lengths for the status wheel with bigger size
    // Circle circumference = 2πr = 2π(30) ≈ 188
    var circumference = 188;
    var total = projects.length;

    // Reset all arcs first to prevent overlapping
    [activeArc, progressArc, blockedArc, holdArc, otherArc].forEach(function (
      arc
    ) {
      arc.setAttribute("stroke-dasharray", "0 " + circumference);
      arc.setAttribute("stroke-dashoffset", "0");
    });

    // Calculate segments with gaps to prevent overlap
    var segments = [];
    if (counts.active > 0)
      segments.push({ count: counts.active, arc: activeArc, status: "active" });
    if (counts.progress > 0)
      segments.push({
        count: counts.progress,
        arc: progressArc,
        status: "progress",
      });
    if (counts.blocked > 0)
      segments.push({
        count: counts.blocked,
        arc: blockedArc,
        status: "blocked",
      });
    if (counts.hold > 0)
      segments.push({ count: counts.hold, arc: holdArc, status: "hold" });
    if (counts.other > 0)
      segments.push({ count: counts.other, arc: otherArc, status: "other" });

    if (segments.length > 0) {
      var gapSize = segments.length > 1 ? 2 : 0; // 2px gap between segments
      var minSegmentSize = 15; // Minimum segment size for clickability
      var totalGaps = (segments.length - 1) * gapSize;
      var totalMinSize = segments.length * minSegmentSize;
      var availableCircumference = circumference - totalGaps;

      // Check if we need to use minimum sizes
      var useMinSizes = totalMinSize > availableCircumference;
      var offset = 0;

      if (useMinSizes) {
        // Use minimum sizes for all segments
        segments.forEach(function (segment, index) {
          segment.arc.setAttribute(
            "stroke-dasharray",
            minSegmentSize + " " + circumference
          );
          segment.arc.setAttribute("stroke-dashoffset", -offset);
          offset += minSegmentSize + gapSize;

          // Add click handler to each segment
          segment.arc.addEventListener("click", function (e) {
            e.stopPropagation();
            handleArcClick(
              currentFilter === segment.status ? null : segment.status
            );
          });
        });
      } else {
        // Use proportional sizes but ensure minimum
        segments.forEach(function (segment, index) {
          var proportionalLength =
            (segment.count / total) * availableCircumference;
          var length = Math.max(proportionalLength, minSegmentSize);

          segment.arc.setAttribute(
            "stroke-dasharray",
            length + " " + circumference
          );
          segment.arc.setAttribute("stroke-dashoffset", -offset);
          offset += length + gapSize;

          // Add click handler to each segment
          segment.arc.addEventListener("click", function (e) {
            e.stopPropagation();
            handleArcClick(
              currentFilter === segment.status ? null : segment.status
            );
          });
        });
      }
    }

    // Add click handler to background circle to reset filter
    var bgCircle = document.querySelector(".bg-circle");
    if (bgCircle) {
      bgCircle.addEventListener("click", function (e) {
        e.stopPropagation();
        handleArcClick(null);
      });
    }

    mainCard.style.display = "flex";
  } else {
    mainCard.style.display = "none";
  }

  // Show tasks card
  tasksCard.style.display = "flex";

  // Initialize and add resize listener
  updateDropdownText();
  window.addEventListener("resize", updateDropdownText);

  // Search and filter functionality
  var searchInput = document.getElementById("searchInput");
  var clearButton = document.getElementById("clearSearch");

  // Check if elements exist before setting up functionality
  if (!searchInput || !clearButton) {
    console.error("Search elements not found:", {
      searchInput: !!searchInput,
      clearButton: !!clearButton,
    });
  } else {
    // Search input functionality
    searchInput.addEventListener("input", function (e) {
      currentSearchTerm = e.target.value.trim();

      // Show/hide clear button
      if (currentSearchTerm) {
        clearButton.style.display = "flex";
      } else {
        clearButton.style.display = "none";
      }

      updateFilter();
    });

    // Clear search functionality
    clearButton.addEventListener("click", function () {
      searchInput.value = "";
      currentSearchTerm = "";
      clearButton.style.display = "none";
      updateFilter();
      searchInput.focus();
    });
  }

  // Initialize dropdowns
  initializeTeamDropdown();

  // Status filter dropdown event
  var statusDropdown = document.getElementById("statusFilter");
  if (statusDropdown) {
    statusDropdown.addEventListener("change", function () {
      currentFilter = this.value || null;
      updateFilter();
    });
  }

  // Team dropdown event handlers
  var teamDropdownTrigger = document.getElementById("teamDropdownTrigger");
  var teamDropdownMenu = document.getElementById("teamDropdownMenu");

  if (teamDropdownTrigger && teamDropdownMenu) {
    teamDropdownTrigger.addEventListener("click", function (e) {
      e.stopPropagation();
      teamDropdownOpen = !teamDropdownOpen;
      teamDropdownMenu.classList.toggle("show", teamDropdownOpen);
    });

    // Handle checkbox changes
    teamDropdownMenu.addEventListener("change", function (e) {
      if (e.target.type === "checkbox") {
        var member = e.target.getAttribute("data-member");
        if (e.target.checked) {
          if (selectedTeamMembers.indexOf(member) === -1) {
            selectedTeamMembers.push(member);
          }
        } else {
          var index = selectedTeamMembers.indexOf(member);
          if (index > -1) {
            selectedTeamMembers.splice(index, 1);
          }
        }
        updateTeamDropdownText();
        updateFilter();
      }
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener("click", function (e) {
    if (
      teamDropdownTrigger &&
      teamDropdownMenu &&
      !teamDropdownTrigger.contains(e.target) &&
      !teamDropdownMenu.contains(e.target)
    ) {
      teamDropdownOpen = false;
      teamDropdownMenu.classList.remove("show");
    }
  });

  /* Initialize display */
  updateFilter();

  // Make functions globally accessible for external calls
  window.updateFilter = updateFilter;
  window.updateTeamDropdownText = updateTeamDropdownText;
})();

// Enhanced UI Functions

// Toast notification system
function showToast(title, message, type = "info", duration = 4000) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: "✓",
    error: "✕",
    warning: "⚠",
    info: "ℹ",
  };

  toast.innerHTML = `
    <div class="toast-icon">${iconMap[type] || "ℹ"}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
  `;

  container.appendChild(toast);

  // Trigger animation
  setTimeout(() => toast.classList.add("show"), 100);

  // Auto remove
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => container.removeChild(toast), 300);
  }, duration);
}

// Modal system
function showModal(title, content, onConfirm = null) {
  const overlay = document.getElementById("modalOverlay");
  const titleEl = document.getElementById("modalTitle");
  const bodyEl = document.getElementById("modalBody");

  titleEl.textContent = title;
  bodyEl.innerHTML = content;

  overlay.classList.add("show");

  // Focus management
  const firstFocusable = overlay.querySelector(
    "button, input, textarea, select"
  );
  if (firstFocusable) firstFocusable.focus();

  // Store confirm handler
  window.currentModalConfirm = onConfirm;
}

function closeModal() {
  const overlay = document.getElementById("modalOverlay");
  overlay.classList.remove("show");
  window.currentModalConfirm = null;
}

function confirmModal() {
  if (window.currentModalConfirm) {
    window.currentModalConfirm();
  }
  closeModal();
}

// Clear all filters function
function clearAllFilters() {
  // Reset all filter states (these are now global variables)
  currentFilter = null;
  currentSearchTerm = "";
  selectedTeamMembers = [];

  // Update UI elements
  var searchInput = document.getElementById("searchInput");
  var clearButton = document.getElementById("clearSearch");
  var statusDropdown = document.getElementById("statusFilter");

  if (searchInput) searchInput.value = "";
  if (clearButton) clearButton.style.display = "none";
  if (statusDropdown) statusDropdown.value = "";

  // Update team dropdown
  if (window.updateTeamDropdownText) window.updateTeamDropdownText();

  // Clear team checkboxes
  var teamCheckboxes = document.querySelectorAll(
    '#teamOptionsContainer input[type="checkbox"]'
  );
  teamCheckboxes.forEach(function (cb) {
    cb.checked = false;
  });

  // Update display
  if (window.updateFilter) window.updateFilter();

  // Show success toast
  showToast("Filters Cleared", "All filters have been reset", "success");
}

// Enhanced keyboard navigation
document.addEventListener("keydown", function (e) {
  // ESC to close modal
  if (e.key === "Escape") {
    const modal = document.getElementById("modalOverlay");
    if (modal.classList.contains("show")) {
      closeModal();
    }
  }

  // Ctrl+/ to focus search
  if (e.ctrlKey && e.key === "/") {
    e.preventDefault();
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.focus();
  }
});

// Loading state helpers
function showLoading(element) {
  if (element) {
    element.classList.add("btn-loading");
    element.disabled = true;
  }
}

function hideLoading(element) {
  if (element) {
    element.classList.remove("btn-loading");
    element.disabled = false;
  }
}

// Enhanced Navigation Functions

// Navigation Menu Functionality
function initializeNavigation() {
  // Main navigation links
  document.querySelectorAll(".nav-link[data-page]").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      navigateToPage(this.dataset.page);
    });
  });

  // Navigation dropdown
  const navDropdownTrigger = document.querySelector(".nav-dropdown-trigger");
  const navDropdownMenu = document.querySelector(".nav-dropdown-menu");

  if (navDropdownTrigger && navDropdownMenu) {
    navDropdownTrigger.addEventListener("click", function (e) {
      e.preventDefault();
      const isOpen = this.getAttribute("aria-expanded") === "true";
      this.setAttribute("aria-expanded", !isOpen);
      navDropdownMenu.classList.toggle("show", !isOpen);
    });

    // Dropdown actions
    document
      .querySelectorAll(".nav-dropdown-link[data-action]")
      .forEach((link) => {
        link.addEventListener("click", function (e) {
          e.preventDefault();
          handleDropdownAction(this.dataset.action);
          navDropdownMenu.classList.remove("show");
          navDropdownTrigger.setAttribute("aria-expanded", "false");
        });
      });
  }

  // Close dropdown when clicking outside
  document.addEventListener("click", function (e) {
    if (
      !navDropdownTrigger?.contains(e.target) &&
      !navDropdownMenu?.contains(e.target)
    ) {
      navDropdownMenu?.classList.remove("show");
      navDropdownTrigger?.setAttribute("aria-expanded", "false");
    }
  });
}

function navigateToPage(page) {
  // Update active nav link
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
  });

  document.querySelector(`[data-page="${page}"]`)?.classList.add("active");

  // Update breadcrumb
  updateBreadcrumb(page);

  // Handle page-specific logic
  currentPage = page;

  switch (page) {
    case "dashboard":
      showToast("Navigation", "Switched to Dashboard view", "info", 2000);
      break;
    case "reports":
      showModal(
        "Reports",
        "Reports functionality coming soon! This will include analytics, charts, and data exports.",
        null
      );
      break;
    case "team":
      showModal(
        "Team Management",
        "Team management features coming soon! This will allow you to manage team members, roles, and permissions.",
        null
      );
      break;
  }
}

function handleDropdownAction(action) {
  switch (action) {
    case "show-all":
      clearAllFilters();
      break;
    case "show-active":
      currentFilter = "active";
      updateFilter();
      updateBreadcrumb("dashboard", "Active Projects");
      break;
    case "show-archived":
      showModal(
        "Archived Projects",
        "Archive functionality coming soon! This will show completed and archived projects.",
        null
      );
      break;
    case "create-project":
      openCreateProjectModal();
      break;
  }
}

function updateBreadcrumb(page, filter = null) {
  const breadcrumbCurrent = document.getElementById("breadcrumbCurrent");

  let text = "";
  switch (page) {
    case "dashboard":
      text = filter || "Dashboard";
      break;
    case "reports":
      text = "Reports & Analytics";
      break;
    case "team":
      text = "Team Management";
      break;
    default:
      text = "Dashboard";
  }

  if (breadcrumbCurrent) {
    breadcrumbCurrent.textContent = text;
  }
}

// Filter Presets Functionality
function initializeFilterPresets() {
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      applyFilterPreset(this.dataset.preset);

      // Update active state
      document
        .querySelectorAll(".preset-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
    });
  });
}

function applyFilterPreset(preset) {
  // Save current filter to history
  saveFilterToHistory();

  switch (preset) {
    case "all":
      clearAllFilters();
      updateBreadcrumb("dashboard", "All Projects");
      break;
    case "my-projects":
      // Mock user - in real app this would come from user session
      const currentUser = "Sarah Chen";
      selectedTeamMembers = [currentUser];
      currentFilter = null;
      currentSearchTerm = "";
      updateFilter();
      updateTeamDropdownText();
      updateBreadcrumb("dashboard", "My Projects");
      showToast(
        "Filter Applied",
        `Showing projects assigned to ${currentUser}`,
        "success",
        3000
      );
      break;
    case "overdue":
      // Mock overdue logic - in real app this would filter by due dates
      currentFilter = "blocked";
      updateFilter();
      updateBreadcrumb("dashboard", "Overdue Projects");
      showToast(
        "Filter Applied",
        "Showing overdue and blocked projects",
        "warning",
        3000
      );
      break;
    case "this-quarter":
      // Mock quarter logic - in real app this would filter by date ranges
      currentFilter = "active";
      updateFilter();
      updateBreadcrumb("dashboard", "This Quarter");
      showToast(
        "Filter Applied",
        "Showing active projects from this quarter",
        "info",
        3000
      );
      break;
  }
}

// Quick Actions Functionality
function initializeQuickActions() {
  // Create Project
  document
    .getElementById("createProjectBtn")
    ?.addEventListener("click", openCreateProjectModal);

  // Export Data
  document.getElementById("exportBtn")?.addEventListener("click", function () {
    showLoading(this);

    // Mock export process
    setTimeout(() => {
      hideLoading(this);
      showToast(
        "Export Complete",
        "Project data has been exported to CSV",
        "success"
      );
    }, 2000);
  });

  // Print View
  document.getElementById("printBtn")?.addEventListener("click", function () {
    window.print();
    showToast("Print", "Opening print dialog...", "info", 2000);
  });

  // Advanced Search
  document
    .getElementById("advancedSearchBtn")
    ?.addEventListener("click", openAdvancedSearch);

  // Refresh Data
  document.getElementById("refreshBtn")?.addEventListener("click", function () {
    showLoading(this);

    // Mock refresh process
    setTimeout(() => {
      hideLoading(this);
      updateFilter();
      showToast("Data Refreshed", "Project data has been updated", "success");
    }, 1500);
  });

  // Help
  document.getElementById("helpBtn")?.addEventListener("click", function () {
    showModal(
      "Help & Documentation",
      `
      <div style="text-align: left;">
        <h4>Keyboard Shortcuts</h4>
        <ul>
          <li><kbd>Ctrl + /</kbd> - Focus search</li>
          <li><kbd>Esc</kbd> - Close modals</li>
        </ul>
        
        <h4>Navigation</h4>
        <ul>
          <li>Use the filter presets for quick views</li>
          <li>Click the status wheel to filter by status</li>
          <li>Use team dropdown to filter by team members</li>
        </ul>
        
        <h4>Features</h4>
        <ul>
          <li>Search across project names, descriptions, and status</li>
          <li>Filter history is saved automatically</li>
          <li>All interactions preserve smooth animations</li>
        </ul>
      </div>
    `,
      null
    );
  });
}

// Advanced Search Modal Functions
function openAdvancedSearch() {
  const modal = document.getElementById("advancedSearchModal");
  modal.classList.add("show");

  // Focus first input
  const firstInput = modal.querySelector("input");
  if (firstInput) firstInput.focus();

  // Populate current values
  document.getElementById("advancedSearchText").value = currentSearchTerm;

  // Load filter history
  loadFilterHistory();
}

function closeAdvancedSearch() {
  const modal = document.getElementById("advancedSearchModal");
  modal.classList.remove("show");
}

function initializeAdvancedSearch() {
  // Tab switching
  document.querySelectorAll(".search-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      const targetTab = this.dataset.tab;

      // Update active tab
      document
        .querySelectorAll(".search-tab")
        .forEach((t) => t.classList.remove("active"));
      this.classList.add("active");

      // Show corresponding content
      document.querySelectorAll(".search-tab-content").forEach((content) => {
        content.style.display = "none";
      });

      document.getElementById(targetTab + "Tab").style.display = "block";
    });
  });

  // Range inputs for task progress
  const progressMin = document.getElementById("taskProgressMin");
  const progressMax = document.getElementById("taskProgressMax");
  const minLabel = document.getElementById("progressMinLabel");
  const maxLabel = document.getElementById("progressMaxLabel");

  if (progressMin && progressMax) {
    progressMin.addEventListener("input", function () {
      minLabel.textContent = this.value + "%";
      if (parseInt(this.value) > parseInt(progressMax.value)) {
        progressMax.value = this.value;
        maxLabel.textContent = this.value + "%";
      }
    });

    progressMax.addEventListener("input", function () {
      maxLabel.textContent = this.value + "%";
      if (parseInt(this.value) < parseInt(progressMin.value)) {
        progressMin.value = this.value;
        minLabel.textContent = this.value + "%";
      }
    });
  }
}

function clearAdvancedSearch() {
  document.getElementById("advancedSearchText").value = "";
  document.getElementById("dateFrom").value = "";
  document.getElementById("dateTo").value = "";
  document.getElementById("taskProgressMin").value = "0";
  document.getElementById("taskProgressMax").value = "100";
  document.getElementById("progressMinLabel").textContent = "0%";
  document.getElementById("progressMaxLabel").textContent = "100%";

  // Reset checkboxes
  document
    .querySelectorAll('#searchInFields input[type="checkbox"]')
    .forEach((cb) => {
      cb.checked = cb.defaultChecked;
    });
}

function applyAdvancedSearch() {
  const searchText = document.getElementById("advancedSearchText").value;

  // Save to history before applying
  saveFilterToHistory();

  // Apply search
  currentSearchTerm = searchText;
  updateFilter();

  // Close modal
  closeAdvancedSearch();

  // Show feedback
  showToast(
    "Search Applied",
    "Advanced search filters have been applied",
    "success"
  );
  updateBreadcrumb("dashboard", "Advanced Search Results");
}

function saveCurrentFilter() {
  const filterName = prompt("Enter a name for this filter:");
  if (filterName) {
    const filter = {
      name: filterName,
      searchTerm: currentSearchTerm,
      statusFilter: currentFilter,
      teamMembers: [...selectedTeamMembers],
      timestamp: new Date().toISOString(),
    };

    savedFilters.unshift(filter);
    if (savedFilters.length > 10) savedFilters.pop(); // Keep only 10

    loadFilterHistory();
    showToast(
      "Filter Saved",
      `Filter "${filterName}" has been saved`,
      "success"
    );
  }
}

// Filter History Functions
function saveFilterToHistory() {
  if (currentSearchTerm || currentFilter || selectedTeamMembers.length > 0) {
    const historyItem = {
      searchTerm: currentSearchTerm,
      statusFilter: currentFilter,
      teamMembers: [...selectedTeamMembers],
      timestamp: new Date().toISOString(),
    };

    // Avoid duplicates
    const isDuplicate = filterHistory.some(
      (item) =>
        item.searchTerm === historyItem.searchTerm &&
        item.statusFilter === historyItem.statusFilter &&
        JSON.stringify(item.teamMembers) ===
          JSON.stringify(historyItem.teamMembers)
    );

    if (!isDuplicate) {
      filterHistory.unshift(historyItem);
      if (filterHistory.length > 20) filterHistory.pop(); // Keep only 20
    }
  }
}

function loadFilterHistory() {
  const recentSearches = document.getElementById("recentSearches");
  const savedFiltersEl = document.getElementById("savedFilters");

  // Recent searches
  if (recentSearches) {
    recentSearches.innerHTML = "";

    if (filterHistory.length === 0) {
      recentSearches.innerHTML =
        '<p style="color: var(--muted); font-style: italic;">No recent searches</p>';
    } else {
      filterHistory.slice(0, 10).forEach((item) => {
        const historyItem = document.createElement("div");
        historyItem.className = "history-item";

        const description = [];
        if (item.searchTerm) description.push(`"${item.searchTerm}"`);
        if (item.statusFilter)
          description.push(getStatusDisplayName(item.statusFilter));
        if (item.teamMembers.length)
          description.push(`${item.teamMembers.length} team member(s)`);

        historyItem.innerHTML = `
          <span>${description.join(" • ") || "All projects"}</span>
          <small style="color: var(--muted);">${formatRelativeTime(
            item.timestamp
          )}</small>
        `;

        historyItem.addEventListener("click", () => applyHistoryFilter(item));
        recentSearches.appendChild(historyItem);
      });
    }
  }

  // Saved filters
  if (savedFiltersEl) {
    savedFiltersEl.innerHTML = "";

    if (savedFilters.length === 0) {
      savedFiltersEl.innerHTML =
        '<p style="color: var(--muted); font-style: italic;">No saved filters</p>';
    } else {
      savedFilters.forEach((filter) => {
        const filterItem = document.createElement("div");
        filterItem.className = "history-item";

        filterItem.innerHTML = `
          <span>${filter.name}</span>
          <small style="color: var(--muted);">${formatRelativeTime(
            filter.timestamp
          )}</small>
        `;

        filterItem.addEventListener("click", () => applyHistoryFilter(filter));
        savedFiltersEl.appendChild(filterItem);
      });
    }
  }
}

function applyHistoryFilter(filter) {
  currentSearchTerm = filter.searchTerm || "";
  currentFilter = filter.statusFilter || null;
  selectedTeamMembers = [...(filter.teamMembers || [])];

  // Update UI
  const searchInput = document.getElementById("searchInput");
  const statusDropdown = document.getElementById("statusFilter");

  if (searchInput) searchInput.value = currentSearchTerm;
  if (statusDropdown) statusDropdown.value = currentFilter || "";

  updateTeamDropdownText();
  updateFilter();
  closeAdvancedSearch();

  showToast("Filter Applied", "Historical filter has been applied", "success");
}

function formatRelativeTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

// Create Project Modal
function openCreateProjectModal() {
  showModal(
    "Create New Project",
    `
    <div style="text-align: left;">
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Project Name</label>
        <input type="text" id="newProjectName" placeholder="Enter project name..." style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-lg);">
      </div>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Description</label>
        <textarea id="newProjectDesc" placeholder="Enter project description..." style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-lg); min-height: 80px; resize: vertical;"></textarea>
      </div>
      
      <div style="margin-bottom: 1rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Status</label>
        <select id="newProjectStatus" style="width: 100%; padding: 0.75rem; border: 1px solid var(--border); border-radius: var(--radius-lg);">
          <option value="Active">Active</option>
          <option value="In Progress">In Progress</option>
          <option value="On Hold">On Hold</option>
        </select>
      </div>
      
      <p style="color: var(--muted); font-size: 0.875rem;">
        Note: This is a demo. In a real application, this would create a new project in your system.
      </p>
    </div>
  `,
    function () {
      const name = document.getElementById("newProjectName").value;
      if (name.trim()) {
        showToast(
          "Project Created",
          `Project "${name}" would be created in a real application`,
          "success"
        );
      } else {
        showToast("Error", "Please enter a project name", "error");
        return false; // Prevent modal from closing
      }
    }
  );

  // Focus the name input
  setTimeout(() => {
    document.getElementById("newProjectName")?.focus();
  }, 100);
}

// Initialize all navigation on page load
document.addEventListener("DOMContentLoaded", function () {
  initializeNavigation();
  initializeFilterPresets();
  initializeQuickActions();
  initializeAdvancedSearch();

  // Close advanced search modal on escape
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const advancedModal = document.getElementById("advancedSearchModal");
      if (advancedModal?.classList.contains("show")) {
        closeAdvancedSearch();
      }
    }
  });

  // Initialize new views
  initializeViewSwitching();
  initializeTeamView();
  initializeAnalyticsView();
  initializeSettingsView();

  // Initialize analytics data after views are set up
  setTimeout(() => {
    updateAnalyticsData();
  }, 100);

  // =================================
  // VIEW SWITCHING FUNCTIONALITY
  // =================================

  function initializeViewSwitching() {
    // Add click handlers to navigation links
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        const page = this.getAttribute("data-page");
        if (page) {
          switchView(page);
          updateNavigationState(this);
        }
      });
    });
  }

  window.switchView = function (viewName) {
    console.log("Switching to view:", viewName);

    // Hide all views by removing active class and setting display none
    const views = document.querySelectorAll(
      '.view-container, main[role="main"]:not(.view-container)'
    );
    views.forEach((view) => {
      view.style.display = "none";
      view.classList.remove("active");
    });

    // Show the selected view
    let targetView;
    switch (viewName) {
      case "overview":
        targetView = document.querySelector(
          'main[role="main"]:not(.view-container)'
        );
        updateBreadcrumb("Project Overview");
        currentPage = "overview";
        break;
      case "analytics":
        targetView = document.getElementById("analytics-view");
        console.log("Analytics view found:", targetView);
        // Remove the alert and add smooth analytics loading
        if (targetView) {
          targetView.style.display = "block";
          targetView.classList.add("active");

          // Animate analytics data loading
          setTimeout(() => {
            animateAnalyticsData();
          }, 300);
        }
        currentPage = "analytics";
        break;
      case "team":
        targetView = document.getElementById("team-view");
        loadTeamMembers();
        currentPage = "team";
        break;
      case "settings":
        targetView = document.getElementById("settings-view");
        currentPage = "settings";
        break;
    }

    if (targetView) {
      targetView.style.display = "block";
      targetView.classList.add("active");
      console.log("View displayed:", viewName, targetView);
    } else {
      console.error("Target view not found:", viewName);
    }

    // Update navigation active state
    updateNavigationActiveState(viewName);
  };

  function updateNavigationState(clickedLink) {
    // Remove active class from all nav links
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
    });
    // Add active class to clicked link
    clickedLink.classList.add("active");
  }

  function updateNavigationActiveState(viewName) {
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("data-page") === viewName) {
        link.classList.add("active");
      }
    });
  }

  function updateBreadcrumb(pageName) {
    const breadcrumbCurrent = document.getElementById("breadcrumbCurrent");
    if (breadcrumbCurrent) {
      breadcrumbCurrent.textContent = pageName;
    }
  }

  // =================================
  // ANALYTICS VIEW FUNCTIONALITY
  // =================================

  function initializeAnalyticsView() {
    // Initialize chart controls
    const chartBtns = document.querySelectorAll(".chart-btn");
    chartBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        const chartType = this.getAttribute("data-chart");
        updateChartView(chartType, this);
      });
    });
  }

  function updateAnalyticsData() {
    console.log("Updating analytics data. Projects length:", projects.length);

    // If projects not loaded yet, try to load them
    if (!projects.length) {
      loadProjectsForAnalytics();
      // Also show fallback data immediately so view isn't empty
      showFallbackAnalytics();
      return;
    }

    // Calculate metrics
    const totalProjects = projects.length;
    const activeProjects = projects.filter(
      (p) => normalizeStatus(p.status) === "active"
    ).length;
    const inProgressProjects = projects.filter(
      (p) => normalizeStatus(p.status) === "progress"
    ).length;
    const blockedProjects = projects.filter(
      (p) => normalizeStatus(p.status) === "blocked"
    ).length;
    const avgCompletion = Math.round(
      projects.reduce((sum, p) => sum + (p.done / p.total) * 100, 0) /
        totalProjects
    );
    const uniqueTeamMembers = new Set();
    projects.forEach((p) =>
      p.team.forEach((member) => uniqueTeamMembers.add(member))
    );

    console.log("Calculated metrics:", {
      totalProjects,
      activeProjects,
      avgCompletion,
      teamMembers: uniqueTeamMembers.size,
    });

    // Update metric displays
    const totalEl = document.getElementById("totalProjects");
    const activeEl = document.getElementById("activeProjects");
    const avgEl = document.getElementById("avgCompletion");
    const teamEl = document.getElementById("teamMembers");

    if (totalEl) {
      totalEl.textContent = totalProjects;
      console.log("Updated total projects element");
    }
    if (activeEl) {
      activeEl.textContent = activeProjects;
      console.log("Updated active projects element");
    }
    if (avgEl) {
      avgEl.textContent = avgCompletion + "%";
      console.log("Updated average completion element");
    }
    if (teamEl) {
      teamEl.textContent = uniqueTeamMembers.size;
      console.log("Updated team members element");
    }

    // Update status chart
    updateStatusChart();

    // Update timeline with recent projects
    updateProjectTimeline();
  }

  function loadProjectsForAnalytics() {
    console.log("Loading projects for analytics...");

    // First, try to use existing projects array
    if (window.projects && window.projects.length > 0) {
      projects = window.projects;
      console.log("Using existing projects array:", projects.length);
      updateAnalyticsData();
      return;
    }

    // Try to get projects from the data script element
    const dataScript = document.getElementById("data");
    if (dataScript) {
      try {
        const jsonData = JSON.parse(dataScript.textContent);
        projects = jsonData;
        window.projects = projects; // Store globally for reuse
        console.log("Loaded projects from data script:", projects.length);
        updateAnalyticsData(); // Retry now that we have data
      } catch (e) {
        console.error("Failed to parse project data:", e);
        showFallbackAnalytics();
      }
    } else {
      console.warn("No data script found, showing fallback analytics");
      showFallbackAnalytics();
    }
  }

  function showFallbackAnalytics() {
    console.log("Showing fallback analytics data");

    // Show some demo data if real data isn't available
    const totalEl = document.getElementById("totalProjects");
    const activeEl = document.getElementById("activeProjects");
    const avgEl = document.getElementById("avgCompletion");
    const teamEl = document.getElementById("teamMembers");

    if (totalEl) {
      totalEl.textContent = "6";
      console.log("Set fallback total projects");
    } else {
      console.error("Could not find totalProjects element");
    }

    if (activeEl) {
      activeEl.textContent = "3";
      console.log("Set fallback active projects");
    } else {
      console.error("Could not find activeProjects element");
    }

    if (avgEl) {
      avgEl.textContent = "58%";
      console.log("Set fallback average completion");
    } else {
      console.error("Could not find avgCompletion element");
    }

    if (teamEl) {
      teamEl.textContent = "12";
      console.log("Set fallback team members");
    } else {
      console.error("Could not find teamMembers element");
    }

    // Show fallback status chart
    updateFallbackStatusChart();

    // Show fallback timeline
    showFallbackTimeline();
  }

  function updateFallbackStatusChart() {
    console.log("Updating fallback status chart");
    const chartItems = document.querySelectorAll(".status-item");
    const fallbackData = [
      { label: "Active", count: 3, percentage: 50 },
      { label: "In Progress", count: 2, percentage: 33 },
      { label: "Blocked", count: 1, percentage: 17 },
    ];

    chartItems.forEach((item, index) => {
      if (fallbackData[index]) {
        const span = item.querySelector("span");
        const fill = item.querySelector(".status-fill");

        if (span) {
          span.textContent = `${fallbackData[index].label} (${fallbackData[index].count})`;
          console.log(
            `Set status chart item ${index}: ${fallbackData[index].label} (${fallbackData[index].count})`
          );
        }
        if (fill) {
          fill.style.width = `${fallbackData[index].percentage}%`;
          console.log(
            `Set status bar width ${index}: ${fallbackData[index].percentage}%`
          );
        }
      }
    });
  }

  function showFallbackTimeline() {
    console.log("Showing fallback timeline");
    const timelineChart = document.querySelector(".timeline-chart");
    if (!timelineChart) {
      console.error("Timeline chart container not found");
      return;
    }

    const fallbackTimeline = [
      { date: "Oct 15", event: "Smart Traffic Control System - 60% Complete" },
      { date: "Oct 13", event: "City Park Bridge - 82% Complete" },
      { date: "Oct 12", event: "Highway 101 Bridge - 71% Complete" },
      { date: "Oct 10", event: "Traffic Signal Upgrade - 54% Complete" },
    ];

    timelineChart.innerHTML = fallbackTimeline
      .map(
        (item) => `
      <div class="timeline-item">
        <div class="timeline-date">${item.date}</div>
        <div class="timeline-event">${item.event}</div>
      </div>
    `
      )
      .join("");

    console.log(
      "Fallback timeline populated with",
      fallbackTimeline.length,
      "items"
    );
  }

  function updateProjectTimeline() {
    const timelineChart = document.querySelector(".timeline-chart");
    if (!timelineChart || !projects.length) return;

    // Sort projects by most recent update
    const sortedProjects = [...projects].sort(
      (a, b) => new Date(b.updated) - new Date(a.updated)
    );
    const recentProjects = sortedProjects.slice(0, 4);

    timelineChart.innerHTML = recentProjects
      .map((project) => {
        const completion = Math.round((project.done / project.total) * 100);
        const date = new Date(project.updated).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        return `
        <div class="timeline-item">
          <div class="timeline-date">${date}</div>
          <div class="timeline-event">${project.name} - ${completion}% Complete</div>
        </div>
      `;
      })
      .join("");
  }

  function updateStatusChart() {
    if (!projects.length) {
      updateFallbackStatusChart();
      return;
    }

    const statusCounts = {
      active: 0,
      progress: 0,
      blocked: 0,
      hold: 0,
    };

    projects.forEach((project) => {
      const status = normalizeStatus(project.status);
      if (statusCounts.hasOwnProperty(status)) {
        statusCounts[status]++;
      }
    });

    const total = projects.length;
    const chartItems = document.querySelectorAll(".status-item");

    chartItems.forEach((item, index) => {
      const indicator = item.querySelector(".status-indicator");
      const span = item.querySelector("span");
      const fill = item.querySelector(".status-fill");

      let count, label, percentage;
      switch (index) {
        case 0:
          count = statusCounts.active;
          label = "Active";
          percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          break;
        case 1:
          count = statusCounts.progress;
          label = "In Progress";
          percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          break;
        case 2:
          count = statusCounts.blocked;
          label = "Blocked";
          percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          break;
        default:
          return;
      }

      if (span) span.textContent = `${label} (${count})`;
      if (fill) fill.style.width = `${percentage}%`;
    });
  }

  function updateChartView(chartType, button) {
    // Update button states
    document
      .querySelectorAll(".chart-btn")
      .forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    // Here you could switch between different chart views
    // For now, we'll just show a simple status chart
    console.log("Chart view changed to:", chartType);
  }

  // =================================
  // TEAM VIEW FUNCTIONALITY
  // =================================

  function initializeTeamView() {
    // Initialize filter buttons
    const filterBtns = document.querySelectorAll(".member-filters .filter-btn");
    filterBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        const filter = this.getAttribute("data-filter");
        filterTeamMembers(filter, this);
      });
    });
  }

  function loadTeamMembers() {
    const membersList = document.getElementById("membersList");
    if (!membersList) return;

    // Extract unique team members from projects
    const teamMembers = extractTeamMembers();

    membersList.innerHTML = teamMembers
      .map(
        (member) => `
      <div class="member-card" data-status="${member.status}">
        <div class="member-header">
          <div class="member-avatar">${member.initials}</div>
          <div class="member-info">
            <h4>${member.name}</h4>
            <div class="member-role">${member.role}</div>
          </div>
        </div>
        <div class="member-projects">
          ${member.projects
            .map((project) => `<span class="project-tag">${project}</span>`)
            .join("")}
        </div>
      </div>
    `
      )
      .join("");
  }

  function extractTeamMembers() {
    const memberMap = new Map();

    projects.forEach((project) => {
      project.team.forEach((memberName) => {
        if (!memberMap.has(memberName)) {
          const initials = memberName
            .split(" ")
            .map((n) => n[0])
            .join("");
          memberMap.set(memberName, {
            name: memberName,
            initials: initials,
            role: generateRole(memberName),
            projects: [],
            status: "active",
          });
        }
        memberMap.get(memberName).projects.push(project.name);
      });
    });

    return Array.from(memberMap.values());
  }

  function generateRole(memberName) {
    // Simple role assignment based on name patterns
    const roles = [
      "Project Manager",
      "Engineer",
      "Designer",
      "Developer",
      "Analyst",
      "Coordinator",
    ];
    const hash = memberName.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    return roles[hash % roles.length];
  }

  function filterTeamMembers(filter, button) {
    // Update button states
    document
      .querySelectorAll(".member-filters .filter-btn")
      .forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    // Filter members
    const memberCards = document.querySelectorAll(".member-card");
    memberCards.forEach((card) => {
      const status = card.getAttribute("data-status");
      let show = true;

      switch (filter) {
        case "all":
          show = true;
          break;
        case "active":
          show = status === "active";
          break;
        case "available":
          show = card.querySelectorAll(".project-tag").length <= 1;
          break;
      }

      card.style.display = show ? "block" : "none";
    });
  }

  window.addTeamMember = function () {
    // For demo purposes, show an alert
    showToast("Add Team Member feature would open a form modal", "info");
  };

  // =================================
  // SETTINGS VIEW FUNCTIONALITY
  // =================================

  function initializeSettingsView() {
    // Initialize settings navigation
    const settingsNavItems = document.querySelectorAll(".settings-nav-item");
    settingsNavItems.forEach((item) => {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        const section = this.getAttribute("data-section");
        switchSettingsSection(section, this);
      });
    });

    // Initialize theme change handlers
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach((radio) => {
      radio.addEventListener("change", function () {
        if (this.checked) {
          applyTheme(this.value);
        }
      });
    });
  }

  function switchSettingsSection(sectionName, clickedItem) {
    // Update navigation
    document
      .querySelectorAll(".settings-nav-item")
      .forEach((item) => item.classList.remove("active"));
    clickedItem.classList.add("active");

    // Update content
    document
      .querySelectorAll(".settings-section")
      .forEach((section) => section.classList.remove("active"));
    const targetSection = document.getElementById(sectionName + "-settings");
    if (targetSection) {
      targetSection.classList.add("active");
    }
  }

  function applyTheme(theme) {
    // For demo purposes, show the theme change
    showToast(`Theme changed to: ${theme}`, "success");

    // Here you would implement actual theme switching logic
    if (theme === "dark") {
      // Add dark theme classes
      console.log("Applying dark theme...");
    } else if (theme === "light") {
      // Add light theme classes
      console.log("Applying light theme...");
    }
  }

  window.saveSettings = function () {
    // Collect all settings values
    const settings = {
      dashboardName: document.querySelector(".setting-input").value,
      defaultView: document.querySelector(".setting-select").value,
      autoRefresh: document.querySelectorAll(".setting-select")[1].value,
      theme: document.querySelector('input[name="theme"]:checked').value,
      // Add more settings as needed
    };

    // For demo purposes, show success message
    showToast("Settings saved successfully!", "success");
    console.log("Settings saved:", settings);
  };

  window.resetSettings = function () {
    if (
      confirm(
        "Are you sure you want to reset all settings to their default values?"
      )
    ) {
      // Reset form values
      document.querySelector(".setting-input").value = "CA DOT Dashboard";
      document.querySelectorAll(".setting-select")[0].value = "overview";
      document.querySelectorAll(".setting-select")[1].value = "60";
      document.querySelector(
        'input[name="theme"][value="light"]'
      ).checked = true;

      showToast("Settings reset to defaults", "info");
    }
  };

  // =================================
  // ANALYTICS ANIMATIONS & INTERACTIONS
  // =================================

  window.animateAnalyticsData = function () {
    console.log("Animating analytics data...");

    // Animate metric values with counting effect
    const metricValues = document.querySelectorAll(".metric-value[data-value]");
    metricValues.forEach((element, index) => {
      const targetValue = parseInt(element.getAttribute("data-value"));
      const isPercentage = element.textContent.includes("%");

      setTimeout(() => {
        animateCounter(element, 0, targetValue, 1000, isPercentage);
      }, index * 200);
    });

    // Animate status bars
    setTimeout(() => {
      const statusFills = document.querySelectorAll(".status-fill[data-width]");
      statusFills.forEach((fill, index) => {
        const width = fill.getAttribute("data-width");
        setTimeout(() => {
          fill.style.width = width + "%";
        }, index * 150);
      });
    }, 800);

    // Animate progress bars
    setTimeout(() => {
      const progressFills = document.querySelectorAll(
        ".progress-fill[data-width]"
      );
      progressFills.forEach((fill, index) => {
        const width = fill.getAttribute("data-width");
        setTimeout(() => {
          fill.style.width = width + "%";
        }, index * 100);
      });
    }, 1200);

    // Animate summary bars
    setTimeout(() => {
      const summaryFills = document.querySelectorAll(
        ".summary-fill[data-width]"
      );
      summaryFills.forEach((fill, index) => {
        const width = fill.getAttribute("data-width");
        setTimeout(() => {
          fill.style.width = width + "%";
        }, index * 200);
      });
    }, 1600);
  };

  function animateCounter(element, start, end, duration, isPercentage) {
    const startTime = Date.now();
    const suffix = isPercentage ? "%" : "";

    function updateCounter() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = Math.floor(start + (end - start) * easeOutQuart);

      element.textContent = current + suffix;

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        element.textContent = end + suffix;
      }
    }

    updateCounter();
  }

  window.refreshAnalytics = function () {
    console.log("Refreshing analytics data...");

    // Reset all animations
    const metricValues = document.querySelectorAll(".metric-value[data-value]");
    metricValues.forEach((element) => {
      const isPercentage =
        element.getAttribute("data-value").toString().includes("%") ||
        element.textContent.includes("%");
      element.textContent = isPercentage ? "0%" : "0";
    });

    const allFills = document.querySelectorAll(
      ".status-fill, .progress-fill, .summary-fill"
    );
    allFills.forEach((fill) => {
      fill.style.width = "0%";
    });

    // Show loading toast
    showToast("Refreshing analytics data...", "info");

    // Re-animate after a short delay
    setTimeout(() => {
      animateAnalyticsData();
      setTimeout(() => {
        showToast("Analytics data refreshed!", "success");
      }, 2000);
    }, 500);
  };

  window.switchChartTab = function (button, chartType) {
    // Update button states
    document
      .querySelectorAll(".chart-tab")
      .forEach((tab) => tab.classList.remove("active"));
    button.classList.add("active");

    // For demo purposes, just show a toast
    showToast(`Switched to ${chartType} view`, "info");

    // Here you could implement actual chart switching logic
    console.log("Chart switched to:", chartType);
  };
});
