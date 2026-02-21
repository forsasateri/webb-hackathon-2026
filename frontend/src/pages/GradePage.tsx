import { useEffect, useState } from 'react';
import { GradesPage as GradesComponent } from '../components/CourseGrade';
import { getSchedule, type ScheduleEntry } from '../api/enrollment';
import { LoadingSpinner } from '../components';

export const GradePage = () => {
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const data = await getSchedule();
        setScheduleEntries(data.schedule);
      } catch (error) {
        console.error('Failed to fetch schedule:', error);
        setScheduleEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, []);

  if (loading) return <LoadingSpinner />;

  return <GradesComponent scheduleEntries={scheduleEntries} />;
};