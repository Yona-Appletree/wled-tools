/**
 * Returns a sortable date string for use in filenames:
 *
 * ```
 * 2021-01-01T12-34-56
 * ```
 *
 * @param date The date to format. Defaults to the current date.
 */
export function dateFilenamePart(date = new Date()) {
  const year = date.getFullYear().toString().padStart(4, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;
}
