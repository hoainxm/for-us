// Nhãn cố định (không tự nhập) — dùng chung toàn app.

import type { ExpenseKind } from "@/types";

export const TASK_TAGS = [
  "Đi chợ",
  "Nhà cửa",
  "Dọn dẹp",
  "Nấu ăn",
  "Hẹn hò",
  "Gia đình",
  "Sức khỏe",
  "Công việc",
] as const;

export interface CategoryGroup {
  group: string;
  items: readonly string[];
}

// Danh mục CHI — chia nhóm để chọn nhanh, tên cũ giữ nguyên để dữ liệu cũ không lệch.
export const EXPENSE_CATEGORY_GROUPS: readonly CategoryGroup[] = [
  { group: "Ăn uống", items: ["Ăn uống", "Đi chợ", "Cà phê / Trà sữa", "Nhậu / Tiệc"] },
  {
    group: "Nhà cửa & hoá đơn",
    items: ["Hóa đơn", "Thuê nhà", "Điện nước", "Internet / Điện thoại", "Đồ gia dụng", "Sửa chữa"],
  },
  { group: "Đi lại", items: ["Di chuyển", "Xăng xe", "Gửi xe"] },
  {
    group: "Cá nhân",
    items: ["Mua sắm", "Quần áo", "Sức khỏe", "Làm đẹp", "Học tập", "Thể thao", "Đăng ký / Thuê bao"],
  },
  {
    group: "Tình yêu & gia đình",
    items: ["Hẹn hò", "Quà tặng", "Du lịch", "Hiếu hỉ", "Gia đình", "Thú cưng"],
  },
  {
    group: "Tài chính & khác",
    items: ["Tiết kiệm", "Đầu tư", "Bảo hiểm", "Trả nợ", "Từ thiện", "Phí dịch vụ", "Khác"],
  },
] as const;

// Danh mục THU — trước đây dùng chung danh mục chi nên không có mục nào hợp.
export const INCOME_CATEGORY_GROUPS: readonly CategoryGroup[] = [
  { group: "Thu nhập chính", items: ["Lương", "Thưởng", "Phụ cấp"] },
  { group: "Thu nhập thêm", items: ["Làm thêm", "Kinh doanh", "Bán đồ", "Lãi / Đầu tư"] },
  { group: "Khác", items: ["Được tặng", "Hoàn tiền", "Rút tiết kiệm", "Vay / Mượn", "Khác"] },
] as const;

const flatten = (groups: readonly CategoryGroup[]) => groups.flatMap((g) => g.items);

export const EXPENSE_CATEGORIES = flatten(EXPENSE_CATEGORY_GROUPS);
export const INCOME_CATEGORIES = flatten(INCOME_CATEGORY_GROUPS);

export const categoryGroupsFor = (kind: ExpenseKind): readonly CategoryGroup[] =>
  kind === "income" ? INCOME_CATEGORY_GROUPS : EXPENSE_CATEGORY_GROUPS;

export const EVENT_CATEGORIES = [
  "Kỷ niệm",
  "Sinh nhật",
  "Du lịch",
  "Lễ tết",
  "Khác",
] as const;

export const NOTE_IMAGE_LIMIT = 10;

// Emoji minh hoạ cho danh mục thu/chi
export const CATEGORY_EMOJI: Record<string, string> = {
  // Chi — ăn uống
  "Ăn uống": "🍜",
  "Đi chợ": "🛒",
  "Cà phê / Trà sữa": "☕",
  "Nhậu / Tiệc": "🍻",
  // Chi — nhà cửa & hoá đơn
  "Hóa đơn": "🧾",
  "Thuê nhà": "🏠",
  "Điện nước": "💡",
  "Internet / Điện thoại": "📶",
  "Đồ gia dụng": "🧺",
  "Sửa chữa": "🔧",
  // Chi — đi lại
  "Di chuyển": "🚕",
  "Xăng xe": "⛽",
  "Gửi xe": "🅿️",
  // Chi — cá nhân
  "Mua sắm": "🛍️",
  "Quần áo": "👗",
  "Sức khỏe": "💊",
  "Làm đẹp": "💅",
  "Học tập": "📚",
  "Thể thao": "🏋️",
  "Đăng ký / Thuê bao": "📺",
  // Chi — tình yêu & gia đình
  "Hẹn hò": "💑",
  "Quà tặng": "🎁",
  "Du lịch": "🧳",
  "Hiếu hỉ": "💐",
  "Gia đình": "👨‍👩‍👧",
  "Thú cưng": "🐾",
  // Chi — tài chính & khác
  "Tiết kiệm": "🐖",
  "Đầu tư": "📈",
  "Bảo hiểm": "🛡️",
  "Trả nợ": "💳",
  "Từ thiện": "🤝",
  "Phí dịch vụ": "🏦",
  Khác: "✨",
  // Thu
  Lương: "💰",
  Thưởng: "🎉",
  "Phụ cấp": "🧧",
  "Làm thêm": "🧑‍💻",
  "Kinh doanh": "🏪",
  "Bán đồ": "📦",
  "Lãi / Đầu tư": "📈",
  "Được tặng": "🎁",
  "Hoàn tiền": "↩️",
  "Rút tiết kiệm": "🐖",
  "Vay / Mượn": "🤝",
};

/** Emoji của một khoản — fallback theo thu/chi khi danh mục là dữ liệu cũ/lạ. */
export const emojiOf = (category: string, kind: ExpenseKind = "expense") =>
  CATEGORY_EMOJI[category] ?? (kind === "income" ? "💰" : "✨");
