/**
 * fetch() returning the JSON body, or throwing the server's {"error": ...}
 * message (or the HTTP status) when the response is not OK.
 */
export async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const resp = await fetch(url, init)
  if (!resp.ok) {
    let detail = resp.statusText
    try {
      const body = await resp.json()
      if (body?.error) detail = String(body.error)
    } catch { /* non-JSON body: keep statusText */ }
    throw new Error(`HTTP ${resp.status}: ${detail}`)
  }
  return resp.json()
}

/**
 * Truncates the 'summary.' prefix from a string if it exists
 * @param name - The input string to process
 * @returns The string without the 'summary.' prefix, or the original string if no prefix exists
 * @example
 * truncateSummary('summary.global_quantities.ip.value') // returns 'global_quantities.ip.value'
 * truncateSummary('regular.field.name') // returns 'regular.field.name'
 * truncateSummary('') // returns ''
 * truncateSummary(null) // returns ''
 */
export function truncateSummary(name: string | null | undefined): string {
  if (!name) return '';
  
  if (name.startsWith('summary.')) {
    // Remove the 'summary.' prefix (8 characters) and trim any whitespace
    const withoutSummary = name.substring(8).trim();
    return withoutSummary;
  }
  
  // Return the original string if it doesn't start with 'summary.'
  return name;
}