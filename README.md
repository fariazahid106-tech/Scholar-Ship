# ScholarshipMatch AI
React + Vite + Tailwind CSS + Firebase (Auth, Firestore) + Google AI Studio (Gemini 3.7 Flash)

## Run
```bash
npm install
cp .env.example .env     # fill in your keys, then restart dev server after every .env change
npm run dev
```

## Firebase setup
1. Authentication > Sign-in method > enable Email/Password.
2. Create a Firestore database.
3. Authentication > Users > Add user: create the ADMIN account (email + password) yourself. Do this before anyone else can use that email.
4. Put the admin email in `.env` as `VITE_ADMIN_EMAIL=...` and restart `npm run dev`.
5. Firestore > Rules, replace ADMIN_EMAIL_IN_LOWERCASE with the same email, then Publish:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null && request.auth.token.email.lower() == "ADMIN_EMAIL_IN_LOWERCASE";
    }
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      allow read, delete: if isAdmin();
    }
    match /profiles/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      allow read, delete: if isAdmin();
    }
    match /scholarships/{id} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }
  }
}
```

## Admin
Open `/admin` (or `/#/admin`) and sign in with the admin email and password. Anyone else is rejected, and a logged-in non-admin sees "Access denied". The "Admin" button is in the landing navbar, and in the Home navbar when the admin is signed in.
Tabs: Overview, Users (everyone who signed up or logged in, with their saved profile), Scholarships (add, edit, delete, import starter list). The student Home page reads scholarships only from Firestore and updates instantly. "Visit website" opens each scholarship's link.
The real protection is the Firestore rules above (the UI guard alone can be bypassed). When deploying, keep the SPA rewrite so `/admin` loads (`public/_redirects` for Netlify, `vercel.json` for Vercel).
