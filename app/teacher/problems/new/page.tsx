import { ProblemForm } from "../problem-form";
import { createProblemAction } from "@/modules/problem/actions";

export default function NewProblemPage() {
  return (
    <div className="max-w-3xl pt-8">
      <h1 className="mb-6 text-2xl font-semibold">Thêm bài tập</h1>
      <ProblemForm action={createProblemAction} />
    </div>
  );
}
