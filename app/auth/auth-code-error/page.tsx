import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-950 p-6 space-y-4 text-center">
        <h1 className="text-lg font-bold text-white">로그인 처리에 실패했습니다</h1>
        <p className="text-sm text-gray-400">인증 코드가 만료되었거나 잘못된 요청입니다. 다시 로그인해 주세요.</p>
        <div className="flex flex-col gap-2">
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
            <Link href="/login">로그인으로 이동</Link>
          </Button>
          <Button asChild variant="outline" className="border-gray-700 text-gray-200 hover:bg-gray-900">
            <Link href="/">홈으로 이동</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
