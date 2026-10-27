import { get, set } from 'idb-keyval';
import { PaymentRecord } from './payments';

const PAYMENTS_CACHE_KEY = 'srk_payments_persistent_cache_v2';
const PAYMENTS_BACKUP_LS_KEY = 'srk_payments_backup_v2';

export const BASELINE_PAYMENTS: PaymentRecord[] = [
  {
    docId: "pay_3285735",
    orderId: "ORD-2026-3285735 - subhas sir",
    originalAmount: "₹2,78,525.42",
    originalGst: "₹50,134.58 (18%)",
    grandTotal: "₹3,28,660",
    advanceRequirement: "50% advance payment required at the time",
    advancePayment: "50% advance payment required at the time",
    transportationCharges: "Rs. 3,500",
    installationCharges: "Rs. 16,000",
    remainingBalance: "₹3,28,660",
    deliveryDate: "2026-10-15",
    phases: [
      {
        id: "p1",
        title: "Advance Payment (50% advance payment)",
        amount: "50% advance payment required at the time",
        status: "Pending",
        date: "2026-10-15"
      }
    ]
  },
  {
    docId: "pay_4470109",
    orderId: "ORD-2026-4470109 - FEB TELE INDIA",
    originalAmount: "₹54,042",
    originalGst: "18%",
    grandTotal: "₹63,770",
    advanceRequirement: "50% Advance",
    deliveryDate: "2026-10-25",
    phases: [
      {
        id: "p1",
        title: "50% Advance",
        amount: "₹31,885",
        status: "Pending",
        date: "2026-10-23"
      }
    ]
  },
  {
    docId: "pay_7247180",
    orderId: "ORD-2026-7247180 - NAHIM KHAN",
    originalAmount: "₹39,600",
    originalGst: "18%",
    grandTotal: "₹46,728",
    advanceRequirement: "50% Advance",
    deliveryDate: "2026-10-28",
    phases: [
      {
        id: "p1",
        title: "50% Advance",
        amount: "₹23,364",
        status: "Pending",
        date: "2026-10-23"
      }
    ]
  },
  {
    docId: "pay_7921369",
    orderId: "ORD-2026-7921369 - High Vision Developers Pvt Ltd",
    originalAmount: "₹22,500",
    originalGst: "18%",
    grandTotal: "₹22,500",
    advanceRequirement: "100% Advance",
    deliveryDate: "2026-10-22",
    phases: [
      {
        id: "p1",
        title: "Full Payment",
        amount: "₹22,500",
        status: "Pending",
        date: "2026-10-16"
      }
    ]
  },
  {
    docId: "pay_0412906",
    orderId: "ORD-2026-0412906 - CLOTHIQ SOLUTIONS PVT LTD",
    originalAmount: "₹1,54,700",
    originalGst: "18%",
    grandTotal: "₹1,82,546",
    advanceRequirement: "50% Advance",
    deliveryDate: "2026-10-18",
    phases: [
      {
        id: "p1",
        title: "50% Advance",
        amount: "₹91,273",
        status: "Pending",
        date: "2026-10-14"
      }
    ]
  },
  {
    docId: "pay_8706607",
    orderId: "ORD-2026-8706607 - SLEEPILY HOMES",
    originalAmount: "₹42,500",
    originalGst: "18%",
    grandTotal: "₹50,150",
    advanceRequirement: "50% Advance",
    deliveryDate: "2026-10-16",
    phases: [
      {
        id: "p1",
        title: "50% Advance",
        amount: "₹25,075",
        status: "Pending",
        date: "2026-10-13"
      }
    ]
  },
  {
    docId: "pay_7624213",
    orderId: "ORD-2026-7624213 - Artificial Limbs Manufacturing Corporation of India",
    originalAmount: "₹42,702",
    originalGst: "18%",
    grandTotal: "₹50,388",
    advanceRequirement: "50% Advance",
    deliveryDate: "2026-10-19",
    phases: [
      {
        id: "p1",
        title: "50% Advance",
        amount: "₹25,194",
        status: "Pending",
        date: "2026-10-13"
      }
    ]
  },
  {
    docId: "pay_5376329",
    orderId: "ORD-2026-5376329 - Bhartiya Skill Development University",
    originalAmount: "₹17,930",
    originalGst: "18%",
    grandTotal: "₹17,930",
    advanceRequirement: "100% Advance",
    deliveryDate: "2026-10-15",
    phases: [
      {
        id: "p1",
        title: "Full Payment",
        amount: "₹17,930",
        status: "Pending",
        date: "2026-10-13"
      }
    ]
  }
];

export async function getCachedPayments(): Promise<PaymentRecord[]> {
  try {
    if (typeof window !== 'undefined') {
      const idbPayments = await get<PaymentRecord[]>(PAYMENTS_CACHE_KEY);
      if (idbPayments && idbPayments.length > 0) {
        return idbPayments;
      }
      const lsRaw = localStorage.getItem(PAYMENTS_BACKUP_LS_KEY);
      if (lsRaw) {
        const parsed = JSON.parse(lsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn("Cached payments retrieval notice:", err);
  }
  return BASELINE_PAYMENTS;
}

export async function setCachedPayments(payments: PaymentRecord[]): Promise<void> {
  if (!payments || payments.length === 0) return;
  try {
    if (typeof window !== 'undefined') {
      await set(PAYMENTS_CACHE_KEY, payments);
      try {
        localStorage.setItem(PAYMENTS_BACKUP_LS_KEY, JSON.stringify(payments));
      } catch (lsErr) {
        console.warn("LocalStorage payment backup warning:", lsErr);
      }
    }
  } catch (err) {
    console.warn("Error caching payments locally:", err);
  }
}
