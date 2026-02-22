import { useCallback, useEffect, useState } from 'react';
import { GradesPage as GradesComponent } from '../components/CourseGrade';
import { getSchedule, type ScheduleEntry } from '../api/enrollment';
import { LoadingSpinner } from '../components';

export const GradePage = () => {
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchSchedule = useCallback(async (showInitialLoading: boolean = false) => {
    if (showInitialLoading) {
      setInitialLoading(true);
    }
    try {
      const data = await getSchedule();
      setScheduleEntries(data.schedule);
    } catch (error) {
      console.error('Failed to fetch schedule:', error);
      setScheduleEntries([]);
    } finally {
      if (showInitialLoading) {
        setInitialLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchSchedule(true);
  }, [fetchSchedule]);

  if (initialLoading) return <LoadingSpinner />;

  return <GradesComponent scheduleEntries={scheduleEntries} onScheduleChanged={() => fetchSchedule(false)} />;
};
