import { get, set } from 'idb-keyval';
import { Order } from './orders';

const ORDERS_CACHE_KEY = 'srk_orders_persistent_cache_v2';
const ORDERS_BACKUP_LS_KEY = 'srk_orders_backup_v2';

export const BASELINE_ORDERS: Order[] = [
  {
    id: "ORD-2026-4470109",
    docId: "ord_4470109",
    customer: "FEB TELE INDIA",
    amount: "₹63,770",
    date: "Oct 23, 2026",
    status: "Dispatched",
    items: 6,
    createdAt: { seconds: 1792742400 },
    details: {
      totalAmount: "₹63,770",
      employeeName: "Khushboo Modi",
      deliveryDate: "2026-10-25",
      advancePayment: "50% Advance"
    }
  },
  {
    id: "ORD-2026-7247180",
    docId: "ord_7247180",
    customer: "NAHIM KHAN",
    amount: "₹46,728",
    date: "Oct 23, 2026",
    status: "New Order",
    items: 4,
    createdAt: { seconds: 1792742000 },
    details: {
      totalAmount: "₹46,728",
      employeeName: "Abhilasha verma",
      deliveryDate: "2026-10-28",
      advancePayment: "50% Advance"
    }
  },
  {
    id: "ORD-2026-7921369",
    docId: "ord_7921369",
    customer: "High Vision Developers Pvt Ltd",
    amount: "₹22,500",
    date: "Oct 16, 2026",
    status: "New Order",
    items: 2,
    createdAt: { seconds: 1792137600 },
    details: {
      totalAmount: "₹22,500",
      employeeName: "Anshuman Singh",
      deliveryDate: "2026-10-22",
      advancePayment: "100% Advance"
    }
  },
  {
    id: "ORD-2026-0412906",
    docId: "ord_0412906",
    customer: "CLOTHIQ SOLUTIONS PVT LTD",
    amount: "₹1,82,546",
    date: "Oct 14, 2026",
    status: "Dispatched",
    items: 12,
    createdAt: { seconds: 1791964800 },
    details: {
      totalAmount: "₹1,82,546",
      employeeName: "Bhawna Khandelwal",
      deliveryDate: "2026-10-18",
      advancePayment: "50% Advance"
    }
  },
  {
    id: "ORD-2026-8706607",
    docId: "ord_8706607",
    customer: "SLEEPILY HOMES",
    amount: "₹50,150",
    date: "Oct 13, 2026",
    status: "Dispatched",
    items: 5,
    createdAt: { seconds: 1791878400 },
    details: {
      totalAmount: "₹50,150",
      employeeName: "Khushboo Modi",
      deliveryDate: "2026-10-16",
      advancePayment: "50% Advance"
    }
  },
  {
    id: "ORD-2026-7624213",
    docId: "ord_7624213",
    customer: "Artificial Limbs Manufacturing Corporation of India",
    amount: "₹50,388",
    date: "Oct 13, 2026",
    status: "New Order",
    items: 4,
    createdAt: { seconds: 1791878000 },
    details: {
      totalAmount: "₹50,388",
      employeeName: "Abhilasha verma",
      deliveryDate: "2026-10-19",
      advancePayment: "50% Advance"
    }
  },
  {
    id: "ORD-2026-5376329",
    docId: "ord_5376329",
    customer: "Bhartiya Skill Development University",
    amount: "₹17,930",
    date: "Oct 13, 2026",
    status: "Dispatched",
    items: 3,
    createdAt: { seconds: 1791877000 },
    details: {
      totalAmount: "₹17,930",
      employeeName: "Anshuman Singh",
      deliveryDate: "2026-10-15",
      advancePayment: "100% Advance"
    }
  },
  {
    id: "ORD-2026-3285735",
    docId: "ord_3285735",
    customer: "subhas sir",
    amount: "₹3,28,660",
    date: "Oct 15, 2026",
    status: "New Order",
    items: 8,
    createdAt: { seconds: 1792051200 },
    details: {
      totalAmount: "₹3,28,660",
      employeeName: "Anshuman Singh",
      deliveryDate: "2026-10-15",
      advancePayment: "50% advance payment required at the time",
      transportationCharges: "Rs. 3,500",
      installationCharges: "Rs. 16,000",
      gst: "18%"
    }
  },
  {
    id: "ORD-2026-9182341",
    docId: "ord_9182341",
    customer: "Apex Tech Innovations",
    amount: "₹2,45,000",
    date: "Oct 12, 2026",
    status: "Production",
    items: 10,
    createdAt: { seconds: 1791792000 },
    details: { totalAmount: "₹2,45,000", employeeName: "Bhawna Khandelwal", deliveryDate: "2026-10-29" }
  },
  {
    id: "ORD-2026-8812401",
    docId: "ord_8812401",
    customer: "Zenith Design Studios",
    amount: "₹1,15,400",
    date: "Oct 11, 2026",
    status: "Scheduled Dispatched",
    items: 7,
    createdAt: { seconds: 1791705600 },
    details: { totalAmount: "₹1,15,400", employeeName: "Khushboo Modi", deliveryDate: "2026-10-24" }
  },
  {
    id: "ORD-2026-7734120",
    docId: "ord_7734120",
    customer: "Vanguard Infra Projects",
    amount: "₹4,12,000",
    date: "Oct 10, 2026",
    status: "Purchase",
    items: 16,
    createdAt: { seconds: 1791619200 },
    details: { totalAmount: "₹4,12,000", employeeName: "Anshuman Singh", deliveryDate: "2026-11-02" }
  },
  {
    id: "ORD-2026-6641920",
    docId: "ord_6641920",
    customer: "Radiant Health Systems",
    amount: "₹95,200",
    date: "Oct 09, 2026",
    status: "Dispatched",
    items: 6,
    createdAt: { seconds: 1791532800 },
    details: { totalAmount: "₹95,200", employeeName: "Abhilasha verma", deliveryDate: "2026-10-20" }
  },
  {
    id: "ORD-2026-5512903",
    docId: "ord_5512903",
    customer: "Skyline Architect Hub",
    amount: "₹1,78,000",
    date: "Oct 08, 2026",
    status: "New Order",
    items: 9,
    createdAt: { seconds: 1791446400 },
    details: { totalAmount: "₹1,78,000", employeeName: "Bhawna Khandelwal", deliveryDate: "2026-10-27" }
  },
  {
    id: "ORD-2026-4421908",
    docId: "ord_4421908",
    customer: "Pinnacle Co-working Spaces",
    amount: "₹3,60,000",
    date: "Oct 07, 2026",
    status: "Production",
    items: 18,
    createdAt: { seconds: 1791360000 },
    details: { totalAmount: "₹3,60,000", employeeName: "Khushboo Modi", deliveryDate: "2026-11-05" }
  },
  {
    id: "ORD-2026-3391024",
    docId: "ord_3391024",
    customer: "Matrix Retail Solutions",
    amount: "₹88,500",
    date: "Oct 06, 2026",
    status: "Dispatched",
    items: 5,
    createdAt: { seconds: 1791273600 },
    details: { totalAmount: "₹88,500", employeeName: "Anshuman Singh", deliveryDate: "2026-10-18" }
  },
  {
    id: "ORD-2026-2281905",
    docId: "ord_2281905",
    customer: "Heritage Hospitality Ltd",
    amount: "₹5,20,000",
    date: "Oct 05, 2026",
    status: "New Order",
    items: 22,
    createdAt: { seconds: 1791187200 },
    details: { totalAmount: "₹5,20,000", employeeName: "Bhawna Khandelwal", deliveryDate: "2026-11-10" }
  },
  {
    id: "ORD-2026-1192834",
    docId: "ord_1192834",
    customer: "Global Logistics Warehousing",
    amount: "₹1,42,000",
    date: "Oct 04, 2026",
    status: "Installation Complete",
    items: 8,
    createdAt: { seconds: 1791100800 },
    details: { totalAmount: "₹1,42,000", employeeName: "Abhilasha verma", deliveryDate: "2026-10-14" }
  },
  {
    id: "ORD-2026-0092817",
    docId: "ord_0092817",
    customer: "Prime Diagnostics Labs",
    amount: "₹76,400",
    date: "Oct 03, 2026",
    status: "Dispatched",
    items: 4,
    createdAt: { seconds: 1791014400 },
    details: { totalAmount: "₹76,400", employeeName: "Khushboo Modi", deliveryDate: "2026-10-12" }
  },
  {
    id: "ORD-2026-9928176",
    docId: "ord_9928176",
    customer: "Elite Educational Foundation",
    amount: "₹2,84,000",
    date: "Oct 02, 2026",
    status: "Production",
    items: 14,
    createdAt: { seconds: 1790928000 },
    details: { totalAmount: "₹2,84,000", employeeName: "Anshuman Singh", deliveryDate: "2026-10-30" }
  },
  {
    id: "ORD-2026-8837165",
    docId: "ord_8837165",
    customer: "Urban Nest Interiors",
    amount: "₹1,95,000",
    date: "Oct 01, 2026",
    status: "New Order",
    items: 11,
    createdAt: { seconds: 1790841600 },
    details: { totalAmount: "₹1,95,000", employeeName: "Bhawna Khandelwal", deliveryDate: "2026-10-25" }
  },
  {
    id: "ORD-2026-7746154",
    docId: "ord_7746154",
    customer: "Sterling Automotives Ltd",
    amount: "₹3,10,000",
    date: "Sep 29, 2026",
    status: "Dispatched",
    items: 15,
    createdAt: { seconds: 1790668800 },
    details: { totalAmount: "₹3,10,000", employeeName: "Khushboo Modi", deliveryDate: "2026-10-10" }
  },
  {
    id: "ORD-2026-6655143",
    docId: "ord_6655143",
    customer: "Sapphire Software Labs",
    amount: "₹2,18,000",
    date: "Sep 28, 2026",
    status: "Installation Complete",
    items: 12,
    createdAt: { seconds: 1790582400 },
    details: { totalAmount: "₹2,18,000", employeeName: "Abhilasha verma", deliveryDate: "2026-10-08" }
  },
  {
    id: "ORD-2026-5564132",
    docId: "ord_5564132",
    customer: "Prestige Luxury Living",
    amount: "₹4,85,000",
    date: "Sep 26, 2026",
    status: "Dispatched",
    items: 20,
    createdAt: { seconds: 1790409600 },
    details: { totalAmount: "₹4,85,000", employeeName: "Anshuman Singh", deliveryDate: "2026-10-05" }
  },
  {
    id: "ORD-2026-4473121",
    docId: "ord_4473121",
    customer: "Quantum BioPharma",
    amount: "₹1,62,000",
    date: "Sep 24, 2026",
    status: "New Order",
    items: 7,
    createdAt: { seconds: 1790236800 },
    details: { totalAmount: "₹1,62,000", employeeName: "Bhawna Khandelwal", deliveryDate: "2026-10-15" }
  },
  {
    id: "ORD-2026-3382110",
    docId: "ord_3382110",
    customer: "Oasis Legal Advocates",
    amount: "₹84,000",
    date: "Sep 22, 2026",
    status: "Installation Complete",
    items: 4,
    createdAt: { seconds: 1790064000 },
    details: { totalAmount: "₹84,000", employeeName: "Khushboo Modi", deliveryDate: "2026-09-30" }
  },
  {
    id: "ORD-2026-2291009",
    docId: "ord_2291009",
    customer: "Nova Fintech Services",
    amount: "₹3,40,000",
    date: "Sep 20, 2026",
    status: "Dispatched",
    items: 16,
    createdAt: { seconds: 1789891200 },
    details: { totalAmount: "₹3,40,000", employeeName: "Anshuman Singh", deliveryDate: "2026-10-02" }
  },
  {
    id: "ORD-2026-1100998",
    docId: "ord_1100998",
    customer: "Metro Heights Commercial",
    amount: "₹2,90,000",
    date: "Sep 18, 2026",
    status: "Production",
    items: 14,
    createdAt: { seconds: 1789718400 },
    details: { totalAmount: "₹2,90,000", employeeName: "Abhilasha verma", deliveryDate: "2026-10-12" }
  },
  {
    id: "ORD-2026-0019887",
    docId: "ord_0019887",
    customer: "Kuber Exports Corporation",
    amount: "₹1,25,000",
    date: "Sep 16, 2026",
    status: "Dispatched",
    items: 6,
    createdAt: { seconds: 1789545600 },
    details: { totalAmount: "₹1,25,000", employeeName: "Bhawna Khandelwal", deliveryDate: "2026-09-28" }
  },
  {
    id: "ORD-2026-9928776",
    docId: "ord_9928776",
    customer: "Jindal Industrial Foundry",
    amount: "₹1,98,000",
    date: "Sep 14, 2026",
    status: "New Order",
    items: 9,
    createdAt: { seconds: 1789372800 },
    details: { totalAmount: "₹1,98,000", employeeName: "Khushboo Modi", deliveryDate: "2026-10-05" }
  },
  {
    id: "ORD-2026-8837665",
    docId: "ord_8837665",
    customer: "Infinity Cowork Jaipur",
    amount: "₹2,35,000",
    date: "Sep 12, 2026",
    status: "Installation Complete",
    items: 11,
    createdAt: { seconds: 1789200000 },
    details: { totalAmount: "₹2,35,000", employeeName: "Anshuman Singh", deliveryDate: "2026-09-25" }
  },
  {
    id: "ORD-2026-7746554",
    docId: "ord_7746554",
    customer: "Horizon Media Networks",
    amount: "₹72,000",
    date: "Sep 10, 2026",
    status: "Dispatched",
    items: 4,
    createdAt: { seconds: 1789027200 },
    details: { totalAmount: "₹72,000", employeeName: "Abhilasha verma", deliveryDate: "2026-09-20" }
  },
  {
    id: "ORD-2026-6655443",
    docId: "ord_6655443",
    customer: "Golden Era Jewels HQ",
    amount: "₹4,30,000",
    date: "Sep 08, 2026",
    status: "Production",
    items: 19,
    createdAt: { seconds: 1788854400 },
    details: { totalAmount: "₹4,30,000", employeeName: "Bhawna Khandelwal", deliveryDate: "2026-10-01" }
  },
  {
    id: "ORD-2026-5564332",
    docId: "ord_5564332",
    customer: "Falcon Logistics Hub",
    amount: "₹1,55,000",
    date: "Sep 05, 2026",
    status: "Dispatched",
    items: 7,
    createdAt: { seconds: 1788595200 },
    details: { totalAmount: "₹1,55,000", employeeName: "Khushboo Modi", deliveryDate: "2026-09-18" }
  },
  {
    id: "ORD-2026-4473221",
    docId: "ord_4473221",
    customer: "Everest Engineering Works",
    amount: "₹1,88,000",
    date: "Sep 03, 2026",
    status: "New Order",
    items: 8,
    createdAt: { seconds: 1788422400 },
    details: { totalAmount: "₹1,88,000", employeeName: "Anshuman Singh", deliveryDate: "2026-09-24" }
  },
  {
    id: "ORD-2026-3382119",
    docId: "ord_3382119",
    customer: "Dynamic Fitness Centres",
    amount: "₹92,000",
    date: "Sep 01, 2026",
    status: "Installation Complete",
    items: 5,
    createdAt: { seconds: 1788249600 },
    details: { totalAmount: "₹92,000", employeeName: "Abhilasha verma", deliveryDate: "2026-09-12" }
  }
];

export async function getCachedOrders(): Promise<Order[]> {
  try {
    if (typeof window !== 'undefined') {
      const idbOrders = await get<Order[]>(ORDERS_CACHE_KEY);
      if (idbOrders && idbOrders.length > 0) {
        return idbOrders;
      }
      const lsRaw = localStorage.getItem(ORDERS_BACKUP_LS_KEY);
      if (lsRaw) {
        const parsed = JSON.parse(lsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn("Cached orders retrieval notice:", err);
  }
  return BASELINE_ORDERS;
}

export async function setCachedOrders(orders: Order[]): Promise<void> {
  if (!orders || orders.length === 0) return;
  try {
    if (typeof window !== 'undefined') {
      await set(ORDERS_CACHE_KEY, orders);
      try {
        localStorage.setItem(ORDERS_BACKUP_LS_KEY, JSON.stringify(orders));
      } catch (lsErr) {
        console.warn("LocalStorage backup quota warning:", lsErr);
      }
    }
  } catch (err) {
    console.warn("Error caching orders locally:", err);
  }
}
