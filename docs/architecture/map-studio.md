# AO-OS Map Studio and Agentic Operations Architecture

**Document Type:** Internal Product / Architecture Memo
**Date:** April 18, 2026
**Status:** Draft for internal alignment
**Owner:** AO / AO-OS Product + Technology

## 1. Decision Summary

AO-OS should own floor-map operations natively inside the product rather than relying on Figma or another external design tool as the system of record.

Figma should remain part of the design workflow for concepting, spatial planning, interface review, and visual standards. It should not be used as the operational runtime, authoring system of record, or permissions layer for live floor intelligence.

The recommended product direction is to build an internal AO-OS module referred to here as **Map Studio**. Map Studio should serve as the operational authoring and control layer for:

* floor plans
* rooms and room groups
* doors and access points
* access readers and hardware placements
* zones and zone permissions
* lockers and locker banks
* cleaning status
* room availability and time remaining
* maintenance alerts
* environmental and sensor overlays
* versioned layout updates by location and floor

The recommended implementation path is:

1. Build Map Studio natively in AO-OS using the existing NestJS, Next.js, Prisma, and Cloud SQL stack.
2. Use AO-OS as the system of record for floor entities and operational state.
3. Use SVG as the canonical visual layout format and JSON / relational objects as the semantic metadata layer.
4. Use n8n as the first orchestration layer for AI-assisted workflows and approvals.
5. Add a direct in-app OpenAI agent layer later once app-native tools and workflows are stable.

## 2. Why This Matters

AO-OS is already more than a brochureware concept or a collection of disconnected software experiments. It is a live operating system with working modules for core business and operational flows, including:

* members
* staff users
* guests
* visits
* waivers
* bookings
* folios
* kiosk
* location
* floor plans
* rooms
* room bookings
* lockers
* wristbands
* access control
* presence events
* cleaning
* subscriptions
* membership plans

The web application is also live across three major surfaces:

* staff portal
* member portal
* guest kiosk

The current product already supports the core end-to-end loop in which a guest can arrive, complete kiosk flow, pay through Stripe, receive wristband assignment, enter controlled spaces, and be monitored through Datadog-enabled observability and automation.

This means the next major product challenge is not proving that AO-OS can run location operations. The next challenge is improving how AO-OS represents, manages, and operationalizes the physical environment.

The floor-map problem is strategically important because it sits at the center of multiple AO-OS responsibilities:

* access control
* room operations
* bookings and time management
* staff visual awareness
* cleaning workflows
* locker availability
* maintenance issues
* safety and incident visibility
* multi-location standardization
* onboarding of new locations and future renovations

If AO-OS does not own this layer directly, the result will be fragmentation between design artifacts, operational data, permissions logic, hardware mappings, and staff workflows. That fragmentation will become more costly as AO scales to additional locations.

## 3. Current-State Constraints and Opportunities

### 3.1 Existing AO-OS Stack

Current live stack includes:

* **Infrastructure:** GCP VM, Docker containers, Cloudflare, Cloud SQL
* **Backend:** NestJS API
* **Frontend:** Next.js 14 web application
* **Database Layer:** Prisma 6 with Prisma Accelerate
* **Source Control:** GitHub
* **Observability:** Datadog APM and RUM
* **Payments:** Stripe
* **Automation:** n8n
* **Notifications and Ops Routing:** Slack, Notion
* **Voice Alerts:** ElevenLabs Lane 1 live
* **Testing and Security:** Postman / Newman, SwaggerHub sync, CodeQL
* **AI / Automation:** GPT-4o currently used via n8n for self-heal workflows

### 3.2 Existing Domain Readiness

AO-OS already models many of the exact entities needed for a floor intelligence system:

* floor plans
* rooms
* room bookings
* lockers
* wristbands
* access control
* presence events
* cleaning
* location

This is a major advantage. The platform already has the right backbone to support an operational floor-map system without introducing an entirely separate platform or external source of truth.

### 3.3 Current Gaps

The most important current gaps are:

* hardware integrations for locker vendors and physical access readers are not fully wired
* floor plans are not yet elevated into a rich operational control layer
* Figma is still a design source rather than an app-owned runtime model
* OpenAI is not yet directly integrated into the AO-OS app layer; AI currently runs through n8n
* environmental and sensor overlays are not yet fully modeled in the operator experience

These gaps reinforce the need to make AO-OS itself the place where facility intelligence is authored and managed.

## 4. Product Decision

### 4.1 What AO-OS Should Do

AO-OS should become the source of truth for facility intelligence.

That means AO-OS should allow authorized operators to:

* import or create a floor layout
* create and edit floors for a location
* define rooms and room boundaries
* identify doors and access readers
* create and manage zones
* assign permissions by door and zone
* bind rooms, doors, and readers to operational objects
* monitor room, locker, and zone status visually
* show cleaning state and time remaining
* show incidents and facility issues on the map
* support renovations, map revisions, and rollback

### 4.2 What Figma Should Do

Figma should remain in the workflow, but in a narrower and cleaner role:

* concepting
* space planning
* layout review
* iconography and UI standards
* stakeholder review and approval

Figma should not serve as:

* the operational database
* the live map runtime
* the permission model
* the hardware binding layer
* the incident overlay system
* the authoritative multi-location floor management tool

### 4.3 Why Not Use Figma as the Core Tool

Figma is excellent for visual design, but weak as the authoritative source for live operational semantics.

AO-OS needs a system that can reliably represent and persist objects such as:

* room IDs
* floor IDs
* door IDs
* access readers
* zone membership
* zone permissions
* locker bank availability
* cleaning status
* out-of-service state
* environmental alerts
* vendor hardware bindings
* published versions by location and floor

A design file can depict these visually, but it does not naturally serve as the source of truth for operational logic, permissions, and live telemetry.

## 5. Target Architecture

### 5.1 Architecture Principle

The floor map should be treated as a **digital operational surface**, not merely a diagram.

### 5.2 Canonical Representation

The recommended representation is:

* **SVG** for base visual layout rendering
* **JSON metadata** plus relational AO-OS entities for semantic meaning and runtime behavior

This creates a clean separation:

* visual geometry lives in SVG
* operational meaning lives in AO-OS data structures

### 5.3 Core Model Layers

#### Layer 1: Base Plan Layer

Contains:

* building shell
* floor outlines
* walls
* room boundaries
* circulation paths
* architectural layout

#### Layer 2: Operational Object Layer

Contains:

* rooms
* doors
* access points
* readers
* locker banks
* staff-only areas
* amenities such as sauna, steam, plunge, lounge, clinic, and support areas

#### Layer 3: Rules Layer

Contains:

* zone definitions
* permission assignments
* door-to-zone relationships
* room grouping rules
* cleaning and operational workflow states
* role-based visibility and editing rights

#### Layer 4: Live State Layer

Contains:

* room occupied / available
* time remaining on room rental
* cleaning requested / in progress / complete
* locker availability
* out-of-service indicators
* device offline indicators
* alert state
* maintenance state
* sensor warnings

### 5.4 Data Model Direction

The system should include stable IDs for objects such as:

* `location_id`
* `building_id`
* `floor_id`
* `floor_version_id`
* `room_id`
* `door_id`
* `reader_id`
* `zone_id`
* `locker_bank_id`
* `sensor_id`
* `asset_id`
* `incident_id`

Each visual object placed on the map should be bindable to one or more AO-OS records.

### 5.5 Versioning

Each floor must support draft and published versions.

The system should support:

* creating a draft from the current published version
* editing a draft safely
* previewing changes
* publishing a new version
* rolling back to a previous published version
* auditing who changed what and when

This is especially important for:

* new location onboarding
* renovation updates
* temporary closures
* zone reconfiguration
* compliance review

## 6. Map Studio Product Scope

### 6.1 View Mode

Staff and operators should be able to see:

* room status
* availability
* room time remaining
* cleaning state
* locker status
* zone access conditions
* maintenance issues
* environmental warnings
* out-of-service spaces
* trouble areas such as sauna malfunction or air circulation problems

### 6.2 Edit Mode

Authorized users such as a GM or central operations admin should be able to:

* upload or import a floor plan
* add a new floor
* edit room boundaries
* add or move doors
* place access readers
* create, rename, and delete zones
* assign rooms and doors to zones
* mark staff-only areas
* attach hardware bindings
* add sensors or environmental points
* mark a space under renovation or temporarily unavailable
* save draft versions and publish changes

### 6.3 Role Model

At minimum, the following roles should be considered:

* central product / ops admin
* location GM
* floor supervisor / duty manager
* maintenance / facilities lead
* cleaning lead
* security / access administrator

Permissions should control:

* who can view maps
* who can edit maps
* who can publish versions
* who can modify access configurations
* who can attach hardware
* who can mark operational issues

## 7. AI Operating Model

### 7.1 Principle

AI should operate on structured AO-OS tools, not on raw diagrams.

The goal is not for AI to freehand-edit a picture. The goal is for AI to accelerate and assist with structured operational tasks.

### 7.2 What AI Should Be Able to Do

AI should assist with:

* creating new floor structures from templates
* suggesting zone definitions
* detecting inconsistent room or zone naming
* identifying missing reader assignments
* flagging doors without permissions
* summarizing incidents by zone or floor
* suggesting likely operational causes of problems
* creating task suggestions for maintenance or cleaning
* guiding staff through location setup workflows
* helping operators update maps after renovations

### 7.3 AO-OS Tooling Model

AI should interact with AO-OS through explicit actions such as:

* `createFloor`
* `duplicateFloorFromTemplate`
* `addRoom`
* `splitRoom`
* `createDoor`
* `placeAccessReader`
* `createZone`
* `renameZone`
* `assignDoorToZone`
* `attachSensorToRoom`
* `markSpaceOutOfService`
* `setCleaningState`
* `publishFloorVersion`

This keeps AI bounded, auditable, and compatible with future compliance and safety requirements.

### 7.4 Orchestration Recommendation

In the near term, n8n should be the primary orchestration layer for AI-assisted workflows.

Use n8n for:

* approval routing
* notifications
* escalation flows
* human-in-the-loop review
* Slack or Notion updates
* maintenance ticket generation
* voice alert triggers
* multi-step remediation workflows

### 7.5 Future AI Layer

Once AO-OS-native tools are mature, direct in-app OpenAI agent integration should be added.

That later phase should support:

* richer in-app copilot behavior
* more flexible tool use
* agent handoffs between specialist functions
* better traceability of reasoning and action
* operator-facing conversational workflows inside AO-OS

## 8. User Workflows

### 8.1 New Location Onboarding

A central admin or GM should be able to:

1. create a new location
2. add one or more floors
3. import a base floor plan
4. define rooms and core areas
5. place doors and access readers
6. define zones
7. assign permissions
8. define lockers and amenities
9. attach devices and sensor points
10. save draft and publish

### 8.2 Renovation or Layout Update

An authorized user should be able to:

1. duplicate current published version into draft
2. edit the affected portion of the map
3. add, remove, or re-label spaces
4. update affected doors, readers, and zones
5. preview impact
6. publish when ready
7. roll back if needed

### 8.3 Day-of Operations

Operations staff should be able to:

* open a map and instantly see current facility state
* identify occupied and available rooms
* see remaining time for room bookings
* identify which spaces need cleaning
* view facility issues and outages
* determine whether readers, doors, or zones are degraded
* navigate staff response to incidents faster

## 9. Implementation Plan

### Phase 1: Data Model and Rendering Foundation

Build:

* floor and floor version model
* SVG import and rendering pipeline
* room / door / zone entity bindings
* basic read-only staff map view

Goal:
Create the first operationally meaningful facility view inside AO-OS.

### Phase 2: Authoring and Version Control

Build:

* draft vs published versions
* edit mode for geometry and object placement
* zone creation and naming
* door and reader placement
* publish / rollback flow

Goal:
Allow AO-OS to become the authoring tool for floor intelligence.

### Phase 3: Live Operational Overlays

Build:

* room status overlays
* cleaning overlays
* locker availability overlays
* incident overlays
* device and alert overlays
* time remaining indicators

Goal:
Turn the map into a live staff control surface.

### Phase 4: AI-Assisted Authoring and Operations

Build:

* AI-assisted map setup
* naming and consistency suggestions
* operational anomaly detection
* AI-generated maintenance / cleaning task suggestions
* n8n-orchestrated approval flows

Goal:
Use AI to accelerate setup and day-to-day operations without removing human control.

### Phase 5: Hardware and Sensor Binding

Build:

* locker vendor API bindings
* physical access reader integrations
* wristband / reader event association
* environmental sensor overlays
* equipment telemetry bindings

Goal:
Connect the digital operational surface to the real facility.

### Phase 6: Direct In-App Agent Layer

Build:

* AO-OS-native AI agent interface
* operator copilot inside the product
* structured tool execution
* richer in-app support for issue diagnosis and action

Goal:
Give AO-OS a direct, intelligent operational layer without outsourcing the product brain to external tooling.

## 10. Risks and Guardrails

### 10.1 Risks

* overbuilding the editor before defining the data model clearly
* blending design and runtime responsibilities too early
* allowing AI to make unbounded or unsafe facility changes
* binding to vendor hardware too early without stable abstractions
* creating map complexity that overwhelms local operators

### 10.2 Guardrails

* AO-OS remains the system of record
* Figma remains design-only
* all AI actions must map to bounded AO-OS tools
* publishing changes should require explicit role-based permission
* major access-control changes should support approval workflows
* hardware bindings should sit behind stable provider abstractions
* live alerts should distinguish between confirmed state and inferred state

## 11. Final Recommendation

AO-OS should formally adopt the position that facility intelligence is a core product capability.

The company should build **Map Studio** as a native AO-OS module using the existing application stack. This module should become the authoritative layer for floor layouts, zones, access points, rooms, lockers, cleaning state, and incident overlays across all current and future locations.

Figma should remain in the design workflow, but not as the system of record for operational maps.

In the near term, AI should act through structured AO-OS tools with n8n as the orchestration layer. In a later phase, AO-OS should add direct in-app OpenAI agent capabilities once the map model and operational tools are stable.

This direction best matches the current AO-OS stack, supports multi-location scale, preserves operational clarity, and creates the strongest path toward a true digital operational control surface for AO.
