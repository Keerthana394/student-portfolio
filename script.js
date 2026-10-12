
"use strict";

const studentGrid = document.getElementById("student-grid");
const searchInput = document.getElementById("search-input");
const clearButton = document.getElementById("clear-search");
const statusMessage = document.getElementById("status-message");
const studentCount = document.getElementById("student-count");

let students = [];
let projectsById = new Map();

// Create an HTML element and safely insert text.
function createElement(tagName, className, text) {
    const element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    if (text !== undefined && text !== null) {
        element.textContent = String(text);
    }

    return element;
}

// Create a list of items.
function addList(parent, values, className) {
    const list = createElement("ul", className);

    values.forEach((value) => {
        list.appendChild(createElement("li", "", value));
    });

    parent.appendChild(list);
}

// Create skill tags.
function addTagList(parent, values) {
    const list = createElement("ul", "tag-list");

    values.forEach((value) => {
        list.appendChild(createElement("li", "tag", value));
    });

    parent.appendChild(list);
}

// Get initials for the student avatar.
function getInitials(name) {
    return String(name || "Student")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

// Find the projects associated with a student.
function getStudentProjects(student) {
    if (!Array.isArray(student.projects)) {
        return [];
    }

    return student.projects
        .map((projectId) => projectsById.get(projectId))
        .filter(Boolean)
        .map((project) => project.title || project.name || project.id);
}

// Generate a student portfolio card dynamically.
function createStudentCard(student) {
    const card = createElement("article", "student-card");
    const top = createElement("div", "card-top");

    const avatar = createElement(
        "div",
        "avatar",
        getInitials(student.name)
    );

    avatar.setAttribute("aria-hidden", "true");

    const identity = createElement("div");

    identity.appendChild(
        createElement(
            "h3",
            "student-name",
            student.name || "Unnamed student"
        )
    );

    identity.appendChild(
        createElement(
            "p",
            "student-meta",
            [
                student.department,
                student.semester
            ].filter(Boolean).join(" · ") || "Student"
        )
    );

    top.append(avatar, identity);
    card.appendChild(top);

    // Student biography.
    if (student.bio) {
        card.appendChild(
            createElement("p", "bio", student.bio)
        );
    }

    // Skills.
    const skills = Array.isArray(student.skills)
        ? student.skills
        : [];

    if (skills.length > 0) {
        card.appendChild(
            createElement("h4", "card-label", "Skills")
        );

        addTagList(card, skills);
    }

    // Academic projects.
    const projectTitles = getStudentProjects(student);

    if (projectTitles.length > 0) {
        card.appendChild(
            createElement("h4", "card-label", "Projects")
        );

        addList(card, projectTitles, "project-list");
    }

    // Achievements.
    const achievements = Array.isArray(student.achievements)
        ? student.achievements
        : [];

    if (achievements.length > 0) {
        card.appendChild(
            createElement("h4", "card-label", "Achievements")
        );

        addList(card, achievements, "achievement-list");
    }

    // Footer with roll number and contact link.
    const footer = createElement("div", "card-footer");

    footer.appendChild(
        createElement(
            "span",
            "roll-number",
            student.rollNo || "Portfolio"
        )
    );

    if (student.email) {
        const emailLink = createElement(
            "a",
            "email-link",
            "Contact student ↗"
        );

        emailLink.href = "mailto:" + student.email;

        emailLink.setAttribute(
            "aria-label",
            "Email " + (student.name || "student")
        );

        footer.appendChild(emailLink);
    }

    card.appendChild(footer);

    return card;
}

// Display matching student cards.
function renderStudents(studentList) {
    studentGrid.replaceChildren();

    if (studentList.length === 0) {
        const emptyState = createElement("div", "empty-state");

        emptyState.appendChild(
            createElement("div", "empty-icon", "⌕")
        );

        emptyState.appendChild(
            createElement("h3", "", "No portfolios found")
        );

        emptyState.appendChild(
            createElement(
                "p",
                "",
                "Try another name, skill, semester, or project keyword."
            )
        );

        studentGrid.appendChild(emptyState);

        studentCount.textContent = "0 students found";
        statusMessage.textContent = "";

        return;
    }

    const fragment = document.createDocumentFragment();

    studentList.forEach((student) => {
        fragment.appendChild(createStudentCard(student));
    });

    studentGrid.appendChild(fragment);

    studentCount.textContent =
        studentList.length +
        (studentList.length === 1
            ? " student found"
            : " students found");

    statusMessage.textContent = "";
}

// Combine searchable student information into one string.
function searchableText(student) {
    const projectTitles = getStudentProjects(student);

    const values = [
        student.name,
        student.rollNo,
        student.department,
        student.semester,
        student.email,
        student.bio,
        ...(Array.isArray(student.skills) ? student.skills : []),
        ...(Array.isArray(student.achievements)
            ? student.achievements
            : []),
        ...projectTitles
    ];

    return values.filter(Boolean).join(" ").toLowerCase();
}

// Filter instantly as the user types.
function filterStudents() {
    const query = searchInput.value.trim().toLowerCase();

    clearButton.hidden = query.length === 0;

    if (!query) {
        renderStudents(students);
        return;
    }

    const filteredStudents = students.filter((student) =>
        searchableText(student).includes(query)
    );

    renderStudents(filteredStudents);
}

// Load the separate JSON dataset.
async function loadStudentData() {
    statusMessage.classList.remove("error");
    statusMessage.textContent = "Loading student data...";

    try {
        const response = await fetch("data.json");

        if (!response.ok) {
            throw new Error(
                "Could not load data.json. HTTP status: " +
                response.status
            );
        }

        const data = await response.json();

        if (!data || !Array.isArray(data.graph)) {
            throw new Error(
                'The JSON file must contain a "graph" array.'
            );
        }

        // The graph can contain multiple entity types.
        // Store projects separately, indexed by their IDs.
        projectsById = new Map(
            data.graph
                .filter(
                    (item) =>
                        item &&
                        item.type === "Project" &&
                        item.id
                )
                .map((project) => [project.id, project])
        );

        // Display only Student entities.
        students = data.graph.filter(
            (item) => item && item.type === "Student"
        );

        renderStudents(students);

        if (students.length === 0) {
            statusMessage.textContent =
                "No student records are available in data.json yet.";
        }

    } catch (error) {
        console.error("Student data loading error:", error);

        studentGrid.replaceChildren();
        studentCount.textContent = "Data unavailable";

        statusMessage.classList.add("error");

        statusMessage.textContent =
            "Unable to load student data. Check data.json and run the website using a local web server or GitHub Pages.";
    }
}

// Search event: runs on every input change.
searchInput.addEventListener("input", filterStudents);

// Clear the search and restore all student cards.
clearButton.addEventListener("click", () => {
    searchInput.value = "";
    filterStudents();
    searchInput.focus();
});

// Start the application.
loadStudentData();
