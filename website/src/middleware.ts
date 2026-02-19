import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from '@convex-dev/auth/nextjs/server'

// Ensure the Convex URL is available for fetchAction calls in the auth
// middleware (code exchange, token refresh). The library reads this env var
// directly but it may not be available in Vercel Edge runtime.
const CONVEX_URL = 'https://original-gnat-303.convex.cloud'
if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  process.env.NEXT_PUBLIC_CONVEX_URL = CONVEX_URL
}

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)'])

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, '/login')
  }
}, { verbose: true, convexUrl: CONVEX_URL })

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
