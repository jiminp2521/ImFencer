import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase-server'

const sanitizeNextPath = (value: string | null) => {
    if (!value) return '/'
    if (!value.startsWith('/')) return '/'
    if (value.startsWith('//')) return '/'
    return value
}

const sanitizeAuthMode = (value: string | null): 'login' | 'signup' => {
    return value === 'signup' ? 'signup' : 'login'
}

const toLoginErrorPath = (message: string) => `/login?oauthError=${encodeURIComponent(message)}`

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = sanitizeNextPath(searchParams.get('next'))
    const authMode = sanitizeAuthMode(searchParams.get('authMode'))
    const oauthError = searchParams.get('error')
    const oauthErrorDescription = searchParams.get('error_description')

    if (oauthError) {
        const detail = oauthErrorDescription || oauthError
        return NextResponse.redirect(`${origin}/login?oauthError=${encodeURIComponent(detail)}`)
    }

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const { data: { user } } = await supabase.auth.getUser()

            let redirectUrl = next
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, is_deleted')
                    .eq('id', user.id)
                    .maybeSingle()

                if (profile?.is_deleted) {
                    await supabase.auth.signOut()
                    redirectUrl = '/login?deleted=1'
                } else if (authMode === 'login') {
                    if (!profile?.username) {
                        await supabase.auth.signOut()
                        redirectUrl = toLoginErrorPath('가입된 계정이 없습니다. 회원가입을 먼저 진행해주세요.')
                    }
                } else if (profile?.username) {
                    await supabase.auth.signOut()
                    redirectUrl = toLoginErrorPath('이미 가입된 소셜 계정입니다. 로그인 화면에서 로그인해주세요.')
                } else {
                    redirectUrl = '/signup/profile'
                }
            }

            const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${redirectUrl}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${redirectUrl}`)
            } else {
                return NextResponse.redirect(`${origin}${redirectUrl}`)
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
