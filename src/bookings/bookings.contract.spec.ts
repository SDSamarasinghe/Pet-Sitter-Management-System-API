import { ValidationPipe } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateBookingAdminDto } from './dto/create-booking-admin.dto';
import { CheckSitterAvailabilityDto } from './dto/check-sitter-availability.dto';

/**
 * The booking form sends these payloads verbatim. The API runs a global pipe
 * with `forbidNonWhitelisted`, so an unexpected key is a 400 rather than being
 * ignored — worth pinning the shapes down here.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const validate = (value: any, metatype: any) =>
  pipe.transform(value, { type: 'body', metatype });

/** The validation messages behind a pipe rejection, which Nest nests in the response. */
async function rejectionMessages(value: any, metatype: any): Promise<string[]> {
  try {
    await validate(value, metatype);
  } catch (error: any) {
    const message = error?.response?.message ?? error?.message;
    return Array.isArray(message) ? message : [message];
  }
  throw new Error('Expected the payload to be rejected, but it was accepted');
}

// Evening 14th, morning + evening 15th, morning 16th.
const VISIT_SLOTS = [
  { date: '2026-08-14', startTime: '18:00', endTime: '18:30', endsNextDay: false, label: 'Evening' },
  { date: '2026-08-15', startTime: '08:00', endTime: '08:30', endsNextDay: false, label: 'Morning' },
  { date: '2026-08-15', startTime: '18:00', endTime: '18:30', endsNextDay: false, label: 'Evening' },
  { date: '2026-08-16', startTime: '08:00', endTime: '08:30', endsNextDay: false, label: 'Morning' },
];

const CLIENT_PAYLOAD = {
  serviceType: 'Pet Visit 30min',
  startDate: '2026-08-14T18:00:00',
  endDate: '2026-08-16T08:30:00',
  visitSlots: VISIT_SLOTS,
  numberOfPets: 2,
  petTypes: ['Cat(s)'],
  notes: 'Insulin twice daily',
  totalAmount: 60,
};

describe('booking form payload contract', () => {
  it('accepts the client booking payload', async () => {
    const result = await validate(CLIENT_PAYLOAD, CreateBookingDto);
    expect(result.visitSlots).toHaveLength(4);
    expect(result.visitSlots[0].label).toBe('Evening');
  });

  it('accepts the client payload with a sitter attached', async () => {
    const result = await validate(
      { ...CLIENT_PAYLOAD, sitterId: '64b7f1a2c3d4e5f601020304' },
      CreateBookingDto,
    );
    expect(result.sitterId).toBe('64b7f1a2c3d4e5f601020304');
  });

  it('accepts the admin booking payload', async () => {
    const result = await validate(
      { ...CLIENT_PAYLOAD, userId: '64b7f1a2c3d4e5f601020304' },
      CreateBookingAdminDto,
    );
    expect(result.visitSlots).toHaveLength(4);
  });

  it('accepts the availability payload', async () => {
    const result = await validate(
      { visitSlots: VISIT_SLOTS, petTypes: ['Cat(s)'] },
      CheckSitterAvailabilityDto,
    );
    expect(result.visitSlots).toHaveLength(4);
  });

  it('accepts an overnight visit', async () => {
    const result = await validate(
      {
        ...CLIENT_PAYLOAD,
        visitSlots: [
          { date: '2026-08-14', startTime: '22:00', endTime: '07:00', endsNextDay: true },
        ],
      },
      CreateBookingDto,
    );
    expect(result.visitSlots[0].endsNextDay).toBe(true);
  });

  it('rejects a malformed visit date', async () => {
    const messages = await rejectionMessages(
      { ...CLIENT_PAYLOAD, visitSlots: [{ date: '14/08/2026', startTime: '18:00', endTime: '18:30' }] },
      CreateBookingDto,
    );
    expect(messages.join(' ')).toMatch(/YYYY-MM-DD/);
  });

  it('rejects a 12-hour clock time', async () => {
    const messages = await rejectionMessages(
      { ...CLIENT_PAYLOAD, visitSlots: [{ date: '2026-08-14', startTime: '6:00 PM', endTime: '18:30' }] },
      CreateBookingDto,
    );
    expect(messages.join(' ')).toMatch(/24-hour/);
  });

  it('rejects an unknown field rather than silently dropping it', async () => {
    const messages = await rejectionMessages({ ...CLIENT_PAYLOAD, sneaky: true }, CreateBookingDto);
    expect(messages.join(' ')).toMatch(/sneaky/);
  });

  it('rejects an empty visit list', async () => {
    const messages = await rejectionMessages({ visitSlots: [] }, CheckSitterAvailabilityDto);
    expect(messages.join(' ')).toMatch(/visitSlots/);
  });
});
