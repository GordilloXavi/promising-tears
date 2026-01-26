
import Experience from './Experience/Experience.js'


const experience = new Experience(document.querySelector('canvas.webgl'))

// Loading Screen Logic
const loadingScreen = document.getElementById('loading-screen')
const loadingText = document.getElementById('loading-text')
const enterButton = document.getElementById('enter-button')

experience.resources.on('ready', () => {
    loadingText.style.display = 'none'
    enterButton.style.display = 'flex'
})

// In case resources are already loaded (e.g. strict mode or fast load)
if (experience.resources.loaded === experience.resources.toLoad) {
    loadingText.style.display = 'none'
    enterButton.style.display = 'flex'
}

enterButton.addEventListener('click', () => {
    loadingScreen.style.display = 'none'
})

const menuButton = document.getElementById('bottomBarMenuButton')
const menu = document.getElementById('bottomBarMenu')

const closeMenu = () => {
    menu.classList.remove('is-open')
    menuButton.setAttribute('aria-expanded', 'false')
}

const toggleMenu = () => {
    const isOpen = menu.classList.toggle('is-open')
    menuButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false')
}

menuButton.addEventListener('click', (event) => {
    event.stopPropagation()
    toggleMenu()
})

document.addEventListener('click', (event) => {
    if (menu.classList.contains('is-open') && !menu.contains(event.target)) {
        closeMenu()
    }
})

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) {
        closeMenu()
    }
})
