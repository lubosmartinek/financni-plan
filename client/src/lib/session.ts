/**
 * Session token — drží se pouze v paměti prohlížeče (RAM).
 * Nikdy se neuloží do localStorage, sessionStorage ani cookies.
 * Po zavření karty/okna zanikne automaticky.
 */

let _token: string | null = null;
let _assessmentId: number | null = null;

export const session = {
  setToken(id: number, token: string) {
    _token = token;
    _assessmentId = id;
  },
  getToken(): string | null {
    return _token;
  },
  getId(): number | null {
    return _assessmentId;
  },
  clear() {
    _token = null;
    _assessmentId = null;
  },
  /** URL s tokenem pro API volání */
  withToken(url: string): string {
    if (!_token) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}token=${encodeURIComponent(_token)}`;
  },
};
