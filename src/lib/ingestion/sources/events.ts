export interface EventItem {
  externalId: string;
  title: string;
  content: string | null;
  url: string | null;
  author: string | null;
  publishedAt: Date | null;
  rawData: string;
}

/**
 * Fetch events from Eventbrite API.
 * Searches for industry events matching given keywords.
 */
export async function fetchEventbriteEvents(
  query: string,
  options: {
    locationAddress?: string;
    startDateRange?: string; // ISO date
  } = {}
): Promise<EventItem[]> {
  // Eventbrite's public search doesn't require auth for basic searches
  const params = new URLSearchParams({
    q: query,
    "location.address": options.locationAddress || "United Kingdom",
    "location.within": "100mi",
    sort_by: "date",
    expand: "venue",
  });

  if (options.startDateRange) {
    params.set("start_date.range_start", options.startDateRange);
  }

  try {
    const response = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?${params.toString()}`,
      {
        headers: {
          "User-Agent": "SFD-Insights-Engine/1.0",
        },
      }
    );

    if (!response.ok) {
      // Eventbrite may require auth -- fall back gracefully
      console.warn(`Eventbrite API returned ${response.status}, skipping`);
      return [];
    }

    const data = await response.json();

    return (data.events || []).map(
      (event: {
        id: string;
        name: { text: string };
        description: { text: string };
        url: string;
        start: { utc: string };
        organizer?: { name: string };
      }) => ({
        externalId: `eventbrite-${event.id}`,
        title: event.name?.text || "Untitled Event",
        content: event.description?.text?.slice(0, 500) || null,
        url: event.url,
        author: event.organizer?.name || null,
        publishedAt: event.start?.utc ? new Date(event.start.utc) : null,
        rawData: JSON.stringify(event),
      })
    );
  } catch (error) {
    console.error("Failed to fetch from Eventbrite", error);
    return [];
  }
}

/**
 * Manually curated events can be added via the dashboard.
 * This function provides the structure for parsing curated event data.
 */
export interface CuratedEvent {
  name: string;
  date: string;
  location: string;
  url: string;
  cfpDeadline?: string;
  relevantTopics: string[];
  audienceDescription: string;
  notes?: string;
}
