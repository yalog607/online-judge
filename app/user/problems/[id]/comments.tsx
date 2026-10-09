"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  addCommentAction,
  deleteCommentAction,
  toggleLikeAction,
} from "@/modules/comment/actions";
import { FormError, SubmitButton } from "@/components/form";
import type { FormState } from "@/modules/auth/actions";

export type CommentView = {
  id: number;
  parentId: number | null;
  userId: number;
  fullName: string;
  content: string;
  timeAgo: string;
  likes: number;
  liked: boolean;
  authorRole: string;
};

const initial: FormState = {};

function Avatar({ userId, name, size = 34 }: { userId: number; name: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-grid flex-none place-items-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `hsl(${(userId * 47) % 360} 55% 46%)`,
      }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

function CommentForm({
  problemId,
  parentId,
  placeholder,
  onDone,
}: {
  problemId: number;
  parentId?: number;
  placeholder: string;
  onDone?: () => void;
}) {
  const [state, action] = useActionState(addCommentAction, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onDone?.();
    }
  }, [state, onDone]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="problemId" value={problemId} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <div className="flex gap-2">
        <input
          name="content"
          required
          maxLength={2000}
          aria-label="Bình luận"
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-muted px-3.5 py-2.5 text-sm outline-none focus:border-fg focus:bg-surface"
        />
        <SubmitButton className="!px-4 !py-2 text-sm">Gửi</SubmitButton>
      </div>
      <FormError message={state.error} />
    </form>
  );
}

function CommentItem({
  c,
  problemId,
  currentUserId,
  canModerate,
  replies,
}: {
  c: CommentView;
  problemId: number;
  currentUserId: number;
  canModerate: boolean;
  replies?: CommentView[];
}) {
  const [replying, setReplying] = useState(false);
  const [pending, start] = useTransition();
  const canDelete = c.userId === currentUserId || canModerate;

  return (
    <div className="flex gap-3">
      <Avatar userId={c.userId} name={c.fullName} size={replies ? 34 : 28} />
      <div className="min-w-0 flex-1">
        <div className="text-sm flex items-center gap-2">
          <b>{c.fullName}</b>
          {c.authorRole === "Admin" && (
            <span className="rounded bg-bad/10 px-1.5 py-0.5 text-[10px] font-bold text-bad">
              Admin
            </span>
          )}
          {c.authorRole === "Teacher" && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              Giảng viên
            </span>
          )}
          {c.authorRole === "TA" && (
            <span className="rounded bg-ok/10 px-1.5 py-0.5 text-[10px] font-bold text-ok">
              Trợ giảng
            </span>
          )}
          <span className="text-fg-muted">· {c.timeAgo}</span>
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{c.content}</p>
        <div className="mt-1.5 flex items-center gap-4 text-xs text-fg-muted">
          <button
            type="button"
            disabled={pending}
            onClick={() => start(() => toggleLikeAction(problemId, c.id))}
            className={c.liked ? "font-semibold text-bad" : "hover:text-fg"}
            aria-pressed={c.liked}
          >
            {c.liked ? "♥" : "♡"} {c.likes}
          </button>
          {replies && (
            <button type="button" onClick={() => setReplying((v) => !v)} className="hover:text-fg">
              Trả lời
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (confirm("Xóa bình luận này?"))
                  start(() => deleteCommentAction(problemId, c.id));
              }}
              className="ml-auto hover:text-bad"
            >
              Xóa
            </button>
          )}
        </div>
        {replying && (
          <div className="mt-3">
            <CommentForm
              problemId={problemId}
              parentId={c.id}
              placeholder="Viết câu trả lời..."
              onDone={() => setReplying(false)}
            />
          </div>
        )}
        {replies && replies.length > 0 && (
          <div className="mt-3 flex flex-col gap-3 border-l-2 border-line pl-3.5">
            {replies.map((r) => (
              <CommentItem
                key={r.id}
                c={r}
                problemId={problemId}
                currentUserId={currentUserId}
                canModerate={canModerate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function Comments({
  problemId,
  currentUserId,
  canModerate,
  comments,
}: {
  problemId: number;
  currentUserId: number;
  canModerate: boolean;
  comments: CommentView[];
}) {
  const roots = comments.filter((c) => c.parentId === null);
  const repliesOf = (id: number) =>
    comments.filter((c) => c.parentId === id).sort((a, b) => a.id - b.id);

  return (
    <div className="flex flex-col gap-5">
      <CommentForm problemId={problemId} placeholder="Viết bình luận hoặc trao đổi giải thuật..." />
      {roots.map((c) => (
        <CommentItem
          key={c.id}
          c={c}
          problemId={problemId}
          currentUserId={currentUserId}
          canModerate={canModerate}
          replies={repliesOf(c.id)}
        />
      ))}
      {roots.length === 0 && (
        <p className="py-6 text-center text-sm text-fg-muted">
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </p>
      )}
    </div>
  );
}
