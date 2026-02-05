

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item: unknown): boolean {
  return Boolean(item && typeof item === 'object' && !Array.isArray(item))
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function deepMerge<T extends object, R extends object>(target: T, source: R): T & R {
  const output = { ...target } as T & R
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sourceValue = (source as any)[key]

      if (isObject(sourceValue)) {
        if (!(key in target)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Object.assign(output, { [key]: sourceValue })
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (output as any)[key] = deepMerge((target as any)[key], sourceValue)
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.assign(output, { [key]: sourceValue })
      }
    })
  }

  return output
}
