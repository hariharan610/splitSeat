export type ResultType = "direct" | "split" | "waitlist";
export type StatusColor = "green" | "blue" | "red";

export interface Leg {
  leg_number: number;
  origin: string;
  destination: string;
  origin_name?: string;
  destination_name?: string;
  status: string;
  seats: string;
  coach_change: boolean;
  fare: number | null;
}

export interface TrainResult {
  train_number: string;
  train_name: string;
  result_type: ResultType;
  status: string;
  status_color: StatusColor;
  seats: string | null;
  legs: Leg[] | null;
  departure: string | null;
  arrival: string | null;
  duration: string | null;
  fare: number | null;
}

export interface SearchResponse {
  results: TrainResult[];
  origin: string;
  destination: string;
  date: string;
}
