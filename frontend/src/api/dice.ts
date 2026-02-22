import { BASE_URL } from './base_url';
import { getAuthToken } from './auth';

export interface DiceStatePlan {
  position: [number, number, number];
  target: [number, number, number];
  direction: [number, number, number];
  speed: number;
  velocity: [number, number, number];
  angular_velocity: [number, number, number];
  rotation_euler: [number, number, number];
}

export interface DiceLaunchPlan {
  face_layout: string[];
  dice_states: DiceStatePlan[];
}

export interface DiceAuthoritativeResult {
  dice_values: string[];
  total: number;
  average: number;
  grade: string;
}

export interface StartDiceRollResponse {
  roll_id: number;
  course_id: number;
  attempt_number: number;
  attempts_used: number;
  attempts_left: number;
  max_attempts: number;
  status: string;
  original_score: number;
  score_before: number;
  score_after: number;
  grade_before: string;
  grade_after: string;
  authoritative_result: DiceAuthoritativeResult;
  launch_plan: DiceLaunchPlan;
  message: string;
}

export interface FinalizeDiceRollRequest {
  roll_id: number;
  client_dice_values?: string[];
  client_total?: number;
  client_average?: number;
  client_grade?: string;
}

export interface FinalizeDiceRollResponse {
  roll_id: number;
  course_id: number;
  attempt_number: number;
  attempts_used: number;
  attempts_left: number;
  status: string;
  score_after: number;
  grade_after: string;
  authoritative_result: DiceAuthoritativeResult;
  message: string;
}

export interface DebugClearDiceRollsResponse {
  course_id: number;
  deleted_rolls: number;
  restored_score: number | null;
  message: string;
}

export const startDiceRoll = async (courseId: number): Promise<StartDiceRollResponse> => {
  const response = await fetch(`${BASE_URL}/grade/dice/${courseId}/start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error: any = new Error(data?.detail || 'Failed to start dice roll');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return response.json();
};

export const finalizeDiceRoll = async (payload: FinalizeDiceRollRequest): Promise<FinalizeDiceRollResponse> => {
  const response = await fetch(`${BASE_URL}/grade/dice/finalize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error: any = new Error(data?.detail || 'Failed to finalize dice roll');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return response.json();
};

export const debugClearDiceRolls = async (courseId: number): Promise<DebugClearDiceRollsResponse> => {
  const response = await fetch(`${BASE_URL}/grade/dice/${courseId}/debug-clear`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error: any = new Error(data?.detail || 'Failed to clear dice rolls');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return response.json();
};
