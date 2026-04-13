````markdown
# Envoi

**Envoi** is a secure student-focused file sharing web application designed to help users upload, manage, and share academic files in a more controlled, organized, and security-aware way.

This project was developed as a final-year cybersecurity project and focuses on combining **practical file sharing** with **usable security features** such as controlled sharing, verification-aware access, grouped file collections, smart share rules, and per-file security monitoring.

---

## Overview

Students often share files through messaging apps, email, or public cloud links, which can be messy, insecure, and poorly structured for academic use. Envoi was built to provide a cleaner and safer alternative.

With Envoi, users can:

- upload academic files
- preview and manage their files
- share files directly with other users
- organize related files into collections
- apply smart sharing rules
- monitor file activity through a dedicated Security Center

---

## Key Features

### Core Features
- User authentication
- File upload and management
- File preview
- Direct file sharing
- Shared files view
- Notifications

### Security Features
- Verified-user enforcement
- Password-protected sharing
- Share expiry support
- Access logging
- Download control
- Rule-based Smart Share Contracts
- Owner-only Envoi Security Center

### Advanced Features

#### File Collection Builder
Group multiple related files into one structured collection and share them together.

#### Smart Share Contracts
Apply sharing rules such as:
- verified users only
- expiry date/time
- maximum views
- maximum downloads
- download allowed or disabled

#### Envoi Security Center
An owner-only per-file security page that shows:
- security score
- risk status
- recent alerts
- activity timeline
- active direct shares
- quick actions such as revoke and expire access

---

## Tech Stack

- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Next.js App Router API routes
- **Authentication:** NextAuth
- **Database / Backend Services:** Firebase Firestore, Firebase Storage, Supabase
- **Testing:** Jest, Playwright
- **Deployment:** Vercel

---

## Project Structure

```bash
app/
  (dashboard)/
  api/
  shared-files/
  public-files/
utils/
__tests__/
tests/
````

The application uses the Next.js App Router structure, with API routes for backend logic and utility modules for validation, sharing, logging, and security-related processing.

---

## Getting Started

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd envoi
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root and add the required environment variables for:

* NextAuth
* Firebase
* Supabase
* any additional local configuration used by the project

### 4. Run the development server

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Available Scripts

### Run development server

```bash
npm run dev
```

### Run unit tests

```bash
npm run test:unit
```

### Run end-to-end tests

```bash
npm run test:e2e
```

### Run full test suite

```bash
npm run test:all
```

### Build for production

```bash
npm run build
```

### Start production build

```bash
npm run start
```

---

## Security Design Highlights

Envoi was designed with security as a core priority rather than an afterthought.

Some of the main security-focused design choices include:

* server-side ownership checks
* verified-user restrictions
* password-protected access flows
* contract-based share enforcement
* per-file access logging
* detection of suspicious activity patterns
* owner-only visibility into security events
* direct-share revocation and forced expiry controls

The aim is not to imitate enterprise-scale infrastructure, but to provide a realistic and well-scoped secure file sharing platform suitable for an academic setting.

---

## Testing

The project includes both:

* **Unit testing** for validation and security-related logic
* **End-to-end testing** for key user flows

Testing was used to validate:

* file validation rules
* password attempt limiting
* verification token behavior
* file collection validation
* smart share contract logic
* security center summary logic
* upload and share flows

---

## Current Status

Envoi currently includes:

* secure file upload and sharing
* grouped file collections
* smart share contracts
* per-file security monitoring
* testing coverage for major flows

Planned or optional future improvements may include:

* external email-based sharing
* forgot password flow
* email verification improvements
* domain-based email delivery integration
* improved notification workflows
* further UX polish

---

## Academic Context

This project was developed as part of a final-year cybersecurity project and focuses on applying practical security principles to a real web application.

It combines:

* secure software design
* access control
* user-centered sharing workflows
* logging and monitoring
* realistic scope control for an academic system

---

## Author

**Abdulhamid Babajide Mustapha**
Final-year Cybersecurity Student

---

## License

This project is for academic and portfolio use unless otherwise stated.

```
```
