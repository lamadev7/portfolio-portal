"use client";

import { useState } from "react";
import { changePassword } from "@/app/admin/actions";
import { Field, SaveBar, Section, Text, useSaver } from "./fields";

export default function AccountForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const { pending, msg, run } = useSaver();
  const mismatch = confirm.length > 0 && next !== confirm;

  return (
    <form
      className="editor editor-single"
      onSubmit={(e) => {
        e.preventDefault();
        if (next !== confirm) return;
        run(() => changePassword(current, next), "Password changed", () => {
          setCurrent("");
          setNext("");
          setConfirm("");
        });
      }}
    >
      <div className="editor-main">
        <Section title="Account" desc={`Signed in as ${email}.`}>
          <Field label="Current password" wide>
            <Text type="password" autoComplete="current-password" value={current} onChange={setCurrent} required />
          </Field>
          <Field label="New password" hint="At least 12 characters." wide>
            <Text type="password" autoComplete="new-password" minLength={12} value={next} onChange={setNext} required />
          </Field>
          <Field label="Repeat new password" hint={mismatch ? "The passwords don't match." : undefined} wide>
            <Text type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} required />
          </Field>
        </Section>
      </div>
      <SaveBar pending={pending} msg={msg}>
        <button type="submit" className="btn" disabled={pending || mismatch}>
          Change password
        </button>
      </SaveBar>
    </form>
  );
}
