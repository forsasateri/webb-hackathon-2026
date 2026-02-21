/**
 * Utility function to convert time slot number to readable time range
 */
export const getTimeSlotLabel = (timeSlot: number): string => {
  const labels = {
    1: '8:00 - 10:00',
    2: '10:00 - 12:00',
    3: '13:00 - 15:00',
    4: '15:00 - 17:00',
  };
  return labels[timeSlot as keyof typeof labels] || 'Unknown';
};
