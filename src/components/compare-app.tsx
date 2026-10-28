"use client";

import { useMemo, useRef, useState } from "react";
import {
  detectFileKind,
  findNotFollowingBack,
  formatFollowedAt,
  parseInstagramFile,
  type InstagramAccount,
} from "@/lib/instagram";

type LoadedFile = {
  name: string
  count: number
}

const HIDDEN_KEY = "ig-hidden-usernames";

function readHidden(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(HIDDEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveHidden(usernames: Set<string>) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...usernames]));
}

async function readJsonFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text);
}

export function CompareApp() {
  const [followers, setFollowers] = useState<InstagramAccount[]>([]);
  const [following, setFollowing] = useState<InstagramAccount[]>([]);
  const [followersFile, setFollowersFile] = useState<LoadedFile | null>(null);
  const [followingFile, setFollowingFile] = useState<LoadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "az">("recent");
  const [hideReviewed, setHideReviewed] = useState(true);
  const [hidden, setHidden] = useState<Set<string>>(() => readHidden());
  const [copied, setCopied] = useState(false);

  const followersInput = useRef<HTMLInputElement>(null);
  const followingInput = useRef<HTMLInputElement>(null);

  const notFollowingBack = useMemo(
    () => findNotFollowingBack(following, followers),
    [following, followers],
  );

  const visible = useMemo(() => {
    const filtered = notFollowingBack.filter((account) => {
      const matchesQuery = account.username
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      const isHidden = hidden.has(account.username.toLowerCase());
      return matchesQuery && (!hideReviewed || !isHidden);
    });

    if (sort === "az") {
      return [...filtered].sort((a, b) =>
        a.username.localeCompare(b.username, "es"),
      );
    }
    return filtered;
  }, [notFollowingBack, query, sort, hideReviewed, hidden]);

  const ready = followers.length > 0 && following.length > 0;

  async function ingestFiles(files: File[]) {
    setError(null);
    setCopied(false);

    for (const file of files) {
      try {
        const data = await readJsonFile(file);
        const kind = detectFileKind(data, file.name);
        const accounts = parseInstagramFile(data);

        if (accounts.length === 0) {
          setError(`No pude leer cuentas en ${file.name}.`);
          continue;
        }

        const meta = { name: file.name, count: accounts.length };

        if (kind === "following") {
          setFollowing(accounts);
          setFollowingFile(meta);
        } else if (kind === "followers") {
          setFollowers(accounts);
          setFollowersFile(meta);
        } else {
          setError(
            `No reconocí ${file.name}. Subí followers_1.json o following.json.`,
          );
        }
      } catch {
        setError(`${file.name} no es un JSON válido de Instagram.`);
      }
    }
  }

  function toggleHidden(username: string) {
    const key = username.toLowerCase();
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setHidden(next);
    saveHidden(next);
  }

  function exportCsv() {
    const rows = [
      ["username", "perfil", "seguido_desde"],
      ...visible.map((account) => [
        account.username,
        account.href,
        formatFollowedAt(account.timestamp),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "no-me-siguen.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyUsernames() {
    const text = visible.map((account) => account.username).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 text-center sm:text-left">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          <span className="h-1.5 w-1.5 rounded-full bg-[#dd2a7b]" />
          Tus archivos no se suben a ningún servidor
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Quién <span className="ig-text">no te sigue</span>
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-400">
          Cargá <code className="text-zinc-200">followers_1.json</code> y{" "}
          <code className="text-zinc-200">following.json</code> de tu
          exportación de Instagram. Se generará una lista de cuentas que seguís y no
          te siguen, con el link directo al perfil para dejar de seguirlas.
        </p>
      </header>

      <section
        className="grid gap-4 md:grid-cols-2"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void ingestFiles([...event.dataTransfer.files]);
        }}
      >
        <FileCard
          title="Seguidores"
          hint="followers_1.json"
          file={followersFile}
          onPick={() => followersInput.current?.click()}
        />
        <FileCard
          title="Seguidos"
          hint="following.json"
          file={followingFile}
          onPick={() => followingInput.current?.click()}
        />
        <input
          ref={followersInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            void ingestFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
        <input
          ref={followingInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(event) => {
            void ingestFiles([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
      </section>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <details className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-400">
        <summary className="cursor-pointer font-medium text-zinc-200">
          Cómo descargar estos archivos desde Instagram
        </summary>
        <ol className="mt-3 list-decimal space-y-2 pl-5 leading-6">
          <li>En Instagram: Configuración → Centro de cuentas.</li>
          <li>Tu información y permisos → Descargar tu información.</li>
          <li>
            Pedí solo <strong className="text-zinc-200">Seguidores y seguidos</strong>{" "}
            en formato <strong className="text-zinc-200">JSON</strong>.
          </li>
          <li>
            Cuando llegue el mail, descomprimí el ZIP y buscá{" "}
            <code>followers_1.json</code> y <code>following.json</code>.
          </li>
        </ol>
      </details>

      {ready ? (
        <>
          <section className="mt-8 grid gap-3 sm:grid-cols-3">
            <Stat label="Te siguen" value={followers.length} />
            <Stat label="Seguís" value={following.length} />
            <Stat
              label="No te siguen de vuelta"
              value={notFollowingBack.length}
              accent
            />
          </section>

          <section className="mt-6 flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar usuario..."
              className="h-11 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm outline-none placeholder:text-zinc-500 focus:border-[#dd2a7b]/60"
            />
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as "recent" | "az")
              }
              className="h-11 rounded-2xl border border-white/10 bg-black/30 px-3 text-sm outline-none"
            >
              <option value="recent">Más recientes</option>
              <option value="az">A-Z</option>
            </select>
            <label className="flex shrink-0 items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={hideReviewed}
                onChange={(event) => setHideReviewed(event.target.checked)}
                className="accent-[#dd2a7b]"
              />
              Ocultar revisados
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void copyUsernames()}
                className="h-11 rounded-2xl border border-white/10 px-4 text-sm text-zinc-200 hover:bg-white/5"
              >
                {copied ? "Copiado" : "Copiar"}
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className="h-11 rounded-2xl border border-white/10 px-4 text-sm text-zinc-200 hover:bg-white/5"
              >
                CSV
              </button>
            </div>
          </section>

          <p className="mt-4 text-sm text-zinc-500">
            Mostrando {visible.length} de {notFollowingBack.length} cuentas.
            Abrí el perfil y tocá <span className="text-zinc-300">Siguiendo</span>{" "}
            para dejar de seguir.
          </p>

          <ul className="mt-4 space-y-2">
            {visible.map((account) => {
              const isHidden = hidden.has(account.username.toLowerCase());
              return (
                <li
                  key={account.username}
                  className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="ig-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white">
                      {account.username.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">@{account.username}</p>
                      <p className="text-xs text-zinc-500">
                        Seguido el {formatFollowedAt(account.timestamp)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleHidden(account.username)}
                      className="h-10 rounded-2xl border border-white/10 px-3 text-sm text-zinc-300 hover:bg-white/5"
                    >
                      {isHidden ? "Mostrar" : "Revisado"}
                    </button>
                    <a
                      href={account.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ig-gradient inline-flex h-10 items-center justify-center rounded-2xl px-4 text-sm font-medium text-white"
                    >
                      Dejar de seguir
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>

          {visible.length === 0 ? (
            <p className="mt-8 text-center text-zinc-500">
              No hay cuentas para mostrar con esos filtros.
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-10 text-center text-sm text-zinc-500">
          Subí los dos archivos, o arrastralos acá, para generar la lista.
        </p>
      )}
    </div>
  );
}

function FileCard({
  title,
  hint,
  file,
  onPick,
}: {
  title: string
  hint: string
  file: LoadedFile | null
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-left transition hover:border-[#dd2a7b]/50 hover:bg-white/[0.05]"
    >
      <p className="text-sm text-zinc-400">{title}</p>
      {file ? (
        <>
          <p className="mt-2 truncate text-lg font-medium">{file.name}</p>
          <p className="mt-1 text-sm text-zinc-400">
            {file.count.toLocaleString("es-AR")} cuentas
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-lg font-medium">Elegir {hint}</p>
          <p className="mt-1 text-sm text-zinc-500">
            Clic o arrastrá el archivo acá
          </p>
        </>
      )}
    </button>
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <p
        className={`mt-1 text-3xl font-semibold ${accent ? "ig-text" : "text-white"}`}
      >
        {value.toLocaleString("es-AR")}
      </p>
    </div>
  );
}
