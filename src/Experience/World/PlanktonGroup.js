import * as THREE from 'three'
import Experience from "../Experience"

class Plankton {
    constructor (position, rotation, model) {
        this.experience = new Experience()
        this.camera = this.experience.camera.instance
        this.resources = this.experience.resources

        this.model = model

        // Hover state for smooth metalness transition
        this.isHovered = false
        this.currentMetalness = 2
        this.defaultMetalness = 2
        this.targetMetalness = 3
        this.transitionSpeed = 0.1

        this.mesh = this.createMesh()
        this.mesh.position.set(position.x, position.y, position.z)
        this.mesh.rotation.set(rotation.x, rotation.y, rotation.z)

        // Cache meshes for metalness updates
        this.childMeshes = []
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                this.childMeshes.push(child)
            }
        })

        // Create bounding sphere for fast hover detection
        this.boundingSphere = new THREE.Sphere()
        this.intersectPoint = new THREE.Vector3() // Reusable vector for intersection
        this.updateBoundingSphere()
    }

    updateBoundingSphere() {
        // Compute bounding box then create sphere from it
        const box = new THREE.Box3().setFromObject(this.mesh)
        box.getBoundingSphere(this.boundingSphere)
        this.boundingSphere.radius = 0.5
    }

    createMesh () {
        const resource = this.model
        const model = resource.scene.clone()

        model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.material = child.material.clone()
                const oldMaterial = child.material
                const newMaterial = new THREE.MeshPhysicalMaterial({
                    color: oldMaterial.color.clone(),
                    map: oldMaterial.map,
                    metalness: 2, // Add glow by increasing this number
                    roughness:0,
                    opacity: oldMaterial.opacity,
                })
                newMaterial.clearcoat = 1.0
                newMaterial.clearcoatRoughness = -5.0
                child.material = newMaterial
                
            }
        })

        return model
    }

    handleIntersections (rayCaster) {
        // Use bounding sphere for fast intersection test with distance check
        const hit = rayCaster.ray.intersectSphere(this.boundingSphere, this.intersectPoint)
        if (hit) {
            const distance = rayCaster.ray.origin.distanceTo(this.intersectPoint)
            this.isHovered = distance < 4
        } else {
            this.isHovered = false
        }
    }

    handleClick (event) {
        return
    }

    update () {
        this.mesh.scale.x = Math.abs(Math.sin(this.experience.time.elapsed/1000))/20 + 1
        this.mesh.scale.y = Math.abs(Math.sin(this.experience.time.elapsed/1000))/20 + 1
        this.mesh.scale.z = Math.abs(Math.sin(this.experience.time.elapsed/1000))/20 + 1

        // Smooth metalness transition on hover
        const targetValue = this.isHovered ? this.targetMetalness : this.defaultMetalness
        this.currentMetalness += (targetValue - this.currentMetalness) * this.transitionSpeed

        // Apply metalness to cached meshes
        for (let i = 0; i < this.childMeshes.length; i++) {
            this.childMeshes[i].material.metalness = this.currentMetalness
        }
    }
}

export default class PlanktonGroup {
    constructor () {
        this.experience = new Experience()
        this.resources = this.experience.resources
        const objectHeight = 0.5

        const plankton_1_position = new THREE.Vector3(0, objectHeight, -3)
        const plankton_2_position = new THREE.Vector3(5, objectHeight, -3)

        const plankton_1_rotation = new THREE.Euler(0, -Math.PI/2, 0)
        const plankton_2_rotation = new THREE.Euler(0, -Math.PI/2, 0)

        this.plankton_1_object = new Plankton(plankton_1_position, plankton_1_rotation, this.resources.items.plankton1Model)
        this.plankton_2_object = new Plankton(plankton_2_position, plankton_2_rotation, this.resources.items.plankton1Model)

        this.experience.scene.add(this.plankton_1_object.mesh)
        this.experience.scene.add(this.plankton_2_object.mesh)

        // Create tooltip element
        this.tooltip = document.createElement('div')
        this.tooltip.className = 'plankton-tooltip'
        this.tooltip.textContent = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.'
        document.body.appendChild(this.tooltip)

        // Track cursor position for tooltip
        this.cursorX = 0
        this.cursorY = 0
        window.addEventListener('pointermove', (e) => {
            this.cursorX = e.clientX
            this.cursorY = e.clientY
            this.updateTooltipPosition()
        })
    }

    updateTooltipPosition() {
        this.tooltip.style.left = this.cursorX + 'px'
        this.tooltip.style.top = this.cursorY + 'px'
    }

    getAllInstances() {
        return [
            this.plankton_1_object,
            this.plankton_2_object
        ]
    }

    handleIntersections(rayCaster) {
        let anyHovered = false
        this.getAllInstances().forEach((instance) => {
            instance.handleIntersections(rayCaster)
            if (instance.isHovered) anyHovered = true
        })

        // Show/hide tooltip based on hover state
        if (anyHovered) {
            this.tooltip.classList.add('visible')
        } else {
            this.tooltip.classList.remove('visible')
        }
    }

    handleClick (event) {
        this.getAllInstances().forEach((instance, index) => {
            instance.handleClick(event)
        })
    }

    update () {
        this.plankton_1_object.update()
        this.plankton_2_object.update()
    }
}