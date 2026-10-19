"use client";

import Image from "next/image";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useDialog } from "@/components/dialog-provider";
import {
  addCommentAction,
  deleteCommentAction,
  toggleLikeAction,
} from "@/modules/comment/actions";
import { Form, FormError, SubmitButton } from "@/components/form";
import type { FormState } from "@/modules/auth/actions";
import type { CommentTarget } from "@/modules/comment/schema";
import type { CommentView } from "@/modules/comment/view";

const initial: FormState = {};

function Avatar({
  userId,
  name,
  avatar,
  size = 34,
}: {
  userId: number;
  name: string;
  avatar?: string | null;
  size?: number;
}) {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name}
        width={size}
        height={size}
        unoptimized
        className="flex-none rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
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
  target,
  parentId,
  placeholder,
  onDone,
}: {
  target: CommentTarget;
  parentId?: number;
  placeholder: string;
  onDone?: () => void;
}) {
  const [state, action] = useActionState(addCommentAction, initial);

  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state, onDone]);

  return (
    <Form action={action} state={state} resetOnSuccess errorField="content" className="flex flex-col gap-2">
      <input type="hidden" name="kind" value={target.kind} />
      <input type="hidden" name="targetId" value={target.id} />
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
    </Form>
  );
}

function CommentItem({
  c,
  target,
  currentUserId,
  canModerate,
  replies,
}: {
  c: CommentView;
  target: CommentTarget;
  currentUserId: number;
  canModerate: boolean;
  replies?: CommentView[];
}) {
  const [replying, setReplying] = useState(false);
  const [pending, start] = useTransition();
  const dialog = useDialog();
  const canDelete = c.userId === currentUserId || canModerate;

  return (
    <div className="flex gap-3">
      <Avatar userId={c.userId} name={c.fullName} avatar={c.avatar} size={replies ? 34 : 28} />
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
            onClick={() => start(() => toggleLikeAction(target, c.id))}
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
              onClick={async () => {
                const ok = await dialog.confirm({
                  title: "Xóa bình luận",
                  message: "Xóa bình luận này?",
                  confirmText: "Xóa",
                  danger: true,
                });
                if (ok) start(() => deleteCommentAction(target, c.id));
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
              target={target}
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
                target={target}
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
  target,
  currentUserId,
  canModerate,
  canComment = true,
  comments,
}: {
  target: CommentTarget;
  currentUserId: number;
  canModerate: boolean;
  canComment?: boolean;
  comments: CommentView[];
}) {
  const roots = comments.filter((c) => c.parentId === null);
  const repliesOf = (id: number) =>
    comments.filter((c) => c.parentId === id).sort((a, b) => a.id - b.id);

  return (
    <div className="flex flex-col gap-5">
      {canComment ? (
        <CommentForm
          target={target}
          placeholder={
            target.kind === "problem"
              ? "Viết bình luận hoặc trao đổi giải thuật..."
              : "Viết bình luận hoặc thảo luận..."
          }
        />
      ) : (
        <div className="rounded-lg border border-line bg-muted px-4 py-3 text-sm text-fg-muted text-center">
          Bạn cần tham gia kỳ thi để có thể thảo luận.
        </div>
      )}
      {roots.map((c) => (
        <CommentItem
          key={c.id}
          c={c}
          target={target}
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
