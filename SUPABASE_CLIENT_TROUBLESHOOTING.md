# Supabase Client Troubleshooting Guide

## Common Issues That Cause Supabase Client to Hang or Fail

### 1. **Session/Authentication Issues**
The most common cause - `supabase.auth.getUser()` can hang if:
- Session cookies are expired or invalid
- Multiple client instances trying to refresh session simultaneously
- Cookie storage is blocked (third-party cookies, browser privacy settings)
- Session refresh is stuck in a loop

**Symptoms:**
- Client-side queries hang indefinitely
- No error, just never resolves
- Works fine on server-side API routes

**Fix:**
- Use server-side API routes instead of direct client queries
- Ensure cookies are properly set in middleware
- Check browser console for cookie warnings

### 2. **Environment Variables**
Missing or incorrect environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Check:**
- Variables are set in `.env.local` (for local dev)
- Variables are set in Vercel/your hosting platform (for production)
- Variables start with `NEXT_PUBLIC_` for client-side usage
- No typos in variable names

### 3. **Cookie Issues**
Supabase SSR relies on cookies for session management:

- **Third-party cookies blocked**: Browser privacy settings block cookies
- **SameSite cookie issues**: CORS/cookie policies blocking session
- **Cookie expiration**: Session expired and refresh failed
- **Multiple domains**: Cookies not shared across subdomains

### 4. **Network/CORS Issues**
- Supabase project URL blocked by firewall/proxy
- CORS headers not configured correctly
- Network timeout (requests taking too long)

### 5. **RLS (Row Level Security) Policies**
Queries can appear to hang if:
- RLS policies are too restrictive
- Policy conditions are incorrect
- User doesn't have proper permissions

**Check:**
- RLS policies in Supabase dashboard
- Error messages in browser console (sometimes hidden)
- Try with service role key (admin client) to bypass RLS

### 6. **Multiple Client Instances**
Creating multiple Supabase clients can cause race conditions:
- Each client tries to refresh session independently
- Cookie conflicts
- Memory leaks

**Fix:**
- Create client once and reuse
- Use server-side client for server components
- Use client-side client only in client components

### 7. **Next.js SSR Issues**
Client-side Supabase with Next.js SSR can have issues:
- Hydration mismatches
- Server/client state sync issues
- Cookie handling in different environments

## Solutions We've Implemented

### ✅ Use Server-Side API Routes
Instead of direct client queries, use API routes:

**Before (problematic):**
```typescript
const supabase = createClient();
const { data } = await supabase.from('designs').select();
```

**After (works reliably):**
```typescript
// Client-side
const response = await fetch('/api/designs/list');
const { designs } = await response.json();
```

### ✅ Server-Side Rendering
Use server components when possible:
```typescript
// app/layout.tsx
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
```

### ✅ Middleware Session Refresh
The middleware automatically refreshes sessions:
```typescript
// middleware.ts
const { data: { user } } = await supabase.auth.getUser();
```

## Debugging Steps

1. **Check Browser Console:**
   - Look for cookie warnings
   - Network tab for failed/hanging requests
   - Check for CORS errors

2. **Check Environment Variables:**
   ```bash
   # In browser console
   console.log(process.env.NEXT_PUBLIC_SUPABASE_URL);
   ```

3. **Test with Direct API Call:**
   ```typescript
   // Test if Supabase is reachable
   fetch('https://your-project.supabase.co/rest/v1/', {
     headers: {
       'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
     }
   })
   ```

4. **Check Supabase Dashboard:**
   - Database → Logs for query issues
   - Authentication → Logs for auth issues
   - Settings → API for URL/key verification

5. **Try Service Role Key (Admin):**
   - Bypass RLS to test if policies are the issue
   - **Never expose service role key to client!**

6. **Check Cookie Storage:**
   ```javascript
   // In browser console
   document.cookie // Should show Supabase session cookies
   ```

## Best Practices

1. **Always use API routes for data fetching in client components**
2. **Use server-side client in server components**
3. **Let middleware handle session refresh**
4. **Handle errors gracefully with try/catch and timeouts**
5. **Add loading states for async operations**

