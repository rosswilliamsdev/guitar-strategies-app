import { redirect } from 'next/navigation';

export default function BookLessonPage() {
  // Redirect to the new scheduling page
  redirect('/scheduling');
}