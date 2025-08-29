/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {GoogleGenAI, Modality} from '@google/genai'
import {limitFunction} from 'p-limit'

const timeoutMs = 123_333
const maxRetries = 5
const baseDelay = 1_233
const ai = new GoogleGenAI({apiKey: process.env.API_KEY})

export default limitFunction(
  async ({model, prompt, inputFile, signal}) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), timeoutMs)
        )

        const parts = []
        if (inputFile) {
          parts.push({
            inlineData: {
              data: inputFile.split(',')[1],
              mimeType: 'image/jpeg'
            }
          })
        }
        parts.push({text: prompt})

        const modelPromise = ai.models.generateContent({
          model,
          config: {
            responseModalities: [Modality.TEXT, Modality.IMAGE],
            safetySettings
          },
          contents: {parts}
        })

        const response = await Promise.race([modelPromise, timeoutPromise])

        if (!response.candidates || response.candidates.length === 0) {
          throw new Error('No candidates in response')
        }

        const inlineDataPart = response.candidates[0].content.parts.find(
          p => p.inlineData
        )
        if (!inlineDataPart) {
          throw new Error('No inline data found in response')
        }

        return 'data:image/png;base64,' + inlineDataPart.inlineData.data
      } catch (error) {
        if (signal?.aborted || error.name === 'AbortError') {
          return
        }

        if (attempt === maxRetries - 1) {
          throw error
        }

        const delay = baseDelay * 2 ** attempt
        await new Promise(res => setTimeout(res, delay))
        console.warn(
          `Attempt ${attempt + 1} failed, retrying after ${delay}ms...`
        )
      }
    }
  },
  {concurrency: 2}
)

const safetySettings = [
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
  'HARM_CATEGORY_HARASSMENT'
].map(category => ({category, threshold: 'BLOCK_NONE'}))
