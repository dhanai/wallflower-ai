# Cookie/Session Issues Between Localhost and Production

## The Problem

When you log in from **localhost** and then visit **Vercel production** (or vice versa), you can encounter cookie/session conflicts that cause the Supabase client to hang.

### What Happens:

1. **Domain-Specific Cookies**: Cookies are domain-specific. When you log in on `localhost:3000`, Supabase sets session cookies for that domain only. These cookies **won't work** on `your-app.vercel.app`.

2. **Stale Cookies**: Your browser keeps cookies from both domains:
   - `localhost` cookies (for local dev)
   - `vercel.app` cookies (for production)
   
   The Supabase client tries to use cookies from the wrong domain, causing it to hang when trying to refresh the session.

3. **Session Validation Failure**: `supabase.auth.getUser()` tries to validate a session cookie that belongs to a different domain, causing it to hang indefinitely.

4. **Race Conditions**: Multiple active sessions on different domains can cause conflicts.

## Symptoms

- Supabase client queries hang indefinitely
- `auth.getUser()` never resolves
- Client-side queries fail silently
- Works fine after clearing cookies
- Works on server-side API routes (they don't rely on browser cookies the same way)

## Solutions

### Solution 1: Clear Cookies When Switching Domains

**Manual Fix:**
1. Open browser DevTools (F12)
2. Go to Application → Cookies
3. Clear all cookies for both `localhost` and your Vercel domain
4. Refresh the page

**Programmatic Fix:**
Add a utility to clear stale cookies on page load:

```typescript
// In your app or middleware
if (typeof window !== 'undefined') {
  // Clear cookies from wrong domain on page load
  const currentDomain = window.location.hostname;
  if (currentDomain.includes('vercel.app')) {
    // Clear localhost cookies
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });
  }
}
```

### Solution 2: Always Sign Out Before Switching

Always sign out properly before switching between localhost and production:
- Sign out from localhost → clear localhost session
- Sign out from production → clear production session
- Then sign in on the new domain

### Solution 3: Use Different Browsers/Profiles

- Use one browser profile for localhost development
- Use another browser profile (or browser) for production testing
- This keeps sessions completely separate

### Solution 4: Clear All Site Data

In Chrome/Edge:
1. Open DevTools → Application tab
2. Click "Clear site data"
3. Check all boxes
4. Click "Clear site data"

### Solution 5: Add Cookie Debugging

Add logging to see what cookies are present:

```typescript
if (typeof window !== 'undefined') {
  console.log('Current domain:', window.location.hostname);
  console.log('All cookies:', document.cookie);
  console.log('Supabase cookies:', 
    document.cookie.split(';').filter(c => c.includes('supabase'))
  );
}
```

## Prevention

### Best Practices:

1. **Use API Routes**: Always use server-side API routes instead of direct client Supabase queries (which we've already implemented)
2. **Clear on Sign Out**: Ensure sign-out clears cookies properly
3. **Domain Detection**: Add checks to handle domain mismatches gracefully
4. **Error Handling**: Add timeouts to Supabase client calls to prevent infinite hangs

## Why Server-Side Works

Server-side API routes work because:
- They use server-side Supabase client which doesn't rely on browser cookies the same way
- Cookies are handled by the server middleware
- Session validation happens on the server, not in the browser
- No domain-specific cookie conflicts

This is why we've moved all data fetching to API routes - they're more reliable and don't have these cookie issues!

