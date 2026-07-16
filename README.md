# Hamleys Mystery Audit Intelligence

## Overview

Hamleys Mystery Audit Intelligence is an internal web application for
Hamleys India leadership to monitor Mystery Audit performance across
**Retail** and **PLAY** stores.

Version 1 is a static GitHub Pages application built using HTML, CSS and
JavaScript. Future versions will support Google Sheets, Google Apps
Script, email notifications and authentication.

------------------------------------------------------------------------

# Objectives

-   Provide leadership with a single Mystery Audit dashboard.
-   Enable L&D to upload Mystery Audit reports.
-   Enable ROMs to submit employee defaulter cases.
-   Enable HR to initiate and complete disciplinary actions.
-   Maintain historical audit data.
-   Support both Retail and PLAY businesses.

------------------------------------------------------------------------

# Application Pages

## Dashboard (`index.html`)

-   Retail / PLAY toggle
-   India Overview
-   RM / ROM / SD / Store views
-   Audit trends
-   Section performance
-   Areas of Improvement
-   HR Action status

## Admin Portal (`admin.html`)

-   Upload Base Store Mapping
-   Upload Retail Audit PDFs
-   Upload PLAY Audit PDFs
-   Upload Historical Audit Data
-   Validate uploads
-   Refresh Dashboard

## Defaulter & HR Portal (`cases.html`)

ROM submits defaulters → HRBP reviews → HR action → Case closed.

------------------------------------------------------------------------

# Folder Structure

    Hamleys-Mystery-Audit-Intelligence/
    ├── index.html
    ├── admin.html
    ├── cases.html
    ├── README.md
    ├── assets/
    │   ├── css/
    │   ├── js/
    │   ├── images/
    │   ├── icons/
    │   └── fonts/
    ├── data/
    └── docs/

------------------------------------------------------------------------

# Technology

-   HTML5
-   CSS3
-   Vanilla JavaScript
-   Apache ECharts
-   PDF.js
-   SheetJS

------------------------------------------------------------------------

# GitHub Deployment

1.  Create a GitHub repository.
2.  Upload all project files.
3.  Commit changes.
4.  Open **Settings → Pages**.
5.  Select **Deploy from a branch**.
6.  Choose **main** and **/(root)**.
7.  Save.

------------------------------------------------------------------------

# Roadmap

## V1

-   Static GitHub Pages
-   Local browser storage

## V2

-   Google Sheets integration
-   Email notifications
-   Authentication
-   Shared multi-user database

------------------------------------------------------------------------

Maintainer: Hamleys India -- Learning & Development
