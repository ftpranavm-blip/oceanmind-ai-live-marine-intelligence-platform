# OceanMind AI   Live Marine Intelligence Platform

> **Note:** The feature sections below are the original product brief and
> describe intended behaviour, including live data feeds that are not built.
> "Backend API" and "External Data Sources" describe what exists today. See
> README.md for the current state.

## Overview
OceanMind AI is a fully live, modular marine intelligence and climate risk monitoring platform that combines real-time data sources, live API integrations, and automated analysis to provide comprehensive ocean monitoring and risk assessment capabilities with automatic alert generation.

## Core Features

### Application Header
- Dark enterprise-themed header with custom OceanMind AI logo (`logopranav.png`) displayed beside the title
- Logo positioned neatly beside "OceanMind AI" text with proper horizontal alignment and balanced visual hierarchy
- Logo sized approximately 1.5× the text height for visibility without being overpowering
- Responsive design maintaining correct spacing and centering across all screen sizes
- Logo and title visible across all pages for consistent branding with adaptive scaling for different screen sizes
- Maintains dark theme consistency throughout the application

### Command Center Dashboard
- Dark enterprise-themed dashboard with sidebar navigation
- Live global map panel with real-time vessel tracking using properly configured Leaflet.js with OpenStreetMap tiles
- Interactive incident timeline with auto-refresh capabilities
- Real-time Global Marine Risk Index display combining all monitoring modules including live Fusion Engine correlations
- Module shortcuts with live severity indicators
- Navigation to seven main modules: Satellite, Coral, AIS, IoT, Live Ocean Map, Fusion, and Alerts
- Auto-refresh on new data uploads or API updates
- Guaranteed map tile loading with fallback mechanisms
- Subtle loading animations (pulsing wave or spinner overlay) while fetching live map data with graceful empty state handling
- Consistent refresh timing synchronized between live map and alert systems for smoother live experience

### Live Ocean Map Module
- Interactive real-time marine data visualization using properly configured Leaflet.js with working OpenStreetMap tile layers
- **Enhanced demo vessel data display with 4-5 static demo vessel data points shown by default on the map to clearly demonstrate live map functionality when no external feed is active**
- **Demo vessels positioned at strategic global locations with realistic vessel information including MMSI numbers, vessel types, speeds, headings, and risk scores**
- Continuous real-time vessel tracking with backend mechanism that fetches latest vessel data at regular intervals (30-60 seconds) with no caching to ensure always-fresh AIS vessel information
- Frontend implementation using React Query's polling system for periodic refetching to update marker positions dynamically without reloading the map
- Smooth marker coordinate updates and details (MMSI, type, speed, heading) without marker re-creation during each update cycle
- Persistent map viewport and user interactions (zoom, pan, toggles) maintained during live updates
- Synchronized backend and frontend systems ensuring seamless live vessel position refresh with continuous real-time movement on the map
- Dynamic map marker, overlay, and heatmap updates without page reloads using backend-driven data
- Backend-driven vessel and parameter data with smooth transitions based on prior data points when live data is unavailable
- Reliable map rendering with immediate tile loading and fallback mechanisms
- Live vessel position tracking with dynamic markers fetched from backend `getMapData()` endpoint
- Smooth marker animations to simulate vessel motion and position updates based on real backend data
- Color-coded vessel markers based on risk score levels:
  - Green for low risk (0-0.25)
  - Yellow for moderate risk (0.25-0.5)
  - Orange for high risk (0.5-0.75)
  - Red for critical risk (0.75-1.0)
- Interactive vessel tooltips and popups displaying:
  - Vessel name and identification details
  - Current location coordinates
  - Speed and heading information
  - Last updated timestamp
  - Real-time risk score assessment
  - Nearby alerts and incidents
- **Fully functional toggleable ocean parameter overlays with complete visual representation:**
  - **Temperature overlay using gradient color layers with interactive tooltips showing temperature values in °C**
  - **Pollution level overlay with color intensity indicators and interactive tooltips displaying pollution index values**
  - **Current direction overlay using vector arrows showing flow patterns with interactive tooltips displaying current speed and direction**
  - **All overlays coexist with vessel markers without performance degradation**
  - **Toggle controls allowing users to enable/disable each overlay independently**
  - **Gradient layers for temperature and pollution using color intensity to represent magnitude**
  - **Vector arrows for currents showing both direction and speed with appropriate scaling**
- Continuous real-time updates using periodic API polling with configurable refetch intervals
- Automatic refresh functionality with zoom-level and map position retention during updates
- Animated transitions for vessel movements and data updates
- Real-world map interaction with zoom, pan, and layer toggle controls
- Integration with backend API for continuous vessel and ocean parameter updates
- Enhanced backend-driven live data feeds with realistic motion simulation based on prior data points
- Graceful handling of empty states by showing demo data until live data streams load to ensure meaningful live visuals
- Dark enterprise theme styling with custom map tiles and UI elements to match application theme
- Proper Leaflet.js integration with reliable OpenStreetMap tile rendering and error handling
- Loading animations during data fetch operations

### Satellite Intelligence Module
- Google Earth Engine integration panel for live satellite data access
- Enhanced region selector with predefined critical marine regions:
  - Great Barrier Reef (Australia)
  - Coral Triangle (Southeast Asia)
  - Maldives
  - Andaman & Nicobar Islands (India)
  - Red Sea
  - Hawaii
  - Florida Keys (USA)
- Region selection via dropdown menu or interactive map-based polygon selection
- Stored coordinates for each predefined region enabling automated data queries
- Timeframe picker and enhanced satellite layer selection including:
  - Sentinel-1 (SAR) for radar imagery with cloud-independent, day/night functionality
  - Sentinel-2 for optical imagery
  - Landsat for multispectral data
  - MODIS for thermal and ocean color data
- Independent or combined satellite data source selection
- Manual satellite image upload functionality
- Real-time image analysis capabilities:
  - Vessel detection and clustering (enhanced with Sentinel-1 SAR)
  - Oil spill detection using SAR data
  - Night-time maritime monitoring via radar imagery
  - Pollution pattern identification
  - Marine Protected Area (MPA) violation monitoring
- Automatic satellite_risk_score computation and display
- Automated alert triggering based on analysis results
- Analysis History section displaying:
  - Previously completed analyses with timestamps
  - Selected regions and satellite data sources used
  - Computed risk scores and analysis results
  - **Instant display updates without requiring page reload using optimized React Query cache invalidation and real-time polling**
  - **Immediate synchronization between backend persistence and frontend display ensuring new analyses appear instantly after saving**
- **Enhanced "Save Analysis & Generate Alerts" functionality:**
  - Fully functional save operation that immediately persists analysis data to backend
  - **Automatic React Query cache invalidation for `getSatelliteAnalysisHistory` to refresh history instantly**
  - **Real-time state updates ensuring new analyses appear immediately in Analysis History section**
  - User interface success feedback with confirmation message
  - Guaranteed backend persistence with complete metadata storage
- Persistent storage of analysis results with immediate display updates
- Real-time synchronization between backend persistence and frontend React Query layer ensuring new analyses appear instantly after saving

### Coral Intelligence Module
- Coral image upload functionality with live AI analysis
- NOAA Coral Reef Watch API integration for live temperature and stress data
- Enhanced region selector with predefined coral reef regions:
  - Great Barrier Reef – Australia (Indo-Pacific)
  - Coral Triangle – Indonesia, Philippines, Malaysia
  - Maldives – Indian Ocean
  - Andaman & Nicobar Islands – India
  - Hawaii – Central Pacific Ocean
  - Caribbean Reefs – Caribbean Sea
  - Florida Keys – United States
  - Seychelles – Western Indian Ocean
  - Red Sea Reefs – Middle East
  - Persian Gulf (Arabian Gulf) – Arabian Peninsula
- Region selection via dropdown menu with proper geo-mapping and consistent labeling
- Stored coordinates for each predefined coral reef region enabling automated data queries
- Real-time bleaching probability assessment for selected regions
- Thermal stress estimation using live temperature feeds
- Automatic coral_risk_score computation and display
- Risk data transmission to Fusion Engine
- Live temperature and stress data visualization
- Analysis History section displaying:
  - Previously completed coral analyses with timestamps
  - Selected coral reef regions and data types (SST/live temperature)
  - Computed risk scores and analysis results
  - Alert status (triggered or not) for each analysis
  - **Instant display updates without requiring page reload using optimized React Query cache invalidation and real-time polling**
  - **Immediate synchronization between backend persistence and frontend display ensuring new analyses appear instantly after saving**
- **Enhanced "Save Analysis & Generate Alerts" functionality:**
  - Fully functional save operation that immediately persists coral analysis data to backend
  - **Automatic React Query cache invalidation for `getCoralAnalysisHistory` to refresh history instantly**
  - **Real-time state updates ensuring new analyses appear immediately in Analysis History section**
  - User interface success feedback with confirmation message
  - Guaranteed backend persistence with complete metadata storage
- Persistent storage of coral analysis results with guaranteed backend persistence
- Real-time synchronization between backend persistence and frontend React Query layer ensuring new analyses appear instantly after saving
- Analytics integration across data collection, visualization, and alerts for all coral reef regions

### AIS Intelligence Module
- AIS data ingestion via CSV upload and live stream simulation
- Real-time AIS data processing and analysis
- Vessel route plotting and live tracking visualization
- Speed and course analysis with real-time graphical displays
- Behavioral analytics including:
  - Loitering detection
  - Route deviation analysis
  - AIS gap identification
  - Zone violation monitoring
- Illegal fishing detection algorithms
- Real-time ais_risk_score computation and alert generation
- Analysis History section displaying:
  - Previously completed AIS analyses with timestamps
  - Selected regions or areas of interest
  - Vessel IDs (MMSI/IMO) analyzed
  - Computed risk scores and analysis results
  - Alert status (triggered or not) for each analysis
  - **Instant display updates without requiring page reload using optimized React Query cache invalidation and real-time polling**
  - **Immediate synchronization between backend persistence and frontend display ensuring new analyses appear instantly after saving**
- **Enhanced "Save Analysis & Generate Alerts" functionality:**
  - Fully functional save operation that immediately persists AIS analysis data to backend
  - **Automatic React Query cache invalidation for `getAISAnalysisHistory` to refresh history instantly**
  - **Real-time state updates ensuring new analyses appear immediately in Analysis History section**
  - User interface success feedback with confirmation message
  - Guaranteed backend persistence with complete metadata storage
- Persistent storage of AIS analysis results with guaranteed backend persistence
- Real-time synchronization between backend persistence and frontend React Query layer ensuring new analyses appear instantly after saving

### IoT Ocean Intelligence Module
- IoT sensor data ingestion via CSV upload
- Mock NOAA buoy data simulation integration
- Real-time monitoring of ocean parameters:
  - Water temperature
  - pH levels
  - Turbidity
  - Dissolved oxygen
- Automatic iot_risk_score computation
- Climate stress alert triggering based on parameter thresholds
- Live parameter visualization and trending
- **Enhanced "Save Data & Generate Alerts" functionality:**
  - Fully functional save operation that immediately persists IoT analysis data with full metadata including:
    - Module identifier ("IoT Intelligence")
    - Region or sensor location
    - Data type (temperature, oxygen, pH, turbidity)
    - Timestamp
    - Alert status (triggered or not)
  - **Automatic React Query cache invalidation for `getIoTAnalysisHistory` to refresh history instantly**
  - **Real-time state updates ensuring new analyses appear immediately in Analysis History section**
  - User interface success feedback with confirmation message
  - Guaranteed backend persistence with complete metadata storage
- IoT Data History section displaying:
  - Previously completed IoT analyses with timestamps
  - Selected regions or sensor locations
  - Data types monitored (temperature, oxygen, pH, turbidity)
  - Computed IoT risk scores and analysis results
  - Alert status (triggered or not) for each analysis
  - **Instant display updates without requiring page reload using optimized React Query cache invalidation and real-time polling**
  - **Immediate synchronization between backend persistence and frontend display ensuring new analyses appear instantly after saving**
- Persistent storage of IoT analysis results with guaranteed backend persistence
- Real-time synchronization between backend persistence and frontend React Query layer ensuring new analyses appear instantly after saving
- End-to-end verification that saving IoT analyses correctly updates both backend storage and frontend UI display

### Fusion Engine
- Fully real-time multi-source signal integration from all monitoring modules including Live Ocean Map data
- Continuous automatic data polling from all intelligence layers (Satellite, Coral, AIS, IoT, Live Ocean Map) every 8 seconds using optimized `useQueries.ts` hook
- Real-time Global Marine Risk Index calculation with automatic updates based on latest module data
- Enhanced backend fusion logic that continuously aggregates live data streams from all modules by periodically collecting their latest risk scores and alert states
- Automated fusion alert generation with new backend logic that triggers and persists fusion alerts whenever cross-module correlation conditions are met:
  - High satellite risk + high AIS risk = Illegal fishing fusion alert
  - High coral risk + high temperature data = Reef emergency fusion alert
  - High satellite pollution + high IoT turbidity = Pollution correlation fusion alert
  - Multiple high-risk modules in same geographic area = Critical zone fusion alert
- Live correlation-based alert generation with automatic fusion alert creation and immediate persistence
- Enhanced rule-based risk assessment combining:
  - Satellite risk scores with AIS data for illegal fishing detection
  - Coral risk scores with temperature data for reef emergency alerts
  - Satellite pollution detection with IoT turbidity data for pollution alerts
  - Live Ocean Map vessel tracking with risk assessment data
  - Vessel density analysis with coral bleaching indicators
  - Sea surface temperature correlations with pollution indicators
- Unified intelligence visualization showing satellite + coral + AIS + IoT + Live Ocean Map correlations
- Live Fusion Matrix display with real-time correlation visualization:
  - Interactive correlation grid showing relationships between all data sources
  - Color-coded correlation strength indicators
  - Dynamic updates without page reloads every 8 seconds
  - Smooth animations for correlation changes
- Automatic fusion alert generation based on multi-source correlations with immediate display in frontend
- Real-time fusion_risk_score computation and display
- Continuous backend synchronization ensuring fusion-generated alerts appear instantly in Command Center and Alerts module with correct `type_` tag as "Fusion"
- Live updates and automatic risk index recalculation every 8 seconds
- Persistent storage of fusion analysis results and correlation data
- Fusion Dashboard with live correlation metrics and trend analysis
- Automatic correlation threshold monitoring and alert triggering
- Real-time data aggregation from all modules without manual refresh requirements
- Seamless integration with AlertsModule to display fusion alerts in global alert feed with proper tagging
- Optimized polling synchronization between Fusion Engine, Command Center, and alert timeline for consistent live experience
- **Enhanced "Save Snapshot" functionality with complete implementation:**
  - Fully functional "Save Snapshot" button that captures current Fusion Engine state
  - Immediate backend persistence using `saveFusionAnalysis()` endpoint with all required fields:
    - Unique snapshot ID
    - Precise timestamp
    - Current fusion risk score
    - Current global marine risk index
    - Complete correlation matrix data
    - Number of active alerts generated
    - Owner principal identification
  - **Automatic React Query cache invalidation for `getFusionAnalysisHistory` to refresh history instantly**
  - **Real-time state updates ensuring new snapshots appear immediately in Fusion Analysis History section**
  - User interface success feedback immediately after saving with confirmation message
  - Guaranteed backend persistence with complete metadata storage
  - Real-time synchronization ensuring new snapshots appear immediately in Fusion Analysis History without manual page reload
- **Enhanced Three-Tab Interface with Fixed Navigation and Robust State Management:**
  - **Fusion Analysis Tab:** Primary analysis interface with correlation matrix, risk scores, and "Save Snapshot" functionality
  - **AI Recommendations Tab:** Displays AI-generated recommendations after fusion analysis completion with automatic activation when recommendations are generated
  - **Fusion History Tab:** Shows historical fusion analysis snapshots and associated recommendations
  - **Seamless Tab Navigation with Persistent State Management:** Users can freely switch between all three tabs at any time through clickable tab headers with instant transitions and no UI locks or freezing
  - **Enhanced Tab State Management with Data Persistence:** Tab switching maintains all loaded data (analyses, recommendations, history) without re-renders or state loss, ensuring seamless user experience
  - **Improved Visual Feedback:** Active tab is visually distinct with clear highlighting, hover effects, and consistent state synchronization across all operations
  - **Instant Transitions with Data Preservation:** Tab switching is immediate with no delays, loading states, or unresponsive periods while preserving all Fusion data across tabs
  - **Robust State Synchronization:** Tab state correctly maintains data integrity when switching sections, preventing any data loss or UI freezing during navigation
  - **Auto-activation with Restored Control:** AI Recommendations tab automatically becomes active when new recommendations are generated, but users immediately regain full control to switch to any tab afterward with all data preserved
  - **Validated Responsiveness with Data Integrity:** Final validation ensures Fusion UI module remains fully responsive with instant transitions and maintains all loaded data when switching between tabs
  - **Persistent Data Loading:** All Fusion data (analyses, recommendations, history) stays loaded and accessible when switching tabs, avoiding unnecessary re-renders or data refetching
- **AI Recommendations Tab Content:**
  - Automatically activates after a Fusion Engine analysis is completed and recommendations are generated
  - Displays comprehensive AI-generated recommendations including:
    - **Situation Summary:** Generated text explaining detected risks, anomalies, or correlation patterns
    - **Risk Assessment:** Overall severity level, confidence score, and specific risk type classification (Illegal Fishing, Reef Emergency, Pollution Event, Critical Zone Alert)
    - **Actionable Steps:** List of recommended mitigation or response actions based on detected scenario
    - **Responsible Stakeholders:** Suggested authorities or agencies (Coast Guard, Marine Research, Environmental Agency, Port Authority, etc.)
    - **Confidence Levels:** Displayed as percentage or clear "High/Medium/Low" indicators tied to current risk and correlation data
  - Real-time UI feedback confirming when recommendations are generated and saved
  - Integration with backend recommendation generation system
- Fusion Analysis History section displaying:
  - Previously completed fusion analyses with timestamps
  - Cross-module correlation results and conditions met
  - Computed fusion risk scores and analysis results
  - Alert status (triggered or not) for each fusion analysis
  - **Associated AI recommendations for each historical analysis**
  - **Instant display updates without requiring page reload using optimized React Query cache invalidation and real-time polling**
  - **Immediate synchronization between backend persistence and frontend display ensuring new analyses appear instantly after saving**
- Real-time synchronization between backend persistence and frontend React Query layer ensuring new fusion analyses appear instantly after saving

### Central Alerts & Incident Management
- Fully live and functional alerts dashboard with continuous real-time updates
- Automatic refresh every 8 seconds without requiring manual refresh using optimized `useQueries.ts` hook
- Real-time alert synchronization ensuring newly generated alerts from all modules (Satellite, Coral, AIS, IoT, Fusion, and Live Ocean Map) are immediately reflected in the alerts list and timeline view
- Enhanced fusion alert integration with immediate display of correlation-based alerts tagged with `type_`: "Fusion"
- Centralized alert and incident database with guaranteed backend persistence including:
  - Alert type and classification
  - Source module identification (Satellite, Coral, AIS, IoT, Fusion, Live Ocean Map)
  - Timestamp with precise creation time
  - Severity level (Low, Medium, High, Critical)
  - Alert owner/originator information
  - Complete metadata for traceability
  - Fusion correlation data for multi-source alerts
- Live severity-based filtering with dynamic color-coded badges:
  - Green badges for Low severity alerts
  - Yellow badges for Medium severity alerts
  - Orange badges for High severity alerts
  - Red badges for Critical severity alerts
- Real-time sorting with most recent alerts displayed first
- Interactive alert details view with expandable information panels
- Enhanced alert timeline visualization with:
  - Smooth animations for new alert additions
  - Live synchronization with backend data every 8 seconds
  - Chronological display with visual severity indicators
  - Hover effects and interactive elements
- Automatic alert list refresh when any module triggers new alerts including fusion-generated alerts
- End-to-end live alert synchronization ensuring seamless integration between all monitoring modules, fusion engine, and the alerts dashboard
- Alert categorization by severity levels, timestamps, and source modules with real-time updates
- Source attribution for all alerts including complete module identification with special "Fusion" tagging
- Incident replay functionality with live data integration
- Global alert panel showing active risks and live incident feeds
- Persistent alert storage with immediate frontend display updates
- Loading animations and smooth transitions during alert data updates
- Dark enterprise theme consistency with alert severity color coding
- Verified fusion alert refresh behaviors work seamlessly with Command Center and alert timeline

## Data Storage Requirements

### Backend Data Storage
- Enhanced real-time alert and incident records with complete metadata including:
  - Alert type and classification
  - Source module identification (Satellite, Coral, AIS, IoT, Fusion, Live Ocean Map)
  - Precise timestamp with creation time
  - Severity level (Low, Medium, High, Critical)
  - Alert owner/originator information
  - Complete traceability metadata
  - Fusion correlation data for multi-source alerts
  - Special "Fusion" type tagging for fusion-generated alerts
- Live risk scores from all monitoring modules (satellite_risk_score, ais_risk_score, iot_risk_score, coral_risk_score, ocean_map_risk_score, fusion_risk_score)
- Global Marine Risk Index calculations and historical data with fusion engine contributions
- Enhanced fusion correlation matrices and analysis results with persistent storage
- Multi-source correlation data and threshold configurations for automated fusion alert triggering
- Fusion alert generation rules and cross-module condition tracking
- **Enhanced fusion analysis snapshot storage with complete data persistence:**
  - Unique snapshot identifiers and precise timestamps
  - Complete fusion risk scores and global marine risk index values
  - Full correlation matrix data and cross-module relationships
  - Number of active alerts generated at snapshot time
  - Owner principal identification for traceability
  - Complete metadata for snapshot reconstruction and analysis
  - **AI-generated recommendations data including situation summary, risk assessment, actionable steps, responsible stakeholders, and confidence levels**
  - Guaranteed backend Map storage in `fusionAnalysisHistory` with immediate persistence
- **AI Recommendations storage:**
  - Generated situation summaries and risk context explanations
  - Risk type classifications and severity assessments
  - Confidence scores and levels tied to correlation data
  - Actionable mitigation and response recommendations
  - Responsible stakeholder assignments based on detected scenarios
  - Recommendation generation timestamps and metadata
- Uploaded coral images and AI analysis results
- **Enhanced coral analysis history records with guaranteed instant persistence:**
  - Analysis timestamps and completion status
  - Selected coral reef regions and coordinate data
  - Data types used (SST/live temperature)
  - Computed coral risk scores and analysis results
  - Alert status (triggered or not) for each analysis
  - Generated alerts and incidents
  - **Backend event timestamps and alert metadata for real-time synchronization with immediate React Query cache updates**
- Predefined coral reef region coordinate data for automated queries
- **Enhanced AIS analysis history records with guaranteed instant persistence:**
  - Analysis timestamps and completion status
  - Module identifier ("AIS Intelligence")
  - Selected regions or areas of interest
  - Vessel IDs (MMSI/IMO) analyzed
  - Computed AIS risk scores and analysis results
  - Alert status (triggered or not) for each analysis
  - Generated alerts and incidents
  - **Backend event timestamps and alert metadata for real-time synchronization with immediate React Query cache updates**
- AIS data records and behavioral analysis results
- **Enhanced IoT analysis history records with guaranteed instant persistence:**
  - Analysis timestamps and completion status
  - Module identifier ("IoT Intelligence")
  - Selected regions or sensor locations
  - Data types monitored (temperature, oxygen, pH, turbidity)
  - Computed IoT risk scores and analysis results
  - Alert status (triggered or not) for each analysis
  - Generated alerts and incidents
  - **Backend event timestamps and alert metadata for real-time synchronization with immediate React Query cache updates**
- IoT sensor readings and threshold configurations
- **Enhanced Live Ocean Map vessel and ocean parameter data storage:**
  - **Static demo vessel data points (4-5 vessels) with realistic information including MMSI numbers, vessel types, coordinates, speeds, headings, and risk scores**
  - **Ocean parameter data for temperature, pollution, and current overlays with coordinate-based values for interactive tooltips**
  - **Temperature data with coordinate mapping and values in °C for gradient overlay visualization**
  - **Pollution level data with coordinate mapping and index values for color intensity overlay**
  - **Current direction and speed data with coordinate mapping and vector information for arrow overlay visualization**
- Live Ocean Map vessel position data and risk assessments with periodic updates every 30-60 seconds and no caching for always-fresh AIS vessel information
- Ocean parameter data (temperature, currents, pollution overlays)
- Vessel information and tracking history with enhanced backend-driven motion data
- Enhanced fusion engine rules and correlation results with real-time updates and persistent alert generation tracking
- User-defined monitoring regions and parameters
- API integration configurations and data cache
- Live data stream metadata and processing logs
- Enhanced backend data for vessels and ocean parameters with realistic transitions based on prior data points
- **Enhanced satellite analysis history records with guaranteed instant persistence:**
  - Analysis timestamps and completion status
  - Selected regions and coordinate data
  - Satellite data sources used (Sentinel-1, Sentinel-2, Landsat, MODIS)
  - Computed risk scores and analysis results
  - Generated alerts and incidents
  - **Backend event timestamps and alert metadata for real-time synchronization with immediate React Query cache updates**
- Predefined region coordinate data for automated satellite queries

### File Storage
- Coral image uploads and analysis outputs
- AIS CSV data files and processed results
- IoT sensor data files and analysis reports
- Satellite imagery and analysis results
- Generated reports and fusion intelligence outputs
- Fusion correlation matrices and analysis reports

## Backend API (as implemented in `backend/main.mo`)

This section lists only endpoints that exist. "User" means a caller with the
`#user` role or higher; calls from other callers trap.

### Analyses
| Endpoint | Kind | Notes |
| --- | --- | --- |
| `saveSatelliteAnalysis(id, region, sourceSentinel1, sourceSentinel2, sourceLandsat, sourceModis, vesselCount, clusterFlag, pollutionFlag, nearCoral, marina_area_flag, riskScore) -> Bool` | update | User. Traps if `id` holds another user's record (admins may overwrite). |
| `getSatelliteAnalysisHistory() -> [SatelliteAnalysis]` | query | User. Caller's own records; admins see all. |
| `saveCoralAnalysis(region, imageId, bleachingProbability, thermalStress, riskScore, dataType) -> Bool` | update | User. Stored under a server-generated key (`<region>#<n>`). `alertStatus` = `riskScore >= 6`. |
| `getCoralAnalysisHistory() -> [CoralAnalysis]` | query | User. Caller's own records; admins see all. |
| `saveAISAnalysis(id, dataModule, region, vesselIDs, riskScore) -> Bool` | update | User. Owner check as above. `alertStatus` = `riskScore >= 7`. |
| `getAISAnalysisHistory() -> [AISAnalysis]` | query | User. Caller's own records; admins see all. |
| `saveIoTAnalysis(id, dataModule, region, dataType, riskScore) -> Bool` | update | User. Owner check as above. `alertStatus` = `riskScore >= 7`. |
| `getIoTAnalysisHistory() -> [IoTAnalysis]` | query | User. Caller's own records; admins see all. |
| `saveFusionAnalysis(id, correlations, fusionRiskScore, globalRiskScore, alertsGenerated, aiRecommendations) -> Bool` | update | User. Owner check as above. AI recommendations are generated in the frontend and passed in. |
| `getFusionAnalysisHistory() -> [FusionAnalysisRecord]` | query | User. Caller's own records; admins see all. |
| `getAIRecommendations(id) -> ?AIRecommendations` | query | User. Returns `null` for another user's record unless the caller is an admin. |

Risk scores for satellite, coral, AIS and IoT are on a 0-10 scale.

### Alerts
| Endpoint | Kind | Notes |
| --- | --- | --- |
| `saveAlert(id, type_, severity, source) -> Bool` | update | User. Traps if `id` holds another user's alert (admins may overwrite). Fusion alerts use this with `type_ = "Fusion"`. |
| `updateAlert(id, type_, severity, source) -> Bool` | update | User. Owner or admin only; traps if the alert does not exist. |
| `getAllAlerts() -> [Alert]` | query | User. Returns every user's alerts. |
| `getAlertsByType(alertType) -> [Alert]` | query | User. Returns every user's alerts of that type. |
| `getAlertsBySeverity(severity) -> [Alert]` | query | User. Returns every user's alerts of that severity. |

### Map
| Endpoint | Kind | Notes |
| --- | --- | --- |
| `getMapData() -> MapData` | query | User. Returns 5 hardcoded demo vessels and 5 fixed ocean-parameter points (temperature, current, pollution). Nothing is fetched. |

### Users and access control
| Endpoint | Kind | Notes |
| --- | --- | --- |
| `getCallerUserProfile() -> ?UserProfile` | query | User. |
| `getUserProfile(user) -> ?UserProfile` | query | User; own profile only unless admin. |
| `saveCallerUserProfile(profile)` | update | User. |
| `getCallerUserRole() -> UserRole` | query | From the authorization mixin. |
| `isCallerAdmin() -> Bool` | query | From the authorization mixin. |
| `assignCallerUserRole(user, role)` | update | From the authorization mixin. |
| `_initializeAccessControlWithSecret(userSecret)` | update | From the authorization mixin. |

### Blob storage (from the `blob-storage` mixin)
`_caffeineStorageBlobIsLive`, `_caffeineStorageBlobsToDelete`,
`_caffeineStorageConfirmBlobDeletion`, `_caffeineStorageCreateCertificate`,
`_caffeineStorageRefillCashier`, `_caffeineStorageUpdateGatewayPrincipals`.

## External Data Sources
None are connected. The satellite ("Earth Engine"), coral ("NOAA Coral Reef
Watch"), AIS and IoT ("NOAA buoy") readings are generated in the browser with
`Math.random`, and the UI labels them "Simulated".

## Technical Architecture
- Continuous real-time vessel tracking with backend mechanism fetching latest vessel data every 30-60 seconds with no caching
- Frontend React Query polling system for periodic refetching and dynamic marker position updates without map reloading
- **Enhanced real-time Analysis History system with guaranteed instant updates:**
  - **Optimized React Query cache invalidation for all analysis history endpoints (`getSatelliteAnalysisHistory`, `getCoralAnalysisHistory`, `getAISAnalysisHistory`, `getIoTAnalysisHistory`, `getFusionAnalysisHistory`)**
  - **Immediate cache updates triggered by successful save operations across all modules**
  - **Real-time polling system ensuring analysis history sections reflect latest data without page reload**
  - **Synchronized backend persistence and frontend state management for instant UI updates**
- Enhanced real-time alerts system with automatic refresh every 8 seconds using optimized React Query polling in `useQueries.ts`
- Live alert synchronization ensuring immediate display of newly generated alerts from all modules including fusion alerts with "Fusion" type tagging
- Optimized real-time Fusion Engine data aggregation with automatic polling from all intelligence modules every 8 seconds
- Enhanced continuous fusion correlation computation and alert generation without manual refresh requirements
- Backend fusion logic with automated cross-module condition monitoring and fusion alert triggering with immediate persistence
- **Enhanced React Query integration for all module save functionality:**
  - **Immediate React Query cache invalidation for all analysis history queries after successful save operations**
  - **Optimized mutation handling with success feedback and automatic history refresh across all modules**
  - **Guaranteed frontend-backend synchronization for instant analysis display in all modules**
  - **Error handling and user feedback for all save operations**
  - **Real-time AI recommendation generation and display integration**
- **AI Recommendations system integration:**
  - Automatic recommendation generation triggered by fusion analysis completion
  - Real-time UI updates for AI Recommendations tab activation
  - Backend integration for recommendation persistence alongside fusion snapshots
  - Frontend React Query hooks for recommendation data fetching and display
- **Enhanced Fusion Engine Tab Navigation with Robust State Management and Data Persistence:**
  - **Seamless Tab Switching with Data Preservation:** Component state management ensuring all three tabs (Fusion Analysis, AI Recommendations, Fusion History) remain accessible and clickable at all times with instant transitions while preserving all loaded data
  - **Improved State Reset Logic with Data Integrity:** Tab state correctly maintains data integrity when switching sections, preventing UI locks, inactive click events, or unresponsive periods while keeping all Fusion data loaded
  - **Enhanced Visual Feedback:** Active tab is visually distinct with clear highlighting, proper contrast, and consistent state synchronization across all operations
  - **Instant Responsiveness with Data Preservation:** Tab navigation is immediate with no delays, loading states, or transition lag after any operation while maintaining all analyses, recommendations, and history data
  - **Validated UI Responsiveness with Data Persistence:** Final validation ensures Fusion UI module remains fully responsive with instant transitions and proper state management while preserving all loaded Fusion data across tab switches
  - **Auto-activation with Immediate Control Restoration and Data Preservation:** AI Recommendations tab automatically becomes active when new recommendations are generated, but users immediately regain full control to switch to any tab afterward without restrictions while all data remains loaded
  - **Robust Event Handling with Data Integrity:** Click events are always active and responsive, preventing any UI freezing or inactive states during tab navigation while maintaining all Fusion data without re-renders or state loss
  - **Persistent Data Loading Across Tabs:** All Fusion data (analyses, recommendations, history) stays loaded and accessible when switching tabs, avoiding unnecessary re-renders or data refetching for seamless user experience
- **Real-time data binding between backend persistence and frontend React Query layer across all intelligence modules:**
  - **Guaranteed instant display of new analyses after saving with no manual reload required**
  - **Enhanced React Query mutation and cache management for all modules (Satellite, Coral, AIS, IoT, Fusion)**
  - **Automatic UI refresh mechanisms for all Analysis History sections ensuring live synchronization between backend Map storage and frontend display**
  - **Optimized polling and cache invalidation strategies for consistent real-time experience**
- Smooth marker coordinate and detail updates without marker re-creation during update cycles
- Persistent map viewport and user interactions during live updates
- Synchronized backend and frontend systems for seamless live vessel position refresh and alert updates with 8-second polling optimization
- **Enhanced Live Ocean Map visualization with comprehensive overlay support:**
  - **Leaflet.js integration with fully functional temperature, pollution, and current overlays using gradient layers and vector arrows**
  - **Interactive tooltip system displaying temperature values in °C, pollution index values, and current speed/direction information**
  - **Toggle controls for independent overlay management without performance degradation**
  - **Coexistence of vessel markers and ocean parameter overlays with smooth rendering**
- Map-based visualization for spatial data with live overlays using properly configured Leaflet.js
- Live Fusion Matrix visualization with real-time correlation updates and smooth animations every 8 seconds
- Time-series charts for temporal analysis with auto-refresh
- Responsive design for various screen sizes
- Live data export capabilities for analysis results
- Automated alert generation and notification system with guaranteed persistence including fusion alerts with proper "Fusion" tagging
- Continuous connection between backend methods and frontend visualization layers
- Enhanced backend-driven data updates with realistic motion simulation based on prior data points
- Smooth animated transitions for real-time data updates, vessel motion simulation, and alert display
- Reliable map tile loading with OpenStreetMap integration and error handling
- Enhanced backend data systems to ensure consistent user experience with graceful empty state handling
- Loading animations and user experience enhancements during data fetch operations using optimized `useQueries.ts` hook
- Prioritized backend-driven live data display with enhanced simulation capabilities
- Continuous backend-driven data feeds using enhanced motion simulation to ensure meaningful live visuals
- Synchronized refresh timing between Command Center, Live Ocean Map, Fusion Engine, and Alerts dashboard for consistent live experience with 8-second polling intervals
- **Guaranteed persistence and immediate display of analysis results and alerts without page reload for all modules including fusion with enhanced React Query cache management**
- End-to-end live alert synchronization ensuring seamless integration between monitoring modules, fusion engine, and alerts dashboard with verified fusion alert refresh behaviors
- Real-time fusion correlation processing with automatic backend synchronization and frontend display updates every 8 seconds
- Optimized polling intervals ensuring synchronization between all modules and fusion engine for consistent live experience
