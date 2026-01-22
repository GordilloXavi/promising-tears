import * as THREE from 'three'

import Debug from './Utils/Debug.js'
import Sizes from './Utils/Sizes.js'
import Time from './Utils/Time.js'
import Camera from './Camera.js'
import GameState from './GameState.js'
import Renderer from './Renderer.js'
import World from './World/World.js'
import Resources from './Utils/Resources.js'
import YlieFirstPersonControls from './YlieFirstPersonControls.js'
import SocketMessenger from './SocketMessenger.js'

import sources from './sources.js'

let instance = null

export default class Experience
{
    constructor(_canvas, isMobile)
    {
        // Singleton
        if(instance)
        {
            return instance
        }
        instance = this
        
        // Global access
        window.experience = this

        // Options
        this.canvas = _canvas
        this.isMobile = isMobile
        this.state = GameState.LOBBY

        this.setupNameOverlay()

        // Setup
        this.debug = new Debug()
        this.sizes = new Sizes()
        this.time = new Time()
        this.scene = new THREE.Scene()
        this.resources = new Resources(sources)
        this.camera = new Camera()
        this.controls = new YlieFirstPersonControls()
        this.renderer = new Renderer()
        this.world = new World()
        this.socketMessenger = null//new SocketMessenger()

        // Resize event
        this.sizes.on('resize', () =>
        {
            this.resize()
        })

        // Time tick event
        this.time.on('tick', () =>
        {
            this.update()
        })
    }

    setupNameOverlay() {
        const nameOverlay = document.getElementById('nameOverlay')
        const nameForm = document.getElementById('nameForm')
        const nameInput = document.getElementById('nameInput')
        const canvas = document.getElementById('threeCanvas')

        window.addEventListener('load', () => {
            nameInput.focus()
        })

        // Form Submission
        nameForm.addEventListener('submit', (e) => {
            e.preventDefault()
            this.playerName = nameInput.value.trim()
            if (this.playerName.length > 0) {
                this.controls.lock()
                nameOverlay.style.display = 'none'
                canvas.style.display = 'block'
                this.state = GameState.PLAYING
                this.world.selfPlayer.name = this.playerName
                this.socketMessenger = new SocketMessenger()
                this.world.stemObjectGroup.playAllSounds()
            }
        })
    }

    resize()
    {
        this.camera.resize()
        this.renderer.resize()
    }

    update()
    {
        this.controls.update()
        this.world.update()
        this.renderer.update()
    }

    destroy()
    {
        this.sizes.off('resize')
        this.time.off('tick')

        // Traverse the whole scene
        this.scene.traverse((child) =>
        {
            // Test if it's a mesh
            if(child instanceof THREE.Mesh)
            {
                child.geometry.dispose()

                // Loop through the material properties
                for(const key in child.material)
                {
                    const value = child.material[key]

                    // Test if there is a dispose function
                    if(value && typeof value.dispose === 'function')
                    {
                        value.dispose()
                    }
                }
            }
        })

        this.renderer.instance.dispose()

        if(this.debug.active)
            this.debug.ui.destroy()
    }
}