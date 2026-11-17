const projectGrid = document.getElementById("projectGrid");
const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");
const projectFilters = document.getElementById("projectFilters");
const projectCount = document.getElementById("projectCount");
const navLinks = document.getElementById("navLinks");
const backToTop = document.getElementById("backToTop");

document.getElementById("year").textContent = new Date().getFullYear();

// ==========================================
// MOBILE NAVIGATION
// ==========================================

const menuToggle = document.getElementById("menuToggle");

menuToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  menuToggle.textContent = isOpen ? "✕" : "☰";
});

document.querySelectorAll(".nav-links a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    menuToggle.textContent = "☰";
  });
});

// ==========================================
// DARK MODE / LIGHT MODE
// ==========================================

// Create Theme Button
let themeToggle = document.getElementById("themeToggle");

if (!themeToggle) {
  const themeItem = document.createElement("li");
  themeItem.className = "theme-toggle-item";

  themeToggle = document.createElement("button");
  themeToggle.id = "themeToggle";
  themeToggle.type = "button";
  themeToggle.className = "theme-toggle";

  themeItem.appendChild(themeToggle);
  navLinks.appendChild(themeItem);
}

// Get saved theme
let currentTheme = "light";

try {
  currentTheme = localStorage.getItem("portfolio-theme") || "light";
} catch (error) {
  currentTheme = "light";
}

function applyTheme(theme) {
  currentTheme = theme;

  document.documentElement.dataset.theme = theme;

  themeToggle.textContent =
    theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode";

  themeToggle.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
  );

  try {
    localStorage.setItem("portfolio-theme", theme);
  } catch (error) {
    console.warn("Could not save theme preference.");
  }
}

// Apply saved theme
applyTheme(currentTheme);

// Theme Button Click
themeToggle.addEventListener("click", () => {
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme);
});

// ==========================================
// ABOUT ME TABS
// ==========================================

const aboutTabContent = {
  skills: {
    label: "tab-skills",
    items: [
      ["CURRENTLY LEARNING", "Programming & Web Development", "HTML, CSS, JavaScript, C, Java and Python fundamentals."],
      ["EXPLORING", "Cybersecurity & Databases", "Security fundamentals, networking and MongoDB."]
    ]
  },
  experience: {
    label: "tab-experience",
    items: [
      ["PROJECT-BASED PRACTICE", "Personal Portfolio Website", "Practising responsive web design and connecting a website to a backend."],
      ["CONTINUOUS LEARNING", "Hands-on Experiments", "Building small projects to improve coding, debugging and problem-solving skills."]
    ]
  },
  education: {
    label: "tab-education",
    items: [
      ["FIELD OF STUDY", "Computer Science", "Studying computer science concepts and programming fundamentals."],
      ["SELF-LEARNING", "Technology & Development", "Learning through documentation, practice and personal projects."]
    ]
  }
};

const aboutTabs = document.querySelectorAll(".about-tab");
const aboutPanel = document.getElementById("aboutTabPanel");

function showAboutTab(tabName) {
  const content = aboutTabContent[tabName];
  if (!content || !aboutPanel) return;

  aboutTabs.forEach(tab => {
    const selected = tab.dataset.tab === tabName;
    tab.classList.toggle("active", selected);
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  aboutPanel.setAttribute("aria-labelledby", content.label);

  aboutPanel.innerHTML = content.items.map(item => `
    <div class="tab-detail">
      <span class="tab-date">${item[0]}</span>
      <h4>${item[1]}</h4>
      <p>${item[2]}</p>
    </div>
  `).join("");
}

aboutTabs.forEach(tab => {
  tab.addEventListener("click", () => showAboutTab(tab.dataset.tab));
});

// ==========================================
// SAFE OUTPUT HELPERS
// ==========================================

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function safeExternalURL(value = "") {
  try {
    const url = new URL(String(value), window.location.origin);

    return ["http:", "https:"].includes(url.protocol)
      ? escapeHTML(url.href)
      : "";
  } catch {
    return "";
  }
}

// ==========================================
// PROJECT SETTINGS
// ==========================================

let allProjects = [];
let activeFilter = "All";

let showAllProjects = false;

const PROJECTS_LIMIT = 6;

// Create See More / See Less Button

let seeMoreButton = document.getElementById("seeMoreProjects");

if (!seeMoreButton) {
  const moreWrap = document.createElement("div");
  moreWrap.className = "project-more-wrap";

  seeMoreButton = document.createElement("button");
  seeMoreButton.id = "seeMoreProjects";
  seeMoreButton.className = "button primary";
  seeMoreButton.type = "button";

  moreWrap.appendChild(seeMoreButton);
  projectGrid.insertAdjacentElement("afterend", moreWrap);
}

seeMoreButton.addEventListener("click", () => {
  showAllProjects = !showAllProjects;
  renderProjects();
});

// Fallback project images

const sampleProjectImages = [
  "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=80"
];

// ==========================================
// TECHNOLOGY FILTERS
// ==========================================

function renderFilters(projects) {
  const technologies = [
    ...new Set(
      projects.flatMap(project =>
        Array.isArray(project.tech) ? project.tech : []
      )
    )
  ]
    .filter(item => typeof item === "string" && item.trim())
    .sort((a, b) => a.localeCompare(b));

  const filters = ["All", ...technologies];

  if (!filters.includes(activeFilter)) {
    activeFilter = "All";
  }

  projectFilters.innerHTML = filters.map(filter => `
    <button
      class="filter-chip"
      type="button"
      data-filter="${escapeHTML(filter)}"
      aria-pressed="${filter === activeFilter}"
    >
      ${escapeHTML(filter)}
    </button>
  `).join("");
}

// ==========================================
// RENDER PROJECTS
// ==========================================

function renderProjects() {

  const visibleProjects = activeFilter === "All"
    ? allProjects
    : allProjects.filter(project =>
        Array.isArray(project.tech) &&
        project.tech.includes(activeFilter)
      );

  projectCount.textContent =
    `${visibleProjects.length} ${visibleProjects.length === 1 ? "project" : "projects"}`;

  // No projects found

  if (!visibleProjects.length) {
    projectGrid.innerHTML = `
      <div class="empty-card">
        No projects match this filter yet.
        Choose another technology to explore more work.
      </div>
    `;

    seeMoreButton.hidden = true;
    return;
  }

  // Show only 6 projects initially

  const projectsToShow = showAllProjects
    ? visibleProjects
    : visibleProjects.slice(0, PROJECTS_LIMIT);

  // See More / See Less visibility

  seeMoreButton.hidden = visibleProjects.length <= PROJECTS_LIMIT;

  seeMoreButton.textContent = showAllProjects
    ? "See Less"
    : "See More";

  // Render project cards

  projectGrid.innerHTML = projectsToShow.map((project, index) => {

    const liveURL = safeExternalURL(project.link);
    const githubURL = safeExternalURL(project.github);

    const imageURL =
      safeExternalURL(project.image) ||
      sampleProjectImages[index % sampleProjectImages.length];

    const tags = (
      Array.isArray(project.tech) ? project.tech : []
    )
      .map(item => `<span>${escapeHTML(item)}</span>`)
      .join("");

    return `
      <article class="project-card ${project.featured ? "featured" : ""}">

        <div class="project-image-wrap">
          <img
            class="project-image"
            src="${imageURL}"
            alt="${escapeHTML(project.title || "Portfolio project")} preview"
            loading="lazy"
          >
        </div>

        <div class="project-body">

          <div class="project-top">
            <span>✳</span>
            <span>↗</span>
          </div>

          ${project.featured
            ? '<span class="project-label">✦ Featured project</span>'
            : ""
          }

          <h3>${escapeHTML(project.title || "Untitled project")}</h3>

          <p>
            ${escapeHTML(
              project.description ||
              "A project built while learning and practising development."
            )}
          </p>

          <div class="tags">
            ${tags}
          </div>

          <div class="project-links">

            ${liveURL
              ? `<a href="${liveURL}" target="_blank" rel="noopener noreferrer">Live demo ↗</a>`
              : ""
            }

            ${githubURL
              ? `<a href="${githubURL}" target="_blank" rel="noopener noreferrer">GitHub ↗</a>`
              : ""
            }

          </div>

        </div>

      </article>
    `;
  }).join("");
}

// ==========================================
// PROJECT FILTER CLICK EVENT
// ==========================================

projectFilters.addEventListener("click", event => {

  const button = event.target.closest("button[data-filter]");

  if (!button) return;

  activeFilter = button.dataset.filter;

  // Reset See More when filter changes
  showAllProjects = false;

  projectFilters.querySelectorAll("button").forEach(item => {
    item.setAttribute(
      "aria-pressed",
      String(item === button)
    );
  });

  renderProjects();
});

// ==========================================
// LOAD PROJECTS FROM EXISTING API
// ==========================================

async function loadProjects() {

  try {

    const response = await fetch("/api/projects");

    if (!response.ok) {
      throw new Error("Request failed");
    }

    const projects = await response.json();

    allProjects = Array.isArray(projects) ? projects : [];

    if (!allProjects.length) {

      projectCount.textContent = "Projects";

      projectFilters.innerHTML = "";

      projectGrid.innerHTML = `
        <div class="empty-card">
          Your projects will appear here.
          Add projects using your existing admin dashboard.
        </div>
      `;

      seeMoreButton.hidden = true;

      return;
    }

    renderFilters(allProjects);

    renderProjects();

  } catch (error) {

    projectCount.textContent = "Projects";

    projectGrid.innerHTML = `
      <div class="empty-card">
        Could not load projects.
        Check that the server and database are running.
      </div>
    `;

    seeMoreButton.hidden = true;
  }
}

loadProjects();

// ==========================================
// CONTACT FORM
// Existing API and payload preserved
// ==========================================

contactForm.addEventListener("submit", async event => {

  event.preventDefault();

  formStatus.textContent = "Sending...";

  const data = Object.fromEntries(
    new FormData(contactForm).entries()
  );

  try {

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Something went wrong.");
    }

    formStatus.textContent = result.message;

    contactForm.reset();

  } catch (error) {

    formStatus.textContent = error.message;
  }
});

// ==========================================
// NAVIGATION HIGHLIGHTING
// ==========================================

const sections = [
  ...document.querySelectorAll("main section[id]")
];

if ("IntersectionObserver" in window) {

  const sectionObserver = new IntersectionObserver(entries => {

    entries.forEach(entry => {

      if (!entry.isIntersecting) return;

      document.querySelectorAll(".nav-links a").forEach(link => {

        link.classList.toggle(
          "active",
          link.getAttribute("href") === `#${entry.target.id}`
        );

      });

    });

  }, {
    rootMargin: "-35% 0px -55% 0px"
  });

  sections.forEach(section => {
    sectionObserver.observe(section);
  });
}

// ==========================================
// BACK TO TOP BUTTON
// ==========================================

window.addEventListener("scroll", () => {

  backToTop.classList.toggle(
    "visible",
    window.scrollY > 500
  );

}, {
  passive: true
});