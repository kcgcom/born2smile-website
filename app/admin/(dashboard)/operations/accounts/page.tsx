"use client";

import { useEffect, useState } from "react";
import { AdminActionButton, AdminSurface } from "@/components/admin/AdminChrome";
import { useAdminAuthState } from "@/components/admin/AdminAuthProvider";
import { readBrowserId, setDeviceName } from "@/components/admin/AdminBrowserPresence";
import { AdminErrorState } from "../../components/AdminErrorState";
import { useAdminApi, useAdminMutation } from "../../components/useAdminApi";

interface Account {
  email: string;
  isOwner: boolean;
  enabled: boolean;
}

interface Presence {
  email: string;
  browser_id: string;
  device_name: string | null;
  public_ip: string | null;
  last_seen_at: string;
}

const endpoint = "/api/admin/accounts";
const emptyAccount: Account = { email: "", isOwner: false, enabled: true };
const timeFormat = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" });
const inputClass = "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-700";

export default function AdminAccountsPage() {
  const { access, user } = useAdminAuthState();
  const { data, loading, error, refetch } = useAdminApi<{ accounts: Account[]; presence: Presence[]; checkedAt: number }>(endpoint, access?.isOwner === true);
  const { mutate, loading: saving, error: saveError } = useAdminMutation();
  const [selected, setSelected] = useState("");
  const [settings, setSettings] = useState(false);
  const [editing, setEditing] = useState(false);
  const [emailLocked, setEmailLocked] = useState(false);
  const [form, setForm] = useState(emptyAccount);
  const [notice, setNotice] = useState("");
  const [includeSelf, setIncludeSelf] = useState(false);
  const [deviceName, setName] = useState("");
  const [passwordEmail, setPasswordEmail] = useState("");
  const [password, setPassword] = useState("");
  useEffect(() => {
    const interval = window.setInterval(refetch, 60_000);
    return () => window.clearInterval(interval);
  }, [refetch]);
  if (!access?.isOwner) return null;

  const browserId = data && !includeSelf ? readBrowserId() : null;
  const sessions = data?.presence.filter((session) =>
    (!selected || session.email === selected)
    && (includeSelf || session.browser_id !== browserId || session.email !== user?.email?.toLowerCase()));
  const lastSeen = new Map<string, string>();
  for (const session of data?.presence ?? []) {
    if (!lastSeen.has(session.email)) lastSeen.set(session.email, session.last_seen_at);
  }

  const save = async () => {
    const result = await mutate(endpoint, "PUT", { email: form.email.trim(), enabled: form.enabled });
    if (!result.error) {
      setNotice("계정 설정을 저장했습니다.");
      setEditing(false);
      refetch();
    }
  };
  const savePassword = async () => {
    const result = await mutate(`${endpoint}/password`, "PUT", { email: passwordEmail, password });
    setPassword("");
    if (!result.error) {
      setNotice("직원 비밀번호를 저장했습니다.");
      setPasswordEmail("");
    }
  };

  return <div className="space-y-5">
    <AdminSurface tone="white" className="rounded-2xl p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">계정·접속 관리</h1>
        <AdminActionButton tone="dark" aria-expanded={settings} aria-controls="account-settings" onClick={() => {
          setSettings(!settings);
          setEditing(false);
          setPasswordEmail("");
          setPassword("");
          setNotice("");
        }}>계정 설정</AdminActionButton>
      </header>
      {loading && <p role="status" className="mt-4 text-sm">계정 목록을 불러오는 중…</p>}
      {error && <AdminErrorState message={error} onRetry={refetch} />}
      <h2 className="mt-5 font-semibold">계정 목록</h2>
      <ul className="mt-3 divide-y divide-slate-100">
        {data?.accounts.map((account) => <li key={account.email} className="flex flex-wrap items-center justify-between gap-x-3 py-2">
          <button type="button" aria-pressed={selected === account.email} onClick={() => setSelected(selected === account.email ? "" : account.email)}
            className="min-h-11 break-all rounded px-2 text-left font-medium text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-700">{account.email}</button>
          <span className="text-sm text-slate-600">{account.isOwner ? "원장" : "직원"} · {account.enabled ? "사용 허용" : "중지"}
            {lastSeen.has(account.email) && ` · 최근 ${timeFormat.format(new Date(lastSeen.get(account.email)!))}`}
          </span>
          {settings && !account.isOwner && <AdminActionButton tone="dark" onClick={() => { setForm(account); setEmailLocked(true); setEditing(true); setNotice(""); }}>사용 상태 변경</AdminActionButton>}
          {settings && !account.isOwner && account.enabled && <AdminActionButton tone="dark" onClick={() => { setPasswordEmail(account.email); setPassword(""); setEditing(false); setNotice(""); }}>비밀번호 설정</AdminActionButton>}
        </li>)}
      </ul>
      {notice && <p role="status" className="mt-3 text-sm text-emerald-800">{notice}</p>}
      {settings && <section id="account-settings" className="mt-4 space-y-3 rounded-xl border border-slate-200 p-4">
        <AdminActionButton tone="dark" onClick={() => { setForm(emptyAccount); setEmailLocked(false); setEditing(true); setNotice(""); }}>직원 계정 등록</AdminActionButton>
        {passwordEmail && !editing && <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void savePassword(); }}>
          <p className="text-sm font-medium">{passwordEmail}</p>
          <label className="flex flex-col gap-1 text-sm">새 비밀번호
            <input className={inputClass} type="password" autoComplete="new-password" required minLength={12} maxLength={72}
              value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
          <AdminActionButton type="submit" tone="primary" disabled={saving}>비밀번호 저장</AdminActionButton>
        </form>}
        {editing && <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <label className="flex flex-col gap-1 text-sm">직원 이메일
            <input className={inputClass} type="email" required maxLength={254} value={form.email}
              readOnly={emailLocked}
              onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />사용 허용
          </label>
          {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
          <AdminActionButton type="submit" tone="primary" disabled={saving}>저장</AdminActionButton>
        </form>}
      </section>}
    </AdminSurface>
    <AdminSurface tone="white" className="rounded-2xl p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">접속 목록</h2>
        <AdminActionButton tone="dark" onClick={refetch}>새로고침</AdminActionButton>
      </header>
      <p className="mt-2 text-sm text-slate-600">최근 24시간 · 한국시간{selected ? ` · ${selected}` : ""}</p>
      <label className="mt-2 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={includeSelf} onChange={(event) => setIncludeSelf(event.target.checked)} />현재 브라우저의 내 접속 표시</label>
      <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
        event.preventDefault();
        try { setDeviceName(deviceName.trim()); setNotice("현재 브라우저의 기기 이름을 저장했습니다."); }
        catch { setNotice("이 브라우저에 기기 이름을 저장할 수 없습니다."); }
      }}>
        <label className="flex flex-col gap-1 text-sm">현재 기기 이름
          <input className={inputClass} value={deviceName} maxLength={60} placeholder="예: 데스크" onChange={(event) => setName(event.target.value)} />
        </label>
        <AdminActionButton type="submit" tone="dark">기기 이름 저장</AdminActionButton>
      </form>
      {sessions?.length === 0 && <p className="mt-4 text-sm text-slate-600">표시할 접속 기록이 없습니다.</p>}
      <ul className="mt-4 divide-y divide-slate-100">
        {sessions?.map((session) => <li key={`${session.email}-${session.browser_id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
          <span className="break-all font-medium">{session.email}</span>
          <span>{session.device_name || "이름 미등록"}</span>
          <span>{session.public_ip || "공인 IP 확인 불가"}</span>
          <time dateTime={session.last_seen_at}>{timeFormat.format(new Date(session.last_seen_at))}</time>
          {data && data.checkedAt - Date.parse(session.last_seen_at) < 300_000 && <span className="text-emerald-800">최근 5분 내 확인</span>}
        </li>)}
      </ul>
    </AdminSurface>
  </div>;
}
