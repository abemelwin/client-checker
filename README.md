# ES Print Group — Customer Clearing House (Client Checker)

A centralized customer verification, clearing house, and client database management web application built with **Google Apps Script** and modern HTML/JavaScript. It connects multiple regional branch Google Sheets databases to check for client duplicates, manage records, and streamline sales operations across branches.

---

## 🌟 Features

- **Multi-Branch Database Support**: Seamlessly switch or sync across branches:
  - North Mindanao
  - South Luzon
  - Visayas
  - North Luzon
  - South Mindanao
- **Customer Conflict & Duplicate Checking**: Real-time matching by Company Name, Contact Person, Phone Numbers, and Email Addresses to prevent account overlaps across Account Executives (AEs) and Sales Managers (SMs).
- **Client Management**: Create, update, and search customer records directly from the web interface.
- **Account & Credential Syncing**: Role-based access control and user credential persistence using Google Apps Script `PropertiesService`.
- **Responsive UI**: Clean, mobile-friendly interface built with vanilla HTML/CSS and fast client-side interactions.

---

## 📁 Project Structure

```
├── Code.gs             # Google Apps Script backend logic & Sheet integration
├── index.html          # Web application frontend (UI, styles, and client logic)
└── README.md           # Documentation
```

---

## 🚀 Setup & Deployment Guide

Follow these steps to deploy the application on Google Apps Script:

### 1. Create a Google Apps Script Project
1. Navigate to [script.google.com](https://script.google.com).
2. Click **New project** and name it (e.g., `ES Print Client Checker`).

### 2. Add Source Code
1. Copy the contents of `Code.gs` into the project's `Code.gs` file.
2. In the Apps Script editor, click **+** next to Files > **HTML**, name it `index.html`, and paste the contents of `index.html`.

### 3. Configure Branches and Sheet URLs
Open `Code.gs` and verify or update the `BRANCHES` mapping with your Google Spreadsheet URLs:
```javascript
var BRANCHES = {
  'NORTH MINDANAO': '<SPREADSHEET_URL>',
  'SOUTH LUZON': '<SPREADSHEET_URL>',
  'VISAYAS': '<SPREADSHEET_URL>',
  'NORTH LUZON': '<SPREADSHEET_URL>',
  'SOUTH MINDANAO': '<SPREADSHEET_URL>'
};
```
Ensure each connected Google Spreadsheet has a sheet/tab named `CLIENT DATABASE` matching the column definitions in `COL_MAP`.

### 4. Deploy as a Web App
1. Click **Deploy** > **New deployment**.
2. Select type: **Web app**.
3. Configure the deployment:
   - **Description**: `Production Deployment`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone` (or restricted within your organization if using Google Workspace).
4. Click **Deploy** and copy the generated **Web App URL**.

---

## 📋 Required Google Sheet Columns

The `CLIENT DATABASE` tab in each branch spreadsheet should include the following header columns:

- `ENCODE / UPDATE DATE`
- `COMPANY NAME`
- `AE`
- `TL`
- `SM`
- `ADDRESS`, `CITY`, `PROVINCE`
- `CONTACT PERSON 1`, `CONTACT PERSON 2`, `POSITION 2`
- `CONTACT NUMBER 1`, `CONTACT NUMBER 2`, `CONTACT NUMBER 3`, `CONTACT NUMBER 4`
- `EMAIL 1`, `EMAIL 2`, `EMAIL 3`
- `FIRST CONTACT`, `LEAD SOURCE`, `NOTES`, `INQUIRY`, `ID`

---

## 🛠️ Tech Stack

- **Backend**: Google Apps Script (JavaScript ES6 / V8 Runtime)
- **Database**: Google Sheets API via Apps Script `SpreadsheetApp`
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla ES6+)
