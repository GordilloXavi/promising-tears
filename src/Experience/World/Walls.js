import * as THREE from 'three'
import Experience from "../Experience"

class Wall {
    constructor (position, rotation) {
        this.experience = new Experience()
        this.camera = this.experience.camera.instance

        this.mesh = this.createMesh()
        this.mesh.position.set(position.x, position.y, position.z)
        this.mesh.rotation.set(rotation.x, rotation.y, rotation.z)
    }

    createMesh () {
        const material = new THREE.MeshPhysicalMaterial()
        material.color = new THREE.Color(0xffffff)
        material.metalness = 0
        material.roughness = 0.05
        material.transmission = 0.98
        material.ior = 1.6
        material.thickness = 0.1


        const model = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 3),
            material
        )

        model.castShadow = true
        model.receiveShadow = true

        return model
    }

    handleIntersections (rayCaster) {
        return
    }

    handleClick (event) {
        return
    }

    update () {
        return
    }
}

export default class Walls {
    constructor () {
        this.experience = new Experience()
        const objectHeight = 0.5

        const wall_1_position = new THREE.Vector3(0, objectHeight, 0)
        const wall_2_position = new THREE.Vector3(0, objectHeight, -12)

        const wall_1_rotation = new THREE.Euler(0, Math.PI/2, 0)
        const wall_2_rotation = new THREE.Euler(0, Math.PI/2, 0)


        this.wall_1_object = new Wall(wall_1_position, wall_1_rotation)
        this.wall_2_object = new Wall(wall_2_position, wall_2_rotation)

        this.experience.scene.add(this.wall_1_object.mesh)
        this.experience.scene.add(this.wall_2_object.mesh)

    }

    getAllInstances() {
        return [
            this.wall_1_object,
            this.wall_2_object
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
        this.wall_1_object.update()
        this.wall_2_object.update()
    }
}