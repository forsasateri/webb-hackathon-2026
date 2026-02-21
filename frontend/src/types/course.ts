// Original version
// export interface Course {
//   id: string; // UUID
//   courseCode: string; // e.g., "DAT101", "MAT270"
//   name: string;
//   description: string;
//   time_slot: 1 | 2 | 3 | 4;
//   enrolled: boolean;
//   score?: string;
// }

export interface Course {
  id: number;
  code: string; // e.g., "DAT101", "MAT270"
  name: string;
  description: string;
  credits: number;
  instructor: string;
  department: string;
  capacity: number;
  enrolled_count: number;
  avg_rating: number | null; // This miht be changed in future

  //time_slot: 1 | 2 | 3 | 4;
  time_slots: TimeSlot[]; // Should always have at least one but could be multiple


  enrolled: boolean; // Move to other type, keeping for now to simplify things
  score?: string;
}


export interface TimeSlot {
  id: number; // Unique for each period + slot combination. Should be enough to compare ids to check for conflicting courses
  period: number; // 1, 2, 3, or 4
  slot: number; // 1, 2, 3, or 4
}





  // Example from backend
  // {
  //   "id": 1,
  //   "code": "TAMS11",
  //   "name": "Probability and Statistics, First Course",
  //   "description": "The aim of the course is to give an introduction to probability and statistics, i.e. to introduce theoretical probability models and to give methods for statistical inference based on observed data. By the end of the course the student should be able to: M1 (probability calculations): describe and use models for phenomena affected by chance and carry out probability calculations. M2 (stochastic variables): use random variables and their properties to describe and explain random variation. M3 (point estimates): use an appropriate random model to describe and analyze observed data, draw conclusions about parameters of interest, and derive point estimates of parameters and analyze their properties. M4 (Confidence intervals and hypothesis testing): understand the principles of drawing conclusions via confidence intervals and hypothesis testing, and construct confidence intervals and conduct hypothesis testing for observed data, report the conclusions and assess certainty. M5 (Software): use Matlab or R software to analyze and solve probability and statistics problems.",
  //   "credits": 6,
  //   "instructor": "Xiangfeng Yang",
  //   "department": "Matematiska institutionen",
  //   "capacity": 111,
  //   "enrolled_count": 0,
  //   "avg_rating": null,
  //   "time_slots": [
  //     {
  //       "id": 1,
  //       "period": 2,
  //       "slot": 4
  //     },
  //     {
  //       "id": 2,
  //       "period": 3,
  //       "slot": 4
  //     }
  //   ]
  // },