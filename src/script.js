
import Experience from './Experience/Experience.js'

// Check for mobile devices
const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop|BlackBerry|Mobile/i.test(navigator.userAgent) //|| window.matchMedia("(max-width: 768px)").matches

const experience = new Experience(document.querySelector('canvas.webgl'), isMobile)
