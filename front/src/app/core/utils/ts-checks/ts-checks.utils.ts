/**
 * Checks if a value is not `null` or `undefined`.
 *
 * @template T - The type of the value.
 * @param {T} value - The value to check.
 * @returns {value is NonNullable<T>} - Returns `true` if the value is truthy (not `null` nor `undefined`), false otherwise.
 */
export const checkTypePredicate = <T>(value: T): value is NonNullable<T> => {
  return Boolean(value);
};
