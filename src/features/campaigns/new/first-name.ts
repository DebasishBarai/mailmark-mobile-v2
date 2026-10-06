/**
 * A `firstName` merge field for every recipient whose file names them, so the
 * templates' {{firstName|there}} greets people by name whatever the CSV
 * called its name column. Ported from withFirstName in the website's
 * lib/campaign/audience.ts and checked against its tests.
 */

// "JOHN" and "john" read as "John"; "McKay" and "DeShawn" are left alone.
function tidyName(word: string): string {
  if (word === word.toUpperCase() || word === word.toLowerCase()) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  return word;
}

function firstWord(name: string): string {
  const word = name.trim().split(/\s+/)[0] ?? '';
  // A first "word" of digits or punctuation (a phone number, an account
  // number) is not a name.
  return /\p{L}/u.test(word) ? tidyName(word) : '';
}

const FIRST_NAME_KEY = /^first[\s_-]?name$/i;
const FULL_NAME_KEY = /^(full[\s_-]?name|name|customer|customer[\s_-]?name|contact|contact[\s_-]?name|client|client[\s_-]?name)$/i;

/**
 * Adds `firstName` from a first-name column ("First Name", "first_name",
 * "FirstName"...), or from the first word of a name column, when the fields
 * have one and `firstName` is not already set.
 */
export function withFirstName(fields: Record<string, string>): Record<string, string> {
  if (fields.firstName?.trim()) return fields;
  const keys = Object.keys(fields);
  const firstKey = keys.find((k) => FIRST_NAME_KEY.test(k.trim()) && fields[k]?.trim());
  if (firstKey) return { ...fields, firstName: tidyName(fields[firstKey].trim()) };
  const nameKey = keys.find((k) => FULL_NAME_KEY.test(k.trim()) && fields[k]?.trim());
  if (nameKey) {
    const first = firstWord(fields[nameKey]);
    if (first) return { ...fields, firstName: first };
  }
  return fields;
}

const LAST_NAME_KEY = /^(last[\s_-]?name|surname|family[\s_-]?name)$/i;

/**
 * A recipient's full name from whatever the import gave: a name column,
 * first and last name columns, or a first name alone. Empty when nothing
 * names them. Ported from nameOf in the website's lib/campaign/audience.ts.
 */
export function nameOf(fields: Record<string, string>): string {
  const keys = Object.keys(fields);
  const value = (re: RegExp) => {
    const key = keys.find((k) => re.test(k.trim()) && fields[k]?.trim());
    return key ? fields[key].trim() : '';
  };
  const full = fields.name?.trim() || value(FULL_NAME_KEY);
  if (full) return full;
  const first = value(FIRST_NAME_KEY) || fields.firstName?.trim() || '';
  const last = value(LAST_NAME_KEY);
  return [first, last].filter(Boolean).join(' ');
}
