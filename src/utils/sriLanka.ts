import { ExamGrade } from '@/src/types/tuition';

export function formatLkr(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `Rs. ${safe.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatLkrCompact(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `Rs. ${Math.round(safe).toLocaleString('en-LK')}`;
}

export function validateSriLankanPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(\+94|94|0)?7[01245678][0-9]{7}$/.test(cleaned);
}

export function normalizeSriLankanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  let core = digits;
  if (digits.startsWith('94') && digits.length === 11) {
    core = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length === 10) {
    core = digits.slice(1);
  }
  if (core.length === 9 && core.startsWith('7')) {
    return `+94 ${core.slice(0, 2)} ${core.slice(2, 5)} ${core.slice(5)}`;
  }
  return phone.trim();
}

export function validateNic(nic: string): boolean {
  const trimmed = nic.trim().toUpperCase();
  if (!trimmed) return true; // optional field when blank
  return /^[0-9]{9}[VX]$/.test(trimmed) || /^[0-9]{12}$/.test(trimmed);
}

export function calculateGrade(marks: number, maxMarks: number): ExamGrade {
  if (maxMarks <= 0) return 'W';
  const pct = (marks / maxMarks) * 100;
  if (pct >= 75) return 'A';
  if (pct >= 65) return 'B';
  if (pct >= 55) return 'C';
  if (pct >= 40) return 'S';
  return 'W';
}

export function getCurrentMonthKey(): string {
  return '2026-11';
}

export function getCurrentMonthLabel(): string {
  return 'November 2026';
}

export function getTodayDateKey(): string {
  return '2026-11-13';
}

export function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function playCheckInChime(isPaid: boolean): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (isPaid) {
      // Bright crisp ascending two-note major chime
      const freqs = [587.33, 880]; // D5 -> A5
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.001, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.24);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.26);
      });
    } else {
      // Distinct low warning two-pulse alert for overdue fee
      const freqs = [260, 210];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.001, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.22, now + idx * 0.14 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.22);
      });
    }
  } catch {
    // Ignore audio context restriction errors in headless browsers
  }
}

export function formatTimestampLabel(value: unknown): string {
  if (!value) return 'Just now';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
    const d = (value as { toDate: () => Date }).toDate();
    return d.toLocaleString('en-LK', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return 'Just now';
}
