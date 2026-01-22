import * as THREE from 'three'
import Experience from "../Experience"

class Wall {
    constructor (position, rotation) {
        this.experience = new Experience()
        this.camera = this.experience.camera.instance
        this.resources = this.experience.resources

        this.mesh = this.createMesh()
        this.mesh.position.set(position.x, position.y, position.z)
        this.mesh.rotation.set(rotation.x, rotation.y, rotation.z)
    }

    createMesh () {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.2,
            roughness: 0,
            metalness: 1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });
        const model = new THREE.Mesh(geometry, material);

        return model
    }

    handleIntersections (rayCaster) {
        return
    }

    handleClick (event) {
        return
    }

    update () {
        this.mesh.scale.x = Math.abs(Math.sin(this.experience.time.elapsed/1000))/5 + 1
        this.mesh.scale.y = Math.abs(Math.sin(this.experience.time.elapsed/1000))/5 + 1
        this.mesh.scale.z = Math.abs(Math.sin(this.experience.time.elapsed/1000))/5 + 1
    }
}

export default class Walls {
    constructor () {
        this.experience = new Experience()
        this.resources = this.experience.resources
        const objectHeight = 0.5

        const plankton_1_position = new THREE.Vector3(0, objectHeight, -4)
        const plankton_2_position = new THREE.Vector3(0, objectHeight, -8)

        const plankton_1_rotation = new THREE.Euler(0, -Math.PI/2, 0)
        const plankton_2_rotation = new THREE.Euler(0, Math.PI/2, 0)

        this.plankton_1_object = new Plankton(plankton_1_position, plankton_1_rotation, this.resources.items.plankton1Model)
        this.plankton_2_object = new Plankton(plankton_2_position, plankton_2_rotation, this.resources.items.plankton1Model)

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