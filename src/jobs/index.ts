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
  //timestamp?: number; //match specific //scraper doesnt give a good value
}
export interface VlrTeam {
  name: string;
  country: string;
  score: string | null; //null if upcoming status
  won?: boolean; //result specific
}
export interface DirectResponse {
  status: string;
  data: DirectVlrMatch;
}
export interface DirectVlrMatch {
  teams: VlrTeam[];
  status: string;
  event: string;
  tournament: string;
  img: string;
  utcDate: string; //match specific
  won?: boolean;
}
/**
 *
 * @param relative_time time form vlrMatch ie 5h 23m or 1w 2d
 * @param from
 * @returns
 */
export function convertRelativeToDate(
  relative_time: string,
  from: Date = new Date()
): Date {
  const regex = /(\d+)\s*(d|h|m|s)/gi;
  let match: RegExpExecArray | null;
  let minute = 0;

  while ((match = regex.exec(relative_time)) !== null) {
    const value = Number(match[1]);
    const unit = match[2].toLowerCase() as 'd' | 'h' | 'm' | 'w';

    switch (unit) {
      case 'w':
        minute += value * 7 * 24 * 60;
        break;
      case 'd':
        minute += value * 24 * 60;
        break;
      case 'h':
        minute += value * 60;
        break;
      case 'm':
        minute += value;
        break;
    }
  }
  let now_minute = Math.floor(from.getTime() / (1000 * 60)) * (1000 * 60);

  return new Date(now_minute + minute * 1000 * 60);
}
