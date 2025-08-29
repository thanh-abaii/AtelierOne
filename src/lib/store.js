/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import 'immer'
import {create} from 'zustand'
import {immer} from 'zustand/middleware/immer'
import {createSelectorFunctions} from 'auto-zustand-selectors-hook'
import modes from './modes'

const firstPeriod = Object.values(modes)[0]
const firstArtistKey = Object.keys(firstPeriod.artists)[0]

export default createSelectorFunctions(
  create(
    immer(() => ({
      didInit: false,
      photos: [],
      activeMode: firstArtistKey,
      gifInProgress: false,
      gifUrl: null,
      customPrompt: '',
      activePrompt: firstPeriod.artists[firstArtistKey].prompts[0]
    }))
  )
)
