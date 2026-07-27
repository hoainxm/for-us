// Nhãn cố định (không tự nhập) — dùng chung toàn app.

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

export const EXPENSE_CATEGORIES = [
  "Ăn uống",
  "Đi chợ",
  "Hẹn hò",
  "Di chuyển",
  "Hóa đơn",
  "Mua sắm",
  "Sức khỏe",
  "Khác",
] as const;

export const EVENT_CATEGORIES = [
  "Kỷ niệm",
  "Sinh nhật",
  "Du lịch",
  "Lễ tết",
  "Khác",
] as const;

export const NOTE_IMAGE_LIMIT = 10;

// Emoji minh hoạ cho danh mục chi tiêu
export const EXPENSE_CATEGORY_EMOJI: Record<string, string> = {
  "Ăn uống": "🍜",
  "Đi chợ": "🛒",
  "Hẹn hò": "💑",
  "Di chuyển": "🚕",
  "Hóa đơn": "🧾",
  "Mua sắm": "🛍️",
  "Sức khỏe": "💊",
  "Khác": "✨",
};
