import { redirect } from 'next/navigation';

export default function FencingLessonsPage() {
  redirect('/fencing?tab=lessons');
}
