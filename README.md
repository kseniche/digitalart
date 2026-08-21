# Digital Art

A full-stack web application for digital art and computer graphics.

**Laravel 12** · **PHP 8.2+** · **React 19** · **Vite 7** · **MySQL** · **Laravel Sanctum** · **Spatie Permission**

> **Educational project / graduation thesis**
>
> Digital Art is a social platform for publishing and discovering digital artwork. The project was designed and developed independently from concept and UI/UX design to backend, database architecture, frontend, testing and deployment.

---

## Table of Contents

- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [User Roles](#user-roles)
- [Content Workflow](#content-workflow)
- [Notifications](#notifications)
- [Architecture](#architecture)
- [Database](#database)
- [Backend](#backend)
- [Frontend](#frontend)
- [UI/UX Design](#uiux-design)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Technologies](#technologies)
- [My Role](#my-role)
- [Project Timeline](#project-timeline)
- [Project Challenges](#project-challenges)
- [Project Status](#project-status)
- [Documentation](#documentation)
- [Installation](#installation)
- [License](#license)

---

## About the Project

**Digital Art** is a web application designed as a social platform for digital artists and people interested in computer graphics.

The platform allows users to publish their artwork, discover content, interact with other authors and build their own portfolios.

The main focus of the project was not to maximize the number of features, but to design a **clear and consistent user experience** where possible actions, navigation paths and system responses are predictable and understandable.

The project was developed independently from the initial concept and interface design to database architecture, backend and frontend implementation, testing and deployment.

The project started as a course project and was subsequently expanded and developed into a graduation thesis. During this period, the functionality, architecture and interface were significantly extended.

---

## Key Features

### For guests

- Browse the publication feed
- View individual publications
- View authors' profiles and portfolios
- Browse content by categories and tags
- Search and filter publications
- View related publications

Guests can browse public content but cannot interact with publications.

### For registered users

- Create and manage a personal profile
- Build a personal portfolio
- Publish images and videos
- Save publications to favourites
- Like publications and comments
- Comment on publications
- Follow other authors
- View followers and subscriptions
- Create drafts
- Schedule publications
- Receive in-app notifications
- Receive important notifications by email
- Edit and resubmit publications returned for revision

### Content discovery

The publication feed supports:

- Search by title, description and tags
- Category filtering
- Tag filtering
- Author filtering
- Sorting by date, title and popularity
- Pagination
- A subscriptions-only feed for registered users
- Related-content recommendations

Recommendations are based on related categories, tags and interaction data.

---

## User Roles

The application has three access levels:

| Role | Access |
| --- | --- |
| Guest | Browse public publications and profiles |
| User | Publish content and interact with the platform |
| Administrator | Manage users, publications, comments and platform content |

**Laravel Sanctum** is used for API authentication, while **Spatie Permission** is used for role-based access control.

Protected routes and administrative functionality require the appropriate authentication and permissions.

When a guest attempts to perform an action that requires authentication, the interface provides an authentication prompt.

A blocked user can still browse available content but cannot perform restricted social or content-management actions.

---

## Content Workflow

A publication has several states throughout its lifecycle:

```text
Draft
  ↓
Scheduled / Submitted
  ↓
Automatic moderation
  ↓
Administrator review
  ↓
Published
```

A publication can also be returned to the author for revision or rejected/deleted by an administrator.

### Automatic moderation

Before reaching an administrator, publication text is checked against an internal list of prohibited words.

If prohibited content is detected:

```text
User creates publication
        ↓
Automatic moderation
        ↓
Prohibited word detected
        ↓
Publication returned to author
        ↓
User edits publication
        ↓
Resubmission
```

The author receives an in-app notification explaining that the publication did not pass automatic moderation.

### Administrator moderation

After successful automatic moderation, the publication is sent to an administrator for review.

The administrator can:

- Approve the publication
- Return it to the author with a reason
- Delete the publication

Approved publications become available in the public feed and the author's portfolio.

---

## Notifications

The application contains an internal notification system with optional email delivery for selected events.

### In-app notifications

Notifications are displayed inside the application for events such as:

- Publication moderation results
- Comments
- Favorites
- Other user and moderation events

### Email notifications

Email delivery can be used for important events such as:

- Account blocking and unblocking
- Publication moderation results
- Other significant system events

The application also integrates with **S3-compatible object storage** for media files.

---

## Architecture

The application follows a client-server architecture with a Laravel backend and React SPA frontend.

```text
┌─────────────────────────────┐
│          React SPA          │
│                             │
│  Components                 │
│  Pages                      │
│  Forms                      │
│  Modals                     │
│  Filters                    │
│  React Router               │
└──────────────┬──────────────┘
               │
               │ REST API / JSON
               │
┌──────────────▼──────────────┐
│       Laravel Backend       │
│                             │
│  Controllers                │
│  Authentication             │
│  Authorization              │
│  Validation                 │
│  Business Logic             │
│  Notifications              │
│  Moderation                 │
└──────────────┬──────────────┘
               │
               │ Eloquent ORM
               │
┌──────────────▼──────────────┐
│            MySQL            │
│                             │
│  Users                      │
│  Publications               │
│  Comments                   │
│  Categories                 │
│  Likes                      │
│  Favorites                  │
│  Followers                  │
│  Notifications              │
│  etc.                       │
└─────────────────────────────┘
               │
               ▼
      S3-compatible storage
```

The frontend is implemented as a **Single Page Application (SPA)**. Client-side navigation and reusable React components allow the application to update individual parts of the interface without a full page reload.

The Laravel backend provides JSON responses through the REST API and handles authentication, authorization, validation and business logic.

---

## Database

The application uses **MySQL** as its primary relational database.

The database structure contains dedicated entities for users, publications, comments, likes, favorites, followers, categories, notifications and moderation-related data.

Key database concepts include:

- Primary and foreign keys
- One-to-many relationships
- Relation tables for user interactions
- Secondary indexes
- Migrations
- Seeders
- Cascade deletion
- Soft deletion
- Unique constraints

The database structure was iteratively improved during development. Earlier versions contained less efficient data structures, which were later refactored as the project evolved.

Examples included:

- Separating user and profile data unnecessarily
- Keeping tags directly inside the publication model
- Refining relationships between related entities

The final database model was designed as a relational structure with attention to data integrity and normalization.

---

## Backend

The backend is built with **Laravel 12** and **PHP 8.2+**.

It is responsible for:

- Authentication
- Authorization
- REST API endpoints
- Database interaction
- Publication management
- Moderation workflow
- User management
- Comments
- Likes
- Favorites
- Subscriptions
- Notifications
- File handling
- Validation
- Administrative functionality

Authentication for API interactions is implemented using **Laravel Sanctum**.

Role and permission management is implemented using **Spatie Permission**.

The main business logic is implemented on the backend, primarily through Laravel controllers and application services.

---

## Frontend

The frontend is implemented using:

- React 19
- Vite 7
- JavaScript
- HTML5
- CSS3
- React Router

The application uses a component-based approach.

Reusable components are used for:

- Publication cards
- Forms
- Modals
- Filters
- Notifications
- Profile elements
- Authentication interfaces
- Interactive controls

The application uses asynchronous API requests to load and update data without reloading the entire page.

The interface includes responsive layouts for desktop and mobile devices.

Videos are displayed using the native HTML video player.

---

## UI/UX Design

The complete interface was designed independently in **Figma** before implementation.

The design process included:

- User flows
- Navigation
- Prototypes
- Visual layouts
- Reusable interface components
- Forms and interaction states
- Administrative interfaces
- Responsive layouts

The main UX goal was to make user actions and navigation predictable:

- Where am I?
- What can I do here?
- Where will this action lead?
- How can I return to the previous context?
- What happened after the action?
- What should I do if an error occurs?

Particular attention was paid to user flows, interaction states, navigation and edge cases.

---

## Testing

Testing was performed throughout the development process and included manual functional testing and automated tests.

The project includes testing of:

- Registration and authentication
- Publication creation and editing
- Publication moderation
- User profiles
- Likes and other social interactions
- Access restrictions
- Administrative operations
- API behaviour
- Media handling
- Validation and error states
- Different user roles
- Responsive interface behaviour

The project also includes browser-based tests using **Laravel Dusk** and API testing with **Postman**.

An end-to-end user scenario covers the main flow from registration to publication.

The application was also tested with external users during development to identify usability issues and unexpected interaction paths.

---

## Deployment

The application was previously deployed to a public server with a dedicated domain for project demonstration.

The deployed version was used for real-user testing and demonstration.

Media files were stored using cloud object storage rather than directly on the application server.

The public deployment is no longer active, but the project can be run locally using the provided installation instructions.

---

## Project Structure

```text
.
├── app/
│   ├── Http/
│   ├── Models/
│   ├── Services/
│   └── ...
├── config/
├── database/
│   ├── migrations/
│   └── seeders/
├── resources/
│   ├── js/
│   │   └── components/
│   └── css/
├── routes/
│   ├── api.php
│   └── web.php
├── tests/
│   ├── Feature/
│   ├── Unit/
│   └── Browser/
├── docs/
├── install.md
└── README.md
```

---

## Technologies

### Backend

- PHP 8.2+
- Laravel 12
- Laravel Sanctum
- Spatie Permission

### Frontend

- React 19
- Vite 7
- JavaScript
- HTML5
- CSS3
- React Router

### Database & Storage

- MySQL
- Eloquent ORM
- Database migrations
- Database seeders
- S3-compatible object storage

### Development & Testing

- Git
- GitLab
- Figma
- PHPUnit
- Laravel Dusk
- Postman

---

## My Role

**Solo developer**

I was responsible for the complete development process:

- Project concept
- Requirements analysis
- User scenarios
- Information architecture
- UI/UX design
- Figma prototypes
- Database design
- Backend development
- REST API implementation
- Frontend development
- Authentication and authorization
- Moderation workflow
- Notifications
- Testing
- Debugging
- Deployment
- Technical documentation

No ready-made architecture, database schema, UI design or codebase was provided.

AI-assisted development tools were used as development aids. The project architecture, implementation decisions, debugging, testing and final integration were performed as part of my development work.

---

## Project Timeline

The project evolved over more than one academic year.

### Course Project

The initial concept was developed as a course project during the third year of study.

### Graduation Project

During the fourth year, the project was expanded into a full graduation thesis.

The final focused development phase took approximately **5–6 months**, alongside other academic work.

During this period, the application was significantly expanded in functionality, architecture and interaction design.

---

## Project Challenges

### User Flow Design

One of the main challenges was designing complete user flows instead of implementing isolated features.

For each major action, possible user states, system responses and alternative paths had to be considered.

### Filtering

The filtering system required several iterations.

The initial version contained more filtering options than the final implementation. During development, the logic was simplified and corrected to provide more predictable behaviour.

### Database Design

The database structure evolved during development.

Some early design decisions were later identified as inefficient and were refactored as the application grew.

Examples included:

- Separating user and profile data unnecessarily
- Storing tags directly in the publication model
- Refining relationships between entities

### Asynchronous Interactions

Several frontend/backend interaction issues required debugging, including:

- Likes not being persisted correctly
- Like counters becoming inconsistent
- State inconsistencies after page reloads
- Slow page transitions and loading states

### Moderation Workflow

The moderation system required coordination between:

- Publication states
- Automatic text checks
- Administrator actions
- User notifications
- Publication resubmission

---

## Project Status

**Completed diploma project.**

The core application was implemented, deployed and tested during development.

### Implemented

- [x] User authentication
- [x] User profiles
- [x] Publication feed
- [x] Image and video publications
- [x] Categories and tags
- [x] Search and filtering
- [x] Likes
- [x] Comments
- [x] Favorites
- [x] Subscriptions
- [x] User portfolios
- [x] Drafts
- [x] Scheduled publications
- [x] Automatic text moderation
- [x] Administrator moderation
- [x] Publication state management
- [x] In-app notifications
- [x] Email notifications
- [x] Administrative panel
- [x] Role-based access control
- [x] Cloud media storage
- [x] Database migrations and seeders
- [x] Functional testing
- [x] Browser testing
- [x] SPA architecture
- [x] Responsive UI

### Not implemented

- [ ] Password recovery flow
- [ ] Email account verification
- [ ] Automated image-content moderation

---

## Documentation

Detailed technical documentation is included with the project.

The documentation covers:

- Subject-area research
- Functional requirements
- Technical specification
- Application architecture
- Database design
- User interface design
- User scenarios
- Backend implementation
- Frontend implementation
- Testing
- User instructions

Additional project files:

- [`install.md`](install.md) — installation and environment configuration
- [`tests/Browser/README.md`](tests/Browser/README.md) — browser testing documentation
- [`docs/pz.txt`](docs/pz.txt) — graduation project documentation

---

## Installation

### Requirements

- PHP 8.2+
- Composer
- Node.js
- npm
- MySQL or SQLite

### Setup

```bash
composer run setup
php artisan db:seed
php artisan storage:link
composer run dev
```

The application will be available at:

```text
http://127.0.0.1:8000
```

For detailed setup instructions, environment configuration and development commands, see [`install.md`](install.md).

---

## License

This project was developed as an educational graduation project.

The application uses Laravel, which is distributed under the MIT License.
