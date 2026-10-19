export const AUDIT_ACTIONS: Record<string, string> = {
  SetUserRole: "Đổi vai trò người dùng",
  SetUserStatus: "Đổi trạng thái tài khoản",
  TransferOwnership: "Chuyển quyền sở hữu",
  DemoteTA: "Giáng chức trợ giảng",
  ImpersonateStart: "Đăng nhập thay người dùng",
  IMPERSONATE_SESSION_START: "Đăng nhập thay người dùng",
  CONTEST_CREATE: "Tạo kỳ thi",
  CONTEST_UPDATE: "Cập nhật kỳ thi",
  CONTEST_DELETE: "Xóa kỳ thi",
  DOCUMENT_UPLOAD: "Tải lên tài liệu",
  DOCUMENT_DELETE: "Xóa tài liệu",
  "CREATE:Problem": "Tạo bài tập",
  "UPDATE:Problem": "Cập nhật bài tập",
  "UPDATE:User": "Cập nhật tài khoản",
};

export function auditLabel(action: string, targetType: string) {
  return AUDIT_ACTIONS[`${action}:${targetType}`] ?? AUDIT_ACTIONS[action] ?? action;
}
