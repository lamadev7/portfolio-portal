"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login } from "@/app/admin/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn block" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export default function LoginForm() {
  const [state, action] = useFormState(login, {});
  return (
    <form action={action} className="login-form">
      <label className="field field-wide">
        <span className="field-l">Email</span>
        <input className="in" name="email" type="email" autoComplete="username" required autoFocus />
      </label>
      <label className="field field-wide">
        <span className="field-l">Password</span>
        <input className="in" name="password" type="password" autoComplete="current-password" required />
      </label>
      {state?.error && (
        <p className="savebar-msg err" role="alert">
          {state.error}
        </p>
      )}
      <Submit />
    </form>
  );
}
