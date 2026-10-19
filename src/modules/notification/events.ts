import * as repo from "./repo";
import { notify, notifyAggregate } from "./service";

const VERDICT_LABEL: Record<string, string> = {
  AC: "Chấp nhận (AC)",
  WA: "Sai kết quả (WA)",
  TLE: "Quá thời gian (TLE)",
  MLE: "Quá bộ nhớ (MLE)",
  RE: "Lỗi khi chạy (RE)",
  CE: "Lỗi biên dịch (CE)",
  IE: "Lỗi hệ thống chấm (IE)",
};

// Source names/reasons can be longer than a notification field; clip so the message is not dropped.
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

// Looking up recipients must never break the caller either.
async function safely(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e) {
    console.error("notification event failed", e);
  }
}

export function buildJudgeResult(
  problemTitle: string,
  submissionId: number,
  result: string,
  passedCases: string,
) {
  return {
    title: `Bài nộp #${submissionId} đã được chấm: ${VERDICT_LABEL[result] ?? result}`,
    body: clip(`Bài "${clip(problemTitle, 150)}" · đúng ${passedCases} testcase`, 500),
    link: `/submissions/${submissionId}`,
  };
}

export function notifyJudgeResult(submissionId: number, result: string, passedCases: string) {
  return safely(async () => {
    const info = await repo.submissionInfo(submissionId);
    if (!info) return;
    await notify({
      userIds: [info.UserID],
      type: "judge_result",
      ...buildJudgeResult(info.ProblemTitle, submissionId, result, passedCases),
    });
  });
}

// Only the two outcomes a creator cares about; "Private"/"Pending" transitions stay silent.
export function notifyProblemStatus(problemId: number, status: string, actorId: number) {
  return safely(async () => {
    if (status !== "Public" && status !== "Rejected") return;
    const info = await repo.problemInfo(problemId);
    if (!info || info.CreatorID === actorId) return;
    const rejected = status === "Rejected";
    await notify({
      userIds: [info.CreatorID],
      type: rejected ? "problem_rejected" : "problem_approved",
      title: clip(
        rejected ? `Bài tập "${clip(info.Title, 150)}" bị từ chối` : `Bài tập "${clip(info.Title, 150)}" đã được duyệt`,
        200,
      ),
      body: rejected && info.RejectionReason ? clip(`Lý do: ${info.RejectionReason}`, 500) : undefined,
      link: `/user/problems/${problemId}`,
    });
  });
}

export function notifyStudentAdded(classId: number, studentId: number) {
  return safely(async () => {
    const cls = await repo.classInfo(classId);
    if (!cls) return;
    await notify({
      userIds: [studentId],
      type: "class_student_added",
      title: clip(`Bạn đã được thêm vào lớp "${clip(cls.ClassName, 150)}"`, 200),
      link: `/user/classes/${classId}`,
    });
  });
}

export function notifyStudentRemoved(classId: number, studentId: number) {
  return safely(async () => {
    const cls = await repo.classInfo(classId);
    if (!cls) return;
    await notify({
      userIds: [studentId],
      type: "class_student_removed",
      title: clip(`Bạn đã bị xóa khỏi lớp "${clip(cls.ClassName, 150)}"`, 200),
      link: "/user/classes",
    });
  });
}

export function notifyClassDocument(classId: number, fileName: string, actorId: number) {
  return safely(async () => {
    const [cls, students] = await Promise.all([repo.classInfo(classId), repo.classStudentIds(classId)]);
    if (!cls) return;
    await notify({
      userIds: students.filter((id) => id !== actorId),
      type: "class_document_added",
      title: clip(`Tài liệu mới trong lớp "${clip(cls.ClassName, 150)}"`, 200),
      body: clip(fileName, 500),
      link: `/user/classes/${classId}`,
    });
  });
}

function commentLink(c: { ProblemID: number | null; ContestID: number | null }) {
  return c.ContestID ? `/user/contests/${c.ContestID}` : `/user/problems/${c.ProblemID}`;
}

export function notifyCommentReply(parentCommentId: number, actorId: number, actorName: string) {
  return safely(async () => {
    const parent = await repo.commentInfo(parentCommentId, actorId);
    if (!parent || parent.AuthorID === actorId) return;
    await notify({
      userIds: [parent.AuthorID],
      type: "comment_reply",
      title: clip(`${clip(actorName, 100)} đã trả lời bình luận của bạn`, 200),
      link: commentLink(parent),
    });
  });
}

// Call after the toggle: only a like that is now present notifies (not an unlike).
export function notifyCommentLike(commentId: number, actorId: number, actorName: string) {
  return safely(async () => {
    const comment = await repo.commentInfo(commentId, actorId);
    if (!comment || !comment.LikedByUser || comment.AuthorID === actorId) return;
    await notify({
      userIds: [comment.AuthorID],
      type: "comment_like",
      title: clip(`${clip(actorName, 100)} đã thích bình luận của bạn`, 200),
      link: commentLink(comment),
    });
  });
}

export function notifyContestJoined(contestId: number, userId: number, userName: string) {
  return safely(async () => {
    const contest = await repo.contestInfo(contestId);
    if (!contest || contest.CreatorID === userId) return;
    // Many joiners fold into one unread notification showing the TOTAL so far ("Đã có N người ...").
    await notifyAggregate({
      userId: contest.CreatorID,
      type: "contest_joined",
      titleTemplate: `Đã có {n} người tham gia kỳ thi "${clip(contest.ContestName, 120)}"`,
      body: clip(`Mới nhất: ${userName}`, 500),
      link: `/teacher/contests/${contestId}`,
      count: contest.ParticipantCount > 0 ? contest.ParticipantCount : undefined,
    });
  });
}

export function notifyTARequestSubmitted(classId: number, studentId: number, actorId: number) {
  return safely(async () => {
    const [info, admins] = await Promise.all([repo.taRequestInfo(classId, studentId), repo.adminIds()]);
    if (!info) return;
    await notify({
      userIds: admins.filter((id) => id !== actorId),
      type: "ta_request_submitted",
      title: clip(`Yêu cầu nâng trợ giảng: ${clip(info.StudentName, 80)} (lớp "${clip(info.ClassName, 80)}")`, 200),
      body: clip(`Gửi bởi ${info.TeacherName}`, 500),
      link: "/admin/approvals",
    });
  });
}

// Tells both the teacher who asked and the student who became a TA.
export function notifyTAApproved(requestId: number) {
  return safely(async () => {
    const info = await repo.taRequestById(requestId);
    if (!info || info.Status !== "Approved") return;
    const className = clip(info.ClassName, 120);
    await notify({
      userIds: [info.RequestedBy],
      type: "ta_request_approved",
      title: clip(`${clip(info.StudentName, 80)} đã được duyệt làm trợ giảng lớp "${className}"`, 200),
      link: `/teacher/classes/${info.ClassID}`,
    });
    if (info.UserID === info.RequestedBy) return;
    await notify({
      userIds: [info.UserID],
      type: "ta_request_approved",
      title: clip(`Bạn đã trở thành trợ giảng của lớp "${className}"`, 200),
      link: `/user/classes/${info.ClassID}`,
    });
  });
}

// Tells the teacher who asked that the admin turned the TA request down, with the reason.
export function notifyTARejected(requestId: number) {
  return safely(async () => {
    const info = await repo.taRequestById(requestId);
    if (!info || info.Status !== "Rejected") return;
    await notify({
      userIds: [info.RequestedBy],
      type: "ta_request_rejected",
      title: clip(
        `Yêu cầu nâng ${clip(info.StudentName, 80)} làm trợ giảng lớp "${clip(info.ClassName, 80)}" bị từ chối`,
        200,
      ),
      body: info.RejectionReason ? clip(`Lý do: ${info.RejectionReason}`, 500) : undefined,
      link: `/teacher/classes/${info.ClassID}`,
    });
  });
}

// Tells a user their TA role was removed, by a teacher (class given) or by an admin (no class).
export function notifyTADemoted(userId: number, classId?: number) {
  return safely(async () => {
    const cls = classId ? await repo.classInfo(classId) : null;
    await notify({
      userIds: [userId],
      type: "ta_demoted",
      title: clip(
        cls
          ? `Bạn không còn là trợ giảng của lớp "${clip(cls.ClassName, 140)}"`
          : "Quản trị viên đã gỡ vai trò trợ giảng của bạn",
        200,
      ),
      link: cls ? `/user/classes/${classId}` : "/user/classes",
    });
  });
}

export function notifyClassCreated(classId: number, actorId: number) {
  return safely(async () => {
    const [cls, admins] = await Promise.all([repo.classCreatedInfo(classId), repo.adminIds()]);
    if (!cls) return;
    await notify({
      userIds: admins.filter((id) => id !== actorId),
      type: "class_created",
      title: clip(`Lớp mới chờ duyệt: "${clip(cls.ClassName, 150)}"`, 200),
      body: clip(`Giáo viên: ${cls.TeacherName}`, 500),
      link: "/admin/approvals?tab=class",
    });
  });
}

export function notifyContestStarted(contestId: number, actorId: number) {
  return safely(async () => {
    const [contest, participants] = await Promise.all([
      repo.contestInfo(contestId),
      repo.contestParticipantIds(contestId),
    ]);
    if (!contest) return;
    await notify({
      userIds: participants.filter((id) => id !== actorId),
      type: "contest_started",
      title: clip(`Kỳ thi "${clip(contest.ContestName, 150)}" đã bắt đầu`, 200),
      link: `/user/contests/${contestId}`,
    });
  });
}
