'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const lessonModes = [
  { value: 'offline', label: '오프라인' },
  { value: 'online', label: '온라인' },
  { value: 'hybrid', label: '온/오프라인' },
];

const weaponOptions = [
  { value: 'All', label: '전체 종목' },
  { value: 'Epee', label: '에페' },
  { value: 'Sabre', label: '사브르' },
  { value: 'Fleuret', label: '플뢰레' },
];

export default function LessonWritePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lessonMode, setLessonMode] = useState('offline');
  const [weaponType, setWeaponType] = useState('All');
  const [locationText, setLocationText] = useState('');
  const [price, setPrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [maxStudents, setMaxStudents] = useState('1');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;

    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    const parsedPrice = Number(price);
    const parsedDuration = Number(durationMinutes);
    const parsedMaxStudents = Number(maxStudents);

    if (!normalizedTitle) {
      alert('레슨 제목을 입력해주세요.');
      return;
    }

    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      alert('가격을 올바르게 입력해주세요.');
      return;
    }

    if (Number.isNaN(parsedDuration) || parsedDuration <= 0) {
      alert('수업 시간을 올바르게 입력해주세요.');
      return;
    }

    if (Number.isNaN(parsedMaxStudents) || parsedMaxStudents <= 0) {
      alert('최대 인원을 올바르게 입력해주세요.');
      return;
    }

    setPending(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('로그인이 필요합니다.');
        router.push('/login?next=%2Ffencing%2Flessons%2Fwrite');
        return;
      }

      const { error } = await supabase.from('fencing_lesson_products').insert({
        coach_id: user.id,
        title: normalizedTitle,
        description: normalizedDescription || null,
        price: parsedPrice,
        lesson_mode: lessonMode,
        location_text: locationText.trim() || null,
        weapon_type: weaponType === 'All' ? null : weaponType,
        duration_minutes: parsedDuration,
        max_students: parsedMaxStudents,
        is_active: true,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error creating lesson product:', error);
        alert('레슨 등록에 실패했습니다.');
        return;
      }

      alert('레슨이 등록되었습니다.');
      router.push('/fencing?tab=lessons');
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/fencing?tab=lessons" className="text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-semibold text-white">레슨 등록</h1>
        </div>
        <Button
          type="submit"
          form="lesson-write-form"
          disabled={pending}
          className="h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-3 text-xs"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : '등록'}
        </Button>
      </header>

      <main className="px-4 py-4">
        <form id="lesson-write-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">레슨 제목</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 전국체전 메달리스트 에페 1:1 레슨"
              className="border-gray-800 bg-gray-950 text-gray-100 placeholder:text-gray-500"
              maxLength={80}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">소개</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="경력, 지도 방식, 제공 내용 등을 입력해주세요."
              className="min-h-[130px] border-gray-800 bg-gray-950 text-gray-100 placeholder:text-gray-500"
              maxLength={1200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">레슨 방식</label>
              <Select value={lessonMode} onValueChange={setLessonMode}>
                <SelectTrigger className="border-gray-800 bg-gray-950 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-gray-800 bg-gray-950 text-gray-100">
                  {lessonModes.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">종목</label>
              <Select value={weaponType} onValueChange={setWeaponType}>
                <SelectTrigger className="border-gray-800 bg-gray-950 text-gray-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-gray-800 bg-gray-950 text-gray-100">
                  {weaponOptions.map((weapon) => (
                    <SelectItem key={weapon.value} value={weapon.value}>
                      {weapon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">가격(원)</label>
              <Input
                type="number"
                min={0}
                step={1000}
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                placeholder="50000"
                className="border-gray-800 bg-gray-950 text-gray-100 placeholder:text-gray-500"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">수업 시간(분)</label>
              <Input
                type="number"
                min={10}
                step={10}
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
                className="border-gray-800 bg-gray-950 text-gray-100"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">최대 인원</label>
              <Input
                type="number"
                min={1}
                max={20}
                value={maxStudents}
                onChange={(event) => setMaxStudents(event.target.value)}
                className="border-gray-800 bg-gray-950 text-gray-100"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">지역/장소</label>
              <Input
                value={locationText}
                onChange={(event) => setLocationText(event.target.value)}
                placeholder="예: 서울 강남구 / 온라인 줌"
                className="border-gray-800 bg-gray-950 text-gray-100 placeholder:text-gray-500"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500">
            등록 후 `펜싱 &gt; 레슨`에서 바로 노출되며, 사용자 문의와 신청이 연결됩니다.
          </p>
        </form>
      </main>
    </div>
  );
}
