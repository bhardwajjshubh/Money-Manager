# Money Manager Frontend

React + Vite frontend for Money Manager.

## Setup

1. Install dependencies:

```powershell
npm install
```

2. Create env file from template:

```powershell
Copy-Item .env.example .env
```

3. Fill Firebase and API env values in `.env`:

```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_FIREBASE_API_KEY=your-firebase-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
```

4. Run app:

```powershell
npm run dev
```

## Auth Flow

- Signup uses Firebase email/password and sends verification email.
- Login requires verified email and then exchanges Firebase ID token with backend at `/auth/firebase-auth`.
- Forgot password uses Firebase reset email.
