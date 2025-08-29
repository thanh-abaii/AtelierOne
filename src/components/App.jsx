/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {useRef, useState, useEffect} from 'react'
import c from 'clsx'
import {
  snapPhoto,
  setMode,
  deletePhoto,
  makeGif,
  hideGif,
  setCustomPrompt,
  setActivePrompt
} from '../lib/actions'
import useStore from '../lib/store'
import imageData from '../lib/imageData'
import modes from '../lib/modes'
import Timeline from './Timeline'
import {getArtist} from '../lib/artist-helper'

const canvas = document.createElement('canvas')
const ctx = canvas.getContext('2d')
const modeKeys = Object.values(modes)
  .map(period => Object.keys(period.artists))
  .flat()

export default function App() {
  const photos = useStore.use.photos()
  const customPrompt = useStore.use.customPrompt()
  const activeMode = useStore.use.activeMode()
  const activePrompt = useStore.use.activePrompt()
  const gifInProgress = useStore.use.gifInProgress()
  const gifUrl = useStore.use.gifUrl()
  const [videoActive, setVideoActive] = useState(false)
  const [didInitVideo, setDidInitVideo] = useState(false)
  const [focusedId, setFocusedId] = useState(null)
  const [didJustSnap, setDidJustSnap] = useState(false)
  const [showCustomPrompt, setShowCustomPrompt] = useState(false)
  const [showInfoPanels, setShowInfoPanels] = useState(true)
  const [zoomState, setZoomState] = useState({scale: 1, x: 0, y: 0})
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({x: 0, y: 0})
  const videoRef = useRef(null)

  const currentArtist = getArtist(activeMode)

  useEffect(() => {
    if (!focusedId) {
      setTimeout(() => {
        setZoomState({scale: 1, x: 0, y: 0})
      }, 300)
    } else {
      setZoomState({scale: 1, x: 0, y: 0})
    }
  }, [focusedId])

  const startVideo = async () => {
    setDidInitVideo(true)
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {width: {ideal: 1920}, height: {ideal: 1080}},
      audio: false,
      facingMode: {ideal: 'user'}
    })
    setVideoActive(true)
    videoRef.current.srcObject = stream

    const {width, height} = stream.getVideoTracks()[0].getSettings()
    const squareSize = Math.min(width, height)
    canvas.width = squareSize
    canvas.height = squareSize
  }

  const takePhoto = () => {
    const video = videoRef.current
    const {videoWidth, videoHeight} = video
    const squareSize = canvas.width
    const sourceSize = Math.min(videoWidth, videoHeight)
    const sourceX = (videoWidth - sourceSize) / 2
    const sourceY = (videoHeight - sourceSize) / 2

    ctx.clearRect(0, 0, squareSize, squareSize)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(
      video,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      -squareSize,
      0,
      squareSize,
      squareSize
    )
    snapPhoto(canvas.toDataURL('image/jpeg'))
    setDidJustSnap(true)
    setTimeout(() => setDidJustSnap(false), 1000)
  }

  const downloadGif = () => {
    const a = document.createElement('a')
    a.href = gifUrl
    a.download = 'gembooth.gif'
    a.click()
  }

  const getPromptOptionText = (mode, prompt) => {
    if (mode === 'custom') {
      return 'Custom'
    }
    const artist = getArtist(mode)
    if (artist?.prompts) {
      const promptIndex = artist.prompts.indexOf(prompt)
      if (promptIndex !== -1) {
        return `Option ${promptIndex + 1}`
      }
      return 'Edited' // Prompt was edited by user
    }
    return ''
  }

  const handleSetMode = key => {
    setMode(key)
    setShowInfoPanels(true) // Show panels when a new artist is selected
  }

  const handleCloseFocused = () => {
    if (gifUrl) {
      hideGif()
    } else {
      setFocusedId(null)
    }
  }

  const handleWheel = e => {
    if (gifUrl) return
    e.preventDefault()
    const {deltaY} = e
    const scaleAmount = -deltaY * 0.005
    setZoomState(prev => {
      const newScale = Math.max(1, prev.scale + scaleAmount)
      return {...prev, scale: newScale}
    })
  }

  const handleMouseDown = e => {
    if (gifUrl || zoomState.scale <= 1) return
    e.preventDefault()
    setIsPanning(true)
    setPanStart({x: e.clientX - zoomState.x, y: e.clientY - zoomState.y})
  }

  const handleMouseMove = e => {
    if (!isPanning) return
    e.preventDefault()
    setZoomState(prev => ({
      ...prev,
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    }))
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  return (
    <main>
      <div className="header-container">
        <div className="header-title">
          <h1>AtelierOne</h1>
          <a
            href="https://blog.uncledao.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://www.uncledao.com/img/und_logo_black_bg.png"
              alt="Uncle Dao Logo"
              className="header-logo"
            />
          </a>
        </div>
        <div className="header-controls">
          <button onClick={() => setShowInfoPanels(!showInfoPanels)}>
            <span className="icon">
              {showInfoPanels ? 'view_carousel' : 'info'}
            </span>
          </button>
        </div>
      </div>
      <Timeline onSetMode={handleSetMode} />
      <div
        className={c('main-content-wrapper', {
          'panels-hidden': !showInfoPanels
        })}
      >
        <div className="side-panel left">
          {activeMode !== 'custom' && currentArtist ? (
            <>
              <h3>
                {currentArtist.name}
                <span className="lifespan">{currentArtist.lifespan}</span>
              </h3>
              <p>{currentArtist.introduction}</p>

              <h4>Prompt</h4>
              <textarea
                value={activePrompt}
                onChange={e => setActivePrompt(e.target.value)}
              />
              <div className="prompt-options">
                {currentArtist.prompts.map((promptText, index) => (
                  <button
                    key={index}
                    className={c({active: promptText === activePrompt})}
                    onClick={() => setActivePrompt(promptText)}
                  >
                    Option {index + 1}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div />
          )}
        </div>
        <div className="center-column">
          <div
            className={c('video-container', {focused: focusedId || gifUrl})}
          >
            {showCustomPrompt && (
              <div className="customPrompt">
                <button
                  className="circleBtn"
                  onClick={() => {
                    setShowCustomPrompt(false)

                    if (customPrompt.trim().length === 0) {
                      setMode(modeKeys[0])
                    }
                  }}
                >
                  <span className="icon">close</span>
                </button>
                <textarea
                  type="text"
                  placeholder="Enter a custom prompt"
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setShowCustomPrompt(false)
                    }
                  }}
                />
              </div>
            )}
            <video
              ref={videoRef}
              muted
              autoPlay
              playsInline
              disablePictureInPicture="true"
            />
            {didJustSnap && <div className="flash" />}
            {!videoActive && (
              <button className="startButton" onClick={startVideo}>
                <span className="icon">photo_camera</span>
                <p>
                  {didInitVideo ? 'One sec…' : 'Tap anywhere to start webcam'}
                </p>
              </button>
            )}

            {videoActive && (
              <div className="videoControls">
                <button onClick={takePhoto} className="shutter">
                  <span className="icon">camera</span>
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="side-panel right">
          {activeMode !== 'custom' && currentArtist?.notableWork ? (
            <>
              <img
                src={currentArtist.notableWork.imageUrl}
                alt={currentArtist.notableWork.title}
                className="notable-work-image"
              />
              <h4>
                {currentArtist.notableWork.title} (
                {currentArtist.notableWork.year})
              </h4>
              <p>{currentArtist.notableWork.description}</p>
            </>
          ) : (
            <div />
          )}
        </div>
      </div>

      <div className="results">
        <ul>
          {photos.length
            ? photos.map(({id, mode, isBusy, prompt}) => (
                <li className={c({isBusy})} key={id}>
                  <button
                    className="circleBtn deleteBtn"
                    onClick={() => {
                      deletePhoto(id)
                      if (focusedId === id) {
                        setFocusedId(null)
                      }
                    }}
                  >
                    <span className="icon">delete</span>
                  </button>
                  <button
                    className="photo"
                    onClick={() => {
                      if (!isBusy) {
                        setFocusedId(id)
                        hideGif()
                      }
                    }}
                  >
                    <img
                      src={
                        isBusy ? imageData.inputs[id] : imageData.outputs[id]
                      }
                      draggable={false}
                    />
                    <p className="emoji">
                      {mode === 'custom' ? '✏️' : getArtist(mode)?.emoji}
                    </p>
                    <div className="photo-info">
                      <p className="artist-name">
                        {getArtist(mode)?.name || 'Custom'}
                      </p>
                      <p className="prompt-option">
                        {getPromptOptionText(mode, prompt)}
                      </p>
                    </div>
                  </button>
                </li>
              ))
            : videoActive && (
                <li className="empty" key="empty">
                  <p>
                    👉 <span className="icon">camera</span>
                  </p>
                  Snap a photo to get started.
                </li>
              )}
        </ul>
        {photos.filter(p => !p.isBusy).length > 1 && (
          <button
            className="button makeGif"
            onClick={makeGif}
            disabled={gifInProgress}
          >
            {gifInProgress ? (
              'One sec…'
            ) : (
              <>
                <span className="icon">movie</span> Make GIF!
              </>
            )}
          </button>
        )}
      </div>

      {(focusedId || gifUrl) && (
        <div
          className="focusedPhoto-overlay"
          onClick={handleCloseFocused}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="focusedPhoto"
            onClick={e => e.stopPropagation()}
            onWheel={handleWheel}
          >
            <button className="circleBtn" onClick={handleCloseFocused}>
              <span className="icon">close</span>
            </button>
            <img
              src={gifUrl || imageData.outputs[focusedId]}
              alt="photo"
              draggable={false}
              onMouseDown={handleMouseDown}
              style={{
                transform: `scale(${zoomState.scale}) translate(${zoomState.x /
                  zoomState.scale}px, ${zoomState.y / zoomState.scale}px)`,
                cursor: isPanning
                  ? 'grabbing'
                  : zoomState.scale > 1 && !gifUrl
                  ? 'grab'
                  : 'default'
              }}
            />
            {gifUrl && (
              <button className="button downloadButton" onClick={downloadGif}>
                Download
              </button>
            )}
          </div>
        </div>
      )}

      <footer>
        <p>
          @2025 Vibe Coded by{' '}
          <a
            href="https://blog.uncledao.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Uncle Dao
          </a>
        </p>
      </footer>
    </main>
  )
}