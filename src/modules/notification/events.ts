import * as repo from "./repo";
import { notify } from "./service";

const VERDICT_LABEL: Record<string, string> = {
  AC: "Chấp nhận (AC)",
  WA: "Sai kết quả (WA)",
  TLE: "Quá thời gian (TLE)",
  MLE: "Quá bộ nhớ (MLE)",
  RE: "Lỗi khi chạy (RE)",
  CE: "Lỗi biên dịch (CE)",
  IE: "Lỗi hệ thống chấm (IE)",
};

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
    title: `Kết quả chấm bài "${problemTitle}"`,
    body: `${VERDICT_LABEL[result] ?? result} — đúng ${passedCases} testcase`,
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
      title: rejected ? `Bài tập "${info.Title}" bị từ chối` : `Bài tập "${info.Title}" đã được duyệt`,
      body: rejected && info.RejectionReason ? `Lý do: ${info.RejectionReason}` : undefined,
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
      title: `Bạn đã được thêm vào lớp "${cls.ClassName}"`,
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
      title: `Bạn đã bị xóa khỏi lớp "${cls.ClassName}"`,
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
      title: `Tài liệu mới trong lớp "${cls.ClassName}"`,
      body: fileName,
      link: `/user/classes/${classId}`,
    });
  });
}

export function notifyCommentReply(parentCommentId: number, actorId: number, actorName: string) {
  return safely(async () => {
    const parent = await repo.commentInfo(parentCommentId, actorId);
    if (!parent || parent.AuthorID === actorId) return;
    await notify({
      userIds: [parent.AuthorID],
      type: "comment_reply",
      title: `${actorName} đã trả lời bình luận của bạn`,
      link: `/user/problems/${parent.ProblemID}`,
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
      title: `${actorName} đã thích bình luận của bạn`,
      link: `/user/problems/${comment.ProblemID}`,
    });
  });
}

export function notifyContestJoined(contestId: number, userId: number, userName: string) {
  return safely(async () => {
    const contest = await repo.contestInfo(contestId);
    if (!contest || contest.CreatorID === userId) return;
    await notify({
      userIds: [contest.CreatorID],
      type: "contest_joined",
      title: `${userName} đã tham gia kỳ thi "${contest.ContestName}"`,
      link: `/teacher/contests/${contestId}`,
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
      title: `Kỳ thi "${contest.ContestName}" đã bắt đầu`,
      link: `/user/contests/${contestId}`,
    });
  });
}
