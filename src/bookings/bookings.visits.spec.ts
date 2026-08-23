import { BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';

/**
 * The scenario that prompted this work: a client needs an evening visit on
 * Aug 14 and 15 and a morning visit on Aug 15 and 16 — dinner on the 14th
 * through breakfast on the 16th, with two visits on the 15th.
 */
const TZ = 'America/Toronto';

const EVENING_AND_MORNING = [
  { date: '2026-08-14', startTime: '18:00', endTime: '18:30', label: 'Evening' },
  { date: '2026-08-15', startTime: '08:00', endTime: '08:30', label: 'Morning' },
  { date: '2026-08-15', startTime: '18:00', endTime: '18:30', label: 'Evening' },
  { date: '2026-08-16', startTime: '08:00', endTime: '08:30', label: 'Morning' },
];

/** A service with no DB access — the visit maths under test is pure. */
function makeService(findResult: any[] = []): BookingsService {
  const bookingModel: any = {
    find: () => ({ exec: async () => findResult }),
  };
  return new BookingsService(bookingModel, null as any, null as any, null as any);
}

const buildWindows = (service: BookingsService, dto: any) =>
  (service as any).buildVisitWindows(dto);

describe('booking visit windows', () => {
  it('accepts two visits on the same day and keeps their real times', () => {
    const service = makeService();
    const { windows, timeZone } = buildWindows(service, {
      startDate: '2026-08-14T18:00:00.000Z',
      endDate: '2026-08-16T08:30:00.000Z',
      visitSlots: EVENING_AND_MORNING,
      timeZone: TZ,
    });

    expect(timeZone).toBe(TZ);
    expect(windows).toHaveLength(4);

    // Aug 15 carries both a morning and an evening visit.
    const aug15 = windows.filter(
      (w: any) => w.start.toISOString().slice(0, 10) === '2026-08-15',
    );
    expect(aug15).toHaveLength(2);

    // Toronto is UTC-4 in August, so 18:00 local is 22:00Z — and the visit ends
    // 30 minutes later, not at the end of the day.
    expect(windows[0].start.toISOString()).toBe('2026-08-14T22:00:00.000Z');
    expect(windows[0].end.toISOString()).toBe('2026-08-14T22:30:00.000Z');
    expect(windows[0].label).toBe('Evening');
  });

  it('rejects a request that overlaps itself', () => {
    const service = makeService();
    expect(() =>
      buildWindows(service, {
        startDate: '2026-08-15T08:00:00.000Z',
        endDate: '2026-08-15T10:00:00.000Z',
        visitSlots: [
          { date: '2026-08-15', startTime: '08:00', endTime: '09:00' },
          { date: '2026-08-15', startTime: '08:30', endTime: '09:30' },
        ],
        timeZone: TZ,
      }),
    ).toThrow(BadRequestException);
  });

  it('allows back-to-back visits that merely touch', () => {
    const service = makeService();
    const { windows } = buildWindows(service, {
      startDate: '2026-08-15T08:00:00.000Z',
      endDate: '2026-08-15T09:00:00.000Z',
      visitSlots: [
        { date: '2026-08-15', startTime: '08:00', endTime: '08:30' },
        { date: '2026-08-15', startTime: '08:30', endTime: '09:00' },
      ],
      timeZone: TZ,
    });
    expect(windows).toHaveLength(2);
  });

  it('handles a visit that runs past midnight', () => {
    const service = makeService();
    const { windows } = buildWindows(service, {
      startDate: '2026-08-14T22:00:00.000Z',
      endDate: '2026-08-15T07:00:00.000Z',
      visitSlots: [
        { date: '2026-08-14', startTime: '22:00', endTime: '07:00', endsNextDay: true },
      ],
      timeZone: TZ,
    });
    expect(windows).toHaveLength(1);
    expect(windows[0].end.getTime() - windows[0].start.getTime()).toBe(9 * 60 * 60 * 1000);
  });

  it('rejects a past-midnight visit that is not marked as such', () => {
    const service = makeService();
    expect(() =>
      buildWindows(service, {
        startDate: '2026-08-14T22:00:00.000Z',
        endDate: '2026-08-15T07:00:00.000Z',
        visitSlots: [{ date: '2026-08-14', startTime: '22:00', endTime: '07:00' }],
        timeZone: TZ,
      }),
    ).toThrow(/ending the next day/);
  });

  describe('requests without explicit visit slots', () => {
    it('keeps the requested clock window on each day instead of the whole day', () => {
      const service = makeService();
      const { windows } = buildWindows(service, {
        // 09:00–09:30 Toronto on Aug 17, 18 and 19
        startDate: '2026-08-17T13:00:00.000Z',
        endDate: '2026-08-19T13:30:00.000Z',
        timeZone: TZ,
      });

      expect(windows).toHaveLength(3);
      for (const window of windows) {
        expect(window.end.getTime() - window.start.getTime()).toBe(30 * 60 * 1000);
      }
    });

    it('spans a stay across midnight instead of truncating it at end of day', () => {
      const service = makeService();
      // Aug 17 09:00 -> Aug 18 08:30 Toronto: one continuous overnight stay.
      const { windows } = buildWindows(service, {
        startDate: '2026-08-17T13:00:00.000Z',
        endDate: '2026-08-18T12:30:00.000Z',
        timeZone: TZ,
      });
      expect(windows).toHaveLength(1);
      // The old behaviour cut the visit off at 23:59 on the first day.
      expect(windows[0].end.toISOString()).toBe('2026-08-18T12:30:00.000Z');
    });

    it('never blocks out the whole day for a short visit', () => {
      const service = makeService();
      const { windows } = buildWindows(service, {
        // 09:00-09:30 Toronto on a single day
        startDate: '2026-08-17T13:00:00.000Z',
        endDate: '2026-08-17T13:30:00.000Z',
        timeZone: TZ,
      });
      expect(windows).toHaveLength(1);
      expect(windows[0].end.getTime() - windows[0].start.getTime()).toBe(30 * 60 * 1000);
    });

    it('counts calendar days across the spring clock change', () => {
      const service = makeService();
      // Mar 7 09:00 -> Mar 9 09:30 Toronto spans three calendar days but only
      // 47.5 hours, because the clocks go forward on Mar 8.
      const { windows } = buildWindows(service, {
        startDate: '2026-03-07T14:00:00.000Z', // 09:00 EST
        endDate: '2026-03-09T13:30:00.000Z', // 09:30 EDT
        timeZone: TZ,
      });
      expect(windows).toHaveLength(3);
    });

    it('reads a descending time range across days as one visit per night', () => {
      const service = makeService();
      // 18:00 Aug 14 -> 08:00 Aug 16 Toronto: the nights 14->15 and 15->16.
      const { windows } = buildWindows(service, {
        startDate: '2026-08-14T22:00:00.000Z',
        endDate: '2026-08-16T12:00:00.000Z',
        timeZone: TZ,
      });
      expect(windows).toHaveLength(2);
      expect(windows[0].end.getTime() - windows[0].start.getTime()).toBe(14 * 60 * 60 * 1000);
    });
  });
});

describe('visit conflict detection', () => {
  const clientId = '64b7f1a2c3d4e5f601020304';
  const otherClientId = '64b7f1a2c3d4e5f601020399';
  const sitterId = '64b7f1a2c3d4e5f60102030a';

  const windowsFor = (service: BookingsService, slots: any[]) =>
    buildWindows(service, {
      startDate: '2026-08-14T00:00:00.000Z',
      endDate: '2026-08-17T00:00:00.000Z',
      visitSlots: slots,
      timeZone: TZ,
    }).windows;

  const findConflicts = (service: BookingsService, windows: any[], scope: any) =>
    (service as any).findVisitConflicts(windows, scope);

  it('does not flag an evening visit against an existing morning visit', async () => {
    // Existing: Aug 15, 08:00-08:30 Toronto for this client.
    const existing = [
      {
        _id: 'a',
        userId: clientId,
        sitterId: null,
        startDate: new Date('2026-08-15T12:00:00.000Z'),
        endDate: new Date('2026-08-15T12:30:00.000Z'),
      },
    ];
    const service = makeService(existing);
    const windows = windowsFor(service, [
      { date: '2026-08-15', startTime: '18:00', endTime: '18:30' },
    ]);

    const { clientConflicts, sitterConflicts } = await findConflicts(service, windows, {
      userId: clientId,
    });
    expect(clientConflicts).toHaveLength(0);
    expect(sitterConflicts).toHaveLength(0);
  });

  it('flags a visit that genuinely overlaps the client’s existing visit', async () => {
    const existing = [
      {
        _id: 'a',
        userId: clientId,
        sitterId: null,
        startDate: new Date('2026-08-15T12:00:00.000Z'),
        endDate: new Date('2026-08-15T13:00:00.000Z'),
      },
    ];
    const service = makeService(existing);
    const windows = windowsFor(service, [
      { date: '2026-08-15', startTime: '08:30', endTime: '09:30' },
    ]);

    const { clientConflicts } = await findConflicts(service, windows, { userId: clientId });
    expect(clientConflicts).toHaveLength(1);
  });

  it('ignores another client’s booking when no sitter is requested', async () => {
    const existing = [
      {
        _id: 'a',
        userId: otherClientId,
        sitterId: null,
        startDate: new Date('2026-08-15T12:00:00.000Z'),
        endDate: new Date('2026-08-15T13:00:00.000Z'),
      },
    ];
    const service = makeService(existing);
    const windows = windowsFor(service, [
      { date: '2026-08-15', startTime: '08:30', endTime: '09:30' },
    ]);

    const { clientConflicts, sitterConflicts } = await findConflicts(service, windows, {
      userId: clientId,
    });
    expect(clientConflicts).toHaveLength(0);
    expect(sitterConflicts).toHaveLength(0);
  });

  it('flags a sitter already booked at that time by someone else', async () => {
    const existing = [
      {
        _id: 'a',
        userId: otherClientId,
        sitterId,
        startDate: new Date('2026-08-15T12:00:00.000Z'),
        endDate: new Date('2026-08-15T13:00:00.000Z'),
      },
    ];
    const service = makeService(existing);
    const windows = windowsFor(service, [
      { date: '2026-08-15', startTime: '08:30', endTime: '09:30' },
    ]);

    const { clientConflicts, sitterConflicts } = await findConflicts(service, windows, {
      userId: clientId,
      sitterId,
    });
    expect(clientConflicts).toHaveLength(0);
    expect(sitterConflicts).toHaveLength(1);
  });

  it('returns nothing when there is no scope to check', async () => {
    const service = makeService([{ _id: 'a' }]);
    const windows = windowsFor(service, [
      { date: '2026-08-15', startTime: '08:30', endTime: '09:30' },
    ]);
    const { clientConflicts, sitterConflicts } = await findConflicts(service, windows, {});
    expect(clientConflicts).toHaveLength(0);
    expect(sitterConflicts).toHaveLength(0);
  });
});

describe('create() with the payload the booking form now sends', () => {
  const clientId = '64b7f1a2c3d4e5f601020304';

  /**
   * "Dinner on the 14th through breakfast on the 16th": an evening visit on
   * Aug 14 and 15, a morning visit on Aug 15 and 16.
   */
  const FORM_PAYLOAD = {
    serviceType: 'Pet Visit 30min',
    startDate: '2026-08-14T18:00:00',
    endDate: '2026-08-16T08:30:00',
    visitSlots: EVENING_AND_MORNING,
    numberOfPets: 2,
    petTypes: ['Cat(s)'],
    notes: '',
    totalAmount: 60, // 30 per pet per visit × 2 pets
  } as any;

  function serviceWithCapture() {
    const saved: any[] = [];
    const bookingModel: any = function (doc: any) {
      return doc;
    };
    bookingModel.find = () => ({ exec: async () => [] });
    bookingModel.insertMany = async (docs: any[]) => {
      saved.push(...docs);
      return docs.map((doc, i) => ({ ...doc, _id: `id-${i}` }));
    };
    bookingModel.findById = () => ({
      populate: () => ({ populate: () => ({ exec: async () => null }) }),
    });

    const activityLog: any = { log: async () => undefined };
    const service = new BookingsService(bookingModel, null as any, null as any, activityLog);
    return { service, saved };
  }

  it('stores one record per visit, with real times and per-visit pricing', async () => {
    const { service, saved } = serviceWithCapture();
    await service.create(FORM_PAYLOAD, clientId);

    expect(saved).toHaveLength(4);

    // Two records land on Aug 15 — the case that used to be rejected outright.
    const aug15 = saved.filter(
      (b) => b.startDate.toISOString().slice(0, 10) === '2026-08-15',
    );
    expect(aug15).toHaveLength(2);

    // Every visit is 30 minutes, not the rest of the day.
    for (const booking of saved) {
      expect(booking.endDate.getTime() - booking.startDate.getTime()).toBe(30 * 60 * 1000);
    }

    // All four share one group so they show as a single stay.
    const groupIds = new Set(saved.map((b) => b.bookingGroupId));
    expect(groupIds.size).toBe(1);
    expect([...groupIds][0]).toBeTruthy();

    // Labels survive so a sitter can tell the morning visit from the evening one.
    expect(saved.map((b) => b.visitLabel)).toEqual([
      'Evening',
      'Morning',
      'Evening',
      'Morning',
    ]);

    // Priced per visit: Aug 15 and 16 are a Saturday and Sunday, so those three
    // visits carry the weekend surcharge and Friday's does not.
    expect(saved.map((b) => b.totalAmount)).toEqual([60, 69, 69, 69]);

    // The request payload's own fields must not leak into the stored document.
    for (const booking of saved) {
      expect(booking.visitSlots).toBeUndefined();
      expect(booking.timeZone).toBeUndefined();
      expect(booking.status).toBe('pending');
    }
  });

  it('rejects a visit that overlaps one the client already has', async () => {
    const existing = {
      _id: 'existing',
      userId: clientId,
      sitterId: null,
      startDate: new Date('2026-08-15T22:00:00.000Z'), // Aug 15, 18:00 Toronto
      endDate: new Date('2026-08-15T22:30:00.000Z'),
    };
    const bookingModel: any = function (doc: any) {
      return doc;
    };
    bookingModel.find = () => ({ exec: async () => [existing] });
    bookingModel.insertMany = async () => {
      throw new Error('should not reach insertMany');
    };
    const service = new BookingsService(bookingModel, null as any, null as any, {
      log: async () => undefined,
    } as any);

    await expect(service.create(FORM_PAYLOAD, clientId)).rejects.toThrow(
      /already have a visit booked/,
    );
  });
});

describe('update() permissions', () => {
  const adminId = '64b7f1a2c3d4e5f601020001';
  const clientId = '64b7f1a2c3d4e5f601020002';
  const sitterId = '64b7f1a2c3d4e5f601020003';
  const otherSitterId = '64b7f1a2c3d4e5f601020004';
  const bookingId = '64b7f1a2c3d4e5f6010200ff';

  /** A booking as `update()` reads it: userId and sitterId populated. */
  function bookingDoc(overrides: any = {}) {
    return {
      _id: bookingId,
      userId: { _id: clientId },
      sitterId: { _id: sitterId },
      status: 'assigned',
      startDate: new Date('2026-08-15T12:00:00.000Z'),
      endDate: new Date('2026-08-15T12:30:00.000Z'),
      ...overrides,
    };
  }

  function serviceFor(booking: any, conflicts: any[] = []) {
    const applied: any[] = [];
    const bookingModel: any = {};
    bookingModel.findById = () => ({
      populate: () => ({
        populate: () => ({ exec: async () => booking }),
      }),
    });
    bookingModel.find = () => ({ exec: async () => conflicts });
    bookingModel.findByIdAndUpdate = (_id: string, update: any) => {
      applied.push(update);
      return {
        populate: () => ({
          populate: () => ({
            populate: () => ({ exec: async () => ({ ...booking, ...update }) }),
          }),
        }),
      };
    };
    const service = new BookingsService(bookingModel, null as any, null as any, {
      log: async () => undefined,
    } as any);
    return { service, applied };
  }

  it('lets the owning client cancel their own booking', async () => {
    const { service, applied } = serviceFor(bookingDoc());
    await service.update(bookingId, { status: 'cancelled' } as any, clientId, 'client');
    expect(applied[0]).toEqual({ status: 'cancelled' });
  });

  it('stops a client from setting any status other than cancelled', async () => {
    const { service } = serviceFor(bookingDoc());
    await expect(
      service.update(bookingId, { status: 'completed' } as any, clientId, 'client'),
    ).rejects.toThrow(/only set the status to/);
  });

  it('stops a client from re-pricing their booking', async () => {
    const { service } = serviceFor(bookingDoc());
    await expect(
      service.update(bookingId, { totalAmount: 1 } as any, clientId, 'client'),
    ).rejects.toThrow(/may only change/);
  });

  it('stops a sitter editing a booking assigned to someone else', async () => {
    const { service } = serviceFor(bookingDoc());
    await expect(
      service.update(bookingId, { status: 'completed' } as any, otherSitterId, 'sitter'),
    ).rejects.toThrow(/only update your own bookings/);
  });

  it('stops the assigned sitter reassigning the booking', async () => {
    const { service } = serviceFor(bookingDoc());
    await expect(
      service.update(bookingId, { sitterId: otherSitterId } as any, sitterId, 'sitter'),
    ).rejects.toThrow(/may only change/);
  });

  it('lets the assigned sitter mark the booking completed', async () => {
    const { service, applied } = serviceFor(bookingDoc());
    await service.update(bookingId, { status: 'completed' } as any, sitterId, 'sitter');
    expect(applied[0]).toEqual({ status: 'completed' });
  });

  it('stops an unrelated client touching the booking', async () => {
    const { service } = serviceFor(bookingDoc());
    await expect(
      service.update(bookingId, { status: 'cancelled' } as any, otherSitterId, 'client'),
    ).rejects.toThrow(/only update your own bookings/);
  });

  it('drops request-only fields instead of storing them', async () => {
    const { service, applied } = serviceFor(bookingDoc());
    await service.update(
      bookingId,
      { status: 'confirmed', visitSlots: [], timeZone: 'America/Toronto' } as any,
      adminId,
      'admin',
    );
    expect(applied[0]).toEqual({ status: 'confirmed' });
  });

  it('rejects an admin moving a booking onto another visit', async () => {
    const clash = {
      _id: 'other',
      userId: clientId,
      sitterId: null,
      startDate: new Date('2026-08-16T12:00:00.000Z'),
      endDate: new Date('2026-08-16T13:00:00.000Z'),
    };
    const { service } = serviceFor(bookingDoc(), [clash]);
    await expect(
      service.update(
        bookingId,
        {
          startDate: '2026-08-16T12:15:00.000Z',
          endDate: '2026-08-16T12:45:00.000Z',
        } as any,
        adminId,
        'admin',
      ),
    ).rejects.toThrow(/already have a visit booked/);
  });

  it('excludes the booking being moved from its own conflict query', async () => {
    // Return the booking itself from the conflict lookup: the update must still
    // succeed, which is only possible if the query excluded it by id.
    const itself = {
      _id: bookingId,
      userId: clientId,
      sitterId: null,
      startDate: new Date('2026-08-15T13:00:00.000Z'),
      endDate: new Date('2026-08-15T13:30:00.000Z'),
    };

    const queries: any[] = [];
    const booking = bookingDoc();
    const applied: any[] = [];
    const bookingModel: any = {};
    bookingModel.findById = () => ({
      populate: () => ({ populate: () => ({ exec: async () => booking }) }),
    });
    bookingModel.find = (query: any) => {
      queries.push(query);
      // Mirror what Mongo would do with the $nin the service is expected to send.
      const excluded: any[] = query?._id?.$nin ?? [];
      const excludedIds = excluded.map((id: any) => id.toString());
      return {
        exec: async () => [itself].filter((b) => !excludedIds.includes(b._id.toString())),
      };
    };
    bookingModel.findByIdAndUpdate = (_id: string, update: any) => {
      applied.push(update);
      return {
        populate: () => ({
          populate: () => ({
            populate: () => ({ exec: async () => ({ ...booking, ...update }) }),
          }),
        }),
      };
    };
    const service = new BookingsService(bookingModel, null as any, null as any, {
      log: async () => undefined,
    } as any);

    await service.update(
      bookingId,
      { startDate: '2026-08-15T13:00:00.000Z', endDate: '2026-08-15T13:30:00.000Z' } as any,
      adminId,
      'admin',
    );

    expect(queries[0]._id.$nin.map((id: any) => id.toString())).toEqual([bookingId]);
    expect(applied).toHaveLength(1);
  });

  it('rejects a window that ends before it starts', async () => {
    const { service } = serviceFor(bookingDoc());
    await expect(
      service.update(
        bookingId,
        { startDate: '2026-08-15T13:00:00.000Z', endDate: '2026-08-15T12:00:00.000Z' } as any,
        adminId,
        'admin',
      ),
    ).rejects.toThrow(/must end after it starts/);
  });
});

describe('getAvailableSittersForVisits', () => {
  const sitterA = '64b7f1a2c3d4e5f6010200a1';
  const sitterB = '64b7f1a2c3d4e5f6010200b2';

  function serviceWith(sitters: any[], commitments: any[]) {
    const bookingModel: any = {
      find: () => ({ select: () => ({ exec: async () => commitments }) }),
    };
    const userModel: any = { find: () => ({ exec: async () => sitters }) };
    return new BookingsService(bookingModel, userModel, null as any, {
      log: async () => undefined,
    } as any);
  }

  const sitterList = [
    { _id: sitterA, firstName: 'A', petTypesServiced: [] },
    { _id: sitterB, firstName: 'B', petTypesServiced: [] },
  ];

  it('keeps a sitter who is busy in the morning but free in the evening', async () => {
    const service = serviceWith(sitterList, [
      {
        sitterId: sitterA,
        startDate: new Date('2026-08-15T12:00:00.000Z'), // 08:00 Toronto
        endDate: new Date('2026-08-15T12:30:00.000Z'),
      },
    ]);

    const available = await service.getAvailableSittersForVisits({
      visitSlots: [{ date: '2026-08-15', startTime: '18:00', endTime: '18:30' }],
      timeZone: TZ,
    } as any);

    expect(available.map((s: any) => s._id)).toEqual([sitterA, sitterB]);
  });

  it('drops a sitter who is busy during one of the requested visits', async () => {
    const service = serviceWith(sitterList, [
      {
        sitterId: sitterA,
        startDate: new Date('2026-08-15T22:00:00.000Z'), // 18:00 Toronto
        endDate: new Date('2026-08-15T22:30:00.000Z'),
      },
    ]);

    const available = await service.getAvailableSittersForVisits({
      visitSlots: [
        { date: '2026-08-15', startTime: '08:00', endTime: '08:30' },
        { date: '2026-08-15', startTime: '18:00', endTime: '18:30' },
      ],
      timeZone: TZ,
    } as any);

    expect(available.map((s: any) => s._id)).toEqual([sitterB]);
  });

  it('filters by the pet types a sitter services', async () => {
    const service = serviceWith(
      [
        { _id: sitterA, petTypesServiced: ['Dog(s)'] },
        { _id: sitterB, petTypesServiced: ['Cat(s)', 'Dog(s)'] },
      ],
      [],
    );

    const available = await service.getAvailableSittersForVisits({
      visitSlots: [{ date: '2026-08-15', startTime: '08:00', endTime: '08:30' }],
      petTypes: ['Cat(s)'],
      timeZone: TZ,
    } as any);

    expect(available.map((s: any) => s._id)).toEqual([sitterB]);
  });
});
