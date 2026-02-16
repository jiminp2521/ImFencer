import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
        return NextResponse.redirect(url)
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_deleted, user_type')
        .eq('id', user.id)
        .maybeSingle()

    if (profileError) {
        console.error('Middleware profile check failed:', profileError)
        return supabaseResponse
    }

    if (profile?.is_deleted) {
        await supabase.auth.signOut()
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('deleted', '1')
        return NextResponse.redirect(url)
    }

    const path = request.nextUrl.pathname
    const isAdminRoute = path.startsWith('/admin')
    const userType = profile?.user_type || ''
    const isAdmin = userType === 'admin' || userType === 'master' || userType === 'operator'

    if (isAdminRoute && !isAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = '/profile'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/write/:path*',
        '/profile/:path*',
        '/market/write/:path*',
        '/fencing/lessons/write/:path*',
        '/activity/:path*',
        '/notifications/:path*',
        '/admin/:path*',
    ],
}
