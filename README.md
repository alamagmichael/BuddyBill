# BuddyBill

BuddyBill is a mobile-friendly Splitwise-style prototype for creating unlimited groups, signing up people, adding shared expenses, attaching photos or receipts, and splitting amounts by exact values, percentages, shares, or manual adjustments.

## Scripts

- `npm run dev` starts a local static development server on port 5173.
- `npm run build` validates that the required app files and core features are present.
- `npm run preview` serves the static app locally on port 4173.

## Data storage

This version is a front-end prototype. Signup, groups, expenses, and receipt file names are saved to the browser with `localStorage`, so they persist on the same device but are not shared between users yet. A production BuddyBill app would need a backend database, authentication, and file storage for real multi-user accounts, cross-device sync, settlements, and uploaded receipt images.
