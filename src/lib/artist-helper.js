/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import modes from './modes'

export function getArtist(artistKey) {
  if (!artistKey) return null
  for (const period of Object.values(modes)) {
    const artist = period.artists[artistKey]
    if (artist) {
      return artist
    }
  }
  return null
}
