export interface VlrMatches {
  status: string;
  size: number;
  data: VlrMatch[];
}
export interface VlrMatch {
  id: string;
  teams: VlrTeam[];
  status: string;
  event: string;
  tournament: string;
  img: string;
  ago?: string; //Result specific
  in?: string; //match specific
  timestamp?: number; //match specific
}
export interface VlrTeam {
  name: string;
  country: string;
  score: string | null; //null if upcoming status
  won?: boolean; //result specific
}
