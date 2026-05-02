import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // Never redirect API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const { data: { user } } = await supabase.auth.getUser()
  const isAuthPage = pathname.startsWith('/auth')
  const isPublicPage = pathname === '/'

  if (!user && !isAuthPage && !isPublicPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (user) {
    const exemptPaths = ['/voice', '/settings', '/api', '/auth']
    const isExempt = exemptPaths.some(p => pathname.startsWith(p))

    if (!isExempt) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('voice_setup_complete')
        .eq('id', user.id)
        .single()

      if (profile && !profile.voice_setup_complete) {
        const url = request.nextUrl.clone()
        url.pathname = '/voice'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
