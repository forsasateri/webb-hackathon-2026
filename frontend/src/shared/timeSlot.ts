import type { Course } from "../types";

/**
 * Utility function to convert time slot number to readable time range
 */
// export const getTimeSlotLabel = (timeSlot: number): string => {
//   const labels = {
//     1: '8:00 - 10:00',
//     2: '10:00 - 12:00',
//     3: '13:00 - 15:00',
//     4: '15:00 - 17:00',
//   };
//   return labels[timeSlot as keyof typeof labels] || 'Unknown';
// };

export const timeSlotsToString = (course: Course): string => {
  let timeSlotString = '';
  // For each timeslot append period-slot to the string, separated by commas
  course.time_slots.forEach((ts, index) => {
    timeSlotString += `P${ts.period}-S${ts.slot}`;
    if (index < course.time_slots.length - 1) {
      timeSlotString += ', ';
    }
  });
  return timeSlotString;
};