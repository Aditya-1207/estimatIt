# Mission

## Background & Motivation

This project was born out of a real-world need. The primary user is a **consultant civil engineer** working with a **local municipal corporation in Maharashtra, India**. His day-to-day work involves:

1. **Site Visit** — Personally visiting construction sites to take physical dimensions (length, breadth, depth) of civil structures using measuring tapes and tools.
2. **Paper Notes** — Recording all measurements in a notebook/paper at the site.
3. **SSR Lookup** — Looking up the applicable rates from the **Maharashtra Public Works Department (PWD) State Schedule of Rates (SSR)**, which his colleague maintains in an Excel file.
4. **Manual Calculations** — Computing quantities (`No × L × B × D`) and amounts (`Quantity × Rate`) on a physical calculator.
5. **Data Entry** — Handing the paper notes to a separate Excel expert who types everything into a government-format Excel estimation sheet.

This workflow is **slow, error-prone, and repetitive**. The engineering expertise required for actual structural assessment gets buried under hours of clerical data entry and formatting.

## Core Problem

> The time dedicated to actual civil engineering work is reduced because of the overhead of manual writing, SSR lookups, calculator-based arithmetic, and Excel formatting.

The dimension measurement at site cannot be automated — it requires physical presence and engineering judgment. But **everything after the site visit** — writing it down, looking up rates, calculating, and producing the final government-standard Excel sheet — is pure clerical overhead that a software tool can eliminate.

## Vision

**estimatIt** replaces the paper → calculator → Excel expert pipeline with a single digital workflow:

```
Site Visit (notebook/mobile) → estimatIt → Government-format Excel/PDF
```

The engineer enters dimensions directly into the app (at the site on mobile, or later at the office on desktop), selects the matching Maharashtra PWD SSR item, and the app handles all calculations and produces the final deliverable — a properly formatted estimation sheet.

## Objectives

| Objective | Description |
|-----------|-------------|
| **Speed** | Reduce estimate preparation time from hours/days to minutes by eliminating manual calculations and re-typing. |
| **Accuracy** | Auto-compute `Quantity = No × L × B × D` and `Amount = Quantity × Rate`. No calculator errors. |
| **On-site Capture** | Allow dimension entry at the construction site via a mobile-friendly PWA, even without internet (offline-first). |
| **Standard Output** | Generate Excel sheets that conform to the **Government of Maharashtra municipal corporation estimation format** — including Measurement Sheet, Abstract, and Recapitulation. |
| **SSR Integration** | Pre-load the Maharashtra PWD SSR into the app with intelligent type-ahead search by item code or description keywords. |
| **Zero Cost** | Run entirely on free-tier infrastructure. This is a personal tool for a single user, not a commercial product (initially). |
| **Future Mobile** | The architecture should support a native mobile app (React Native/Expo) in the future so the engineer can enter dimensions directly on a phone at the site. |

## Non-Goals (for MVP)

- Multi-user / multi-tenant support
- Support for SSR schedules from other Indian states (Maharashtra PWD only)
- Rate Analysis sheet generation (future phase)
- Automated dimension capture from drawings/blueprints
- Integration with any government portal or e-tendering system
