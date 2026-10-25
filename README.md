# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.


## Administrator access

The verified Firebase Authentication account `marcusdhaynes@gmail.com` is the permanent primary administrator. Existing administrators can appoint and revoke other administrators in **Admin → Users → Role → Administrator**. Ordinary account profiles cannot grant privileges, and a user cannot assign their own role. Delegated administrator access is checked against the protected `adminGrants/{uid}` Firestore document **and** the currently authenticated verified email, not against editable user profile fields.

### Publish the database security rules

GitHub Pages only deploys the web frontend. The security fixes in `firestore.rules` are not applied to the live Firestore database until an authenticated Firebase deployment is performed. From the repository root, after signing into an account with access to the Firebase project:

```sh
npx firebase-tools@latest login
npx firebase-tools@latest deploy --only firestore:rules --project proseu-working-03-624365-f0705
```

The `firebase.json` file targets the existing named Firestore database `ai-studio-191e945d-ad10-4991-bcd4-9c25f55ffcac`. Review existing live rules before deploying, because Firebase deployments replace the rule set for that database. The authenticated user must verify their email before administrator privileges become active.
