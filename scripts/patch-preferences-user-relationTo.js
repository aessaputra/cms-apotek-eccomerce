#!/usr/bin/env node
/**
 * Patch: Remove user.relationTo from preferences queries (single auth collection fix)
 *
 * The path "user.relationTo" cannot be queried when there's only one auth collection.
 * This script patches @payloadcms/next and @payloadcms/ui to use only user.value.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const root = join(__dirname, '..')

const patches = [
  {
    file: 'node_modules/@payloadcms/next/dist/utilities/getPreferences.js',
    old: `    where: {
      and: [{
        key: {
          equals: key
        }
      }, {
        'user.relationTo': {
          equals: userSlug
        }
      }, {
        'user.value': {
          equals: userID
        }
      }]
    }`,
    new: `    where: {
      and: [{
        key: {
          equals: key
        }
      }, {
        'user.value': {
          equals: userID
        }
      }]
    }`,
  },
  {
    file: 'node_modules/@payloadcms/next/dist/views/Document/getDocPreferences.js',
    old: `      where: {
        and: [{
          key: {
            equals: preferencesKey
          }
        }, {
          'user.relationTo': {
            equals: user.collection
          }
        }, {
          'user.value': {
            equals: sanitizeID(user.id)
          }
        }]
      }`,
    new: `      where: {
        and: [{
          key: {
            equals: preferencesKey
          }
        }, {
          'user.value': {
            equals: sanitizeID(user.id)
          }
        }]
      }`,
  },
  {
    file: 'node_modules/@payloadcms/next/dist/elements/Nav/getNavPrefs.js',
    old: `    where: {
      and: [{
        key: {
          equals: 'nav'
        }
      }, {
        'user.relationTo': {
          equals: req.user.collection
        }
      }, {
        'user.value': {
          equals: req?.user?.id
        }
      }]
    }`,
    new: `    where: {
      and: [{
        key: {
          equals: 'nav'
        }
      }, {
        'user.value': {
          equals: req?.user?.id
        }
      }]
    }`,
  },
  {
    file: 'node_modules/@payloadcms/next/dist/views/List/handleServerFunction.js',
    old: `    where: {
      and: [{
        key: {
          equals: preferencesKey
        }
      }, {
        'user.relationTo': {
          equals: user.collection
        }
      }, {
        'user.value': {
          equals: user.id
        }
      }]
    }`,
    new: `    where: {
      and: [{
        key: {
          equals: preferencesKey
        }
      }, {
        'user.value': {
          equals: user.id
        }
      }]
    }`,
  },
  {
    file: 'node_modules/@payloadcms/next/dist/views/Document/handleServerFunction.js',
    old: `      where: {
        and: [{
          key: {
            equals: preferencesKey
          }
        }, {
          'user.relationTo': {
            equals: user.collection
          }
        }, {
          'user.value': {
            equals: user.id
          }
        }]
      }`,
    new: `      where: {
        and: [{
          key: {
            equals: preferencesKey
          }
        }, {
          'user.value': {
            equals: user.id
          }
        }]
      }`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/providers/Auth/index.js',
    old: "path: `/${user.collection}/logout`",
    new: "path: `/${userSlug}/logout`",
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/providers/Auth/index.js',
    old: 'if (user && user.collection) {',
    new: 'if (user) {',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/providers/Auth/index.js',
    old: 'return true;\n  }, [apiRoute, setNewUser, user]);',
    new: 'return true;\n  }, [apiRoute, setNewUser, user, userSlug]);',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/utilities/upsertPreferences.js',
    old: `    where: {
      and: [{
        key: {
          equals: key
        }
      }, {
        'user.relationTo': {
          equals: userSlug
        }
      }, {
        'user.value': {
          equals: userID
        }
      }]
    }`,
    new: `    where: {
      and: [{
        key: {
          equals: key
        }
      }, {
        'user.value': {
          equals: userID
        }
      }]
    }`,
  },
]

let patched = 0
for (const { file, old, new: replacement } of patches) {
  const path = join(root, file)
  try {
    let content = readFileSync(path, 'utf8')
    if (content.includes(old)) {
      content = content.replace(old, replacement)
      writeFileSync(path, content)
      patched++
      console.log(`Patched: ${file}`)
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.warn(`Skip (not found): ${file}`)
    } else {
      throw err
    }
  }
}

if (patched > 0) {
  console.log(`Applied ${patched} patch(es) for user.relationTo QueryError fix.`)
}
