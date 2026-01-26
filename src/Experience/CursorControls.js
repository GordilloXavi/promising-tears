import * as THREE from 'three'
import Experience from './Experience.js'

export default class CursorControls
{
    constructor()
    {
        this.experience = new Experience()
        this.camera = this.experience.camera.instance
        this.sizes = this.experience.sizes
        
        // Parameters
        this.cursor = { x: 0, y: 0 }
        this.sensitivity = 0.4 // Adjust range of motion [default 0.5]
        this.damping = 0.05 // Smoothing factor [default 0.05]

        // Raycaster for hover detection
        this.raycaster = new THREE.Raycaster()
        this.mouse = new THREE.Vector2()

        // Initial fixed position (preserving height from previous controls)
        this.camera.position.set(0, 0.5, 0)
        this.camera.rotation.set(0, 0, 0)

        // Event listener
        window.addEventListener('pointermove', (event) =>
        {
            this.cursor.x = event.clientX / this.sizes.width - 0.5
            this.cursor.y = event.clientY / this.sizes.height - 0.5

            // Update mouse for raycasting (normalized device coordinates)
            this.mouse.x = (event.clientX / this.sizes.width) * 2 - 1
            this.mouse.y = -(event.clientY / this.sizes.height) * 2 + 1

            // Check hover intersections only on pointer move
            this.raycaster.setFromCamera(this.mouse, this.camera)
            if(this.experience.world) {
                this.experience.world.handleIntersections(this.raycaster)
            }
        })

        // Handle click delegation (preserving previous behavior logic)
        window.addEventListener('click', (event) => {
            if(this.experience.world) {
                this.experience.world.handleClick(event)
            }
        })
    }

    update()
    {
        // Calculate target rotation
        // Mouse Move Right (+x) -> Look Right (Negative Y Rotation)
        // Mouse Move Down (+y) -> Look Down (Negative X Rotation)
        
        const targetRotationX = - this.cursor.y * this.sensitivity * Math.PI
        const targetRotationY = - this.cursor.x * this.sensitivity * Math.PI

        // Smoothly interpolate
        this.camera.rotation.x += (targetRotationX - this.camera.rotation.x) * this.damping
        this.camera.rotation.y += (targetRotationY - this.camera.rotation.y) * this.damping
    }
}
