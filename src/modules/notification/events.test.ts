import { beforeEach, describe, expect, it, vi } from "vitest";

const notify = vi.fn();
const notifyAggregate = vi.fn();
const repo = {
  submissionInfo: vi.fn(),
  problemInfo: vi.fn(),
  commentInfo: vi.fn(),
  classInfo: vi.fn(),
  classStudentIds: vi.fn(),
  contestInfo: vi.fn(),
  contestParticipantIds: vi.fn(),
  adminIds: vi.fn(),
  classCreatedInfo: vi.fn(),
  taRequestInfo: vi.fn(),
  taRequestById: vi.fn(),
};
vi.mock("./service", () => ({ notify, notifyAggregate }));
vi.mock("./repo", () => repo);

const events = await import("./events");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("buildJudgeResult", () => {
  it("puts submission id and verdict in the title and the count in the body only", () => {
    const m = events.buildJudgeResult("Tổng hai số", 7, "WA", "3/10");
    expect(m.title).toContain("#7");
    expect(m.title).toContain("WA");
    expect(m.body).toContain("Tổng hai số");
    expect(m.body).toContain("3/10");
    expect(m.link).toBe("/submissions/7");
  });
});

describe("events", () => {
  it("notifies the submission owner of a verdict", async () => {
    repo.submissionInfo.mockResolvedValue({ UserID: 5, ProblemID: 9, ProblemTitle: "P" });
    await events.notifyJudgeResult(7, "AC", "10/10");
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [5], type: "judge_result", link: "/submissions/7" }),
    );
  });

  it("does not notify on an in-between status such as Private", async () => {
    await events.notifyProblemStatus(1, "Private", 2);
    expect(notify).not.toHaveBeenCalled();
  });

  it("does not notify a creator who changed their own problem", async () => {
    repo.problemInfo.mockResolvedValue({ CreatorID: 2, Title: "P", RejectionReason: null });
    await events.notifyProblemStatus(1, "Public", 2);
    expect(notify).not.toHaveBeenCalled();
  });

  it("includes the rejection reason", async () => {
    repo.problemInfo.mockResolvedValue({ CreatorID: 3, Title: "P", RejectionReason: "Thiếu testcase" });
    await events.notifyProblemStatus(1, "Rejected", 2);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: [3],
        type: "problem_rejected",
        body: expect.stringContaining("Thiếu testcase"),
      }),
    );
  });

  it("does not notify a user who replies to their own comment", async () => {
    repo.commentInfo.mockResolvedValue({ AuthorID: 4, ProblemID: 1, ContestID: null, ParentID: null, LikedByUser: false });
    await events.notifyCommentReply(10, 4, "A");
    expect(notify).not.toHaveBeenCalled();
  });

  it("notifies the comment author on like but not on unlike or self-like", async () => {
    repo.commentInfo.mockResolvedValue({ AuthorID: 4, ProblemID: 1, ContestID: null, ParentID: null, LikedByUser: true });
    await events.notifyCommentLike(10, 8, "B");
    expect(notify).toHaveBeenCalledOnce();
    notify.mockClear();
    repo.commentInfo.mockResolvedValue({ AuthorID: 4, ProblemID: 1, ContestID: null, ParentID: null, LikedByUser: false });
    await events.notifyCommentLike(10, 8, "B");
    expect(notify).not.toHaveBeenCalled();
    repo.commentInfo.mockResolvedValue({ AuthorID: 8, ProblemID: 1, ContestID: null, ParentID: null, LikedByUser: true });
    await events.notifyCommentLike(10, 8, "B");
    expect(notify).not.toHaveBeenCalled();
  });

  it("links a contest comment like to the contest page", async () => {
    repo.commentInfo.mockResolvedValue({ AuthorID: 4, ProblemID: null, ContestID: 7, ParentID: null, LikedByUser: true });
    await events.notifyCommentLike(10, 8, "B");
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ link: "/user/contests/7" }));
  });

  it("notifies all class students about a new document except the actor", async () => {
    repo.classInfo.mockResolvedValue({ ClassName: "C1" });
    repo.classStudentIds.mockResolvedValue([1, 2, 3]);
    await events.notifyClassDocument(5, "bai1.pdf", 2);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [1, 3], type: "class_document_added", link: "/user/classes/5" }),
    );
  });

  it("swallows lookup failures", async () => {
    repo.submissionInfo.mockRejectedValue(new Error("db"));
    await expect(events.notifyJudgeResult(1, "AC", "1/1")).resolves.toBeUndefined();
    expect(notify).not.toHaveBeenCalled();
  });

  it("folds contest joins into one aggregated notification for the owner", async () => {
    repo.contestInfo.mockResolvedValue({ CreatorID: 2, ContestName: "K1", ParticipantCount: 42 });
    await events.notifyContestJoined(1, 9,"Học viên");
    expect(notify).not.toHaveBeenCalled();
    expect(notifyAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 2,
        type: "contest_joined",
        link: "/teacher/contests/1",
        titleTemplate: expect.stringContaining("{n}"),
        count: 42,
        body: expect.stringContaining("Học viên"),
      }),
    );
    notifyAggregate.mockClear();
    await events.notifyContestJoined(1, 2, "Chủ kỳ thi");
    expect(notifyAggregate).not.toHaveBeenCalled();
  });

  it("notifies participants when a contest starts", async () => {
    repo.contestInfo.mockResolvedValue({ CreatorID: 2, ContestName: "K1" });
    repo.contestParticipantIds.mockResolvedValue([2, 5, 6]);
    await events.notifyContestStarted(1, 2);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [5, 6], type: "contest_started", link: "/user/contests/1" }),
    );
  });

  it("tells every admin except the actor about a new TA request", async () => {
    repo.adminIds.mockResolvedValue([1, 2, 3]);
    repo.taRequestInfo.mockResolvedValue({
      ClassName: "C1", StudentName: "HV", TeacherName: "GV", RequestedBy: 2, UserID: 9, ClassID: 5, Status: "Pending",
    });
    await events.notifyTARequestSubmitted(5, 9, 2);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userIds: [1, 3],
        type: "ta_request_submitted",
        link: "/admin/approvals",
        body: expect.stringContaining("GV"),
      }),
    );
  });

  it("notifies the teacher and the new TA when a request is approved", async () => {
    repo.taRequestById.mockResolvedValue({
      ClassName: "C1", StudentName: "HV", TeacherName: "GV", RequestedBy: 2, UserID: 9, ClassID: 5, Status: "Approved",
    });
    await events.notifyTAApproved(11);
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [2], type: "ta_request_approved", link: "/teacher/classes/5" }),
    );
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [9], type: "ta_request_approved", link: "/user/classes/5" }),
    );
  });

  it("does not announce a TA approval that is not Approved", async () => {
    repo.taRequestById.mockResolvedValue({
      ClassName: "C1", StudentName: "HV", TeacherName: "GV", RequestedBy: 2, UserID: 9, ClassID: 5, Status: "Rejected",
    });
    await events.notifyTAApproved(11);
    expect(notify).not.toHaveBeenCalled();
  });

  it("tells admins about a new class and skips the creator", async () => {
    repo.adminIds.mockResolvedValue([1, 2]);
    repo.classCreatedInfo.mockResolvedValue({ ClassName: "C1", TeacherID: 2, TeacherName: "GV" });
    await events.notifyClassCreated(5, 2);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ userIds: [1], type: "class_created", link: "/admin/approvals?tab=class" }),
    );
  });

  it("swallows failures when notifying admins", async () => {
    repo.adminIds.mockRejectedValue(new Error("db"));
    repo.classCreatedInfo.mockResolvedValue({ ClassName: "C1", TeacherID: 2, TeacherName: "GV" });
    await expect(events.notifyClassCreated(5, 2)).resolves.toBeUndefined();
    expect(notify).not.toHaveBeenCalled();
  });

  it("clips long titles and rejection reasons so the notification is not dropped", async () => {
    repo.problemInfo.mockResolvedValue({ CreatorID: 3, Title: "T".repeat(200), RejectionReason: "r".repeat(2000) });
    await events.notifyProblemStatus(1, "Rejected", 2);
    const arg = notify.mock.calls[0][0];
    expect(arg.title.length).toBeLessThanOrEqual(200);
    expect(arg.body.length).toBeLessThanOrEqual(500);
  });
});
