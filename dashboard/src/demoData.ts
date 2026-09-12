export type DemoOrder = {
  id: string;
  customer: string;
  phone: string;
  total: number;
  payment: "COD" | "Cash" | "Card";
  status: "NEW" | "CONFIRMED" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";
  createdAt: string;
  items: number;
};

export type DemoCustomer = {
  id: string;
  name: string;
  phone: string;
  orders: number;
  totalSpent: number;
  segment: "VIP" | "RETURNING" | "NEW";
  lastOrder: string;
};

export const DEMO_ORDERS: DemoOrder[] = [
  { id: "SC-1058", customer: "Hassan Ali", phone: "+961 71 555 201", total: 1299, payment: "COD", status: "PREPARING", createdAt: "2026-09-12T07:45:00+03:00", items: 2 },
  { id: "SC-1057", customer: "Karim Daher", phone: "+961 70 222 541", total: 579, payment: "Cash", status: "READY", createdAt: "2026-09-12T06:30:00+03:00", items: 1 },
  { id: "SC-1056", customer: "Maya Saleh", phone: "+961 76 481 330", total: 1548, payment: "Card", status: "CONFIRMED", createdAt: "2026-09-11T23:10:00+03:00", items: 3 },
  { id: "SC-1055", customer: "Ali Hamdan", phone: "+961 81 907 118", total: 249, payment: "COD", status: "DELIVERED", createdAt: "2026-09-11T19:40:00+03:00", items: 1 },
  { id: "SC-1054", customer: "Rami Kassem", phone: "+961 03 423 055", total: 949, payment: "Cash", status: "NEW", createdAt: "2026-09-11T18:15:00+03:00", items: 1 },
  { id: "SC-1053", customer: "Nour Abbas", phone: "+961 71 637 948", total: 799, payment: "COD", status: "CANCELLED", createdAt: "2026-09-11T16:22:00+03:00", items: 1 },
];

export const DEMO_CUSTOMERS: DemoCustomer[] = [
  { id: "C-301", name: "Hassan Ali", phone: "+961 71 555 201", orders: 8, totalSpent: 4280, segment: "VIP", lastOrder: "2026-09-12T07:45:00+03:00" },
  { id: "C-302", name: "Maya Saleh", phone: "+961 76 481 330", orders: 5, totalSpent: 3110, segment: "VIP", lastOrder: "2026-09-11T23:10:00+03:00" },
  { id: "C-303", name: "Karim Daher", phone: "+961 70 222 541", orders: 3, totalSpent: 1387, segment: "RETURNING", lastOrder: "2026-09-12T06:30:00+03:00" },
  { id: "C-304", name: "Ali Hamdan", phone: "+961 81 907 118", orders: 2, totalSpent: 498, segment: "RETURNING", lastOrder: "2026-09-11T19:40:00+03:00" },
  { id: "C-305", name: "Rami Kassem", phone: "+961 03 423 055", orders: 1, totalSpent: 949, segment: "NEW", lastOrder: "2026-09-11T18:15:00+03:00" },
];

export const DEMO_SALES_SERIES = [
  { label: "Sat", value: 980 },
  { label: "Sun", value: 1420 },
  { label: "Mon", value: 1180 },
  { label: "Tue", value: 1760 },
  { label: "Wed", value: 1530 },
  { label: "Thu", value: 2140 },
  { label: "Fri", value: 1890 },
];
