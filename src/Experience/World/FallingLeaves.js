import * as THREE from 'three'
import Experience from "../Experience"

class LeavesModel {
    constructor (position, rotation, model) {
        this.experience = new Experience()
        this.camera = this.experience.camera.instance
        this.resources = this.experience.resources

        this.model = model

        this.mesh = this.createMesh()
        this.mesh.position.set(position.x, position.y, position.z)
        this.mesh.rotation.set(rotation.x, rotation.y, rotation.z)
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
                    metalness: 1,
                    roughness:0,
                    opacity: oldMaterial.opacity,
                })
                newMaterial.clearcoat = 1.0
                newMaterial.clearcoatRoughness = 0.1
                child.material = newMaterial
                
            }
        })

        return model
    }

    handleIntersections (rayCaster) {
        return
    }

    handleClick (event) {
        return
    }

    update () {
        // update animation
    }
}

export default class FallingLeaves {
    constructor () {
        this.experience = new Experience()
        this.resources = this.experience.resources

        const leaves_position = new THREE.Vector3(0, 0, -20)

        const leaves_rotation = new THREE.Euler(0, 0, 0)

        this.leaves_object = new LeavesModel(leaves_position, leaves_rotation, this.resources.items.FallingLeaves)

        this.experience.scene.add(this.leaves_object.mesh)
    }

    getAllInstances() {
        return [
            this.leaves_object
        ]
    }

    handleIntersections(rayCaster) {
        let instances = this.getAllInstances()
        instances.forEach((instance, index) => {
            instance.handleIntersections(rayCaster)
        })
    }

    handleClick (event) {
        let instances = this.getAllInstances()
        instances.forEach((instance, index) => {
            instance.handleClick(event)
        })
    }

    update () {
        this.leaves_object.update()
    }
}