/**
 * A booking is stored as one record per visit, so no single record knows what
 * the client actually owes. These shapes carry the whole stay's charge —
 * built where the visits are known (the bookings service), rendered where the
 * money is quoted (the email templates).
 */

/** What one visit in a stay costs, and why it costs that. */
export interface VisitCharge {
  start: Date;
  /** e.g. 'Morning' / 'Evening', when the client asked for more than one visit a day. */
  label?: string;
  category: 'holiday' | 'weekend' | 'weekday';
  amount: number;
}

/** Every visit in a stay, and the total the client is asked to pay. */
export interface BookingChargeSummary {
  visitCount: number;
  /** Sum across every visit — the figure to quote for payment. */
  total: number;
  visits: VisitCharge[];
  timeZone: string;
}
