/**
 * Repair booking records whose visit window was stored as a whole day.
 *
 * Bookings created before visit-level scheduling had their end time discarded:
 * every day-record was written as `startTime -> 23:59:59.999`. Those records
 * make the visit-overlap check reject any second visit on the same day, so a
 * client who already has a morning visit cannot add an evening one until the
 * stored windows are corrected.
 *
 * The real end time was never persisted, but the service type names the
 * duration ('Pet Visit 30min', 'Pet Walking 60min', ...), so the window is
 * recoverable for most records. Anything unrecognised falls back to one hour.
 *
 * Dry run (default — reports, changes nothing):
 *   MONGODB_URI=... npx ts-node scripts/repair-legacy-visit-windows.ts
 *
 * Apply:
 *   MONGODB_URI=... npx ts-node scripts/repair-legacy-visit-windows.ts --apply
 */
import mongoose from 'mongoose';
import { formatInTimeZone, toDate } from 'date-fns-tz';

const APPLY = process.argv.includes('--apply');
const FALLBACK_MINUTES = 60;
const BUSINESS_TIMEZONE = 'America/Toronto';
const OVERNIGHT_END_CLOCK = '08:00';

/** Minutes a service is meant to last, read from its name. */
function durationMinutesFor(serviceType: string | undefined): number | 'overnight' {
  const name = (serviceType || '').toLowerCase();
  if (name.includes('overnight')) return 'overnight';
  const match = name.match(/(\d+)\s*(min|hr|hour)/);
  if (match) {
    const value = parseInt(match[1], 10);
    return match[2] === 'min' ? value : value * 60;
  }
  return FALLBACK_MINUTES;
}

/**
 * The signature of the old `setHours(23, 59, 59, 999)` call. Seconds and
 * milliseconds are timezone-invariant, so this identifies the affected rows
 * regardless of which timezone the server was running in when they were written.
 */
function looksLikeWholeDayBlock(startDate: Date, endDate: Date): boolean {
  const spansHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  return (
    endDate.getUTCSeconds() === 59 &&
    endDate.getUTCMilliseconds() === 999 &&
    spansHours > 4
  );
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const bookings = mongoose.connection.collection('bookings');

  const candidates = await bookings
    .find({ startDate: { $exists: true }, endDate: { $exists: true } })
    .project({ _id: 1, startDate: 1, endDate: 1, serviceType: 1, status: 1 })
    .toArray();

  const repairs: { id: any; from: Date; to: Date; serviceType: string }[] = [];

  for (const booking of candidates) {
    const startDate = new Date(booking.startDate);
    const endDate = new Date(booking.endDate);
    if (!looksLikeWholeDayBlock(startDate, endDate)) continue;

    const duration = durationMinutesFor(booking.serviceType);
    let repairedEnd: Date;
    if (duration === 'overnight') {
      // An overnight stay runs to 08:00 the next morning in business time.
      const startDayKey = formatInTimeZone(startDate, BUSINESS_TIMEZONE, 'yyyy-MM-dd');
      const [year, month, day] = startDayKey.split('-').map(Number);
      const nextDay = new Date(Date.UTC(year, month - 1, day));
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const nextDayKey = nextDay.toISOString().slice(0, 10);
      repairedEnd = toDate(`${nextDayKey}T${OVERNIGHT_END_CLOCK}:00`, {
        timeZone: BUSINESS_TIMEZONE,
      });
    } else {
      repairedEnd = new Date(startDate.getTime() + duration * 60 * 1000);
    }

    // Never move an end time backwards past its own start.
    if (repairedEnd.getTime() <= startDate.getTime()) {
      repairedEnd = new Date(startDate.getTime() + FALLBACK_MINUTES * 60 * 1000);
    }

    repairs.push({
      id: booking._id,
      from: endDate,
      to: repairedEnd,
      serviceType: booking.serviceType || '(none)',
    });
  }

  console.log(`Scanned ${candidates.length} bookings.`);
  console.log(`${repairs.length} were stored as whole-day blocks.\n`);

  for (const repair of repairs.slice(0, 50)) {
    console.log(
      `  ${repair.id}  ${repair.serviceType.padEnd(22)} ` +
        `${repair.from.toISOString()} -> ${repair.to.toISOString()}`,
    );
  }
  if (repairs.length > 50) console.log(`  ... and ${repairs.length - 50} more`);

  if (!APPLY) {
    console.log('\nDry run. Re-run with --apply to write these changes.');
  } else if (repairs.length > 0) {
    const result = await bookings.bulkWrite(
      repairs.map((repair) => ({
        updateOne: { filter: { _id: repair.id }, update: { $set: { endDate: repair.to } } },
      })),
    );
    console.log(`\nUpdated ${result.modifiedCount} bookings.`);
  }

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
