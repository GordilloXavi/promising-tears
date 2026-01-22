import * as THREE from 'three'
import Experience from "../Experience"

class StemObject {
    constructor (position, color) {
        this.experience = new Experience()
        this.camera = this.experience.camera.instance

        this.mesh = this.createMesh(color)
        this.mesh.position.set(position.x, position.y, position.z)
    }

    createMesh (color) {
        const geometry = new THREE.IcosahedronGeometry(.3)
        const material = new THREE.MeshPhysicalMaterial({
            color: color,
            metalness: 0,
            roughness: 0.05,
            transmission: 1,
            ior: 1.1,
            thickness: 0.1,
            transparent: true,
            opacity: 1,
            // FIXME: you cannot see through the objects
            //blending: THREE.MultiplyBlending
            }
        )

        const cube = new THREE.Mesh(geometry, material)

        return cube
    }

    handleIntersections (rayCaster) {
        return
    }

    handleClick (event) {
        return
    }

    update () {
        this.mesh.rotation.x += this.experience.time.delta
        this.mesh.rotation.y += this.experience.time.delta
    }
}

export default class StemObjectGroup {
    constructor () {
        this.experience = new Experience()
        const objectHeight = 0.5

        const plankton_1_position = new THREE.Vector3(2, objectHeight, -11)
        const plankton_2_position = new THREE.Vector3(0, objectHeight, -11)

        const plankton_1_color = 0x00ff00
        const plankton_2_color = 0x555555


        this.plankton_1_object = new StemObject(plankton_1_position, plankton_1_color)
        this.plankton_2_object = new StemObject(plankton_2_position, plankton_2_color)

        this.experience.scene.add(this.plankton_1_object.mesh)
        this.experience.scene.add(this.plankton_2_object.mesh)
    }

    getAllInstances() {
        return [
            this.plankton_1_object,
            this.plankton_2_object
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
        this.plankton_1_object.update()
        this.plankton_2_object.update()
    }
}