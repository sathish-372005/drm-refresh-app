import chunk from "lodash/chunk";
import type {
  DatasetRefreshResponse,
  StatusMap,
  StatusResponse,
  Workspace,
  WorkspaceListResponse,
} from "./powerbi-types";

type GetToken = () => Promise<string | null>;

const WORKSPACES_URL = "/api/powerbi/workspacelist";
const STATUS_URL = "/api/powerbi/refresh-status";
const REFRESH_URL = "/api/powerbi/dataset-refresh";
const PAGE_SIZE = 500;
const IDS_PER_REQUEST = 100;
const TTL_MS = 60_000;

const cache = new Map<string, { at: number; promise: Promise<unknown> }>();

// Same key within 60s reuses the same promise (shared by Home and workspace pages)
const cachedPromise = <T>(key: string, load: () => Promise<T>, force = false): Promise<T> => {
  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.at < TTL_MS) return hit.promise as Promise<T>;
  const promise = load().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, { at: Date.now(), promise });
  return promise;
};

const getJson = async <T>(url: string, getToken: GetToken): Promise<T> => {
  const token = await getToken();
  if (!token) throw new Error("Please sign in to continue.");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = body?.message || body?.error || `Request failed (HTTP ${res.status})`;
    const error = new Error(message);
    (error as any).code = body?.error;
    (error as any).status = res.status;
    throw error;
  }
  return body as T;
};

const fetchPages = async (getToken: GetToken, skip = 0, acc: Workspace[] = []): Promise<Workspace[]> => {
  const page = await getJson<WorkspaceListResponse>(`${WORKSPACES_URL}?top=${PAGE_SIZE}&skip=${skip}`, getToken);
  const all = [...acc, ...page.workspaces];
  return page.hasMore ? fetchPages(getToken, skip + PAGE_SIZE, all) : all;
};

export const fetchWorkspaces = (getToken: GetToken, force = false) =>
  cachedPromise("workspaces", () => fetchPages(getToken), force);

export const fetchStatuses = (getToken: GetToken, force = false): Promise<StatusMap> =>
  cachedPromise("statuses", async () => (await getJson<StatusResponse>(STATUS_URL, getToken)).statuses, force);

const mergeResponses = (parts: DatasetRefreshResponse[]) =>
  parts.reduce<DatasetRefreshResponse>(
    (acc, part) => ({
      statuses: { ...acc.statuses, ...part.statuses },
      rateLimited: acc.rateLimited || part.rateLimited,
      noAccess: acc.noAccess + part.noAccess,
    }),
    { statuses: {}, rateLimited: false, noAccess: 0 }
  );

// All datasets of one workspace; big workspaces are split into requests of 100 ids
export const fetchDatasetRefresh = (getToken: GetToken, groupId: string, ids: string[], force = false) =>
  cachedPromise(
    `refresh:${groupId}:${ids.join(",")}`,
    async () =>
      mergeResponses(
        await Promise.all(
          chunk(ids, IDS_PER_REQUEST).map((part) =>
            getJson<DatasetRefreshResponse>(`${REFRESH_URL}?groupId=${groupId}&ids=${part.join(",")}`, getToken)
          )
        )
      ),
    force
  );

