# Changelog

All notable changes to the MTS (Misafir Takip Sistemi) project will be documented in this file.

## [2026-01-24] - UI/UX Improvements & Infrastructure Fixes

### Added

#### 🎨 Favicon & Branding
- **Custom Favicon**: New MTS branded favicon with blue rounded-square background and white arrow icon
  - Matches login page logo design
  - Updated `index.html` favicon reference from Vite default to custom `favicon.png`
  - Page title changed from "frontend" to "Misafir Takip Sistemi"

#### 👤 Admin User Setup
- **Default Admin User**: Added local development admin account
  - Username: `admin`
  - Password: `admin123`
  - Role: `admin`

### Changed

#### 🔧 Infrastructure
- **Backend Port Changed**: 5000 → 5001
  - macOS Monterey+ uses port 5000 for ControlCenter service
  - Updated `backend/.env` to use PORT=5001
  - Updated `frontend/vite.config.js` proxy target to localhost:5001
  - Ensures reliable local development on macOS

#### 🎯 Admin Login Button Positioning
- **Improved Layout**: "Admin Girişi" link repositioned
  - Changed from fixed right edge (`justify-end p-4`) 
  - Now aligned with form container (`max-w-4xl mx-auto`)
  - Same padding as content area (`px-4 sm:px-6 lg:px-8`)
  - Visually aligned above "Yeni Rezervasyon" heading

### Fixed
- **Preset Links Not Showing**: Fixed by correcting backend port configuration
  - Presets API was unreachable due to port 5000 conflict
  - Now correctly fetching from port 5001

### Technical Details

#### Modified Files
- `backend/.env` - Port changed to 5001
- `frontend/vite.config.js` - Proxy target updated to 5001
- `frontend/index.html` - Favicon and title updated
- `frontend/src/components/Layout.jsx` - Admin login button positioning
- `frontend/public/favicon.png` - New custom favicon (added)

---

## [2026-01-23 PM] - Form Enhancements & Preset System

### Added

#### 📋 Ön Tanımlı Bilgiler (Preset System)
- **Preset Data Storage**: JSON-based preset system in `backend/data/presets.json`
  - 8 default presets (KH, GH, FL, FS, FP, IN, BE, BM)
  - Each preset contains: firstName, lastName, phone, email, country, city
  
- **Backend Preset API** (`/api/presets`):
  - `GET /api/presets` - Public endpoint to fetch all presets
  - `GET /api/presets/:id` - Public endpoint for single preset
  - `POST /api/presets` - Admin-only: Create new preset
  - `PUT /api/presets/:id` - Admin-only: Update preset
  - `DELETE /api/presets/:id` - Admin-only: Delete preset
  - File-based storage with async read/write operations

- **Admin Preset Management Page** (`/admin/presets`):
  - Full CRUD interface for managing presets
  - Table view showing all presets with ID, Label, Name, Phone, Email
  - Modal form for creating/editing presets
  - Edit and Delete buttons for each preset
  - Validation for required fields
  - Protected route (admin-only access)

- **Preset Quick Links in Forms**:
  - Minimal clickable text buttons in "Formu Giren Kişi Bilgileri" section
  - Format: `Ön Tanımlı: KH · GH · FL · FS · FP · IN · BE · BM`
  - One-click auto-fill of registrar information
  - Works on public pages (no login required)
  - Automatic validation after preset application

- **Sidebar Menu Item**:
  - "Ön Tanımlılar" menu with Bookmark icon
  - Navigation to preset management page

#### 🔄 Form Reorganization
- **Field Order Changed**:
  - New order: Formu Giren Kişi → Rezervasyon Detayları → Grup Başkanı → Ek Misafirler
  - More logical flow for users

#### 📝 HTML5 Input Enhancements
- **Autocomplete Attributes**:
  - `given-name` for first names
  - `family-name` for last names
  - `tel` for phone numbers
  - `email` for email addresses
  - `country-name` for country fields
  - `address-level2` for city fields
  - Better mobile keyboard selection
  - Improved browser autofill support

#### 📞 International Phone Input
- **react-phone-number-input Integration**:
  - International phone selector with country flags
  - Custom CSS styling matching application theme
  - Separate themes: blue for registrar, gray for guests
  - Auto-validation with `isValidPhoneNumber`
  - Real-time error feedback

- **IP-Based Country Detection**:
  - Automatic country detection using ipapi.co
  - Sets default country code for phone input
  - Fallback to Turkey (TR) if detection fails
  - Applied to all phone inputs (registrar, guest, additional guests)

#### ✅ Real-Time Input Validation
- **Email Validation**:
  - Regex pattern validation
  - Optional field validation (only validates if filled)
  - Green checkmark for valid emails
  - Red error message for invalid format

- **Phone Validation**:
  - International format validation
  - Required field validation
  - Visual feedback with icons
  - Error messages: "Geçerli bir telefon numarası giriniz"
  - Success messages: "Geçerli telefon"

- **Visual Feedback**:
  - Green CheckCircle icon for valid input
  - Red AlertCircle icon for errors
  - Red border on invalid fields
  - Submit button auto-disabled when validation fails

#### 📊 Excel Import for Groups
- **XLSX Library Integration**:
  - Template download functionality
  - Excel file upload and parsing
  - First row = group leader, remaining rows = additional guests
  - Columns: Ad, Soyad, Telefon, Email

- **Excel Import UI**:
  - Indigo-themed section (group mode only)
  - "Template İndir" button for downloading sample
  - "Excel Yükle" button with file picker
  - Accepts .xlsx and .xls files
  - Instructions and column header guidance
  - Auto-population of form after successful import
  - Guest count auto-updated
  - Validation applied to imported data

### Changed

#### � Calendar View Improvements
- **Enhanced Reservation Display**:
  - Name, City, and Country shown on *every* day of reservation
  - Consistent visual style across all days
  - Tooltip with full guest details and status
  - Optimized for readability on smaller screens
  - Smart truncation for long text
- **Capacity Indicator**:
  - Daily occupancy shown against configurable max capacity (e.g., 5/9)
  - Color-coded indicators (Green = Available, Red = Full)

#### ⚙️ Configurable Settings
- **Settings Management**:
  - Admin-configurable application settings
  - JSON-based storage (`backend/data/settings.json`)
  - Admin-only management page: `/admin/settings`
- **Max Capacity Setting**:
  - Configurable daily max capacity (default: 9)
  - Admin can update value via UI
  - Updates reflected in Dashboard and Calendar calculations immediately
- **Backend Settings API**:
  - `GET /api/settings` (Public)
  - `PUT /api/settings` (Admin)

### Changed

#### �📱 Mobile Responsiveness Improvements
- **NewReservation Page**:
  - Fully responsive with Tailwind breakpoints
  - Grid layouts: 1 col (mobile) → 2 cols (tablet) → 3 cols (desktop)
  - Responsive typography: text-xs/sm → text-base/lg
  - Touch-friendly button sizes
  - Compact tab labels on mobile ("Birey" vs "Bireysel")
  - Adaptive container widths and padding

#### 🔓 Public Access Enhancements
- **Public Preset Access**:
  - Presets endpoint `GET /api/presets` made public
  - Non-logged-in users can see and use preset buttons
  - Authentication still required for modifying presets

### Technical Details

#### New Dependencies
- `react-phone-number-input` - International phone input component
- `libphonenumber-js` - Phone number validation (already included)
- `xlsx` - Excel file reading and writing

#### New Files
- `backend/data/presets.json` - Preset data storage
- `backend/data/settings.json` - Settings storage
- `backend/routes/presets.js` - Preset CRUD API
- `backend/routes/settings.js` - Settings API
- `frontend/src/pages/Presets.jsx` - Admin preset management page
- `frontend/src/pages/Settings.jsx` - Admin settings page
- `frontend/src/phone-input.css` - Custom phone input styles

#### Modified Files
- `frontend/src/pages/NewReservation.jsx` - Form reorganization, presets, validation, Excel import
- `frontend/src/components/CalendarView.jsx` - UI improvements, settings integration
- `frontend/src/pages/Dashboard.jsx` - Max capacity integration
- `frontend/src/components/Layout.jsx` - Added Presets and Settings menu items
- `frontend/src/App.jsx` - Added Presets and Settings routes
- `backend/server.js` - Added preset and settings routes
- `frontend/src/axiosConfig.js` - Dynamic API URL configuration

### UX Improvements
- Clickable preset shortcuts for faster form filling
- Real-time validation feedback reduces errors
- Automatic country detection improves UX
- Excel import enables bulk data entry
- Mobile-optimized layouts for all screen sizes
- Clear visual feedback for all user actions
- Consistent reservation info in calendar view
- Admin control over system capacity

---

## [2026-01-23] - Authentication & Advanced Features

### Added

#### 🔐 Authentication System
- **User Authentication**: JWT-based authentication system
  - User model with username, password (hashed with bcrypt), and role fields
  - Login endpoint (`POST /api/auth/login`)
  - Registration endpoint (`POST /api/auth/register`)
  - Token verification endpoint (`GET /api/auth/verify`)
  - JWT middleware for protecting routes
  - Admin role middleware for role-based access control

- **Frontend Auth Components**:
  - `AuthContext` for global authentication state management
  - `Login` page with modern UI
  - `Navbar` component showing login/logout and user info
  - `ProtectedRoute` component for route protection
  - Axios interceptors for automatic token injection and 401 handling

- **Admin Sidebar**:
  - Left sidebar navigation for authenticated admin users
  - Dashboard, Rezervasyonlar, Misafirler, Yeni Rezervasyon links
  - Conditionally shown only to logged-in admins
  - Public pages (NewReservation) show no sidebar

#### 📱 Mobile Responsiveness
- **NewReservation Page**:
  - Fully responsive design with Tailwind breakpoints (sm, md, lg)
  - Mobile-optimized form layout (1 column → 2 columns → 3 columns)
  - Responsive typography (text-xs/sm on mobile, text-base/lg on desktop)
  - Touch-friendly button sizes
  - Compact tab buttons on mobile with abbreviated text

#### 📞 International Phone Input
- **react-phone-number-input Integration**:
  - International phone number input with country selector
  - Custom CSS styling to match application UI
  - Separate themes for registrar (blue) and guest inputs
  - IP-based country detection using ipapi.co API
  - Automatic country code selection based on user's location
  - Fallback to Turkey (TR) if detection fails

#### ✅ Input Validation
- **Real-time Validation**:
  - Email validation with regex pattern
  - Phone number validation using `isValidPhoneNumber`
  - Visual feedback with success (green) and error (red) indicators
  - CheckCircle and AlertCircle icons for validation status
  - Error messages displayed below inputs
  - Submit button automatically disabled when validation errors exist

- **Validated Fields**:
  - Registrar phone (required)
  - Registrar email (optional but validated if provided)
  - Guest/Group leader phone (required)
  - Guest/Group leader email (optional but validated if provided)

#### 📊 Excel Import Feature
- **XLSX Integration**:
  - Download Excel template with example data
  - Upload .xlsx or .xls files for bulk guest import
  - First row automatically mapped to group leader
  - Subsequent rows mapped to additional guests
  - Template includes: Ad, Soyad, Telefon, Email columns
  - Automatic form population after import
  - Guest count auto-updated
  - Validation applied to imported data

- **Excel Import UI**:
  - Indigo-themed section visible only in Group mode
  - "Template İndir" button for downloading template
  - "Excel Yükle" button with file picker
  - Instructions and column header information
  - Mobile-responsive layout

#### 🌐 Network Access
- **Dynamic API Configuration**:
  - `axiosConfig.js` with dynamic base URL using `window.location.hostname`
  - Replaced all hardcoded `localhost:5000` with centralized axios instance
  - Backend listening on `0.0.0.0` for network-wide access
  - Support for external device access on same network

#### 🔤 HTML5 Enhancements
- **Autocomplete Attributes**:
  - `given-name` for first name fields
  - `family-name` for last name fields
  - `tel` for phone fields
  - `email` for email fields
  - `country-name` for country fields
  - `address-level2` for city fields
  - Improved mobile keyboard selection
  - Better browser autofill support

### Changed

#### 📝 Form Reorganization
- **NewReservation Layout**:
  - Moved "Rezervasyon Detayları" section before "Grup Başkanı Bilgileri"
  - New order: Registrar Info → Reservation Details → Group Leader → Additional Guests
  - More logical flow for users filling the form

#### 🔒 Route Protection
- **Backend Routes**:
  - `GET /api/reservations` - requires authentication
  - `PUT /api/reservations/:id` - requires authentication + admin role
  - `DELETE /api/reservations/:id` - requires authentication + admin role
  - `POST /api/reservations` - **public** (no auth required for guest submissions)

- **Frontend Routes**:
  - `/` - Public NewReservation page
  - `/login` - Public login page
  - `/dashboard` - Protected (admin only)
  - `/reservations` - Protected (admin only)
  - `/reservations/new` - Protected (admin only, form variant)
  - `/guests` - Protected (admin only)

### Fixed
- **Public Reservation Submission**: Removed auth requirement from POST endpoint to allow public submissions
- **Axios Interceptor**: Only adds Authorization header when token exists
- **401 Redirect Loop**: Prevented redirect on `/login` and `/` paths

### Technical Details

#### Dependencies Added
- `jsonwebtoken` - JWT token generation and verification
- `bcryptjs` - Password hashing
- `react-phone-number-input` - International phone input component
- `libphonenumber-js` - Phone number validation
- `xlsx` - Excel file reading and writing

#### New Files
- `backend/models/User.js` - User model
- `backend/routes/auth.js` - Authentication routes
- `backend/middleware/authMiddleware.js` - JWT and role middleware
- `frontend/src/context/AuthContext.jsx` - Authentication context
- `frontend/src/pages/Login.jsx` - Login page
- `frontend/src/components/Navbar.jsx` - Navigation bar
- `frontend/src/components/ProtectedRoute.jsx` - Route protection HOC
- `frontend/src/components/Layout.jsx` - Admin layout with sidebar
- `frontend/src/axiosConfig.js` - Axios instance with interceptors
- `frontend/src/phone-input.css` - Custom phone input styles

#### Modified Files
- `frontend/src/pages/NewReservation.jsx` - Mobile responsive, validation, Excel import
- `frontend/src/App.jsx` - Layout integration, protected routes
- `frontend/src/main.jsx` - Axios config import
- `backend/server.js` - Auth routes, listen on 0.0.0.0
- `backend/routes/reservations.js` - Route protection
- Multiple component files - Replaced localhost URLs with axios instance

### Security
- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 24 hours
- Token stored in localStorage
- CORS enabled for network access
- Role-based access control (admin vs user roles)

### UX Improvements
- Real-time form validation feedback
- Automatic country detection from IP
- Mobile-optimized interfaces
- Excel bulk import for efficiency
- Clear visual feedback for all actions
- Disabled submit button when validation fails

---

## Future Enhancements
- Password reset functionality
- Remember me option
- Session management
- More granular user permissions
- CSV export for reservations
- Advanced filtering and search
