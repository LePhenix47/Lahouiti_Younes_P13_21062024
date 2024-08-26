/**
 * This utility type is used to prettify the types of objects.
 * It simply returns the same type as the input type, but with
 * all of its properties visible in the IDE on hover
 *
 * @example
 * type FooBar = { foo: string, bar: number };
 *
 * type PrettyObject = PrettifyObject<FooBar & { isAdmin: boolean }>;
 * // => type PrettyObject = { foo: string, bar: number, isAdmin: boolean }
 */
export type PrettifyObject<T extends Record<string, any>> = {
  [P in keyof T]: T[P];
};
