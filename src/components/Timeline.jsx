/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import useStore from '../lib/store'
import {setMode} from '../lib/actions'
import modes from '../lib/modes'

export default function Timeline() {
  const activeMode = useStore.use.activeMode()

  return (
    <div className="timeline-container">
      <div className="timeline">
        <div className="timeline-line"></div>
        {Object.entries(modes).map(([periodName, {period, artists}]) => (
          <div className="timeline-period" key={periodName}>
            <div className="timeline-header">
              <h3>{periodName}</h3>
              <p>({period})</p>
            </div>
            <div className="timeline-point"></div>
            <div className="timeline-artists">
              {Object.entries(artists).map(([artistKey, artistData]) => (
                <button
                  key={artistKey}
                  className={activeMode === artistKey ? 'active' : ''}
                  onClick={() => setMode(artistKey)}
                >
                  {artistData.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}