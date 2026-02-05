

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
export function deepMerge<T extends Record<string, unknown>, R extends Record<string, unknown>>(target: T, source: R): T & R {
  const output = { ...target } as unknown as T & R
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      const sourceValue = source[key]
      const targetValue = target[key]

      if (isObject(sourceValue) && isObject(targetValue)) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        output[key] = deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>)
      } else {
        Object.assign(output, { [key]: sourceValue })
      }
    })
  }

  return output
}


