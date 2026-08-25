import { DoctorBooking, ClinicVisit, GoogleCalendarConfig, GoogleCalendarEventItem, GoogleCalendarSyncLog } from '../types';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: any; expires_in?: number }) => void;
            error_callback?: (err: any) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
          revoke?: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

const STORAGE_KEY_CONFIG = 'petcare_google_calendar_config';
const STORAGE_KEY_TOKEN = 'petcare_gcal_access_token';
const STORAGE_KEY_TOKEN_EXPIRY = 'petcare_gcal_token_expiry';
const STORAGE_KEY_LOGS = 'petcare_gcal_sync_logs';
const STORAGE_KEY_EVENTS_CACHE = 'petcare_gcal_events_cache';

// Default Client ID extracted from project configuration
const DEFAULT_CLIENT_ID = '299123431982-6dgbm8rlbf143mdjcdfimbj9qpjiu994.apps.googleusercontent.com';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export const getDefaultGoogleCalendarConfig = (): GoogleCalendarConfig => ({
  isConnected: false,
  calendarId: 'primary',
  calendarName: 'Google Calendar Klinik & Dokter',
  autoSyncBookings: true,
  autoSyncClinicQueue: true,
  autoSyncDoctorShifts: true,
  syncReminders: true,
  reminderMinutes: 30,
  clientId: DEFAULT_CLIENT_ID
});

export const loadGoogleCalendarConfig = (): GoogleCalendarConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      return { ...getDefaultGoogleCalendarConfig(), ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load Google Calendar config from storage', e);
  }
  return getDefaultGoogleCalendarConfig();
};

export const saveGoogleCalendarConfig = (config: GoogleCalendarConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save Google Calendar config', e);
  }
};

export const getStoredAccessToken = (): string | null => {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const expiry = localStorage.getItem(STORAGE_KEY_TOKEN_EXPIRY);
    if (!token) return null;
    if (expiry && Date.now() > parseInt(expiry, 10)) {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRY);
      return null;
    }
    return token;
  } catch (e) {
    return null;
  }
};

export const setStoredAccessToken = (token: string, expiresInSeconds: number = 3600) => {
  try {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_TOKEN_EXPIRY, (Date.now() + expiresInSeconds * 1000).toString());
  } catch (e) {
    console.error('Failed to store access token', e);
  }
};

export const clearGoogleCalendarAuth = () => {
  try {
    const token = getStoredAccessToken();
    if (token && window.google?.accounts?.oauth2?.revoke) {
      try {
        window.google.accounts.oauth2.revoke(token, () => {});
      } catch (err) {
        // ignore revoke error
      }
    }
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_TOKEN_EXPIRY);
    const config = loadGoogleCalendarConfig();
    config.isConnected = false;
    config.userEmail = undefined;
    config.userName = undefined;
    config.userPhoto = undefined;
    saveGoogleCalendarConfig(config);
  } catch (e) {
    console.error('Failed to clear Google Calendar auth', e);
  }
};

export const loadSyncLogs = (): GoogleCalendarSyncLog[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LOGS);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load sync logs', e);
  }
  return [];
};

export const addSyncLog = (log: Omit<GoogleCalendarSyncLog, 'id' | 'timestamp'>) => {
  try {
    const logs = loadSyncLogs();
    const newLog: GoogleCalendarSyncLog = {
      ...log,
      id: `gcal_log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    const updated = [newLog, ...logs].slice(0, 100);
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(updated));
    return newLog;
  } catch (e) {
    console.error('Failed to save sync log', e);
  }
};

/**
 * Request OAuth Token with GIS client library
 */
export const requestGoogleCalendarAuth = async (
  clientId?: string
): Promise<{ token: string; user?: { email: string; name: string; picture?: string } }> => {
  const targetClientId = clientId || loadGoogleCalendarConfig().clientId || DEFAULT_CLIENT_ID;

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(
        new Error(
          'Google Identity Services (GIS) belum selesai dimuat di browser. Pastikan koneksi internet aktif.'
        )
      );
      return;
    }

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: targetClientId,
        scope: CALENDAR_SCOPE + ' https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (response) => {
          if (response.error) {
            reject(new Error(response.error.message || response.error || 'Autentikasi Google Calendar dibatalkan/gagal.'));
            return;
          }

          if (response.access_token) {
            const token = response.access_token;
            setStoredAccessToken(token, response.expires_in || 3600);

            // Fetch user profile info
            let userProfile: { email: string; name: string; picture?: string } = {
              email: 'klinik.dokter@gmail.com',
              name: 'Drh. Klinik PetCare'
            };

            try {
              const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (profileRes.ok) {
                const pData = await profileRes.json();
                userProfile = {
                  email: pData.email || 'klinik@gmail.com',
                  name: pData.name || 'Dokter Jaga',
                  picture: pData.picture
                };
              }
            } catch (err) {
              console.warn('Failed to fetch Google profile info, using defaults', err);
            }

            // Save connected state
            const config = loadGoogleCalendarConfig();
            config.isConnected = true;
            config.userEmail = userProfile.email;
            config.userName = userProfile.name;
            config.userPhoto = userProfile.picture;
            config.lastSyncedAt = new Date().toISOString();
            saveGoogleCalendarConfig(config);

            addSyncLog({
              type: 'bulk_sync',
              referenceId: 'auth',
              referenceNo: 'AUTH-CONNECT',
              doctorName: userProfile.name,
              patientName: 'Sistem',
              action: 'sync_fetch',
              status: 'success',
              message: `Berhasil terhubung ke Google Calendar (${userProfile.email})`
            });

            resolve({ token, user: userProfile });
          } else {
            reject(new Error('Token akses tidak diterima dari Google.'));
          }
        },
        error_callback: (err) => {
          reject(new Error(err?.message || 'Gagal membuka jendela autentikasi Google.'));
        }
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      reject(new Error(err?.message || 'Inisialisasi Google OAuth gagal.'));
    }
  });
};

/**
 * Format date time string to ISO with offset for Google Calendar API
 */
const formatDateTime = (dateStr: string, timeStr: string, addMinutes: number = 30): { start: string; end: string } => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const startDate = new Date(dateStr);
  startDate.setHours(hours || 9, minutes || 0, 0, 0);

  const endDate = new Date(startDate.getTime() + addMinutes * 60 * 1000);

  return {
    start: startDate.toISOString(),
    end: endDate.toISOString()
  };
};

/**
 * Get Color ID for Google Calendar event based on status and doctor
 */
const getCalendarColorId = (type: 'booking' | 'queue' | 'shift', status?: string): string => {
  if (status === 'Batal') return '8'; // Graphite/Gray
  if (status === 'Selesai') return '2'; // Sage/Green
  if (status === 'Sedang Diperiksa' || status === 'Dipanggil') return '11'; // Flamingo/Red Urgent
  if (status === 'Terkonfirmasi') return '9'; // Blueberry/Blue
  if (type === 'shift') return '6'; // Tangerine/Orange
  return '5'; // Banana/Yellow (Menunggu)
};

/**
 * Push or Sync Doctor Booking to Google Calendar
 */
export const syncDoctorBookingToGoogleCalendar = async (
  booking: DoctorBooking,
  tokenOverride?: string
): Promise<{ success: boolean; eventId?: string; htmlLink?: string; error?: string }> => {
  const token = tokenOverride || getStoredAccessToken();
  if (!token) {
    return { success: false, error: 'Google Calendar belum terhubung. Silakan hubungkan akun Google terlebih dahulu.' };
  }

  const { start, end } = formatDateTime(booking.date, booking.timeSlot, 30);
  const statusEmoji = booking.status === 'Selesai' ? '✅' : booking.status === 'Batal' ? '❌' : '🐾';

  const eventPayload = {
    summary: `${statusEmoji} [Jadwal Dokter] ${booking.doctorName} • ${booking.petName} (${booking.customerName})`,
    description: `🩺 SISTEM KLINIK VETERINER PETCARE\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📌 No. Booking: ${booking.bookingNo}\n` +
      `👨‍⚕️ Dokter: ${booking.doctorName}\n` +
      `🐾 Pasien: ${booking.petName} (${booking.petSpecies})\n` +
      `👤 Pemilik: ${booking.customerName}\n` +
      `🕒 Jadwal: ${booking.date} | Pukul ${booking.timeSlot} WIB\n` +
      `📋 Keluhan/Alasan: ${booking.complaint || '-'}\n` +
      `📊 Status Booking: ${booking.status}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Sinkronisasi otomatis dari Aplikasi Manajemen Klinik PetCare.`,
    start: {
      dateTime: start,
      timeZone: 'Asia/Jakarta'
    },
    end: {
      dateTime: end,
      timeZone: 'Asia/Jakarta'
    },
    colorId: getCalendarColorId('booking', booking.status),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'email', minutes: 60 }
      ]
    },
    extendedProperties: {
      private: {
        app: 'petcare_vet_system',
        bookingId: booking.id,
        bookingNo: booking.bookingNo,
        doctorId: booking.doctorId,
        doctorName: booking.doctorName,
        petId: booking.petId,
        petName: booking.petName,
        customerName: booking.customerName,
        source: 'doctor_booking'
      }
    }
  };

  try {
    const isUpdate = !!booking.googleCalendarEventId;
    const url = isUpdate
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${booking.googleCalendarEventId}`
      : `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

    const method = isUpdate ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventPayload)
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `HTTP ${response.status}: Gagal menyimpan event ke Google Calendar`);
    }

    const eventData = await response.json();

    addSyncLog({
      type: 'doctor_booking',
      referenceId: booking.id,
      referenceNo: booking.bookingNo,
      doctorName: booking.doctorName,
      patientName: booking.petName,
      action: isUpdate ? 'update' : 'create',
      status: 'success',
      message: `Jadwal booking ${booking.bookingNo} (${booking.doctorName}) berhasil disinkronkan ke Google Calendar`,
      googleEventId: eventData.id,
      htmlLink: eventData.htmlLink
    });

    return {
      success: true,
      eventId: eventData.id,
      htmlLink: eventData.htmlLink
    };
  } catch (err: any) {
    addSyncLog({
      type: 'doctor_booking',
      referenceId: booking.id,
      referenceNo: booking.bookingNo,
      doctorName: booking.doctorName,
      patientName: booking.petName,
      action: booking.googleCalendarEventId ? 'update' : 'create',
      status: 'failed',
      message: `Gagal sinkronisasi: ${err.message}`
    });
    return { success: false, error: err.message };
  }
};

/**
 * Sync Clinic Queue Visit to Google Calendar
 */
export const syncClinicVisitToGoogleCalendar = async (
  visit: ClinicVisit,
  tokenOverride?: string
): Promise<{ success: boolean; eventId?: string; htmlLink?: string; error?: string }> => {
  const token = tokenOverride || getStoredAccessToken();
  if (!token) {
    return { success: false, error: 'Google Calendar belum terhubung.' };
  }

  const visitDate = visit.queuedAt ? visit.queuedAt.substring(0, 10) : new Date().toISOString().substring(0, 10);
  const timeNow = new Date().toTimeString().substring(0, 5);
  const { start, end } = formatDateTime(visitDate, timeNow, 45);

  const urgencyTag = visit.triageUrgency ? `[${visit.triageUrgency}]` : '';

  const eventPayload = {
    summary: `🩺 ${urgencyTag} [Antrean Poli #${visit.queueNo}] ${visit.doctorName} • ${visit.petName} (${visit.customerName})`,
    description: `🏥 ANTREAN RAWAT JALAN / POLIKLINIK\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🎫 No. Antrean: #${visit.queueNo} (No. Kunjungan: ${visit.visitNo})\n` +
      `👨‍⚕️ Dokter Pemeriksa: ${visit.doctorName}\n` +
      `🐾 Pasien: ${visit.petName} (${visit.petSpecies} / ${visit.petBreed})\n` +
      `👤 Pemilik: ${visit.customerName}\n` +
      `⚡ Triase Urgensi: ${visit.triageUrgency || 'Normal'} (${visit.triageRationale || '-'})\n` +
      `📋 Keluhan Utama: ${visit.complaint}\n` +
      `📊 Status Kunjungan: ${visit.status}\n` +
      `🕒 Masuk Antrean: ${visit.queuedAt}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Sinkronisasi otomatis antrean klinik PetCare.`,
    start: {
      dateTime: start,
      timeZone: 'Asia/Jakarta'
    },
    end: {
      dateTime: end,
      timeZone: 'Asia/Jakarta'
    },
    colorId: visit.triageUrgency === 'P1' ? '11' : visit.triageUrgency === 'P2' ? '6' : getCalendarColorId('queue', visit.status),
    reminders: {
      useDefault: false,
      overrides: [{ method: 'popup', minutes: 10 }]
    },
    extendedProperties: {
      private: {
        app: 'petcare_vet_system',
        visitId: visit.id,
        visitNo: visit.visitNo,
        queueNo: String(visit.queueNo),
        doctorId: visit.doctorId,
        doctorName: visit.doctorName,
        petId: visit.petId,
        source: 'clinic_visit'
      }
    }
  };

  try {
    const isUpdate = !!visit.googleCalendarEventId;
    const url = isUpdate
      ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${visit.googleCalendarEventId}`
      : `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

    const method = isUpdate ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventPayload)
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `HTTP ${response.status}: Gagal menyimpan event antrean.`);
    }

    const eventData = await response.json();

    addSyncLog({
      type: 'clinic_visit',
      referenceId: visit.id,
      referenceNo: visit.visitNo,
      doctorName: visit.doctorName,
      patientName: visit.petName,
      action: isUpdate ? 'update' : 'create',
      status: 'success',
      message: `Antrean Poli #${visit.queueNo} (${visit.petName}) tersinkron ke Google Calendar`,
      googleEventId: eventData.id,
      htmlLink: eventData.htmlLink
    });

    return {
      success: true,
      eventId: eventData.id,
      htmlLink: eventData.htmlLink
    };
  } catch (err: any) {
    addSyncLog({
      type: 'clinic_visit',
      referenceId: visit.id,
      referenceNo: visit.visitNo,
      doctorName: visit.doctorName,
      patientName: visit.petName,
      action: visit.googleCalendarEventId ? 'update' : 'create',
      status: 'failed',
      message: `Gagal sinkron antrean: ${err.message}`
    });
    return { success: false, error: err.message };
  }
};

/**
 * Fetch events from Google Calendar for the selected date
 */
export const fetchGoogleCalendarEventsForDate = async (
  dateStr: string,
  tokenOverride?: string
): Promise<{ success: boolean; events: GoogleCalendarEventItem[]; error?: string }> => {
  const token = tokenOverride || getStoredAccessToken();
  if (!token) {
    return { success: false, events: [], error: 'Google Calendar belum terhubung.' };
  }

  try {
    const timeMin = new Date(`${dateStr}T00:00:00+07:00`).toISOString();
    const timeMax = new Date(`${dateStr}T23:59:59+07:00`).toISOString();

    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.set('timeMin', timeMin);
    url.searchParams.set('timeMax', timeMax);
    url.searchParams.set('singleEvents', 'true');
    url.searchParams.set('orderBy', 'startTime');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `HTTP ${response.status}: Gagal memuat event Google Calendar`);
    }

    const data = await response.json();
    const items: GoogleCalendarEventItem[] = (data.items || []).map((it: any) => ({
      id: it.id,
      summary: it.summary || '(Tanpa Judul)',
      description: it.description,
      start: it.start || {},
      end: it.end || {},
      htmlLink: it.htmlLink,
      location: it.location,
      status: it.status,
      colorId: it.colorId,
      extendedProperties: it.extendedProperties
    }));

    // Cache locally
    try {
      localStorage.setItem(STORAGE_KEY_EVENTS_CACHE, JSON.stringify(items));
    } catch (e) {}

    return { success: true, events: items };
  } catch (err: any) {
    return { success: false, events: [], error: err.message };
  }
};

/**
 * Delete event from Google Calendar
 */
export const deleteGoogleCalendarEvent = async (
  eventId: string,
  tokenOverride?: string
): Promise<{ success: boolean; error?: string }> => {
  const token = tokenOverride || getStoredAccessToken();
  if (!token) {
    return { success: false, error: 'Google Calendar belum terhubung.' };
  }

  try {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok && response.status !== 404) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `HTTP ${response.status}: Gagal menghapus event`);
    }

    addSyncLog({
      type: 'doctor_booking',
      referenceId: eventId,
      referenceNo: 'EVENT-DELETE',
      doctorName: 'Klinik',
      patientName: '-',
      action: 'delete',
      status: 'success',
      message: `Event Google Calendar (${eventId}) berhasil dihapus.`
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
};

/**
 * Batch Sync all active bookings to Google Calendar
 */
export const batchSyncAllDoctorBookings = async (
  bookings: DoctorBooking[],
  tokenOverride?: string
): Promise<{ total: number; synced: number; failed: number; updatedBookings: DoctorBooking[] }> => {
  const token = tokenOverride || getStoredAccessToken();
  if (!token) {
    throw new Error('Google Calendar belum terhubung. Silakan hubungkan akun terlebih dahulu.');
  }

  let synced = 0;
  let failed = 0;
  const updatedBookings: DoctorBooking[] = [];

  for (const b of bookings) {
    // Only sync active or non-cancelled bookings, or update cancelled ones
    try {
      const res = await syncDoctorBookingToGoogleCalendar(b, token);
      if (res.success && res.eventId) {
        synced++;
        updatedBookings.push({
          ...b,
          googleCalendarEventId: res.eventId,
          googleCalendarHtmlLink: res.htmlLink,
          googleCalendarSyncStatus: 'synced',
          lastSyncedAt: new Date().toISOString()
        });
      } else {
        failed++;
        updatedBookings.push({
          ...b,
          googleCalendarSyncStatus: 'failed'
        });
      }
    } catch (e) {
      failed++;
      updatedBookings.push({
        ...b,
        googleCalendarSyncStatus: 'failed'
      });
    }
  }

  const config = loadGoogleCalendarConfig();
  config.lastSyncedAt = new Date().toISOString();
  saveGoogleCalendarConfig(config);

  return { total: bookings.length, synced, failed, updatedBookings };
};
