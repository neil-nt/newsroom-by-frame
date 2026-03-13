declare module "google-trends-api" {
  interface TrendsOptions {
    keyword?: string | string[];
    startTime?: Date;
    endTime?: Date;
    geo?: string;
    hl?: string;
    category?: number;
    property?: string;
  }

  interface DailyTrendsOptions {
    trendDate?: Date;
    geo?: string;
    hl?: string;
  }

  /** Returns a JSON string — must be parsed with JSON.parse() */
  function interestOverTime(options: TrendsOptions): Promise<string>;

  /** Returns a JSON string — must be parsed with JSON.parse() */
  function relatedQueries(options: TrendsOptions): Promise<string>;

  /** Returns a JSON string — must be parsed with JSON.parse() */
  function relatedTopics(options: TrendsOptions): Promise<string>;

  /** Returns a JSON string — must be parsed with JSON.parse() */
  function dailyTrends(options: DailyTrendsOptions): Promise<string>;

  /** Returns a JSON string — must be parsed with JSON.parse() */
  function interestByRegion(options: TrendsOptions): Promise<string>;

  /** Returns a JSON string — must be parsed with JSON.parse() */
  function realTimeTrends(options: { geo?: string; hl?: string; category?: string }): Promise<string>;
}
