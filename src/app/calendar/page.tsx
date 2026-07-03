import { calendarDays, contentItems } from '@/lib/mock-data';
import { CalendarClient } from './CalendarClient';

export default function CalendarPage() {
  return <CalendarClient days={calendarDays} items={contentItems} />;
}
