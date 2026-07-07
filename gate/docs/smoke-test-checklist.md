# Gate App — Manual Smoke Test Checklist

Run after each refactor phase before merging.

## Environment

- [ ] WAMP Apache + MySQL running
- [ ] `gate/backend/public` is DocumentRoot (`http://gate.local`)
- [ ] `npm run build` completed from `gate/` root (or `npm run dev` for development)
- [ ] Database `gateprod` available

## Auth

- [ ] Login with valid credentials → `status: success`
- [ ] Super Admin redirected to `/dashboard`
- [ ] Gate Guard redirected to `/gate`
- [ ] Admin redirected to `/home`
- [ ] Invalid credentials → 401 error message
- [ ] Logout clears session; protected routes return 401
- [ ] Unauthenticated API call returns 401

## Gate kiosk (`/gate`)

- [ ] QR scan / enter code → check preview loads employee info
- [ ] Semi-auto mode shows submit button
- [ ] Submit records movement (check-in or check-out)
- [ ] Success/error sounds play (if assets present)
- [ ] Manual check-in flow works

## Employees

- [ ] List employees on department database page
- [ ] Create employee
- [ ] Edit employee
- [ ] Search by name / military number

## Reports

- [ ] Attendance report loads for date range
- [ ] Issues report loads (justified or unjustified)

## Badge editor

- [ ] Badge template page loads (Konva canvas editor for visual design)
- [ ] Legacy HTML templates open in CodeMirror editor when applicable
- [ ] Save badge template

## Admin

- [ ] Dashboard stats load
- [ ] Bases / gates CRUD
- [ ] Users list and create
