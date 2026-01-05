## 1. System Architecture

The project follows a client-side MVC architecture (Client-Side Rendering) supported by REST APIs served by Flask.

**Backend:** Flask + SQLAlchemy (provides JSON data only)
**Frontend:** HTML5 + Bootstrap + Vanilla JavaScript (ES6 Classes)
**Database:** SQLite

### Design Choices and Patterns Used

The system was designed with a clear separation between Backend and Frontend to encourage scalability and support the implementation of a PWA.

---

### Backend: Layered Architecture & REST

On the server side (Python/Flask), a layered architecture was adopted to ensure separation of concerns:

* **Data Access Layer (Models):**
  Defined with SQLAlchemy; they manage only the data structure and serialization (`to_dict`).

* **Service Layer:**
  Pure classes (e.g., `InventoryService`) that contain business logic and queries. They return objects, not JSON.

* **Controller Layer (Routes):**
  Handle HTTP requests, invoke Services, and transform objects into JSON responses (`jsonify`).

---

### Frontend: Page Controller Pattern (Vanilla JS)

On the client side, since no complex frameworks (such as React or Angular) are used to keep the project lightweight, the Page Controller pattern was adopted.
It follows the AHA principle (Avoid Hasty Abstractions).

Each HTML page (View) has a corresponding JavaScript Class (Controller) that manages its entire lifecycle (e.g., `EditEquipmentManager` for `edit_equipment_.html`).

#### Reasons for This Choice

* **MPA-based Architecture:**
  Since the architecture is a Multi-Page Application (MPA) served by Flask, each HTML view has an isolated lifecycle.

* **Cohesion:**
  DOM manipulation logic and API calls for a specific view are grouped into a single class (“Smart UI”), making the code easier to read.

* **Simplicity:**
  Avoids over-engineering, such as introducing additional abstraction layers (e.g., separating JS Services and Views) in a context where interactions are specific and not reused across different pages.

* **Lifecycle Management:**
  The class instance is created on `DOMContentLoaded`, ensuring that the script runs only when the DOM is fully ready.

---

## 2. Backend Logic (Flask)

The backend logic of TrackHub is designed as a stateless REST API, with the sole responsibility of exposing structured data and applying business logic, without any HTML rendering responsibilities.

The backend acts as a data provider for the Client-Side Rendering frontend and the Progressive Web App.

### Architecture: Layered Architecture

The backend adopts a well-defined layered architecture to ensure:

* separation of concerns
* ease of maintenance
* long-term extensibility of the data model
* data consistency and integrity

---

### Controller Layer (API Routes)

Controllers are implemented using Flask Blueprints and represent the HTTP entry point of the application.

**Responsibilities:**

* Handling HTTP requests (GET, POST, PUT, DELETE)
* Minimal input validation (data presence, parameters)
* Invoking the Service Layer
* Transforming Python objects into JSON responses (`jsonify`)
* Managing HTTP status codes

**Key Characteristics:**

* No business logic
* No direct database queries
* “Thin” controllers

**Conceptual Example:**

* The controller receives the request → delegates to the Service → returns JSON

---

### Service Layer (Business Logic)

The Service Layer represents the core of the application.

It is composed of pure classes (e.g., `EquipmentService`, `InterventionService`) that encapsulate:

* business logic
* SQLAlchemy queries
* application rules
* orchestration of data operations

**Responsibilities:**

* Dynamic query construction (filters, pagination, search)
* CRUD operation management
* Application of domain rules
* Logic reuse (e.g., the same query for pagination and export)

**Design Choices:**

* Services return SQLAlchemy objects, not JSON
* Serialization is delegated to the upper layer (Controller)
* Private helper methods (e.g., `_build_filter_query`) are used to avoid duplication

This approach makes the code:

* testable
* readable
* easily extensible

---

## 3. Frontend Logic (JavaScript)

Client-side logic is organized into classes that manage the page state and API calls.

### Example: `InventoryManager` Class

Manages the “Inventory” page (`attrezzature.html`).

**File:** `static/js/inventory.js`

**Responsibilities:**

* Maintains pagination state (`this.currentPage`)
* On load (`init()`), calls `/api/options` to populate filters
* Handles search form submission and dynamically reloads the table
* Generates table HTML using Template Literals (backticks)

---

## 4. Data Models (Backend)

SQLAlchemy models have been extended with a `to_dict()` method to enable JSON serialization.

### Example: Equipment

**File:** `models.py`

The `to_dict()` method includes not only base fields but also foreign key descriptions (flattening) to simplify frontend logic (e.g., returning `status_description` instead of forcing the client to make an additional query).

---

## 5. PWA Strategy and Service Worker

The application adopts a Progressive Web App (PWA) approach integrated into a Multi-Page Application (MPA) context.
The goal is to ensure instant UI load times and provide offline resilience.

---

### The “App Shell” Model

To meet the “Client-Side Rendering” requirement, the App Shell Architecture pattern was adopted.

**The Problem with Server-Side Rendering (SSR):**
With traditional rendering (Jinja2), the HTML provided by the server contains both structure and data. Caching these pages in the Service Worker would result in displaying stale data (e.g., yesterday’s inventory list).

**The Solution (Client-Side Rendering):**
A clear separation between container and content was implemented.

* **The “Shell”:**
  Flask serves “empty” HTML files (e.g., `equipment.html`, `homeTech.html`) that contain only the header, menu, footer, and empty containers. Since these are static files, they can be cached by the Service Worker.

* **The Content:**
  Data is loaded separately via JavaScript (REST APIs) and injected into the DOM.

---

### Role of the Service Worker

The Service Worker (`sw.js`) acts as a programmable network proxy to manage requests based on resource type:

#### Cache-First (Shell and Assets)

* Requests for `.html`, `.css`, `.js`, and image files
* The Service Worker checks the cache first: if the file exists, it is returned immediately; otherwise, it is fetched from the network and cached.

**Result:**
The user interface loads instantly and is available even without an internet connection.

#### Network-First (API Data)

* Requests to `/api/*`
* The Service Worker always attempts to fetch fresh data from the server.

**Error Handling:**
If the network request fails, the page JavaScript (e.g., `InventoryManager`) catches the error and displays an offline status message to the user or, optionally, fallback data.

6. Docker & Containerization

TrackHub uses Docker to standardize the development and execution environment of the application.

The goal is not to introduce infrastructural complexity, but to ensure:

* environment consistency between development and production
* isolation of dependencies
* fast project setup on any machine
* increased reliability during deployment

### Typical Setup

* **Backend Container**

  * Python + Flask
  * SQLAlchemy
  * Configuration managed via environment variables

* **Database**

  * SQLite mounted as a persistent volume (current phase)
  * Easily replaceable with PostgreSQL or MySQL without application-level changes

### Architectural Benefits

* No dependency on the host operating system
* Clear isolation of the backend runtime
* Easier onboarding for new developers
* Architecture ready for future extensions (e.g. reverse proxy, dedicated database)

Docker is used as an **architectural support tool**, not as a design constraint, and integrates naturally with the layered, API-first approach adopted by the project.