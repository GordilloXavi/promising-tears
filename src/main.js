import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { Timer } from 'three/addons/misc/Timer.js'
import GUI from 'lil-gui'
import { gsap } from 'gsap'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js'

// Mobile detection - exit early if on mobile
function isMobile() {
    return window.innerWidth <= 768 || 
           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function createCircleTexture() {
    const size = 64
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    const gradient = ctx.createRadialGradient(
        size / 2, size / 2, 0,
        size / 2, size / 2, size / 2
    )
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)')
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
    const texture = new THREE.CanvasTexture(canvas)
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearFilter
    return texture
}

if (isMobile()) {
    console.log('Mobile device detected - exiting 3D application');
    // Don't execute any further code
    throw new Error('Mobile device not supported');
}


// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')
/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

/**
 * Camera
 */

const cameraControlParams = {
    pointerEnabled: false,
    movementSpeed: 15,
    sprintingMovementSpeed: 20, // fixme
    velocityDecay: 0.1,
    initialX: -17.5, 
    initialY: 2,
    initialZ: 24, 
    movementCounter: 0,
    footstepAmplitude: 100,
    footstepFreq: 1.2,
    clickDistance: 4,
    renderDistance: 500 // default 50
}

const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, cameraControlParams.renderDistance)
gui.add(cameraControlParams, 'renderDistance', 10, 500).name('render distance').onChange(() => {
    camera.far = cameraControlParams.renderDistance
    camera.updateProjectionMatrix()
})

camera.position.x = cameraControlParams.initialX
camera.position.y = cameraControlParams.initialY
camera.position.z = cameraControlParams.initialZ
//camera.lookAt(-1, 2, 1) // group1: (0, 0.85, 0) // group3: (40, 0.85, 56)

// Controls
const controls = new PointerLockControls( camera, document.body )

const requestFullscreen = () => {
    const elem = document.documentElement || document.body || canvas
    if (elem && elem.requestFullscreen) {
        return elem.requestFullscreen().catch(() => {})
    }
    if (canvas.requestFullscreen) {
        return canvas.requestFullscreen().catch(() => {})
    }
    return Promise.resolve()
}


/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
})
renderer.shadowMap.enabled = true
renderer.colorSpace = THREE.SRGBColorSpace

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Loading manager, for intro loading screen
const introLoadingManager = new THREE.LoadingManager()

// Loading UI elements
const progressBar = document.getElementById('progressBar')
const loadingPercentage = document.getElementById('loadingPercentage')
const startMessage = document.getElementById('startMessage')
const loaderElement = document.getElementById('loader')
const loadingMessage = document.getElementById('loadingMessage')

let isLoadingComplete = false
let gameStarted = false

// Scene
const scene = new THREE.Scene()

// Fog
const fog = new THREE.FogExp2(0x000000, 0.07) // 0.07 default
//scene.fog = fog
scene.background = new THREE.Color(0x777777)
gui.add(fog, 'density', 0, 0.6).name('fog density')


// Raycaster
const raycaster = new THREE.Raycaster()

// ###### Scene

// Loading screen
const loadingScreenGeometry = new THREE.PlaneGeometry(2, 2, 1, 1)
const loadingScreenMaterial = new THREE.ShaderMaterial({
    transparent: true,
    vertexShader: `
        void main()
        {
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uAlpha;
        void main()
        {
            gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
        }
    `,
    uniforms:
    {
        uAlpha: { value: 1.0 }
    },
})
const loadingScreen = new THREE.Mesh(loadingScreenGeometry, loadingScreenMaterial)
//scene.add(loadingScreen)

introLoadingManager.onLoad = function ( ) {
    isLoadingComplete = true
    
    // Hide loading percentage and show start message
    loadingPercentage.style.display = 'none'
    if (loadingMessage) loadingMessage.style.display = 'none'
    startMessage.style.display = 'block'
    
    speakerL.add(speakerLMusic)
    speakerR.add(speakerRMusic)
}

introLoadingManager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
    const progress = (itemsLoaded / itemsTotal) * 100
    progressBar.style.width = progress + '%'
    loadingPercentage.textContent = Math.round(progress) + '%'
    if (loadingMessage) {
        loadingMessage.style.display = 'block'
        loadingMessage.textContent = `Downloading assets, this might take a while...`
    }
}

// Function to start the game
const startGame = () => {
    if (!isLoadingComplete || gameStarted) return
    
    gameStarted = true
    
    // Hide loader / blocker overlays
    loaderElement.style.display = 'none'
    blocker.style.display = 'none'
    pauseElement.style.display = 'flex'
    pauseElement.classList.remove('visible', 'closing')

    // Show start hint for 10s, then fade out
    if (startHint) {
        startHint.style.display = 'flex'
        requestAnimationFrame(() => {
            startHint.classList.add('visible')
            if (startHintTimeout) clearTimeout(startHintTimeout)
            startHintTimeout = setTimeout(() => {
                startHint.classList.add('fading')
                startHint.classList.remove('visible')
                setTimeout(() => {
                    startHint.style.display = 'none'
                    startHint.classList.remove('fading')
                }, 1500)
            }, 7000)
        })
    }
    
    // Initialize audio context and start music
    if (audioListener.context.state === 'suspended') {
        audioListener.context.resume()
    }

    if (menuSound && menuSound.buffer) {
        try { menuSound.stop() } catch (e) {}
        menuSound.setVolume(audioParams.menuVolume)
        menuSound.play()
    }
    
    if (!heartMusic.isPlaying && heartMusic.buffer) {
        heartMusic.play()
    }
    if (!speakerLMusic.isPlaying && speakerLMusic.buffer) { 
        speakerLMusic.play()
    }
    if (!speakerRMusic.isPlaying && speakerRMusic.buffer) { 
        speakerRMusic.play()
    }
    if (chestDistortionAudio && chestDistortionAudio.buffer && !chestDistortionAudio.isPlaying) {
        chestDistortionAudio.play()
    }
    if (chestArpAudio && chestArpAudio.buffer && !chestArpAudio.isPlaying) {
        chestArpAudio.play()
    }
    
    // Enter fullscreen first, then lock pointer for immediate gameplay
    requestFullscreen().finally(() => {
        controls.lock()
    })
}

// Listen for E key to start game
const onStartKeyPress = (event) => {
    if (event.code === 'KeyE' && isLoadingComplete && !gameStarted) {
        startGame()
        document.removeEventListener('keydown', onStartKeyPress)
    }
}

document.addEventListener('keydown', onStartKeyPress)

// Audio 
const audioParams = {
    look1SongVolume: 0.6,
    look1Speed: 1,
    look2SongVolume: 0.20,
    look2Speed: 1,
    look3SongVolume: 2,
    look3Speed: 1,
    footstepsVolume: 0.4,
    distanceFactor: 4,
    rolloffFactor: 18,
    menuVolume: 0.27,
    musicVolume: 0.015,
    heartVolume: 0.1
}
const audioGUIFolder = gui.addFolder('audio')
audioGUIFolder.close()
audioGUIFolder.add(audioParams, 'menuVolume', 0, 1).name('menu volume')
audioGUIFolder.add(audioParams, 'heartVolume', 0, 1).name('heart volume').onChange(() => {
    heartMusic.setVolume(audioParams.heartVolume)
})

const audioListener = new THREE.AudioListener()
camera.add( audioListener )

const heartMusic = new THREE.Audio(audioListener)
const speakerLMusic = new THREE.PositionalAudio(audioListener)
const speakerRMusic = new THREE.PositionalAudio(audioListener)
// Make the falloff of the positionalAudio a bit more dramatic
speakerLMusic.setRefDistance(1.3)
speakerLMusic.setRolloffFactor(5)
speakerRMusic.setRefDistance(1.3)
speakerRMusic.setRolloffFactor(5)



let muted = false

// load a sound and set it as the PositionalAudio object's buffer
const audioLoader = new THREE.AudioLoader(introLoadingManager)


const footsteps = {
    paths: [
        'sounds/footsteps/left_1.mp3',
        'sounds/footsteps/left_2.mp3',
        'sounds/footsteps/left_3.mp3',
        'sounds/footsteps/right_1.mp3',
        'sounds/footsteps/right_2.mp3',
        'sounds/footsteps/right_3.mp3'
    ],
    audios: [
        new THREE.Audio( audioListener ),
        new THREE.Audio( audioListener ),
        new THREE.Audio( audioListener ),
        new THREE.Audio( audioListener ),
        new THREE.Audio( audioListener ),
        new THREE.Audio( audioListener )
    ],
    currentIndex: 0
}

for (let i = 0; i < footsteps.paths.length; i++) {
    audioLoader.load(footsteps.paths[i], function( buffer ) { 
        footsteps.audios[i].setBuffer( buffer )
        footsteps.audios[i].setLoop(false)
        footsteps.audios[i].setVolume(audioParams.footstepsVolume)
    })
}

const songPaths = [
    'music/song1.mp3',
    'music/song2.mp3'
]

const randomIndex = Math.floor(Math.random() * songPaths.length)
audioLoader.load(songPaths[randomIndex], function( buffer ) { 
    speakerLMusic.setBuffer( buffer )
    speakerLMusic.setLoop(false)
    speakerLMusic.setVolume(audioParams.musicVolume)
    speakerRMusic.setBuffer( buffer )
    speakerRMusic.setLoop(false)
    speakerRMusic.setVolume(audioParams.musicVolume)
})

audioLoader.load('music/heart.mp3', function(buffer) {
    heartMusic.setBuffer(buffer)
    heartMusic.setLoop(true)
    heartMusic.setVolume(audioParams.heartVolume)
})

// Chest distortion positional audio (loads via introLoadingManager)
audioLoader.load('music/heart_distortion.mp3', function(buffer) {
    chestDistortionBuffer = buffer
    if (chestDistortionAudio) {
        chestDistortionAudio.setBuffer(buffer)
        chestDistortionAudio.setLoop(true)
        chestDistortionAudio.setVolume(0.035)
        if (gameStarted && !chestDistortionAudio.isPlaying) {
            chestDistortionAudio.play()
        }
    }
})

// Chest arp positional audio (loads via introLoadingManager)
audioLoader.load('music/arp_loop.mp3', function(buffer) {
    chestArpBuffer = buffer
    if (chestArpAudio) {
        chestArpAudio.setBuffer(buffer)
        chestArpAudio.setLoop(true)
        chestArpAudio.setVolume(0.035)
        if (gameStarted && !chestArpAudio.isPlaying) {
            chestArpAudio.play()
        }
    }
})

// Menu sound (UI)
audioLoader.load('sounds/menu.mp3', function(buffer) {
    menuSound.setBuffer(buffer)
    menuSound.setLoop(false)
    menuSound.setVolume(audioParams.menuVolume)
})

// Chest open sound
audioLoader.load('sounds/chest.mp3', function(buffer) {
    chestOpenSound.setBuffer(buffer)
    chestOpenSound.setLoop(false)
    chestOpenSound.setVolume(2.1)
})

let currentSongIndex = randomIndex

speakerLMusic.onEnded = function() {
    currentSongIndex++
    if (currentSongIndex >= songPaths.length) {
        currentSongIndex = 0
    }
    audioLoader.load(songPaths[currentSongIndex], function(buffer) {
        speakerLMusic.setBuffer(buffer)
        speakerLMusic.play()
        speakerRMusic.setBuffer(buffer)
        speakerRMusic.play()
    })
}


// Environment
let looksMeshes = []
const collidableMeshList = []
let look1 = null


// ### LOOKS GROUPS ###
const look1Group = new THREE.Group()


const wall1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshBasicMaterial({color: 0xFF0000, side: THREE.DoubleSide})
)
const vis = false
gui.hide()
gui.close()

wall1.position.set(10000, 0, 2.5)
gui.add(wall1.position, 'x', -5, 5).name('wall1 x')
gui.add(wall1.position, 'z', -5, 5).name('wall1 z')
looksMeshes.push(wall1)
look1Group.add(wall1)

const wall2 = wall1.clone()
wall2.position.set(-3.24, 0, 4.63)
wall2.visible = vis
looksMeshes.push(wall2)
look1Group.add(wall2)

const wall3 = wall1.clone()
wall3.position.set(-0.41, 0, 5)
wall3.visible = vis
looksMeshes.push(wall3)
look1Group.add(wall3)

const wall4 = wall1.clone()
wall4.position.set(-0.41, 0, 4.2)
wall4.visible = vis
looksMeshes.push(wall4)
look1Group.add(wall4)

const wall5 = wall1.clone()
wall5.position.set(-0.41, 0, 4.5)
wall5.visible = vis
looksMeshes.push(wall5)
look1Group.add(wall5)

const wall6 = wall1.clone()
wall6.position.set(3, 0, 4.9)
wall6.visible = vis
looksMeshes.push(wall6)
look1Group.add(wall6)

const wall7 = wall1.clone()
wall7.position.set(3.5, 0, 4.9)
wall7.visible = vis
looksMeshes.push(wall7)
look1Group.add(wall7)

const wall8 = wall1.clone()
wall8.position.set(0, 0, 0.45)
wall8.visible = vis
looksMeshes.push(wall8)
look1Group.add(wall8)

const wall9 = wall1.clone()
wall9.position.set(0.82, 0, -2.55)
wall9.visible = vis
looksMeshes.push(wall9)
look1Group.add(wall9)

const wall10 = wall1.clone()
wall10.position.set(0.82 + 0.7, 0, -2.55)
wall10.visible = vis
looksMeshes.push(wall10)
look1Group.add(wall10)

const wall11 = wall1.clone()
wall11.position.set(0.82 + 0.7 + 0.7, 0, -2.55)
wall11.visible = vis
looksMeshes.push(wall11)
look1Group.add(wall11)

const wall12 = wall1.clone()
wall12.position.set(0.82 + 0.7 + 0.7 + 0.7, 0, -2.4)
wall12.visible = vis
looksMeshes.push(wall12)
look1Group.add(wall12)

const wall13 = wall1.clone()
wall13.position.set(0.82 + 0.7 + 0.7 + 0.7 + 0.7, 0, -2.35)
wall13.visible = vis
looksMeshes.push(wall13)
look1Group.add(wall13)

const speakerL = wall1.clone()
speakerL.position.set(0.21, 0, 3.52)
speakerL.visible = false
look1Group.add(speakerL)

const speakerR = wall1.clone()
speakerR.position.set(0.21, 0, 1.07)
speakerR.visible = false
look1Group.add(speakerR)

camera.lookAt(-200, 2, -49)


/**
 * Lights
 */
const lightsGUIFolder = gui.addFolder( 'lights' )
lightsGUIFolder.close()

const look1LightsGUIFolder = lightsGUIFolder.addFolder('look 1')
look1LightsGUIFolder.close()

// Ambient light
const ambientLightParams = {
    intensity: 2.5
}
const ambientLight = new THREE.AmbientLight(0xffffff, ambientLightParams.intensity)
scene.add(ambientLight)

lightsGUIFolder.add(ambientLightParams, 'intensity', 0, 3).name('ambient light intensity').onChange(() => {
    ambientLight.intensity = ambientLightParams.intensity
})



const gltf_loader = new GLTFLoader(introLoadingManager)
gltf_loader.load('/models/backrooms_hd.glb', function(gltf) { 
    look1 = gltf.scene

    look1.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
            const geometry = child.geometry
            geometry.computeVertexNormals() // Calculate normals
            collidableMeshList.push(child)
        }
    })

    look1.position.set(0, 0.4, 0)
    look1.rotateY(Math.PI)

    look1Group.add(look1)
})

let chestModel = null
let maxChestDistance = null
const mouse = new THREE.Vector2()
let chestFireflyNeedsInit = true
let isHoveringChest = false
let isInspectOpen = false
let suppressPauseScreen = false

const interactionMessage = document.getElementById('interactionMessage')
const inspectOverlay = document.getElementById('inspectOverlay')
const inspectContent = document.getElementById('inspectContent')
let chestDistortionAudio = null
let chestArpAudio = null
let chestDistortionBuffer = null
let chestArpBuffer = null
const chestOpenSound = new THREE.Audio(audioListener)
const startHint = document.getElementById('startHint')
let startHintTimeout = null
const menuSound = new THREE.Audio(audioListener)
const poemLines = [
    'Ah fondest Serafin, I am it Whom thou seekest!',
    '',
    'A light comes yet fleetest and blinds only the weakest',
    'Monsters, darkness and wickedness you must fight in order to find the light…',
    '',
    'May this present be what unites thee and thy friends,',
    'for to fully understand it’s joy, with them you must enjoy...'
]
const codeLines = ['Q9LEN-RHPED-YECCV']

let isPoemDone = false
let isCodeShown = false
let textAnimationTimeout = null

const clearTextTimeout = () => {
    if (textAnimationTimeout) {
        clearTimeout(textAnimationTimeout)
        textAnimationTimeout = null
    }
}

const buildAnimatedText = (lines, onComplete) => {
    const inspectBody = document.querySelector('.inspect-body')
    if (!inspectBody) return
    inspectBody.innerHTML = ''
    const em = document.createElement('em')
    let delay = 0
    const charDelay = 0.025
    const charAnimDuration = 0.6

    lines.forEach((line, lineIndex) => {
        if (line.length === 0) {
            em.appendChild(document.createElement('br'))
            return
        }
        for (let i = 0; i < line.length; i++) {
            const span = document.createElement('span')
            span.className = 'poem-char'
            span.textContent = line[i] === ' ' ? '\u00a0' : line[i]
            span.style.animationDelay = `${delay}s`
            delay += charDelay
            em.appendChild(span)
        }
        if (lineIndex < lines.length - 1) {
            em.appendChild(document.createElement('br'))
        }
    })
    inspectBody.appendChild(em)

    clearTextTimeout()
    textAnimationTimeout = setTimeout(() => {
        if (onComplete) onComplete()
    }, (delay + charAnimDuration) * 1000)
}

const setInspectHint = (text, visible = true) => {
    const hint = document.querySelector('.inspect-hint')
    if (!hint) return
    hint.textContent = text
    hint.style.display = visible ? 'block' : 'none'
}

buildAnimatedText(poemLines)

const showInspectOverlay = () => {
    if (!gameStarted || !isHoveringChest || !inspectOverlay) return
    isPoemDone = false
    isCodeShown = false
    clearTextTimeout()
    setInspectHint('', false)
    buildAnimatedText(poemLines, () => {
        isPoemDone = true
        setInspectHint('Press [E] to reveal your gift', true)
    })
    isInspectOpen = true
    suppressPauseScreen = true
    inspectOverlay.style.display = 'flex'
    if (interactionMessage) interactionMessage.style.display = 'none'
    if (chestDistortionAudio && chestDistortionAudio.buffer) {
        chestDistortionAudio.setVolume(0)
    }
    if (chestOpenSound && chestOpenSound.buffer) {
        try { chestOpenSound.stop() } catch (e) {}
        chestOpenSound.setVolume(1.1)
        chestOpenSound.play()
    }
    controls.unlock()
}

const hideInspectOverlay = () => {
    if (!inspectOverlay) return
    if (!isCodeShown) return
    isInspectOpen = false
    suppressPauseScreen = false
    inspectOverlay.style.display = 'none'
    clearTextTimeout()
    setInspectHint('Press [E] to close', false)
    if (gameStarted) {
        blocker.style.display = 'none'
        pauseElement.style.display = 'none'
        controls.lock()
    }
}

// Disable click-to-close on the inspect overlay; E controls progression/close

gltf_loader.load('/models/chest.glb', function(gltf) {
    const chest = gltf.scene
    chestModel = chest
    chestFireflyCenter = chest.position
    chestDistortionAudio = new THREE.PositionalAudio(audioListener)
    chestDistortionAudio.setRefDistance(20)
    chestDistortionAudio.setRolloffFactor(1)
    chestDistortionAudio.setLoop(true)
    chestDistortionAudio.setVolume(0.005)
    chest.add(chestDistortionAudio)
    if (chestDistortionBuffer) {
        chestDistortionAudio.setBuffer(chestDistortionBuffer)
    }

    chestArpAudio = new THREE.PositionalAudio(audioListener)
    chestArpAudio.setRefDistance(10)
    chestArpAudio.setRolloffFactor(3)
    chestArpAudio.setLoop(true)
    chestArpAudio.setVolume(0.5)
    chest.add(chestArpAudio)
    if (chestArpBuffer) {
        chestArpAudio.setBuffer(chestArpBuffer)
    }

    // chest.position.set(-27.2833, 1.35, 22.695) initial
    // chest.position.set(23.55389, 1.5, -17.262314) // endzone light
    chest.position.set(29.69641874, 1.5, -7.477549061254779) // endzone light
    chest.scale.set(1.7, 1.7, 1.7)
    
    maxChestDistance = new THREE.Vector3(cameraControlParams.initialX, cameraControlParams.initialY, cameraControlParams.initialZ).distanceTo(chest.position)

    // Initialize chest-path fireflies once chest is loaded
    if (chestFireflyNeedsInit) {
        chestFireflyNeedsInit = false
        const startPos = new THREE.Vector3(cameraControlParams.initialX, cameraControlParams.initialY, cameraControlParams.initialZ)
        const endPos = chest.position.clone()
        const pathVec = endPos.clone().sub(startPos)

        chestFireflyGeometry = new THREE.BufferGeometry()
        const chestFireflyPositions = new Float32Array(chestFirefliesCount * 3)
        chestFireflySeeds = []

        for (let i = 0; i < chestFirefliesCount; i++) {
            // Bias t toward chest to increase density near it
            const t = Math.pow(Math.random(), 0.45) // more weight near 1
            const basePoint = startPos.clone().addScaledVector(pathVec, t)

            // Random offset orthogonal-ish to path for spread
            const radial = (1 - t) * 4 + 0.6
            const theta = Math.random() * Math.PI * 2
            const phi = Math.random() * Math.PI
            const offset = new THREE.Vector3(
                radial * Math.sin(phi) * Math.cos(theta),
                (Math.random() * 1.6) + 0.4,
                radial * Math.sin(phi) * Math.sin(theta)
            )

            chestFireflyPositions[i * 3 + 0] = basePoint.x + offset.x
            chestFireflyPositions[i * 3 + 1] = basePoint.y + offset.y
            chestFireflyPositions[i * 3 + 2] = basePoint.z + offset.z

            chestFireflySeeds.push({
                basePoint,
                offset,
                sway: 0.5 + Math.random() * 1,//0.6,
                speed: 0.35 + Math.random() * 0.5,//0.25,
                vAmp: 0.35 + Math.random() * 0.3,
                phase: Math.random() * Math.PI * 2
            })
        }

        chestFireflyGeometry.setAttribute('position', new THREE.BufferAttribute(chestFireflyPositions, 3))
        chestFireflyMaterial = new THREE.PointsMaterial({
            color: 0xffebae,
            size: 0.08,
            sizeAttenuation: true,
            transparent: true,
            opacity: 0.65,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            map: fireflyTexture,
            alphaMap: fireflyTexture
        })

        chestFireflies = new THREE.Points(chestFireflyGeometry, chestFireflyMaterial)
        scene.add(chestFireflies)
    }

    chest.traverse((child) => {
        if (child.isMesh) {
            //child.castShadow = true
            //child.receiveShadow = true
            collidableMeshList.push(child)
            
            // Clone material to ensure it's unique per mesh for independent modification
            if (child.material) {
                child.material = child.material.clone()
                // Ensure physical material properties are available
                if (!child.material.isMeshPhysicalMaterial) {
                    // Try to upgrade to physical material if needed, or just set properties if compatible
                    // For GLB models, usually Standard or Physical. 
                    // Let's assume Standard/Physical and just set initial values
                    // child.material.roughness = 1
                    // child.material.metalness = 0
                    // child.material.emissiveIntensity = 0
                }
            }
        }
    })

    look1Group.add(chest)
})

scene.add(look1Group)

// Fireflies (soft floating particles)
const fireflyTexture = createCircleTexture()

const firefliesCount = 140 //140
const fireflyGeometry = new THREE.BufferGeometry()
const fireflyPositions = new Float32Array(firefliesCount * 3)
const fireflySeeds = []

for (let i = 0; i < firefliesCount; i++) {
    // Scatter around the play area
    const baseX = (Math.random() - 0.5) * 80
    const baseY = 1.2 + Math.random() * 2.2
    const baseZ = (Math.random() - 0.5) * 80
    fireflyPositions[i * 3 + 0] = baseX
    fireflyPositions[i * 3 + 1] = baseY
    fireflyPositions[i * 3 + 2] = baseZ
    fireflySeeds.push({
        baseX,
        baseY,
        baseZ,
        radius: 0.9 + Math.random() * 1.4,
        speed: 0.3 + Math.random() * 0.35,
        vAmp: 0.35 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2
    })
}

fireflyGeometry.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3))

const fireflyMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.07,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: fireflyTexture,
    alphaMap: fireflyTexture
})

const fireflies = new THREE.Points(fireflyGeometry, fireflyMaterial)
scene.add(fireflies)

// Chest-path fireflies (fixed count along path to chest)
const chestFirefliesCount = 200
let chestFireflyGeometry = null
let chestFireflyMaterial = null
let chestFireflies = null
let chestFireflySeeds = []
let chestFireflyCenter = new THREE.Vector3()

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    effectComposer.setSize(sizes.width, sizes.height)
    effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})


// Controls
const controlsGUIFolder = gui.addFolder('controls')
controlsGUIFolder.close()

let moveForward = false
let moveBackward = false
let moveLeft = false
let moveRight = false
let sprinting = false
let justBeganSprinting = false
let sprintTime = 0
const velocity = new THREE.Vector3()
const direction = new THREE.Vector3()

controlsGUIFolder.add(cameraControlParams, 'pointerEnabled').name('pointer enabled').onChange(() => {
    const pointer = document.getElementById('FPSPointer')
    pointer.style.display = cameraControlParams.pointerEnabled ? 'block' : 'none'
})
cameraControlParams.pointerEnabled = true
const pointer = document.getElementById('FPSPointer')
pointer.style.display = 'block'

controlsGUIFolder.add(cameraControlParams, 'movementSpeed', 1, 150).name('movement speed')
controlsGUIFolder.add(cameraControlParams, 'velocityDecay', 0.01, 5)
controlsGUIFolder.add(cameraControlParams, 'footstepAmplitude', 0, 100).name('footsteps amplitude')
controlsGUIFolder.add(cameraControlParams, 'footstepFreq', 0, 10).name('footsteps speed')
controlsGUIFolder.add(cameraControlParams, 'initialY', 0, 2.50).name('camera height')



controls.pointerSpeed = 0.8
controlsGUIFolder.add(controls, 'pointerSpeed', 0.25, 5).name('sensitivity')

const blocker = document.getElementById( 'blocker' )
const instructions = document.getElementById( 'loader' )
const pauseElement = document.getElementById( 'pause' )
const PAUSE_ANIM_MS = 180

const showPauseScreen = () => {
    if (!gameStarted) return
    if (suppressPauseScreen) return
    if (menuSound && menuSound.buffer) {
        try { menuSound.stop() } catch (e) {}
        menuSound.setVolume(audioParams.menuVolume)
        menuSound.play()
    }
    blocker.style.display = 'block'
    pauseElement.style.display = 'flex'
    pauseElement.classList.remove('closing')
    pauseElement.classList.add('visible')
}

const hidePauseScreen = () => {
    if (!gameStarted) return
    pauseElement.classList.remove('visible')
    pauseElement.classList.add('closing')
    blocker.style.display = 'none'
    window.setTimeout(() => {
        pauseElement.classList.remove('closing')
        pauseElement.style.display = 'none'
    }, PAUSE_ANIM_MS)
}


pauseElement.addEventListener( 'click', function () {
    if (!gameStarted) return

    // Initialize audio context on first interaction
    if (audioListener.context.state === 'suspended') {
        audioListener.context.resume();
    }
    
    // Start speaker music if not already playing
    if (!speakerLMusic.isPlaying && speakerLMusic.buffer) { 
        speakerLMusic.play()
    }
    if (!speakerRMusic.isPlaying && speakerRMusic.buffer) { 
        speakerRMusic.play()
    }
    
    controls.lock()
    if (!document.fullscreenElement) {
        requestFullscreen().finally(() => controls.lock())
    } else {
        document.exitFullscreen()
    }
})

controls.addEventListener( 'lock', function () {
    if (!gameStarted) return
    instructions.style.display = 'none'
    hidePauseScreen()

    for (let i = 0; i < footsteps.audios.length; i++) footsteps.audios[i].setFilter(null)
} )

controls.addEventListener( 'unlock', function () {
    if (!gameStarted) return
    showPauseScreen()
} )


scene.add( controls.getObject() )

const onKeyDown = function ( event ) {
    switch ( event.code ) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true
            break

        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true
            break

        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true
            break

        case 'ArrowRight':
        case 'KeyD':
            moveRight = true
            break
        
        case 'ShiftRight':
        case 'ShiftLeft':
            sprinting = true
            justBeganSprinting = true
            break
    }
}

const onKeyUp = function ( event ) {
    switch ( event.code ) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false
            break

        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false
            break

        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false
            break

        case 'ArrowRight':
        case 'KeyD':
            moveRight = false
            break

        case 'ShiftRight':
        case 'ShiftLeft':
            sprinting = false
            break
    }
}

const onKeyPress = function (event) {
    if (false && event.code === 'KeyM') { // Disable mute
        muted = !muted
        if (muted) {
            speakerLMusic.pause()
            speakerRMusic.pause()
            heartMusic.pause()
        } else {
            // Resume audio context if suspended
            if (audioListener.context.state === 'suspended') {
                audioListener.context.resume();
            }
            speakerLMusic.play().catch(e => console.log('Audio play failed:', e));
            speakerRMusic.play().catch(e => console.log('Audio play failed:', e));
            heartMusic.play().catch(e => console.log('Audio play failed:', e));
        }
    }
}

const onInspectKeyDown = function(event) {
    if (event.code === 'KeyE') {
        if (isInspectOpen) {
            if (!isPoemDone) return
            if (!isCodeShown) {
                if (menuSound && menuSound.buffer) {
                    try { menuSound.stop() } catch (e) {}
                    menuSound.setVolume(audioParams.menuVolume)
                    menuSound.play()
                }
                buildAnimatedText(codeLines, () => {
                    setInspectHint('Press [E] to close', true)
                })
                isCodeShown = true
            } else {
                hideInspectOverlay()
            }
        } else if (isHoveringChest) {
            showInspectOverlay()
        }
    }
}

document.addEventListener( 'keydown', onKeyDown )
document.addEventListener( 'keyup', onKeyUp )
document.addEventListener( 'keypress', onKeyPress)
document.addEventListener( 'keydown', onInspectKeyDown )


document.addEventListener('click', () => {
    // Ignore clicks while still on the loading screen; allow relock after starting
    if (!gameStarted) return
    controls.lock()
})

// POST-PROCESSING
renderer.physicallyCorrectLights = true
lightsGUIFolder.add(renderer, 'physicallyCorrectLights').name('physically correct lighting')
const effectComposer = new EffectComposer(renderer)
effectComposer.setSize(sizes.width, sizes.height)
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
effectComposer.addPass(new RenderPass(scene, camera))

const unrealBloomPass = new UnrealBloomPass()

const bloomGUIFolder = gui.addFolder('bloom')
bloomGUIFolder.close()

let postprocessingParams = {
    enabled: false,
    threshold: 0.05,
    strength: 0.82,
    radius: 0.2,
    closeRadius: 1.2,
    filmGrainIntensity: 0.18,//0.9,//1.4,
    grayscale: false
}

unrealBloomPass.strength = postprocessingParams.strength
unrealBloomPass.radius = postprocessingParams.radius
unrealBloomPass.threshold = postprocessingParams.threshold

bloomGUIFolder.add(postprocessingParams, 'strength', 0, 3).name('bloom strength').onChange(() => {
    unrealBloomPass.strength = postprocessingParams.strength
})
bloomGUIFolder.add(postprocessingParams, 'radius', 0, 2).name('bloom radius').onChange(() => {
    unrealBloomPass.radius = postprocessingParams.radius
})
bloomGUIFolder.add(postprocessingParams, 'threshold', 0, 0.3).name('bloom threshold').onChange(() => {
    unrealBloomPass.threshold = postprocessingParams.threshold
})


effectComposer.addPass(unrealBloomPass)

// Film grain
const effectFilm = new FilmPass( postprocessingParams.filmGrainIntensity, postprocessingParams.greyscale )
effectComposer.addPass(effectFilm)
bloomGUIFolder.add(postprocessingParams, 'filmGrainIntensity', 0, 5).name('film grain intensity').onChange(() => {effectFilm.uniforms.intensity.value = postprocessingParams.filmGrainIntensity})
bloomGUIFolder.add(postprocessingParams, 'grayscale').onChange(() => {effectFilm.uniforms.grayscale.value = postprocessingParams.grayscale})

const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader)
effectComposer.addPass(gammaCorrectionPass)

// Antialias
if(renderer.getPixelRatio() == 1 ) // && !renderer.capabilities.isWebGL2
    {
        const smaaPass = new SMAAPass()
        effectComposer.addPass(smaaPass)
    }

const timer = new Timer()
let fireflyTime = 0

const tick = () =>
{
    // Timer
    timer.update()

    const frameElapsedTime = timer.getDelta()
    const currentMovementSpeed = sprinting ? cameraControlParams.sprintingMovementSpeed : cameraControlParams.movementSpeed
    fireflyTime += frameElapsedTime

    // Animate fireflies with gentle drifting and slight flicker
    const fireflyPosArray = fireflyGeometry.attributes.position.array
    for (let i = 0; i < firefliesCount; i++) {
        const seed = fireflySeeds[i]
        const idx = i * 3
        const sway = Math.sin(fireflyTime * seed.speed + seed.phase) * seed.radius
        const lift = Math.sin(fireflyTime * seed.speed * 0.7 + seed.phase * 1.7) * seed.vAmp
        const depth = Math.cos(fireflyTime * seed.speed * 0.9 + seed.phase * 1.3) * seed.radius
        fireflyPosArray[idx + 0] = seed.baseX + sway
        fireflyPosArray[idx + 1] = seed.baseY + lift
        fireflyPosArray[idx + 2] = seed.baseZ + depth
    }
    fireflyGeometry.attributes.position.needsUpdate = true
    fireflyMaterial.opacity = 0.62 + Math.sin(fireflyTime * 0.8) * 0.08

    // Animate chest-path fireflies (fixed count, biased density toward chest)
    if (chestFireflyGeometry && chestModel) {
        const chestPos = chestFireflyCenter
        const chestPosArray = chestFireflyGeometry.attributes.position.array

        for (let i = 0; i < chestFirefliesCount; i++) {
            const seed = chestFireflySeeds[i]
            const idx = i * 3
            const sway = Math.sin(fireflyTime * seed.speed + seed.phase) * seed.sway
            const lift = Math.sin(fireflyTime * seed.speed * 0.9 + seed.phase * 1.4) * seed.vAmp

            // Base point stays along start->chest path; add gentle drift
            chestPosArray[idx + 0] = seed.basePoint.x + seed.offset.x + sway
            chestPosArray[idx + 1] = seed.basePoint.y + seed.offset.y + lift
            chestPosArray[idx + 2] = seed.basePoint.z + seed.offset.z
        }
        chestFireflyGeometry.attributes.position.needsUpdate = true
        chestFireflyMaterial.opacity = 0.6
        chestFireflyMaterial.size = 0.08
    }

    // Update chest distortion volume by proximity
    if (chestDistortionAudio && chestModel && chestDistortionAudio.buffer) {
        const dist = camera.position.distanceTo(chestModel.position)
        const maxDist = maxChestDistance || cameraControlParams.renderDistance
        let proximity = 1 - dist / maxDist
        proximity = Math.max(0, Math.min(1, proximity))
        // Linear falloff with a quiet floor so it's audible from spawn
        const minVolume = 0.035
        const maxVolume = 0.9
        if (isInspectOpen) {
            chestDistortionAudio.setVolume(0)
        } else {
            const volume = minVolume + proximity * (maxVolume - minVolume)
            chestDistortionAudio.setVolume(volume)
        }
        if (gameStarted && !chestDistortionAudio.isPlaying) {
            chestDistortionAudio.play()
        }
    }

    if (chestArpAudio && chestModel && chestArpAudio.buffer) {
        const dist = camera.position.distanceTo(chestModel.position)
        const maxDist = maxChestDistance || cameraControlParams.renderDistance
        let proximity = 1 - dist / maxDist
        proximity = Math.max(0, Math.min(1, proximity))
        const minVolume = 0.035
        const maxVolume = 0.7
        const volume = minVolume + proximity * (maxVolume - minVolume)
        chestArpAudio.setVolume(volume)
        if (gameStarted && !chestArpAudio.isPlaying) {
            chestArpAudio.play()
        }
    }

    if (justBeganSprinting) {
        sprintTime = 0
        justBeganSprinting = false
    }
    if (sprinting) {
        sprintTime += timer.getDelta()
    }

    // Controls:
    velocity.x -= velocity.x * frameElapsedTime * 1/cameraControlParams.velocityDecay
	velocity.z -= velocity.z * frameElapsedTime * 1/cameraControlParams.velocityDecay

    direction.z = Number( moveForward ) - Number( moveBackward )
	direction.x = Number( moveRight ) - Number( moveLeft )
    direction.normalize()

    if ( moveForward || moveBackward ) velocity.z -= direction.z * frameElapsedTime
    if ( moveLeft || moveRight ) velocity.x -= direction.x * frameElapsedTime

    const deltaX = - velocity.x * frameElapsedTime * currentMovementSpeed
    const deltaZ = - velocity.z * frameElapsedTime * currentMovementSpeed

    const playerRadius = 0.5
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()

    if (deltaX !== 0) {
        right.setFromMatrixColumn(camera.matrix, 0)
        const moveDir = right.clone()
        if (deltaX < 0) moveDir.negate()
        
        raycaster.set(camera.position, moveDir)
        const intersects = raycaster.intersectObjects(collidableMeshList)
        
        if (intersects.length > 0 && intersects[0].distance < playerRadius) {
            // Collision detected
        } else {
            controls.moveRight(deltaX)
        }
    }

    if (deltaZ !== 0) {
        right.setFromMatrixColumn(camera.matrix, 0)
        forward.crossVectors(camera.up, right).normalize()
        const moveDir = forward.clone()
        if (deltaZ < 0) moveDir.negate()

        raycaster.set(camera.position, moveDir)
        const intersects = raycaster.intersectObjects(collidableMeshList)

        if (intersects.length > 0 && intersects[0].distance < playerRadius) {
            // Collision detected
        } else {
            controls.moveForward(deltaZ)
        }
    }

    // Prevent walking through the chest with a simple radius collider
    if (chestModel) {
        const playerPos = controls.getObject().position
        const chestPos = chestModel.position
        const minDist = 1.4 // collision radius
        const diff = playerPos.clone().sub(chestPos)
        const dist = diff.length()
        if (dist < minDist && dist > 0.0001) {
            diff.normalize().multiplyScalar(minDist)
            playerPos.copy(chestPos.clone().add(diff))
            camera.position.copy(playerPos)
        }
    }

    // Footsteps
    if (moveForward || moveBackward || moveLeft || moveRight) {
        cameraControlParams.movementCounter += frameElapsedTime
        const footstepHeight = Math.sin(-Math.PI/2 + cameraControlParams.movementCounter * (currentMovementSpeed) / cameraControlParams.footstepFreq) / cameraControlParams.footstepAmplitude + 1/cameraControlParams.footstepAmplitude
        if (!muted && footstepHeight * cameraControlParams.footstepAmplitude > 1.5) {
            let footstepPlaying = false
            for (let i = 0; i < footsteps.audios.length && !footstepPlaying; i++) footstepPlaying = footsteps.audios[i].isPlaying
            
            if (!footstepPlaying) {
                footsteps.audios[footsteps.currentIndex].play()
                footsteps.currentIndex = (footsteps.currentIndex + 1) % footsteps.audios.length
            }
        }
        camera.position.y = cameraControlParams.initialY + footstepHeight
    } else {
        const footstepHeight = Math.sin(-Math.PI/2 + cameraControlParams.movementCounter * (currentMovementSpeed) / cameraControlParams.footstepFreq) / cameraControlParams.footstepAmplitude + 1/cameraControlParams.footstepAmplitude
        if (footstepHeight > 0.0005) {
            camera.position.y = cameraControlParams.initialY + footstepHeight
            cameraControlParams.movementCounter += frameElapsedTime
        } else{
            cameraControlParams.movementCounter = 0
            camera.position.y = cameraControlParams.initialY
        }
    }
    //if (camera.position.x <= -0.04 || camera.position.z <= 0.45) camera.position.y += 0.2


    // Update bloom in real time, based on distance to chest
    isHoveringChest = false
    if (chestModel) {
        const spawnPos = new THREE.Vector3(cameraControlParams.initialX, cameraControlParams.initialY, cameraControlParams.initialZ)
        const chestPos = chestModel.position
        
        // Max distance is from spawn to chest
        const maxDist = spawnPos.distanceTo(chestPos)
        
        // Current distance
        const currentDist = camera.position.distanceTo(chestPos)
        
        // Calculate factor: 0 at spawn (maxDist), 1 at chest (0)
        let factor = 1 - (currentDist / maxDist)
        
        // Clamp between 0 and 1
        factor = Math.max(0, Math.min(1, factor))
        
        // Apply an easing curve: make it rise fast initially then slow down
        // Logarithmic curve: factor = ln(factor * k + 1) / ln(k + 1)
        // k controls the steepness. Higher k = faster initial rise.
        const k = 20
        factor = Math.log(factor * k + 1) / Math.log(k + 1)

        // Apply bloom parameters based on factor
        // Threshold: 0 -> 0
        unrealBloomPass.threshold = 0
        
        // Strength: 0 -> 1.194
        unrealBloomPass.strength = factor * 1.4//1.194
        
        // Radius: 0 -> 1.132
        unrealBloomPass.radius = factor * 1.4//1.132
        
        // Update GUI params to match
        postprocessingParams.strength = unrealBloomPass.strength
        postprocessingParams.radius = unrealBloomPass.radius
        postprocessingParams.threshold = unrealBloomPass.threshold
    }

    // Collision detection handled above via Raycasting

    // Detect raycast collisions
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera)
    
    if (chestModel) {
        // Use a separate raycaster for mouse/center screen interaction if needed, 
        // or just reuse the camera-center one since it's an FPS.
        // FPS pointer is always at center (0,0) of the screen.
        const intersects = raycaster.intersectObject(chestModel, true)
        
        isHoveringChest = false
        if (intersects.length > 0) {
             // Simplified check: since chestModel is a Group, intersectObject(..., true) checks all descendants.
             // Just need to make sure it's the closest thing if walls block it.
             if (intersects[0].distance < 4.5) { // arbitrary interaction range
                 isHoveringChest = true
             }
        }

        if (interactionMessage) {
            if (isHoveringChest && !isInspectOpen) {
                interactionMessage.textContent = '[E] Inspect'
                interactionMessage.style.display = 'block'
            } else {
                interactionMessage.style.display = 'none'
            }
        }

        chestModel.traverse((child) => {
            if (child.isMesh && child.material) {
                if (isHoveringChest) {
                    gsap.to(child.material, { clearcoat: 1, duration: 0.5 })
                    gsap.to(child.material, { emissiveIntensity: 0.1, duration: 0.5 })
                    if (child.material.emissive.getHex() === 0) child.material.emissive.setHex(0x998877) // Give it a gold glow color if it has none
                } else {
                    gsap.to(child.material, { clearcoat: 0, duration: 0.5 })
                    gsap.to(child.material, { emissiveIntensity: 0, duration: 0.5 })
                }
            }
        })
    }

    // Render
    if (true ||postprocessingParams.enabled) {
        effectComposer.render()
    } else {
        renderer.render(scene,camera)
    }

    window.requestAnimationFrame(tick)
}

tick()